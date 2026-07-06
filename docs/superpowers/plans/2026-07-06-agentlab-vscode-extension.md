# AgentLab — Extension VS Code (barre latérale) — Plan d'implémentation

> **For agentic workers (Fable 5) :** REQUIRED SUB-SKILL — utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases `- [ ]`. Exécute dans l'ordre. Chaque tâche se termine par un commit.

**Goal :** transformer AgentLab en extension VS Code publiable et multi-OS : un atelier visuel de pipelines d'agents Claude vivant dans la barre d'activité gauche, moteur porté en Node (dépendance runtime unique = le CLI `claude`), HITL interactif, bibliothèque portable.

**Architecture :** 3 unités à frontières nettes. (1) **Webview sidebar** (`media/editor.html`) — canvas de cubes+flèches autonome, ne parle à l'hôte que par `postMessage`. (2) **Hôte** (`extension.js`) — `WebviewViewProvider`, exécute le moteur **en process**, relaie les événements, gère bibliothèque (globalStorage) + écriture `.md` + HITL. (3) **Moteur** (`engine.js`) — DAG topo/parallèle porté de `orch.py`, seule couture backend = `ask()` qui spawn `claude -p`.

**Tech Stack :** JavaScript (Node, CommonJS) · API VS Code (`vscode`) · `node:test`/`node:assert` (zéro dépendance de test) · `@vscode/vsce` (packaging) · HTML/CSS/JS vanilla dans le webview (CSP stricte, pas de framework, variables `--vscode-*`).

---

## Contrats verrouillés (référence — tous les tasks s'y conforment)

**Pipeline JSON :** `{ name, nodes: [{id, type, name, x, y, prompt?, web?}], edges: [[from, to], …] }`
**Types de nœud :** `entree` · `llm` · `hitl` · `sortie`

**`engine.runPipeline(pipeline, entree, opts)` → `Promise<outputs>`** où `opts` :
- `onEvent(ev)` — émetteur d'événements.
- `ask(prompt, {web}) → Promise<string>` — appel LLM (défaut : spawn `claude -p`).
- `askHuman({id, name, questions}) → Promise<{answers?:string[], comment?:string}>` — `questions` = `string[]` ou `null`.
- `writeOutput(filename, content) → Promise<void>` — écriture de la sortie `.md`.

**Événements moteur (`onEvent`) :** `pipeline_start{nodes}` · `node_running{id,name,kind}` · `node_done{id,name,output}` · `node_error{id,name,error}` · `pipeline_done` · `error{message}`. L'hôte ajoute `fatal{error}` et `closed{}`.

**Messages webview → hôte :** `ready` · `run{pipeline,entree}` · `savePipeline{name,pipeline}` · `hitl_answer{id,payload}` (payload = `{answers?:string[], comment?:string}`).
**Messages hôte → webview :** `agents{agents}` · `pipelines{pipelines}` · `event{event}` · `saved{name}` · `toast{text}` · `hitl_ask{id,name,questions}` · `noclaude{}`.

**Chemins :** dépôt git = `/Users/meuh/Dev/agentlab`. Racine extension = `/Users/meuh/Dev/agentlab/vscode-agentlab/`. Toutes les commandes `git`/`node` se lancent depuis la racine du dépôt sauf indication.

---

## File Structure

| Fichier | Rôle |
|---|---|
| `vscode-agentlab/engine.js` | **Créé.** Moteur DAG + `ask()` + `buildClaudeArgs()` + `slug()`. Seule couture backend. Aucun import `vscode`. |
| `vscode-agentlab/extension.js` | **Réécrit.** `WebviewViewProvider`, run in-process, HITL round-trip, bibliothèque globalStorage, écriture `.md`, préflight `claude`. |
| `vscode-agentlab/media/editor.html` | **Modifié.** Thème `--vscode-*`, flux vertical, motion des états, feuille HITL, états vides/bandeau, a11y, messagerie HITL/noclaude. |
| `vscode-agentlab/media/icon.svg` | **Créé.** Icône monochrome (`currentColor`) de la barre d'activité. |
| `vscode-agentlab/test/engine.test.js` | **Créé.** Suite `node:test` du moteur. |
| `vscode-agentlab/package.json` | **Modifié.** `viewsContainers`/`views`, commandes, scripts, devDeps. |
| `vscode-agentlab/README.md` | **Créé.** Doc utilisateur/marketplace. |
| `vscode-agentlab/.vscodeignore` | **Créé.** Exclut tests/captures/python du `.vsix`. |
| `.gitignore` | **Créé** (racine dépôt). |
| `vscode-agentlab/orch.py` | **Supprimé** (le moteur est en Node). La copie parente `/Users/meuh/Dev/agentlab/orch.py` reste, archivée. |

---

## Task 1 : Initialiser le dépôt git

**Files :**
- Create: `/Users/meuh/Dev/agentlab/.gitignore`

- [ ] **Step 1 : Créer `.gitignore` à la racine du dépôt**

Fichier `/Users/meuh/Dev/agentlab/.gitignore` :

```gitignore
node_modules/
*.vsix
out/
.DS_Store
**/.DS_Store
**/.playwright-mcp/
```

- [ ] **Step 2 : Initialiser git et faire le commit initial**

Run (depuis `/Users/meuh/Dev/agentlab`) :
```bash
git init
git add -A
git commit -m "chore: initial commit (orchestrateur existant + spec + plan)"
```
Expected : un commit créé, `git status` propre.

---

## Task 2 : Moteur DAG en Node — `buildClaudeArgs` (TDD)

**Files :**
- Create: `vscode-agentlab/engine.js`
- Create: `vscode-agentlab/test/engine.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

`vscode-agentlab/test/engine.test.js` :
```js
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildClaudeArgs } = require("../engine.js");

test("buildClaudeArgs sans web n'inclut pas WebSearch", () => {
  const a = buildClaudeArgs(false);
  assert.ok(a.includes("-p") && a.includes("--output-format") && a.includes("json"));
  assert.ok(!a.includes("WebSearch"));
});

test("buildClaudeArgs avec web ajoute --allowedTools WebSearch", () => {
  const a = buildClaudeArgs(true);
  const i = a.indexOf("--allowedTools");
  assert.ok(i >= 0 && a[i + 1] === "WebSearch");
});
```

- [ ] **Step 2 : Lancer le test, vérifier qu'il échoue**

Run : `cd vscode-agentlab && node --test`
Expected : FAIL — `Cannot find module '../engine.js'`.

- [ ] **Step 3 : Créer `engine.js` avec le minimum pour passer**

`vscode-agentlab/engine.js` :
```js
"use strict";
// engine.js — moteur DAG d'AgentLab (port Node de orch.py).
// Aucune dépendance à `vscode` : testable en isolation.
const { spawn } = require("node:child_process");

const MODEL = "claude-sonnet-4-6"; // passé à `claude --model`

