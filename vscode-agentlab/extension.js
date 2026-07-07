"use strict";
// AgentLab — hôte de l'extension. Enregistre la vue webview de la barre latérale,
// exécute le moteur DAG EN PROCESS (engine.js → `claude -p`), relaie les événements,
// gère la bibliothèque portable (globalStorage), l'écriture des .md et le HITL.
const vscode = require("vscode");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const engine = require("./engine");

const VIEW_ID = "agentlab.view";

// Agents fournis par défaut à la première ouverture (bibliothèque vide).
const DEFAULT_AGENTS = [
  { file: "questionneur.json", data: { name: "Questionneur", web: false,
    prompt: 'À partir du sujet amont, génère 5 à 7 questions de cadrage SPÉCIFIQUES au domaine détecté. Réponds UNIQUEMENT : {"questions": ["…"]}' } },
  { file: "chercheur-web.json", data: { name: "Chercheur web", web: true,
    prompt: "Recherche sur le web des infos récentes et factuelles sur le sujet amont. 5–8 constats clés, chacun avec sa source (URL). Signale les incertitudes. Markdown, sous-titres en ###." } },
  { file: "synthetiseur.json", data: { name: "Synthétiseur", web: false,
    prompt: "À partir des sections amont, croise-les : convergences, tensions, angles morts, puis conclusion nuancée. Markdown." } },
  { file: "critique.json", data: { name: "Critique adverse", web: false,
    prompt: "Avocat du diable sur le contenu amont : failles de raisonnement, hypothèses non vérifiées, risques sous-estimés. Markdown, une objection par point." } },
];

// ---- bibliothèque (globalStorage, portable entre workspaces) ----
function libPath(context, sub) { return path.join(context.globalStorageUri.fsPath, sub); }
function readJsonDir(dir) {
  const out = [];
  try {
    for (const f of fs.readdirSync(dir).sort()) {
      if (!f.endsWith(".json")) continue;
      try { out.push({ file: f, data: JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }); }
      catch { /* fichier invalide ignoré */ }
    }
  } catch { /* dossier absent */ }
  return out;
}
function ensureDefaults(context) {
  const dir = libPath(context, "agents");
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(libPath(context, "pipelines"), { recursive: true });
  if (!fs.readdirSync(dir).some((f) => f.endsWith(".json"))) {
    for (const a of DEFAULT_AGENTS)
      fs.writeFileSync(path.join(dir, a.file), JSON.stringify(a.data, null, 2));
  }
}
function loadAgents(context) { return readJsonDir(libPath(context, "agents")); }
function loadPipelines(context) { return readJsonDir(libPath(context, "pipelines")); }

// ---- préflight : `claude` trouvable ? (résolveur partagé avec le spawn) ----
function hasClaude() { return engine.resolveClaude() != null; }

function wsDir(context) {
  const f = vscode.workspace.workspaceFolders;
  return f && f[0] ? f[0].uri.fsPath : context.globalStorageUri.fsPath;
}

// ---- provider de la vue webview ----
class AgentLabViewProvider {
  constructor(context) { this.context = context; this.view = null; this.hitl = new Map(); this.abort = null; }

