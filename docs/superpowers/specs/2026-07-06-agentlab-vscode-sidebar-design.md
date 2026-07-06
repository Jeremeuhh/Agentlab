# AgentLab — extension VS Code (atelier de pipelines en barre latérale)

**Date :** 2026-07-06
**Statut :** design validé en brainstorming, en attente de relecture avant plan d'implémentation.

## Vision

AgentLab est une **extension VS Code publiable** : un atelier visuel de pipelines
d'agents Claude, vivant **entièrement dans la barre d'activité de gauche**.
L'utilisateur pose des cubes (Entrée · Agent LLM · Humain · Sortie), les relie par
des flèches (fan-out 1→N, convergence N→1), édite leur prompt, lance le pipeline —
les cubes s'allument en direct — et récupère une sortie `.md`.

**Positionnement :** une couche de pipelines visuels *par-dessus Claude Code*.
Backend = `claude -p` (l'abonnement de l'utilisateur, **zéro clé API**).

**Contrainte forte :** l'extension doit se lancer **directement sur tout OS**
(macOS / Linux / Windows). → moteur en Node, **seule dépendance runtime = le CLI
Claude Code** (`claude` dans le PATH). Plus de `python3`.

## Objectifs (v1) et non-objectifs

**Dans la v1 :**
- Éditeur de nœuds dans un `WebviewView` de la barre latérale (cubes + flèches).
- 4 types de cubes : `entree`, `llm` (option WebSearch), `hitl`, `sortie`.
- Fan-out et convergence (un nœud peut avoir plusieurs prédécesseurs/successeurs).
- Exécution live : les cubes changent d'état au fil de l'eau (running / done / error).
- **HITL interactif** : le run se met en pause sur un cube Humain, la sidebar
  affiche les questions, l'utilisateur répond, le run reprend.
- Bibliothèque d'agents + pipelines **portable** (globalStorage) + import/export JSON.
- 4 agents fournis par défaut (Questionneur, Chercheur web, Synthétiseur, Critique).
- Sortie `.md` écrite dans le workspace courant.
- Détection de `claude` au démarrage, message clair si absent.
- Empaquetage `.vsix`.

**Hors v1 (plus tard) :** backend clé API / autres modèles, mini-map, thèmes,
publication réelle sur le Marketplace, versioning des runs, collaboration.

## Architecture — 3 unités à frontières nettes

### 1. Webview sidebar (« le sketch ») — `media/editor.html` (réutilisé)
HTML/JS autonome, sans dépendance externe (CSP stricte, nonce, pas de CDN).
- Rôle : dessiner le canvas de cubes + flèches, drag/déplacement, reliage,
  édition de prompt d'un cube, rendu de l'état live, formulaire HITL.
- **Ne connaît rien de Claude.** Communique uniquement avec l'hôte par messages.
- **Adaptation étroit :** flux vertical par défaut (Entrée en haut → Sortie en bas),
  pan/zoom, cubes compacts. La sidebar VS Code est redimensionnable par l'utilisateur.
- Base : on **réutilise l'`editor.html` existant** (il fait déjà cubes/flèches/
  fan-out/converge, cf. capture `agentlab-02-dark.png`) ; on le re-héberge dans un
  `WebviewView` au lieu d'un `WebviewPanel`, on adapte le CSS pour la largeur étroite.

### 2. Hôte extension (Node) — `extension.js` + `engine.js`
- `engine.js` : **portage en JS de `orch.py`**. Même sémantique :
  tri par niveaux topologiques, nœuds `llm` d'un même niveau lancés **en parallèle**,
  un agent qui échoue n'interrompt pas le reste (sa sortie devient un message d'erreur).
- `extension.js` : enregistre le `WebviewViewProvider`, charge/sauve la bibliothèque,
  écrit les fichiers `.md`, relaie les événements du moteur vers le webview.
- Le moteur tourne **en process** (plus de `spawn python3 orch.py`). Il ne spawn
  que `claude -p`, une fois par nœud `llm`.

