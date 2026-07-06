// AgentLab — extension VS Code. Hôte Node : ouvre le webview (éditeur de
// pipelines), lit la bibliothèque d'agents/pipelines du workspace, et exécute
// un pipeline en lançant `python3 orch.py --events` (→ ton abonnement Claude),
// dont il relaie chaque événement au webview pour le run live.
const vscode = require("vscode");
const cp = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

// Agents fournis par défaut si le workspace n'a pas de dossier agents/.
const DEFAULT_AGENTS = [
  { file: "questionneur.json", data: { name: "Questionneur", web: false,
    prompt: 'À partir du sujet fourni en amont, génère 5 à 7 questions de cadrage SPÉCIFIQUES au domaine détecté. Réponds UNIQUEMENT avec ce JSON : {"questions": ["…"]}' } },
  { file: "chercheur-web.json", data: { name: "Chercheur web", web: true,
    prompt: "Recherche sur le web des infos récentes et factuelles sur le sujet amont. 5–8 constats clés, chacun avec sa source (URL). Signale les incertitudes. Markdown, sous-titres en ###." } },
  { file: "synthetiseur.json", data: { name: "Synthétiseur", web: false,
    prompt: "À partir des sections amont, croise-les : convergences, tensions, angles morts, puis conclusion nuancée. Markdown." } },
  { file: "critique.json", data: { name: "Critique adverse", web: false,
    prompt: "Avocat du diable sur le contenu amont : failles de raisonnement, hypothèses non vérifiées, risques sous-estimés, objections d'un expert sceptique. Markdown, une objection par point." } },
];

function wsDir(context) {
  const f = vscode.workspace.workspaceFolders;
  return f && f[0] ? f[0].uri.fsPath : context.extensionPath;
}
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
function loadAgents(ws) {
  const found = readJsonDir(path.join(ws, "agents"));
  return found.length ? found : DEFAULT_AGENTS;
}
function loadPipelines(ws) { return readJsonDir(path.join(ws, "pipelines")); }

let panel;
function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("agentlab.open", () => open(context)));
}

function open(context) {
  if (panel) { panel.reveal(vscode.ViewColumn.Active); return; }
  panel = vscode.window.createWebviewPanel(
    "agentlab", "AgentLab", vscode.ViewColumn.Active,
    { enableScripts: true, retainContextWhenHidden: true });
  panel.webview.html = html(context, panel.webview);
  panel.onDidDispose(() => { panel = undefined; });
  panel.webview.onDidReceiveMessage((msg) => handle(context, msg));
}

function handle(context, msg) {
  const ws = wsDir(context);
  if (msg.type === "ready") {
    post("agents", { agents: loadAgents(ws) });
    post("pipelines", { pipelines: loadPipelines(ws) });
  } else if (msg.type === "run") {
    run(context, ws, msg.pipeline, msg.entree || "");
  } else if (msg.type === "savePipeline") {
    try {
      const dir = path.join(ws, "pipelines");
      fs.mkdirSync(dir, { recursive: true });
      let name = path.basename(msg.name || "pipeline");
      if (!name.endsWith(".json")) name += ".json";
      fs.writeFileSync(path.join(dir, name), JSON.stringify(msg.pipeline, null, 2));
      post("saved", { name });
      post("pipelines", { pipelines: loadPipelines(ws) });
    } catch (e) {
      post("toast", { text: "Sauvegarde impossible : " + e.message });
    }
  }
}

function run(context, ws, pipeline, entree) {
  const tmp = path.join(os.tmpdir(), `agentlab-${Date.now()}.json`);
  try { fs.writeFileSync(tmp, JSON.stringify(pipeline)); }
  catch (e) { return post("event", { event: { type: "fatal", error: e.message } }); }

  const orch = path.join(context.extensionPath, "orch.py");
  const proc = cp.spawn("python3", [orch, "--events", tmp, entree], { cwd: ws });
  let buf = "";
  proc.stdout.on("data", (d) => {
    buf += d.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
      if (line.trim()) { try { post("event", { event: JSON.parse(line) }); } catch { /* ligne partielle */ } }
    }
  });
  proc.stderr.on("data", (d) => post("event", { event: { type: "stderr", text: d.toString() } }));
  proc.on("error", (e) => post("event", { event: { type: "fatal",
    error: e.code === "ENOENT" ? "python3 introuvable dans le PATH" : e.message } }));
  proc.on("close", (code) => {
    post("event", { event: { type: "closed", code } });
    try { fs.unlinkSync(tmp); } catch { /* déjà nettoyé */ }
  });
}

function post(type, extra) { if (panel) panel.webview.postMessage(Object.assign({ type }, extra)); }

function html(context, webview) {
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

module.exports = { activate, deactivate() { } };
