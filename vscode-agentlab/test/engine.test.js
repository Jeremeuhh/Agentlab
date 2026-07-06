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