// buildClaudeArgs — pur, testable. Construit les args de `claude -p`.
function buildClaudeArgs(web) {
  const args = ["-p", "--model", MODEL, "--output-format", "json", "--strict-mcp-config"];
  if (web) args.push("--allowedTools", "WebSearch");
  return args;
}

module.exports = { buildClaudeArgs };
```

- [ ] **Step 4 : Lancer le test, vérifier qu'il passe**

Run : `cd vscode-agentlab && node --test`
Expected : PASS (2 tests).

- [ ] **Step 5 : Commit**

```bash
git add vscode-agentlab/engine.js vscode-agentlab/test/engine.test.js
git commit -m "feat(engine): buildClaudeArgs + squelette moteur Node"
```

---

## Task 3 : Moteur — exécution linéaire + événements (TDD)

**Files :**
- Modify: `vscode-agentlab/engine.js`
- Modify: `vscode-agentlab/test/engine.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `vscode-agentlab/test/engine.test.js` :
```js
const { runPipeline } = require("../engine.js");

// ask factice : renvoie un texte déterministe incluant le prompt reçu.
const fakeAsk = async (prompt) => "OUT<" + prompt.slice(0, 20) + ">";

function collect() {
  const events = [];
  return { events, onEvent: (e) => events.push(e) };
}

test("pipeline linéaire : ordre des événements + sortie écrite", async () => {
  const pipeline = {
    name: "lin",
    nodes: [
      { id: "n1", type: "entree", name: "Idée" },
      { id: "n2", type: "llm", name: "Agent", prompt: "Analyse" },
      { id: "n3", type: "sortie", name: "Rapport" },
    ],
    edges: [["n1", "n2"], ["n2", "n3"]],
  };
  const { events, onEvent } = collect();
  const written = [];
  const writeOutput = async (filename, content) => written.push({ filename, content });
  await runPipeline(pipeline, "mon sujet", { onEvent, ask: fakeAsk, writeOutput });

  const types = events.map((e) => e.type);
  assert.deepEqual(types[0], "pipeline_start");
  assert.equal(events[0].nodes, 3);
  assert.ok(types.includes("node_running"));
  assert.equal(types[types.length - 1], "pipeline_done");
  // le llm a bien reçu l'entrée en amont et sa sortie est dans le .md
  assert.equal(written.length, 1);
  assert.ok(written[0].filename.endsWith(".md"));
  assert.ok(written[0].content.includes("OUT<"));
  assert.ok(written[0].content.includes("mon sujet"));
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run : `cd vscode-agentlab && node --test`
Expected : FAIL — `runPipeline is not a function`.

- [ ] **Step 3 : Implémenter le moteur**

Remplacer le contenu de `vscode-agentlab/engine.js` par :
```js
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
```

- [ ] **Step 4 : Lancer, vérifier que tout passe**

Run : `cd vscode-agentlab && node --test`
Expected : PASS (3 tests).

- [ ] **Step 5 : Commit**

```bash
git add vscode-agentlab/engine.js vscode-agentlab/test/engine.test.js
git commit -m "feat(engine): exécution DAG + événements (port orch.py)"
```

---

## Task 4 : Moteur — fan-out / convergence + isolation d'erreur (TDD)

**Files :**
- Modify: `vscode-agentlab/test/engine.test.js`

- [ ] **Step 1 : Écrire les tests qui échouent (comportements déjà couverts par le code — on les verrouille)**

Ajouter à `vscode-agentlab/test/engine.test.js` :
```js
test("fan-out puis convergence : le nœud aval reçoit toutes les sorties amont", async () => {
  // echoAsk renvoie le prompt complet pour inspecter les deps injectées
  const echoAsk = async (prompt) => "[[" + prompt + "]]";
  const pipeline = {
    name: "fan",
    nodes: [
      { id: "e", type: "entree", name: "In" },
      { id: "a", type: "llm", name: "A", prompt: "PA" },
      { id: "b", type: "llm", name: "B", prompt: "PB" },
      { id: "c", type: "llm", name: "C", prompt: "PC" },
    ],
    edges: [["e", "a"], ["e", "b"], ["a", "c"], ["b", "c"]],
  };
  const outputs = await runPipeline(pipeline, "x", { ask: echoAsk });
  // C a reçu en amont les noms des deux branches A et B
  assert.ok(outputs.c.includes("## A"));
  assert.ok(outputs.c.includes("## B"));
});

test("isolation d'erreur : un agent qui plante n'arrête pas le pipeline", async () => {
  const flakyAsk = async (prompt) => {
    if (prompt.startsWith("BOOM")) throw new Error("kaboom");
    return "ok";
  };
  const pipeline = {
    name: "err",
    nodes: [
      { id: "e", type: "entree", name: "In" },
      { id: "bad", type: "llm", name: "Bad", prompt: "BOOM" },
      { id: "good", type: "llm", name: "Good", prompt: "fine" },
    ],
    edges: [["e", "bad"], ["e", "good"]],
  };
  const events = [];
  const outputs = await runPipeline(pipeline, "x", { ask: flakyAsk, onEvent: (e) => events.push(e) });
  assert.ok(events.some((e) => e.type === "node_error" && e.id === "bad"));
  assert.ok(events.some((e) => e.type === "pipeline_done"));
  assert.equal(outputs.good, "ok");
  assert.ok(outputs.bad.includes("a échoué"));
});
```

- [ ] **Step 2 : Lancer, vérifier**

Run : `cd vscode-agentlab && node --test`
Expected : PASS (5 tests). Si un test échoue, corriger `engine.js` (le code de Task 3 doit déjà satisfaire ces cas).

- [ ] **Step 3 : Commit**

```bash
git add vscode-agentlab/test/engine.test.js
git commit -m "test(engine): fan-out/convergence + isolation d'erreur"
```

---

## Task 5 : Moteur — HITL round-trip asynchrone (TDD)

**Files :**
- Modify: `vscode-agentlab/test/engine.test.js`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `vscode-agentlab/test/engine.test.js` :
```js
test("HITL : le moteur attend askHuman puis injecte les réponses", async () => {
  const askForQuestions = async (prompt) =>
    prompt.includes("QGEN") ? '{"questions":["Q1","Q2"]}' : "final";
  const order = [];
  const askHuman = async ({ questions }) => {
    order.push("human");
    assert.deepEqual(questions, ["Q1", "Q2"]);
    return { answers: ["A1", "A2"] };
  };
  const pipeline = {
    name: "hitl",
    nodes: [
      { id: "e", type: "entree", name: "In" },
      { id: "q", type: "llm", name: "Gen", prompt: "QGEN" },
      { id: "h", type: "hitl", name: "Cadrage" },
      { id: "s", type: "sortie", name: "Out" },
    ],
    edges: [["e", "q"], ["q", "h"], ["h", "s"]],
  };
  const written = [];
  const outputs = await runPipeline(pipeline, "x", {
    ask: askForQuestions,
    askHuman,
    writeOutput: async (f, c) => { order.push("write"); written.push(c); },
  });
  assert.ok(outputs.h.includes("R : A1"));
  assert.ok(outputs.h.includes("R : A2"));
  // askHuman a été awaité AVANT l'écriture de la sortie
  assert.deepEqual(order, ["human", "write"]);
  assert.ok(written[0].includes("R : A1"));
});
```

- [ ] **Step 2 : Lancer, vérifier**

Run : `cd vscode-agentlab && node --test`
Expected : PASS (6 tests). Le code de Task 3 (`runHitl`) doit satisfaire ce test.

- [ ] **Step 3 : Commit**

```bash
git add vscode-agentlab/test/engine.test.js
git commit -m "test(engine): round-trip HITL asynchrone"
```

---

## Task 6 : Hôte — `package.json` (barre d'activité + vue webview)

**Files :**
- Modify: `vscode-agentlab/package.json`
- Create: `vscode-agentlab/media/icon.svg`

- [ ] **Step 1 : Créer l'icône de la barre d'activité**

`vscode-agentlab/media/icon.svg` (monochrome, `currentColor` — VS Code la teinte selon le thème) :
```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3"  y="4"  width="7" height="5" rx="1.3" stroke="currentColor" stroke-width="1.4"/>
  <rect x="14" y="10" width="7" height="5" rx="1.3" stroke="currentColor" stroke-width="1.4"/>
  <rect x="3"  y="15" width="7" height="5" rx="1.3" stroke="currentColor" stroke-width="1.4"/>
  <path d="M10 6.5h2.2a1.8 1.8 0 0 1 1.8 1.8v2.2M10 17.5h2.2a1.8 1.8 0 0 0 1.8-1.8v-2.2" stroke="currentColor" stroke-width="1.4"/>
