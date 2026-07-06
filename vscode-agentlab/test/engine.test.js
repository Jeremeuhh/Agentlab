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
