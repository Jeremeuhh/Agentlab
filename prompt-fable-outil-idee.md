# Prompt — Outil CLI « idée → dossier de faisabilité »

## Objectif

Construire un outil en **ligne de commande (Python)** qui prend **une idée** en
entrée et produit un **dossier de faisabilité** en Markdown : plan concret,
étude de marché, chiffrage, et trajectoires possibles.

Le cœur du design est une **étape human-in-the-loop** : avant d'analyser, l'outil
génère un **questionnaire personnalisé** (fonction de l'idée) pour cadrer le
travail. C'est un orchestrateur d'agents à flux **déterministe** (pas d'agent
autonome).

## Contraintes techniques

- **Python 3.10+**, un seul fichier `ideas.py`.
- **Une seule dépendance** : le SDK officiel `anthropic`. Rien d'autre.
- Clé API lue depuis la variable d'environnement `ANTHROPIC_API_KEY`.
- Parallélisme via `asyncio` + `AsyncAnthropic` (pas de framework, pas de queue).
- **Aucune base de données**, aucune persistance : le seul artefact produit est
  le fichier Markdown de sortie.
- Modèle : `claude-sonnet-4-6` partout par défaut. Une constante `MODEL` en haut
  du fichier pour changer facilement.

## Flux (5 étapes)

```
1. INTAKE        idée passée en argument :  python ideas.py "mon idée ici"
2. QUESTIONNAIRE 1 appel LLM → 5 à 7 questions sur-mesure (sortie structurée via tool-call)
   [GATE HITL]   le CLI les pose UNE PAR UNE ; l'utilisateur répond ; Entrée vide = passer
                 → idée + réponses = le "brief"
3. FAN-OUT       4 workers lancés EN PARALLÈLE (asyncio.gather), chacun reçoit le brief
4. SYNTHÈSE      1 appel LLM assemble les 4 sorties en un rapport cohérent
5. OUTPUT        écrit  rapport-<slug>.md  (slug dérivé de l'idée)
```

### Étape 2 — Questionnaire (le cœur HITL)

- Un appel LLM avec un **tool-call forcé** qui renvoie une liste de 5 à 7
  questions adaptées à l'idée (pas de questions génériques : elles doivent
  dépendre du domaine détecté).
- Schéma de sortie : `{ "questions": ["...", "...", ...] }`.
- Le CLI affiche chaque question, lit la réponse au clavier. **Entrée vide =
  question passée** (réponse = « non précisé »).
- Le résultat compilé (idée + Q/R) forme le **brief** injecté dans tous les workers.

### Étape 3 — Les 4 workers (en parallèle)

Chacun reçoit le brief complet et renvoie une section Markdown.

| Worker | Contenu attendu |
|---|---|
| **Marché** | TAM / SAM / SOM (estimés), concurrents principaux, tendances, positionnement. |
| **Chiffrage** | Coûts de démarrage, modèle de revenus, hypothèses de prix, seuil de rentabilité (break-even). Marquer explicitement « estimations à valider ». |
| **Plan** | MVP, étapes concrètes, jalons, séquencement, premières actions. |
| **Trajectoires** | 3 scénarios : prudent / réaliste / ambitieux — avec ce qui les distingue. |

### Données hybrides (flag `--web`)

- **Par défaut** : les workers raisonnent sur la connaissance du modèle. Les
  chiffres sont des estimations.
- **`python ideas.py "..." --web`** : active l'outil **`web_search` natif de
  l'API Anthropic** (côté serveur) **uniquement** sur les workers **Marché** et
  **Chiffrage**, pour appuyer les données sur des sources réelles.
- Pas de scraping, pas d'API de recherche tierce.

### Étape 4 — Synthèse

- Un appel LLM reçoit les 4 sections + le brief, et produit un rapport final
  cohérent (intro, les 4 parties, une conclusion « go / no-go » nuancée).

## Format de sortie

Fichier `rapport-<slug>.md` avec :
1. Titre + reformulation de l'idée
2. Le brief (les questions/réponses de cadrage)
3. Marché
4. Chiffrage
5. Plan
6. Trajectoires
7. Synthèse & recommandation

## Gestion des erreurs

- Si un worker échoue, sa section affiche l'erreur mais **les autres continuent**
  (pas de crash global). Utiliser `asyncio.gather(..., return_exceptions=True)`.
- Si `ANTHROPIC_API_KEY` manque : message clair et sortie propre.

## Hors périmètre (NE PAS construire en v1)

- Pas de base de données ni d'historique des idées.
- Pas d'interface web / graphique (CLI uniquement).
- Pas de vote adversarial ni de vérification croisée des chiffres.
- Pas de reprise sur erreur au-delà du `return_exceptions` ci-dessus.

## Vérification attendue

Un petit auto-test : lancer l'outil sur une idée exemple (ex. « une app de
covoiturage pour festivals ») en mode sans `--web`, en simulant des réponses
vides au questionnaire, et vérifier qu'un `rapport-*.md` non vide contenant les
7 sections est bien produit.
