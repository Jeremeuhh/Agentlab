# AgentLab — orchestrateur visuel d'agents Claude

Un atelier de pipelines d'agents LLM, dans la barre latérale de VS Code. Empile des
étapes (Entrée · Agent LLM · Groupe // · Humain · Sortie) dans une liste verticale —
l'ordre de haut en bas **est** l'ordre d'exécution — lance, regarde les étapes
s'allumer en direct, et récupère un rapport `.md`.

## Prérequis
- **Claude Code CLI** (`claude`) installé et dans le PATH. AgentLab exécute les
  agents via `claude -p`, sur ton abonnement (aucune clé API). Multi-OS.
  Sans lui, l'édition marche mais **le lancement est désactivé** (un bandeau le signale).

## Prise en main
1. Ouvre l'icône **AgentLab** dans la barre d'activité.
2. Écris le sujet du run dans la **barre du haut** (💡 `Sujet / question du run…`).
3. Clique **▶ Run**. Les cartes s'allument (⏳ → ✓/✗) avec leur temps ; le bouton
   devient **■ Stop** pour annuler à tout moment.
4. Le rapport final s'écrit en `.md` à la racine du dossier ouvert.

Au premier lancement, un pipeline d'exemple est déjà chargé — remplace juste le sujet
et lance pour voir le flux complet.

## Les étapes (barre `＋ étape` en bas)
| | Étape | Rôle |
|---|---|---|
| 💡 | **Entrée** | Point de départ ; reçoit le sujet de la barre du haut. Une seule par pipeline. |
| 🤖 | **Agent LLM** | Un appel `claude`. Écris son **prompt** ; il reçoit les sorties de l'étape précédente. |
| ∥ | **Groupe //** | Plusieurs agents **en parallèle** sur la même entrée ; leurs sorties **fusionnent** dans l'étape suivante. `＋ agent` pour en ajouter. |
| 🧑 | **Humain** | Met le run en pause pour te consulter (voir plus bas). |
| 📄 | **Sortie** | Écrit un `.md` à la racine du dossier. Une seule par pipeline. |

## Éditer
- **Clic sur une ligne** (chevron ▸) → déplie l'éditeur : nom, prompt, `☑ 🌐 WebSearch`,
  dernière sortie, et les actions (↑/↓, 💾 agent, Supprimer).
- **Réordonner** : glisse la poignée `⠿`, ou utilise ↑/↓ dans l'éditeur déplié.
- **🌐** sur une carte = WebSearch autorisé pour cet agent. **⚠** = prompt vide
  (l'agent tournera quand même avec un prompt par défaut).
- **Annuler / refaire** : `Ctrl/Cmd+Z` · `Ctrl/Cmd+Shift+Z`.

## Étape Humain (HITL)
Quand le run atteint une carte Humain, une feuille s'ouvre en bas :
- si l'étape amont a produit `{"questions":[…]}`, ces questions te sont posées ;
- sinon, un champ commentaire libre.

`Ctrl/Cmd+Entrée` pour continuer, ou **Passer** pour reprendre avec des réponses vides.

## Bibliothèque (partagée entre tous tes projets)
- **Titre `pipeline ▾`** → charger un pipeline sauvé, en créer un nouveau, ou charger l'exemple.
- **`⋯`** → 💾 Sauver le pipeline · ✎ Renommer · ⧉ Exporter (fichier `.json`).
- **💾 agent** (dans l'éditeur d'un agent) → enregistre cet agent, réutilisable ensuite
  depuis la barre `＋ étape`.
- Importer un pipeline `.json` : commande *AgentLab : importer un pipeline*.
