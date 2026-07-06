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
