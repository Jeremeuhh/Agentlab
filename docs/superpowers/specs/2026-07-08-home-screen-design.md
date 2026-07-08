# Écran d'accueil AgentLab — design

**Date** : 2026-07-08 · **Portée** : `media/editor.html` + `extension.js`.

## But

À l'ouverture de l'extension, atterrir sur un **écran d'accueil** listant les pipelines
sauvegardés, avec : ouvrir, lancer, exporter, supprimer, et importer un `.json`.
Aujourd'hui l'extension tombe directement dans un pipeline (dernier état ou exemple) ;
la bibliothèque existe mais n'est accessible que via un menu déroulant.

## Existant réutilisé (aucun changement de stockage)

- Bibliothèque JSON portable en `globalStorage/pipelines/` (`loadPipelines`, `savePipeline`).
- Export via dialogue natif (`exportPipeline`).
- Import via commande `agentlab.importPipeline` (dialogue natif + validation + ajout biblio).

## Modèle

- Nouvelle variable front `view: "home" | "editor"` (hors `state`, non persistée → l'arrivée = accueil).
- `render()` aiguille : `view==="home"` → `renderHome()`, sinon rendu éditeur actuel.
- Bascule de visibilité par `document.body.dataset.view` + CSS (masque chrome éditeur en home, et `#home` en editor).

## Accueil (`#home`)

- En-tête : titre `AgentLab` + **＋ Nouveau** + **⬆ Importer**. Bouton **Reprendre l'édition**
  affiché seulement si un pipeline de travail existe (évite de perdre un travail non sauvé).
- Une carte par pipeline : nom · nb d'étapes · rangée d'icônes de types. Actions :
  - **corps de carte** → Ouvrir (charge + `view="editor"`)
  - **▶** → Lancer (ouvre + focus sur le champ sujet, prêt à `Run`)
  - **⋯** → menu Exporter / Supprimer (réutilise `openMenu`)
- Vide : « Aucun pipeline enregistré » + **Charger l'exemple** + **Importer**.
- Suppression : confirmation **2 clics** (pas de `confirm()` en webview) → message `deletePipeline`.

## Éditeur

- Bouton **⌂** ajouté au header → `view="home"`. Le reste inchangé.

## Back (`extension.js`)

- Message `deletePipeline {file}` : supprime le fichier de `pipelines/`, re-poste `pipelines`.
- Message `importPipeline` : même logique que la commande (factorisée), re-poste `pipelines` + toast.
- Validation d'import assouplie : accepter `{steps}` **ou** `{nodes}` (les deux formats).

## Format mémoire

JSON, format déjà en place : `{name, nodes, edges, steps}`. Import tolère `steps`-seul ou `nodes`-seul.

## Écarté (YAGNI)

Glisser-déposer de fichier dans le webview (dialogue natif suffit), dossiers/tags/recherche,
duplication de pipeline.

## Test

- `webview.test.js` : le script compile toujours ; ajout d'un test « `renderHome` existe et
  `view` par défaut = home ».
- Vérif visuelle via harnais preview + Playwright (accueil peuplé + vide).