  resolveWebviewView(view) {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media")],
    };
    view.webview.html = renderHtml(this.context, view.webview);
    view.webview.onDidReceiveMessage((m) => this.onMessage(m));
  }

  post(type, extra) { if (this.view) this.view.webview.postMessage(Object.assign({ type }, extra)); }

  onMessage(m) {
    if (m.type === "ready") {
      ensureDefaults(this.context);
      this.post("agents", { agents: loadAgents(this.context) });
      this.post("pipelines", { pipelines: loadPipelines(this.context) });
      if (!hasClaude()) this.post("noclaude", {});
    } else if (m.type === "run") {
      this.run(m.pipeline, m.entree || "");
    } else if (m.type === "stop") {
      if (this.abort) this.abort.abort();
    } else if (m.type === "exportPipeline") {
      this.exportPipeline(m);
    } else if (m.type === "savePipeline") {
      try {
        const dir = libPath(this.context, "pipelines");
        fs.mkdirSync(dir, { recursive: true });
        let name = path.basename(m.name || "pipeline");
        if (!name.endsWith(".json")) name += ".json";
        fs.writeFileSync(path.join(dir, name), JSON.stringify(m.pipeline, null, 2));
        this.post("saved", { name });
        this.post("pipelines", { pipelines: loadPipelines(this.context) });
      } catch (e) {
        this.post("toast", { text: "Sauvegarde impossible : " + e.message });
      }
    } else if (m.type === "saveAgent") {
      try {
        const dir = libPath(this.context, "agents");
        fs.mkdirSync(dir, { recursive: true });
        let name = String((m.data && m.data.name) || "agent").trim().replace(/[^\w.à-ÿ-]+/gi, "-") || "agent";
        if (!name.endsWith(".json")) name += ".json";
        fs.writeFileSync(path.join(dir, name), JSON.stringify(m.data, null, 2));
        this.post("toast", { text: "Agent enregistré : " + name });
        this.post("agents", { agents: loadAgents(this.context) });
      } catch (e) {
        this.post("toast", { text: "Enregistrement impossible : " + e.message });
      }
    } else if (m.type === "hitl_answer") {
      const resolve = this.hitl.get(m.id);
      if (resolve) { this.hitl.delete(m.id); resolve(m.payload || {}); }
    }
  }

  async run(pipeline, entree) {
    const controller = new AbortController();
    this.abort = controller;
    const askHuman = (payload) =>
      new Promise((resolve) => { this.hitl.set(payload.id, resolve); this.post("hitl_ask", payload); });
    const writeOutput = async (filename, content) =>
      fs.promises.writeFile(path.join(wsDir(this.context), filename), content, "utf8");
    const onEvent = (ev) => this.post("event", { event: ev });
    try {
      await engine.runPipeline(pipeline, entree, { onEvent, askHuman, writeOutput, signal: controller.signal });
    } catch (e) {
      this.post("event", { event: e && e.aborted ? { type: "stopped" } : { type: "fatal", error: e.message } });
    } finally {
      this.abort = null;
      this.hitl.clear();
      this.post("event", { event: { type: "closed" } });
    }
  }

  async exportPipeline(m) {
    let name = String(m.name || "pipeline").replace(/[^\w.à-ÿ-]+/gi, "-") || "pipeline";
    if (!name.endsWith(".json")) name += ".json";
    const uri = await vscode.window.showSaveDialog({
      filters: { JSON: ["json"] }, saveLabel: "Exporter",
      defaultUri: vscode.Uri.joinPath(vscode.Uri.file(wsDir(this.context)), name),
    });
    if (!uri) return;
    try {
      fs.writeFileSync(uri.fsPath, JSON.stringify(m.pipeline, null, 2));
      this.post("toast", { text: "Exporté : " + path.basename(uri.fsPath) });
    } catch (e) {
      this.post("toast", { text: "Export impossible : " + e.message });
    }
  }
}

function renderHtml(context, webview) {
  const file = path.join(context.extensionPath, "media", "editor.html");
  let h = fs.readFileSync(file, "utf8");
  const nonce = crypto.randomBytes(16).toString("hex");
  const csp =
    `default-src 'none'; ` +
    `style-src ${webview.cspSource} 'unsafe-inline'; ` +
    `script-src 'nonce-${nonce}'; ` +
    `img-src ${webview.cspSource} data:;`;
  return h.replace(/__NONCE__/g, nonce).replace(/__CSP__/g, csp);
}

function activate(context) {
  const provider = new AgentLabViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("agentlab.focus", () =>
      vscode.commands.executeCommand("workbench.view.extension.agentlab"))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("agentlab.importPipeline", async () => {
      const uris = await vscode.window.showOpenDialog({
        canSelectMany: false, filters: { JSON: ["json"] },
        title: "Importer un pipeline AgentLab",
      });
      if (!uris || !uris[0]) return;
      try {
        const data = JSON.parse(fs.readFileSync(uris[0].fsPath, "utf8"));
        if (!Array.isArray(data.nodes)) throw new Error("JSON de pipeline invalide (pas de nodes)");
        const dir = libPath(context, "pipelines");
        fs.mkdirSync(dir, { recursive: true });
        const name = path.basename(uris[0].fsPath);
        fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2));
        provider.post("pipelines", { pipelines: loadPipelines(context) });
        vscode.window.showInformationMessage(`Pipeline « ${data.name || name} » importé dans la bibliothèque.`);
      } catch (e) {
        vscode.window.showErrorMessage("Import impossible : " + e.message);
      }
    })
  );
}

module.exports = { activate, deactivate() {} };
