"use strict";
// Garde-fou du webview : editor.html n'est jamais exécuté par les tests moteur,
// donc une faute de frappe (template literal cassé, quote non fermée) passerait
// inaperçue jusqu'au runtime dans VSCode. On extrait le <script> et on le COMPILE
// (vm.Script compile sans exécuter → attrape toute erreur de syntaxe).
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "media", "editor.html"), "utf8");

test("le <script> du webview compile sans erreur de syntaxe", () => {
  const m = html.match(/<script nonce="__NONCE__">([\s\S]*?)<\/script>/);
  assert.ok(m, "bloc <script nonce> introuvable dans editor.html");
  assert.doesNotThrow(() => new vm.Script(m[1]), "syntaxe JS invalide dans le webview");
});

test("un élément en display:flex garde un guard [hidden] (sinon [hidden] est écrasé)", () => {
  // .banner{display:flex} écrasait l'attribut [hidden] → bandeau toujours visible.
  // Si on met display:flex sur .banner, il FAUT .banner[hidden]{display:none}.
  if (/\.banner\{display:flex/.test(html))
    assert.match(html, /\.banner\[hidden\]\{display:none\}/, "guard .banner[hidden] manquant");
});

test("l'écran d'accueil existe : renderHome + vue home par défaut", () => {
  assert.match(html, /function renderHome\(/, "renderHome manquant");
  assert.match(html, /view\s*=\s*"home"/, "vue « home » par défaut manquante");
});

test("chaque icône référencée par ic('…') existe dans ICONS", () => {
  const names = new Set();
  for (const [, n] of html.matchAll(/ic\(['"]([a-z_]+)['"]\)/g)) names.add(n);
  const defined = new Set([...html.matchAll(/^\s*([a-z_]+):"/gm)].map((x) => x[1]));
  assert.ok(names.size > 0, "aucun appel ic('…') trouvé — la conversion a-t-elle disparu ?");
  for (const n of names) assert.ok(defined.has(n), `icône « ${n} » utilisée mais absente de ICONS`);
});
