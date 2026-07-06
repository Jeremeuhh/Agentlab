"use strict";
// engine.js — moteur DAG d'AgentLab (port Node de orch.py).
// Aucune dépendance à `vscode` : testable en isolation.
const { spawn } = require("node:child_process");

const MODEL = "claude-sonnet-4-6"; // passé à `claude --model`

function buildClaudeArgs(web) {
  const args = ["-p", "--model", MODEL, "--output-format", "json", "--strict-mcp-config"];
  if (web) args.push("--allowedTools", "WebSearch");
  return args;
}

function slug(texte) {
  const t = (texte || "").normalize("NFKD").replace(/[̀-ͯ]/g, "");
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "sortie";
}

function ctx(deps) {
  return deps.map(([nom, out]) => `## ${nom}\n${out}`).join("\n\n");
}

function buildLlmPrompt(node, deps) {
  let prompt = (node.prompt || "").trim() || `Rédige la section « ${node.name} ».`;
  if (deps.length) prompt += "\n\n# Données fournies par les étapes amont\n\n" + ctx(deps);
  return prompt;
}

// ask — spawn `claude -p`, renvoie data.result. Seule couture backend.
function ask(prompt, { web = false } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn("claude", buildClaudeArgs(web));
    let out = "", err = "";
    proc.stdout.on("data", (d) => (out += d));
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", (e) =>
      reject(new Error(e.code === "ENOENT" ? "binaire `claude` introuvable dans le PATH" : e.message)));
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`claude a échoué (${code}) : ${err.slice(0, 300)}`));
      let data;
      try { data = JSON.parse(out); } catch { return reject(new Error(`sortie claude non-JSON : ${out.slice(0, 200)}`)); }
      if (data.is_error) return reject(new Error(`claude a renvoyé une erreur : ${String(data.result).slice(0, 300)}`));
      resolve(data.result);
    });
    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

// runHitl — détecte {"questions":[…]} en amont, sinon commentaire libre.
async function runHitl(node, deps, askHuman) {
  let questions = null;
  const pieces = [];
  for (const [nom, out] of deps) {
    const m = /\{[\s\S]*\}/.exec(String(out));
    if (questions === null && m) {
      try {
        const qs = JSON.parse(m[0]).questions;
        if (Array.isArray(qs) && qs.length) { questions = qs; continue; }
      } catch { /* pas du JSON de questions */ }
    }
    pieces.push(`## ${nom}\n${out}`);
  }
  if (questions) {
    const { answers = [] } = await askHuman({ id: node.id, name: node.name, questions });
    const qr = questions.map((q, i) => `- Q : ${q}\n  R : ${answers[i] || "non précisé"}`);
    pieces.push("## Réponses de cadrage\n" + qr.join("\n"));
  } else {
    const { comment = "" } = await askHuman({ id: node.id, name: node.name, questions: null });
    pieces.push("## Retour humain\n" + (comment || "non précisé"));
  }
  return pieces.join("\n\n");
}

// runPipeline — exécute le graphe par niveaux topologiques.
// Les nœuds llm d'un même niveau tournent en parallèle ; un échec n'arrête pas le reste.
async function runPipeline(pipeline, entree, opts = {}) {
  const emit = opts.onEvent || (() => {});
  const _ask = opts.ask || ask;
  const askHuman = opts.askHuman || (async () => ({ comment: "" }));
  const writeOutput = opts.writeOutput || (async () => {});

  const nodes = {};
  for (const n of pipeline.nodes) nodes[n.id] = n;
  const preds = {};
  for (const id in nodes) preds[id] = [];
  for (const [a, b] of pipeline.edges || []) if (nodes[a] && nodes[b]) preds[b].push(a);

  const outputs = {};
  const depsOf = (id) => preds[id].map((p) => [nodes[p].name, outputs[p]]);

  emit({ type: "pipeline_start", nodes: Object.keys(nodes).length });
  const remaining = new Set(Object.keys(nodes));

  while (remaining.size) {
    const ready = [...remaining].filter((id) => preds[id].every((p) => p in outputs));
    if (!ready.length) {
      emit({ type: "error", message: "cycle ou dépendance manquante" });
      throw new Error("cycle ou dépendance manquante");
    }
    const llmTasks = [];
    for (const id of ready) {
      const n = nodes[id];
      if (n.type === "entree") {
        outputs[id] = entree;
        emit({ type: "node_done", id, name: n.name, output: entree });
      } else if (n.type === "llm") {
        llmTasks.push((async () => {
          emit({ type: "node_running", id, name: n.name, kind: "llm" });
          try {
            const out = await _ask(buildLlmPrompt(n, depsOf(id)), { web: !!n.web });
            outputs[id] = out;
            emit({ type: "node_done", id, name: n.name, output: out });
          } catch (e) {
            outputs[id] = `⚠️ L'agent « ${n.name} » a échoué : ${e.message}`;
            emit({ type: "node_error", id, name: n.name, error: e.message });
          }
        })());
      } else if (n.type === "hitl") {
        emit({ type: "node_running", id, name: n.name, kind: "hitl" });
        outputs[id] = await runHitl(n, depsOf(id), askHuman);
        emit({ type: "node_done", id, name: n.name, output: outputs[id] });
      } else if (n.type === "sortie") {
        emit({ type: "node_running", id, name: n.name, kind: "sortie" });
        const filename = `${slug(n.name)}-${slug(entree)}.md`;
        await writeOutput(filename, `# ${n.name} — ${entree}\n\n` + ctx(depsOf(id)) + "\n");
        outputs[id] = filename;
        emit({ type: "node_done", id, name: n.name, output: filename });
      }
      remaining.delete(id);
    }
    if (llmTasks.length) await Promise.all(llmTasks);
  }
  emit({ type: "pipeline_done" });
  return outputs;
}

module.exports = { runPipeline, ask, buildClaudeArgs, slug };