### 3. Backend LLM — `ask()` dans `engine.js`
- Spawn `claude -p --model <modèle> --output-format json --strict-mcp-config`,
  `--allowedTools WebSearch` si le cube a `web: true`. Écrit le prompt sur stdin,
  parse le JSON de sortie, renvoie `result` (ou lève sur `is_error`).
- **Seule couture avec le backend.** Un backend clé API se brancherait ici sans
  toucher au reste.

### Flux d'exécution
```
sidebar --{run, pipeline, entree}--> hôte
hôte : pour chaque niveau topo, spawn `claude -p` en parallèle sur les cubes llm
claude -p --(JSON)--> hôte --{node_running|node_done|node_error}--> sidebar
   (le cube s'allume / s'éteint / vire au rouge)
cube hitl : hôte --{hitl_ask, questions}--> sidebar (pause)
            sidebar --{hitl_answer, réponses}--> hôte (reprise)
fin : hôte écrit le .md, --{pipeline_done}--> sidebar
```

## Contrats de données (repris de l'existant)

**Pipeline :** `{ nodes: [{id, type, name, prompt?, web?}], edges: [[from, to], …] }`
**Types de nœud :** `entree` · `llm` · `hitl` · `sortie`
**Événements moteur → webview :**
`pipeline_start{nodes}` · `node_running{id,name,kind}` · `node_done{id,name,output}`
· `node_error{id,name,error}` · `pipeline_done` · `fatal{error}`

**HITL interactif (nouveau) :** le moteur reçoit un `reader(questions) → Promise<réponses>`.
Dans l'hôte, ce reader poste `{type:'hitl_ask', id, name, questions}` au webview et
renvoie une Promise résolue à la réception de `{type:'hitl_answer', id, answers}`.
Détection des questions inchangée : une sortie amont contenant un JSON
`{"questions":[…]}` déclenche le mode questionnaire ; sinon commentaire libre.

## Stockage & packaging

- **Bibliothèque** (agents + pipelines) dans le `globalStorageUri` de l'extension →
  disponible sur tous les workspaces. Import/export JSON pour partage. Les 4 agents
  par défaut sont créés à la première ouverture s'ils n'existent pas.
- **Sorties `.md`** écrites à la racine du workspace courant.
- **`contributes`** dans `package.json` : `viewsContainers.activitybar` (icône +
  conteneur « AgentLab ») + `views` (la vue webview). Commande d'ouverture conservée.
- **Empaquetage** via `vsce package` → `.vsix`. Aucune dépendance npm de production
  lourde ; le webview est du HTML/JS inline.
- **Préflight** : au démarrage, vérifier `claude` dans le PATH (via `spawn` test ou
  `which`/`where`). Absent → bandeau explicite dans la vue, pas de crash.

## Tests (minimal, sans framework)

- `engine.test.js` (node, assert) : pipeline factice avec `ask()` stubbé.
  Vérifie : ordre des événements, exécution parallèle d'un niveau, fan-out +
  convergence (un cube à prédécesseurs multiples reçoit bien toutes les sorties
  amont), isolation d'erreur (un cube en échec n'arrête pas les autres), et le
  round-trip HITL (le moteur attend bien la réponse du reader avant de continuer).
- Vérification manuelle end-to-end : F5 (Extension Development Host), ouvrir la vue,
  charger le pipeline `ideas`, lancer, observer les cubes s'allumer et le `.md` sortir.

## Risques / points ouverts

- **Largeur sidebar** : un graphe dense reste à l'étroit ; mitigé par
  redimensionnement + pan/zoom + flux vertical. À réévaluer après le premier essai réel.
- **Portage du moteur** : risque d'écart de comportement Python→Node ; couvert par
  `engine.test.js` qui rejoue les cas clés.
- **HITL** : la pause/reprise doit survivre à la fermeture/réouverture de la vue
  (retainContextWhenHidden) — à vérifier.
- **Git** : le projet n'est pas encore sous contrôle de version ; à initialiser avant
  d'attaquer l'implémentation (recommandé pour une extension destinée à publication).

## Devenir des outils Python

`orch.py`, `agentlab.py` (serveur web), `ideas.py` (CLI) restent comme **outils
perso archivés**, hors du produit publié. Non supprimés ; simplement plus la cible.
```
