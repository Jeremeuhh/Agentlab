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