</svg>
```

- [ ] **Step 2 : Remplacer `package.json`**

Contenu complet de `vscode-agentlab/package.json` :
```json
{
  "name": "agentlab",
  "displayName": "AgentLab — orchestrateur d'agents",
  "description": "Atelier visuel de pipelines d'agents LLM, exécutés via votre abonnement Claude Code (claude -p).",
  "version": "0.2.0",
  "publisher": "local",
  "engines": { "vscode": "^1.75.0" },
  "categories": ["Other", "AI"],
  "main": "./extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        { "id": "agentlab", "title": "AgentLab", "icon": "media/icon.svg" }
      ]
    },
    "views": {
      "agentlab": [
        { "type": "webview", "id": "agentlab.view", "name": "Atelier" }
      ]
    },
    "commands": [
      { "command": "agentlab.focus", "title": "AgentLab : ouvrir l'atelier", "category": "AgentLab" },
      { "command": "agentlab.importPipeline", "title": "AgentLab : importer un pipeline (JSON)", "category": "AgentLab" }
    ]
  },
  "scripts": {
    "test": "node --test",
    "package": "vsce package"
  },
  "devDependencies": {
    "@vscode/vsce": "^3.2.0"
  }
}
```

- [ ] **Step 3 : Vérifier que la vue apparaît (manuel)**

Lancer VS Code en mode dev : ouvrir `vscode-agentlab/` dans VS Code, `F5` (config « Lancer AgentLab » existante).
Expected : une icône **AgentLab** apparaît dans la barre d'activité gauche ; cliquer ouvre une vue « Atelier » (vide/erreur pour l'instant, normal — l'hôte est réécrit au Task 7).

- [ ] **Step 4 : Commit**

```bash
git add vscode-agentlab/package.json vscode-agentlab/media/icon.svg
git commit -m "feat(ext): conteneur barre d'activité + vue webview"
```

---

## Task 7 : Hôte — `extension.js` (provider, run in-process, HITL, bibliothèque, préflight)

**Files :**
- Rewrite: `vscode-agentlab/extension.js`
- Delete: `vscode-agentlab/orch.py`

- [ ] **Step 1 : Supprimer l'ancien moteur Python bundlé**

Run :
```bash
git rm vscode-agentlab/orch.py
```

- [ ] **Step 2 : Réécrire `extension.js`**

Contenu complet de `vscode-agentlab/extension.js` :
```js
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

// ---- préflight : `claude` est-il dans le PATH ? (cross-OS, sans subprocess) ----
function hasClaude() {
  const exts = process.platform === "win32" ? ["claude.exe", "claude.cmd", "claude.bat", "claude"] : ["claude"];
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    if (!dir) continue;
    for (const e of exts) {
      try { fs.accessSync(path.join(dir, e), fs.constants.X_OK); return true; } catch { /* pas ici */ }
    }
  }
  return false;
}

function wsDir(context) {
  const f = vscode.workspace.workspaceFolders;
  return f && f[0] ? f[0].uri.fsPath : context.globalStorageUri.fsPath;
}

// ---- provider de la vue webview ----
class AgentLabViewProvider {
  constructor(context) { this.context = context; this.view = null; this.hitl = new Map(); }

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
    } else if (m.type === "hitl_answer") {
      const resolve = this.hitl.get(m.id);
      if (resolve) { this.hitl.delete(m.id); resolve(m.payload || {}); }
    }
  }

  async run(pipeline, entree) {
    const askHuman = (payload) =>
      new Promise((resolve) => { this.hitl.set(payload.id, resolve); this.post("hitl_ask", payload); });
    const writeOutput = async (filename, content) =>
      fs.promises.writeFile(path.join(wsDir(this.context), filename), content, "utf8");
    const onEvent = (ev) => this.post("event", { event: ev });
    try {
      await engine.runPipeline(pipeline, entree, { onEvent, askHuman, writeOutput });
    } catch (e) {
      this.post("event", { event: { type: "fatal", error: e.message } });
    } finally {
      this.hitl.clear();
      this.post("event", { event: { type: "closed" } });
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
```

- [ ] **Step 3 : Vérifier le chargement (manuel)**

`F5` → ouvrir la vue AgentLab.
Expected : l'atelier se charge, la palette affiche les 4 agents par défaut (bibliothèque globalStorage seedée), le pipeline exemple s'affiche. (Le rendu visuel sera raffiné aux Tasks 8-12 ; à ce stade on valide juste que provider + engine + bibliothèque se câblent sans erreur — vérifier la console webview via « Developer: Open Webview Developer Tools ».)

- [ ] **Step 4 : Commit**

```bash
git add -A
git commit -m "feat(ext): WebviewViewProvider, run in-process, HITL, bibliothèque globalStorage, préflight claude"
```

---

## Task 8 : Webview — thème natif VS Code (`--vscode-*`)

**Files :**
- Modify: `vscode-agentlab/media/editor.html`

> Objectif (quick win #1 de la direction front-end) : l'extension emprunte les couleurs du thème de l'utilisateur (clair / sombre / contraste élevé) au lieu d'imposer les siennes.

- [ ] **Step 1 : Remplacer le bloc `:root` + les deux blocs sombres**

Dans `media/editor.html`, remplacer **tout le bloc** des lignes `:root{…}`, `@media (prefers-color-scheme:dark){…}` et `body.vscode-dark{…}` (repérables entre `<style>` et `*{box-sizing:border-box}`) par :
```css
  :root{
    --ground: var(--vscode-editor-background);
    --dot: color-mix(in srgb, var(--vscode-foreground) 8%, transparent);
    --card: var(--vscode-editorWidget-background, var(--vscode-editor-background));
    --card-2: var(--vscode-input-background, var(--vscode-editor-background));
    --panel-bg: var(--vscode-sideBar-background, var(--vscode-editor-background));
    --ink: var(--vscode-foreground);
    --muted: var(--vscode-descriptionForeground, var(--vscode-foreground));
    --hair: var(--vscode-widget-border, var(--vscode-panel-border, rgba(128,128,128,.25)));
    --line: var(--vscode-panel-border, var(--vscode-widget-border, rgba(128,128,128,.35)));
    --ring: var(--vscode-focusBorder);
    /* types de cube — sémantiques, s'adaptent au thème */
    --entree: var(--vscode-charts-green, #3cc487);
    --llm: var(--vscode-charts-purple, #957dff);
    --human: var(--vscode-charts-orange, #efb04a);
    --sortie: var(--vscode-charts-blue, #5b9dff);
    --io: var(--vscode-charts-green, #3cc487);
    --web: var(--vscode-charts-blue, #5b9dff);
    --run: var(--vscode-progressBar-background, var(--vscode-charts-purple, #957dff));
    --ok: var(--vscode-charts-green, #3cc487);
    --err: var(--vscode-errorForeground, #e06060);
    --mono: var(--vscode-editor-font-family, ui-monospace, Menlo, Consolas, monospace);
    --sans: var(--vscode-font-family, system-ui, sans-serif);
    --shadow: 0 1px 2px color-mix(in srgb, black 12%, transparent);
  }
```

- [ ] **Step 2 : Rendre le bouton Lancer natif**

Dans `media/editor.html`, remplacer la règle :
```css
  .run{background:var(--llm)!important;border-color:var(--llm)!important;color:#fff;font-weight:600}
```
par :
```css
  .run{background:var(--vscode-button-background)!important;border-color:var(--vscode-button-background)!important;
    color:var(--vscode-button-foreground)!important;font-weight:600}
  .run:hover{background:var(--vscode-button-hoverBackground)!important}
```

- [ ] **Step 3 : Vérifier en thème clair ET sombre (manuel)**

`F5`, ouvrir la vue. Basculer le thème VS Code (Cmd/Ctrl+K puis Cmd/Ctrl+T → un thème clair, puis un sombre, puis « High Contrast »).
Expected : le fond, le texte, les bordures et l'accent suivent le thème à chaque changement ; aucun texte illisible ; le bouton Lancer a le style bouton du thème.

- [ ] **Step 4 : Commit**

```bash
git add vscode-agentlab/media/editor.html
git commit -m "feat(webview): thème natif via variables --vscode-*"
```

---

## Task 9 : Webview — flux vertical (ports haut/bas) pour la sidebar étroite

**Files :**
- Modify: `vscode-agentlab/media/editor.html`

> Objectif (quick win #2) : le graphe coule de haut en bas → conçu pour l'étroit. Ports **in en haut**, **out en bas**, arêtes en béziers verticaux, auto-layout par couches verticales.

- [ ] **Step 1 : CSS des ports (haut/bas au lieu de gauche/droite)**

Dans `media/editor.html`, remplacer les règles `.port` :
```css
  .port{position:absolute;top:16px;width:12px;height:12px;border-radius:50%;background:var(--card);
    border:2.5px solid var(--nc,var(--line));cursor:crosshair;z-index:2}
  .port.in{left:-6px} .port.out{right:-6px}
  .port:hover{background:var(--nc)}
```
par :
```css
  .port{position:absolute;left:50%;transform:translateX(-50%);width:13px;height:13px;border-radius:50%;
    background:var(--card);border:2.5px solid var(--nc,var(--line));cursor:crosshair;z-index:2}
  .port.in{top:-7px} .port.out{bottom:-7px}
  .port.out{width:15px;height:15px} /* out plus gros : c'est d'ici qu'on tire */
  .port::before{content:"";position:absolute;inset:-8px;border-radius:50%} /* hit-area 24px */
  .port:hover{background:var(--nc);transform:translateX(-50%) scale(1.15)}
```

- [ ] **Step 2 : `anchor()` — position des ports en haut/bas**

Remplacer la fonction `anchor` :
```js
function anchor(id,side){ const el=nodeEls[id]; const n=state.nodes.find(x=>x.id===id);
  if(!el||!n)return{x:0,y:0}; return {x:n.x+(side==="out"?el.offsetWidth:0), y:n.y+22}; }
```
par :
```js
function anchor(id,side){ const el=nodeEls[id]; const n=state.nodes.find(x=>x.id===id);
  if(!el||!n)return{x:0,y:0};
  return {x:n.x+el.offsetWidth/2, y:n.y+(side==="out"?el.offsetHeight:0)}; }
```

- [ ] **Step 3 : `path()` — bézier vertical**

Remplacer la fonction `path` :
```js
function path(a,b){ const k=Math.max(45,Math.abs(b.x-a.x)*0.45);
  return `M ${a.x} ${a.y} C ${a.x+k} ${a.y}, ${b.x-k} ${b.y}, ${b.x} ${b.y}`; }
```
par :
```js
function path(a,b){ const k=Math.max(40,Math.abs(b.y-a.y)*0.5);
  return `M ${a.x} ${a.y} C ${a.x} ${a.y+k}, ${b.x} ${b.y-k}, ${b.x} ${b.y}`; }
```

- [ ] **Step 4 : `autoLayout()` — couches verticales (y = couche, x = rang)**

Dans la fonction `autoLayout`, remplacer la ligne de positionnement :
```js
    n.x=40+L*240; n.y=40+k*150;}); }
```
par :
```js
    n.x=60+k*210; n.y=40+L*150;}); }
```

- [ ] **Step 5 : Mettre à jour la barre d'aide (ports en bas/haut)**

Remplacer le contenu de `.helpbar` :
```html
      <div class="helpbar"><b>glisser</b> brique = déplacer · <b>●→</b> vers une brique = relier ·
        clic = éditer · <b>Suppr</b> = effacer · <b>Espace/molette-clic</b> = déplacer la vue · <b>Ctrl+Z</b> = annuler</div>
```
par :
```html
      <div class="helpbar"><b>glisser</b> = déplacer · <b>point du bas → autre brique</b> = relier ·
        clic = éditer · <b>Suppr</b> = effacer · <b>Espace/molette</b> = pan · <b>Ctrl+Z</b> = annuler</div>
```

- [ ] **Step 6 : Vérifier (manuel)**

`F5`, ouvrir la vue, cliquer « Ranger » (auto-layout).
Expected : le pipeline s'organise **verticalement** (Entrée en haut, Sortie en bas) ; tirer depuis le point du **bas** d'un cube vers un autre crée un lien ; fan-out (un cube → plusieurs) et convergence (plusieurs → un cube) fonctionnent ; les arêtes sont des courbes verticales.

- [ ] **Step 7 : Commit**

```bash
git add vscode-agentlab/media/editor.html
git commit -m "feat(webview): flux vertical (ports haut/bas) pour sidebar étroite"
```

---

## Task 10 : Webview — cubes distincts, motion des états live, a11y

**Files :**
- Modify: `vscode-agentlab/media/editor.html`

> Direction front-end §3/§4/§8 : 4 types distincts sans dépendre de la couleur seule, transitions nommées, pulse/flash/shake sobres, focus + reduced-motion.

- [ ] **Step 1 : Remplacer les règles d'état du nœud + ajouter motion**

Dans `media/editor.html`, remplacer le bloc :
```css
  .node.selected{border-color:var(--nc);box-shadow:0 0 0 3px var(--ring),var(--shadow)}
  .node.running{box-shadow:0 0 0 3px color-mix(in srgb,var(--llm) 45%,transparent),var(--shadow)}
  .node.done{border-color:var(--ok)}
  .node.error{border-color:var(--err)}
```
par :
```css
  .node{transition:transform 120ms ease-out, box-shadow 120ms ease-out, border-color 180ms ease-out}
  .node:hover{transform:translateY(-1px)}
  .node.selected{border-color:var(--nc);box-shadow:0 0 0 2px var(--ring),var(--shadow)}
  .node.running{border-color:var(--run);animation:pulse 1.6s ease-in-out infinite alternate}
  .node.done{border-color:var(--ok);animation:flashdone 420ms ease-out}
  .node.error{border-color:var(--err);animation:shake 200ms ease-out}
  @keyframes pulse{
    from{box-shadow:0 0 0 2px color-mix(in srgb,var(--run) 25%,transparent),var(--shadow)}
    to{box-shadow:0 0 0 3px color-mix(in srgb,var(--run) 70%,transparent),var(--shadow)}}
  @keyframes flashdone{
    0%{box-shadow:0 0 0 3px color-mix(in srgb,var(--ok) 70%,transparent),var(--shadow)}
    100%{box-shadow:0 0 0 0 transparent,var(--shadow)}}
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
  .node .stat .mk{display:inline-block;animation:pop 160ms cubic-bezier(.22,1,.36,1)}
  @keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
```

- [ ] **Step 2 : Distinguer les 4 types (barre d'accent + glyphe + libellé)**

Le libellé texte (`t.label`) et le glyphe (`t.ico`) sont déjà affichés → deux canaux non-couleur OK. Ajouter la **forme de barre d'accent** distincte. Dans `media/editor.html`, remplacer :
```css
  .node{position:absolute;width:176px;background:var(--card);border:1px solid var(--hair);
    border-radius:12px;box-shadow:var(--shadow);padding:9px 11px 10px;cursor:grab;
    user-select:none;display:flex;flex-direction:column;gap:4px;
    border-top:3px solid var(--nc,var(--line))}
```
par :
```css
  .node{position:absolute;width:184px;background:var(--card);border:1px solid var(--hair);
    border-radius:8px;box-shadow:var(--shadow);padding:10px 11px;cursor:grab;
    user-select:none;display:flex;flex-direction:column;gap:4px;outline:none}
  .node::after{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:8px 0 0 8px;
    background:var(--nc,var(--line))}
  .node[data-type=entree]::after{left:0;right:0;bottom:auto;width:auto;height:3px;border-radius:8px 8px 0 0}
  .node[data-type=sortie]::after{top:auto;left:0;right:0;width:auto;height:3px;border-radius:0 0 8px 8px}
  .node[data-type=hitl]::after{background:repeating-linear-gradient(var(--nc) 0 4px,transparent 4px 8px)}
  .node:focus-visible{box-shadow:0 0 0 2px var(--ring),var(--shadow)}
```

- [ ] **Step 3 : Ajouter `data-type`, focus clavier et ARIA sur les nœuds**

Dans la fonction `makeNode`, remplacer :
```js
  const t=TYPES[n.type], el=document.createElement("div");
  el.className="node"; el.dataset.id=n.id;
  el.style.cssText=`left:${n.x}px;top:${n.y}px;--nc:${CV[t.c]}`;
  el.title=n.name+" — "+t.label;
```
par :
```js
  const t=TYPES[n.type], el=document.createElement("div");
  el.className="node"; el.dataset.id=n.id; el.dataset.type=n.type;
  el.tabIndex=0; el.setAttribute("role","button");
  el.style.cssText=`left:${n.x}px;top:${n.y}px;--nc:${CV[t.c]}`;
  const stTxt=nodeState[n.id]?(" — "+nodeState[n.id]):"";
  el.title=n.name+" — "+t.label; el.setAttribute("aria-label",n.name+" — "+t.label+stTxt);
```

- [ ] **Step 4 : Marque de statut animée (coche/croix « pop »)**

Dans `makeNode`, remplacer :
```js
  el.querySelector(".stat").innerHTML = st==="running"?'<span class="sp"></span>'
    : st==="done"?'<span style="color:var(--ok)">✓</span>'
    : st==="error"?'<span style="color:var(--err)">✗</span>':'';
```
par :
```js
  el.querySelector(".stat").innerHTML = st==="running"?'<span class="sp"></span>'
    : st==="done"?'<span class="mk" style="color:var(--ok)">✓</span>'
    : st==="error"?'<span class="mk" style="color:var(--err)">✗</span>':'';
```

- [ ] **Step 5 : Chiffres stables + spinner via `--run` + reduced-motion sémantique**

Remplacer la règle du spinner :
```css
  .node .stat .sp{display:inline-block;width:10px;height:10px;border-radius:50%;
    border:2px solid color-mix(in srgb,var(--llm) 35%,transparent);border-top-color:var(--llm);
    animation:spin .7s linear infinite}
```
par :
```css
  .node .stat .sp{display:inline-block;width:10px;height:10px;border-radius:50%;
    border:2px solid color-mix(in srgb,var(--run) 35%,transparent);border-top-color:var(--run);
    animation:spin .7s linear infinite}
  .node .tm, #runStatus{font-variant-numeric:tabular-nums}
```
Puis remplacer la règle reduced-motion finale :
```css
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
```
par (coupe le décoratif, garde le sémantique) :
```css
  @media (prefers-reduced-motion:reduce){
    .node.running,.node.done,.node.error,.edges path.flow,.node .mk{animation:none!important}
    *{transition-duration:.01ms!important}
    .node.running .sp{animation:none;border-top-color:currentColor}
    .node.running{border-color:var(--run)}
  }
```

- [ ] **Step 6 : Focus visible générique + navigation clavier de base**

Ajouter, juste avant la règle `@media (prefers-reduced-motion:reduce)` :
```css
  :focus-visible{outline:1px solid var(--ring);outline-offset:2px}
```
Puis, dans le handler `keydown` (bloc `addEventListener("keydown",…)`), ajouter — juste après la ligne `if(["INPUT","TEXTAREA"].includes(e.target.tagName))return;` — la gestion des flèches sur le nœud sélectionné :
```js
  if(sel&&sel.kind==="node"&&e.key.startsWith("Arrow")){e.preventDefault();
    const n=state.nodes.find(x=>x.id===sel.id); if(n){snapshot();
      const d=e.shiftKey?40:10;
      if(e.key==="ArrowLeft")n.x-=d; else if(e.key==="ArrowRight")n.x+=d;
      else if(e.key==="ArrowUp")n.y-=d; else if(e.key==="ArrowDown")n.y+=d;
      persist();renderAll();}}
```

- [ ] **Step 7 : Vérifier (manuel)**

`F5`, lancer le pipeline exemple avec une entrée.
Expected : les cubes en cours **pulsent** (couleur progressBar du thème), les finis flashent vert + coche qui « pop », une erreur secoue une fois ; Entrée/Sortie ont une barre d'accent horizontale (haut/bas), Humain une barre pointillée ; Tab met le focus sur un cube (halo visible), les flèches le déplacent ; en activant « Réduire les animations » de l'OS, les états restent lisibles sans animation décorative.

- [ ] **Step 8 : Commit**

```bash
git add vscode-agentlab/media/editor.html
git commit -m "feat(webview): types distincts (a11y) + motion des états + clavier/reduced-motion"
```

---

## Task 11 : Webview — HITL interactif (feuille + focus trap)

**Files :**
- Modify: `vscode-agentlab/media/editor.html`

> Direction front-end §6 : pas de modale plein écran ; une feuille qui glisse du bas, le cube Humain pulse, focus piégé, Ctrl/Cmd+Entrée valide, Échap ne tue pas le run.

- [ ] **Step 1 : CSS de la feuille HITL**

Ajouter dans `<style>` (avant la règle `.toast`) :
```css
  .hitl{position:absolute;left:0;right:0;bottom:0;z-index:10;background:var(--panel-bg);
    border-top:2px solid var(--human);border-radius:12px 12px 0 0;padding:14px 14px 16px;
    max-height:60%;overflow:auto;box-shadow:0 -8px 24px color-mix(in srgb,black 22%,transparent);
    transform:translateY(100%);transition:transform 200ms ease-out}
  .hitl.show{transform:translateY(0)}
  .hitl h2{margin:0 0 4px;font-size:13px;font-weight:650}
  .hitl .sub{font-size:11px;color:var(--muted);margin-bottom:10px;font-variant-numeric:tabular-nums}
  .hitl label{display:block;font-size:11px;color:var(--ink);margin:8px 0 4px}
  .hitl textarea{width:100%;font-family:var(--mono);font-size:12px;color:var(--ink);
    background:var(--card-2);border:1px solid var(--hair);border-radius:6px;padding:7px 9px;
    resize:vertical;min-height:44px}
  .hitl textarea:focus-visible{outline:none;border-color:var(--human);box-shadow:0 0 0 3px color-mix(in srgb,var(--human) 30%,transparent)}
  .hitl .actions{display:flex;gap:8px;margin-top:12px}
  .hitl .go{background:var(--vscode-button-background);color:var(--vscode-button-foreground);
    border:none;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer}
  .hitl .go:hover{background:var(--vscode-button-hoverBackground)}
  .hitl .cancel{background:transparent;border:1px solid var(--hair);color:var(--muted);
    border-radius:6px;padding:7px 11px;font-size:12px;cursor:pointer}
  @media (prefers-reduced-motion:reduce){.hitl{transition:none}}
```

- [ ] **Step 2 : Élément HITL dans le DOM**

Dans `media/editor.html`, remplacer :
```html
<div class="toast" id="toast"></div>
```
par :
```html
<div class="hitl" id="hitl" role="dialog" aria-modal="true" aria-label="Questions de cadrage" hidden></div>
<div class="toast" id="toast"></div>
```

- [ ] **Step 3 : Logique HITL (afficher, focus-trap, répondre)**

Ajouter dans le `<script>`, juste avant le bloc `/* ---------- messages de l'hôte ---------- */` :
```js
/* ---------- HITL interactif ---------- */
let hitlCtx=null;
function showHitl(payload){
  hitlCtx=payload;
  const el=document.getElementById("hitl");
  const qs=Array.isArray(payload.questions)?payload.questions:null;
  const fields = qs
    ? qs.map((q,i)=>`<label for="hq${i}">${esc(q)}</label><textarea id="hq${i}" data-i="${i}" spellcheck="false"></textarea>`).join("")
    : `<label for="hq0">Commentaire libre (optionnel)</label><textarea id="hq0" data-i="0" spellcheck="false"></textarea>`;
  el.innerHTML=`<h2>« ${esc(payload.name||"Humain")} » attend tes réponses</h2>
    <div class="sub">${qs?`${qs.length} question${qs.length>1?"s":""} · Ctrl/Cmd+Entrée pour continuer`:"Ctrl/Cmd+Entrée pour continuer"}</div>
    ${fields}
    <div class="actions"><button class="go" id="hgo">▶ Continuer</button>
      <button class="cancel" id="hcancel">Annuler le run</button></div>`;
  el.hidden=false; requestAnimationFrame(()=>el.classList.add("show"));
  // met en avant le cube concerné
  const node=nodeEls[payload.id]; if(node){node.classList.add("running"); node.scrollIntoView({block:"center",behavior:"smooth"});}
  const first=el.querySelector("textarea"); if(first)first.focus();
  document.getElementById("hgo").onclick=submitHitl;
  document.getElementById("hcancel").onclick=cancelHitl;
}
function collectHitl(){
  const el=document.getElementById("hitl");
  const areas=[...el.querySelectorAll("textarea")].sort((a,b)=>a.dataset.i-b.dataset.i);
  return areas.map(a=>a.value.trim());
}
function closeHitl(){ const el=document.getElementById("hitl");
  el.classList.remove("show"); el.hidden=true; el.innerHTML=""; hitlCtx=null; }
function submitHitl(){
  if(!hitlCtx)return;
  const vals=collectHitl();
  const payload = Array.isArray(hitlCtx.questions) ? {answers:vals} : {comment:vals[0]||""};
  vscode.postMessage({type:"hitl_answer",id:hitlCtx.id,payload});
  closeHitl();
}
function cancelHitl(){
  if(!hitlCtx)return;
  const payload = Array.isArray(hitlCtx.questions)
    ? {answers:hitlCtx.questions.map(()=>"")} : {comment:""};
  vscode.postMessage({type:"hitl_answer",id:hitlCtx.id,payload});
  closeHitl();
}
// focus-trap + raccourcis dans la feuille
addEventListener("keydown",e=>{
  if(!hitlCtx)return;
  if((e.metaKey||e.ctrlKey)&&e.key==="Enter"){e.preventDefault();submitHitl();return;}
  if(e.key==="Tab"){
    const f=[...document.getElementById("hitl").querySelectorAll("textarea,button")];
    if(!f.length)return;
    const first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
},true);
```

- [ ] **Step 4 : Router `hitl_ask` depuis l'hôte**

Dans le bloc `/* ---------- messages de l'hôte ---------- */`, ajouter une branche dans le `addEventListener("message",…)` — juste après `else if(m.type==="event"){onEvent(m.event);}` :
```js
  else if(m.type==="hitl_ask"){showHitl(m);}
```

- [ ] **Step 5 : Mettre à jour la note du cube Humain dans le panneau**

Dans `updatePanel`, remplacer :
```js
    ${n.type==="hitl"?`<div class="pnote">À l'exécution en terminal, si une brique amont produit <code>{"questions":[…]}</code>, elles sont posées au clavier. Dans VS Code (non interactif) elles passent en « non précisé ».</div>`:""}
```
par :
```js
    ${n.type==="hitl"?`<div class="pnote">Au lancement, si une brique amont produit <code>{"questions":[…]}</code>, le run se met en pause et te les pose ici ; sinon il demande un commentaire libre. <kbd>Ctrl/Cmd+Entrée</kbd> pour continuer.</div>`:""}
```

- [ ] **Step 6 : Vérifier de bout en bout (manuel)**

`F5`, charger le pipeline exemple `ideas` (il contient un cube Humain « Cadrage » après un « Questionnaire » qui produit `{"questions":[…]}`), taper une entrée (ex. « une app de covoiturage pour festivals »), Lancer.
Expected : après le Questionnaire, le run **se met en pause**, la feuille HITL glisse depuis le bas avec les questions générées, le cube « Cadrage » pulse ; répondre, Ctrl/Cmd+Entrée → le run **reprend** et le `.md` final contient les réponses. Échap ne coupe pas le run ; « Annuler le run » envoie des réponses vides et laisse le pipeline se terminer.

- [ ] **Step 7 : Commit**

```bash
git add vscode-agentlab/media/editor.html
git commit -m "feat(webview): HITL interactif (feuille + focus-trap + raccourcis)"
```

---

## Task 12 : Webview — état vide, bandeau « claude absent », suppression de `confirm()`

**Files :**
- Modify: `vscode-agentlab/media/editor.html`

> Direction front-end §7. Aussi : `window.confirm()` n'est pas supporté dans les webviews VS Code → le remplacer.

- [ ] **Step 1 : CSS bandeau + accueil**

Ajouter dans `<style>` (avant `.toast`) :
```css
  .banner{position:absolute;left:10px;right:10px;top:10px;z-index:5;display:flex;gap:8px;align-items:flex-start;
    background:color-mix(in srgb,var(--err) 8%,transparent);border:1px solid var(--err);color:var(--ink);
    border-radius:8px;padding:8px 10px;font-size:11.5px;line-height:1.4}
  .banner code{font-family:var(--mono)}
  .welcome{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:230px;text-align:center;
    color:var(--muted);font-size:12px;line-height:1.5;text-wrap:balance;
    border:1px dashed var(--line);border-radius:10px;padding:18px 16px}
  .welcome button{margin-top:10px;background:var(--vscode-button-background);color:var(--vscode-button-foreground);
    border:none;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer}
```

- [ ] **Step 2 : Éléments dans le stage**

Dans `media/editor.html`, remplacer :
```html
    <div class="stage" id="stage">
      <div class="viewport" id="viewport"><svg class="edges" id="edges"></svg></div>
```
par :
```html
    <div class="stage" id="stage">
      <div class="banner" id="banner" hidden>⚠︎&nbsp;<span><code>claude</code> introuvable dans le PATH — l'édition marche, le <b>lancement est désactivé</b>. Installe Claude Code puis rouvre la vue.</span></div>
      <div class="welcome" id="welcome" hidden>Ton canvas est vide.<br>Ajoute une brique depuis la palette, ou charge l'exemple.<br><button id="wload">Charger l'exemple</button></div>
      <div class="viewport" id="viewport"><svg class="edges" id="edges"></svg></div>
```

- [ ] **Step 3 : Logique accueil + bandeau + désactivation du run**

Ajouter dans le `<script>`, juste avant `buildPalette(); renderAll(); fit();` (dernières lignes) :
```js
/* ---------- accueil / préflight ---------- */
let claudeMissing=false;
function updateWelcome(){
  const w=document.getElementById("welcome"); if(w) w.hidden = state.nodes.length>0;
}
document.getElementById("wload").onclick=()=>{ snapshot(); state=structuredClone(EXEMPLE);
  nodeState={};timing={};outputs={};sel=null; persist(); renderAll(); fit(); };
```
Puis, dans `renderAll`, ajouter à la fin (après `renderEdges(); updatePanel();`) l'appel :
```js
  updateWelcome();
```
Puis, dans le `addEventListener("message",…)`, ajouter une branche :
```js
  else if(m.type==="noclaude"){claudeMissing=true;const b=document.getElementById("banner");if(b)b.hidden=false;
    const r=document.getElementById("bRun");if(r){r.disabled=true;r.title="`claude` introuvable dans le PATH";}}
```
Puis, au début du handler `document.getElementById("bRun").onclick=()=>{ … }`, ajouter après `if(running)return;` :
```js
  if(claudeMissing){toast("`claude` introuvable dans le PATH");return;}
```

- [ ] **Step 4 : Remplacer `confirm()` (non supporté en webview) dans `loadPipeline`**

Remplacer la fonction `loadPipeline` :
```js
function loadPipeline(data){
  if(!data||!Array.isArray(data.nodes))return toast("Pipeline invalide");
  if(!confirm(`Charger « ${data.name||"pipeline"} » ? Le canvas actuel sera remplacé.`))return;
  snapshot(); state=structuredClone(data); nodeState={};timing={};outputs={};sel=null; persist(); renderAll(); fit();
}
```
par (snapshot pris → Ctrl+Z restaure, donc plus besoin de `confirm`) :
```js
function loadPipeline(data){
  if(!data||!Array.isArray(data.nodes))return toast("Pipeline invalide");
  snapshot(); state=structuredClone(data); nodeState={};timing={};outputs={};sel=null; persist(); renderAll(); fit();
  toast(`Chargé : ${data.name||"pipeline"} · Ctrl+Z pour revenir`);
}
```

- [ ] **Step 5 : Vérifier (manuel)**

(a) Vider le canvas (supprimer tous les cubes) → l'accueil apparaît ; « Charger l'exemple » le remplit.
(b) Pour tester le bandeau sans désinstaller `claude` : temporairement forcer `this.post("noclaude", {})` inconditionnellement dans `onMessage`/`ready` de `extension.js`, `F5`, vérifier le bandeau + bouton Lancer désactivé, puis **rétablir** la condition `if (!hasClaude())`.
(c) Charger un pipeline depuis la palette → plus de dialogue bloquant, toast affiché, Ctrl+Z restaure.

- [ ] **Step 6 : Commit**

```bash
git add vscode-agentlab/media/editor.html
git commit -m "feat(webview): accueil, bandeau claude-absent, remplacement de confirm()"
```

---

## Task 13 : Packaging `.vsix` + README

**Files :**
- Create: `vscode-agentlab/.vscodeignore`
- Create: `vscode-agentlab/README.md`

- [ ] **Step 1 : `.vscodeignore` (exclure du paquet)**

`vscode-agentlab/.vscodeignore` :
```
.vscode/**
test/**
**/*.test.js
.playwright-mcp/**
agentlab-*.png
**/.DS_Store
.gitignore
```

- [ ] **Step 2 : README utilisateur**

`vscode-agentlab/README.md` :
```markdown
# AgentLab — orchestrateur visuel d'agents Claude

Un atelier de pipelines d'agents LLM, dans la barre latérale de VS Code. Pose des
cubes (Entrée · Agent LLM · Humain · Sortie), relie-les, lance — les cubes
s'allument en direct — et récupère un rapport `.md`.

## Prérequis
- **Claude Code CLI** (`claude`) installé et dans le PATH. AgentLab exécute les
  agents via `claude -p`, sur ton abonnement (aucune clé API). Multi-OS.

## Utilisation
1. Ouvre l'icône **AgentLab** dans la barre d'activité.
2. Ajoute des briques depuis la palette, relie le point du bas d'un cube vers un autre.
3. Écris une entrée en haut, clique **▶ Lancer**.
4. Un cube **Humain** met le run en pause pour te poser des questions de cadrage.
5. Le cube **Sortie** écrit un `.md` à la racine du dossier ouvert.

Ta bibliothèque d'agents et de pipelines est stockée globalement (disponible sur
tous tes projets). Importe un pipeline via la commande *AgentLab : importer un pipeline*.
```

- [ ] **Step 3 : Installer l'outil de packaging et lancer les tests**

Run (depuis `vscode-agentlab/`) :
```bash
cd vscode-agentlab && npm install && node --test
```
Expected : `@vscode/vsce` installé (devDep) ; les 6 tests moteur PASS.

- [ ] **Step 4 : Construire le `.vsix`**

Run (depuis `vscode-agentlab/`) :
```bash
cd vscode-agentlab && npx vsce package --allow-missing-repository --skip-license
```
Expected : un fichier `agentlab-0.2.0.vsix` est créé. (Si `vsce` réclame un champ manquant, le corriger dans `package.json` et relancer — ne pas ajouter de dépendance runtime.)

- [ ] **Step 5 : Installer le `.vsix` dans VS Code et fumée finale**

Run :
```bash
code --install-extension vscode-agentlab/agentlab-0.2.0.vsix
```
Puis, dans une **nouvelle** fenêtre VS Code (pas l'Extension Development Host) ouverte sur un dossier quelconque : ouvrir l'icône AgentLab, charger l'exemple, taper une entrée, Lancer.
Expected : l'extension installée fonctionne hors mode dev — cubes qui s'allument, HITL, `.md` écrit dans le dossier. C'est la preuve « publiable / multi-OS ».

- [ ] **Step 6 : Commit**

```bash
git add vscode-agentlab/.vscodeignore vscode-agentlab/README.md vscode-agentlab/package.json vscode-agentlab/package-lock.json
git commit -m "chore: packaging .vsix + README"
```

---

## Task 14 : Vérification end-to-end + notes

- [ ] **Step 1 : Relancer toute la suite de tests**

Run : `cd vscode-agentlab && node --test`
Expected : 6 tests PASS (buildClaudeArgs ×2, linéaire, fan-out/convergence, isolation d'erreur, HITL).

- [ ] **Step 2 : Checklist manuelle finale**

Vérifier, dans la fenêtre avec l'extension installée :
- [ ] Icône AgentLab dans la barre d'activité ; vue « Atelier » s'ouvre.
- [ ] Thème : basculer clair/sombre/contraste élevé → UI cohérente.
- [ ] Ajouter/déplacer/relier/supprimer des cubes ; fan-out + convergence ; auto-layout vertical.
- [ ] Run live : pulse/flash/coche/erreur ; compteur `x/N` sans saut de chiffres.
- [ ] HITL : pause, feuille, réponses, reprise ; `.md` contient les réponses.
- [ ] Sortie `.md` écrite à la racine du workspace.
- [ ] Sans `claude` dans le PATH : bandeau + Lancer désactivé, édition possible.
- [ ] `prefers-reduced-motion` : états lisibles sans animation décorative.

- [ ] **Step 3 : Commit de clôture (si des ajustements ont été faits)**

```bash
git add -A && git commit -m "chore: vérification end-to-end v0.2.0" || echo "rien à committer"
```

---

## Self-review (fait par l'auteur du plan)

**Couverture du spec :**
- Moteur porté en Node, multi-OS, dép unique `claude` → Tasks 2-5, 7, 13.
- Barre d'activité + vue webview → Tasks 6-7.
- Cubes/flèches/fan-out/convergence en sidebar étroite (flux vertical) → Task 9.
- Run live + états → Task 10.
- HITL interactif (pause/reprise) → Tasks 5 (moteur) + 11 (webview) + 7 (round-trip hôte).
- Bibliothèque portable globalStorage + agents par défaut + import → Task 7.
- Sortie `.md` dans le workspace → Task 7 (`writeOutput`).
- Préflight `claude` → Tasks 7 + 12.
- Thème natif → Task 8. A11y → Task 10. États vides/bandeau → Task 12. Packaging → Task 13.

**Cohérence des types (vérifiée) :** signatures `runPipeline(pipeline, entree, {onEvent, ask, askHuman, writeOutput})`, `askHuman({id,name,questions})→{answers?|comment?}`, messages `hitl_ask`/`hitl_answer{id,payload}`, événements `pipeline_start|node_running|node_done|node_error|pipeline_done|fatal|closed` — identiques entre `engine.js`, `extension.js` et `editor.html`.

**Placeholders :** aucun — chaque étape code montre le code complet ou l'édition exacte (ancien bloc → nouveau bloc).

**Risque résiduel connu :** les Tasks 8-12 sont des éditions de `editor.html` par remplacement de blocs ; si un bloc source a été modifié par une tâche précédente, se référer au contenu courant du fichier (les blocs ciblés sont disjoints entre tasks, pas de collision attendue).
```
