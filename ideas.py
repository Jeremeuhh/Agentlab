#!/usr/bin/env python3
"""ideas.py — idée → dossier de faisabilité (Markdown).

Version « abonnement » : les appels LLM passent par `claude -p` (Claude Code
headless) au lieu du SDK anthropic. Pas de clé API nécessaire.

Usage :
    python3 ideas.py "mon idée ici"
    python3 ideas.py "mon idée ici" --web   # web_search sur Marché + Chiffrage
"""
import argparse
import asyncio
import json
import re
import shutil
import sys
import unicodedata

MODEL = "claude-sonnet-4-6"  # passé à `claude --model`


# ---------------------------------------------------------------- appel LLM
# ponytail: seule couture avec le backend — pour passer à l'API anthropic,
# remplacer uniquement cette fonction par AsyncAnthropic.messages.create.
async def ask(prompt: str, web: bool = False) -> str:
    cmd = ["claude", "-p", "--model", MODEL, "--output-format", "json",
           "--strict-mcp-config"]  # pas de serveurs MCP → démarrage rapide
    if web:
        cmd += ["--allowedTools", "WebSearch"]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    out, err = await proc.communicate(prompt.encode())
    if proc.returncode != 0:
        raise RuntimeError(f"claude a échoué ({proc.returncode}) : {err.decode()[:300]}")
    data = json.loads(out)
    if data.get("is_error"):
        raise RuntimeError(f"claude a renvoyé une erreur : {str(data.get('result'))[:300]}")
    return data["result"]


# ------------------------------------------------------- étape 2 : questions
async def questionnaire(idee: str) -> list[str]:
    prompt = f"""Tu prépares un dossier de faisabilité pour cette idée :
« {idee} »

Génère 5 à 7 questions de cadrage SPÉCIFIQUES au domaine détecté de cette idée
(pas de questions génériques applicables à n'importe quel projet).

Réponds UNIQUEMENT avec ce JSON, sans markdown ni texte autour :
{{"questions": ["question 1", "question 2", "..."]}}"""
    raw = await ask(prompt)
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        raise RuntimeError(f"réponse questionnaire non parsable : {raw[:200]}")
    qs = json.loads(m.group(0))["questions"]
    if not 3 <= len(qs) <= 10:
        raise RuntimeError(f"nombre de questions inattendu : {len(qs)}")
    return qs


def poser_questions(questions: list[str]) -> list[tuple[str, str]]:
    print("\n--- Questionnaire de cadrage (Entrée vide = passer) ---")
    qr = []
    for i, q in enumerate(questions, 1):
        print(f"\n[{i}/{len(questions)}] {q}")
        try:
            r = input("> ").strip()
        except EOFError:
            r = ""
        qr.append((q, r or "non précisé"))
    return qr


# ------------------------------------------------------- étape 3 : workers
WORKERS = {
    "Marché": (
        "Analyse de marché : TAM / SAM / SOM (estimés, avec les hypothèses), "
        "concurrents principaux, tendances du secteur, positionnement recommandé.",
        True,  # web_search si --web
    ),
    "Chiffrage": (
        "Chiffrage : coûts de démarrage, modèle de revenus, hypothèses de prix, "
        "seuil de rentabilité (break-even). Marque explicitement chaque chiffre "
        "comme « estimation à valider ».",
        True,
    ),
    "Plan": (
        "Plan d'action : définition du MVP, étapes concrètes, jalons, "
        "séquencement, premières actions à faire cette semaine.",
        False,
    ),
    "Trajectoires": (
        "Trajectoires : 3 scénarios — prudent / réaliste / ambitieux — en "
        "explicitant ce qui les distingue (investissement, rythme, risques, issue).",
        False,
    ),
}


async def worker(nom: str, consigne: str, brief: str, web: bool) -> str:
    extra = ("\nAppuie tes chiffres sur des recherches web réelles et cite tes sources."
             if web else "")
    prompt = f"""Voici le brief d'une idée de projet :

{brief}

Rédige la section « {nom} » d'un dossier de faisabilité.
{consigne}{extra}

Réponds en Markdown, commence directement par le contenu (pas de titre de
section, il sera ajouté). Sois concret et structuré."""
    return await ask(prompt, web=web)


# ------------------------------------------------------- étape 4 : synthèse
async def synthese(brief: str, sections: dict[str, str]) -> str:
    corps = "\n\n".join(f"## {n}\n{s}" for n, s in sections.items())
    prompt = f"""Voici le brief et les 4 sections d'un dossier de faisabilité :

{brief}

{corps}

Rédige en Markdown, avec EXACTEMENT ces deux titres de niveau 2 :

## Reformulation
(2-3 phrases reformulant l'idée telle que précisée par le brief)

## Synthèse & recommandation
(analyse croisée des 4 sections : cohérences, tensions, risques majeurs,
puis une recommandation finale go / no-go NUANCÉE avec ses conditions)"""
    return await ask(prompt)


# ---------------------------------------------------------------- assemblage
def slug(texte: str) -> str:
    t = unicodedata.normalize("NFKD", texte).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:50] or "idee"


def section_ou_erreur(nom: str, resultat) -> str:
    if isinstance(resultat, Exception):
        return f"⚠️ Cette section a échoué : {resultat}"
    return resultat


async def main() -> None:
    p = argparse.ArgumentParser(description="idée → dossier de faisabilité")
    p.add_argument("idee", help="l'idée à étudier")
    p.add_argument("--web", action="store_true",
                   help="active web_search sur Marché et Chiffrage")
    args = p.parse_args()

    if not shutil.which("claude"):
        sys.exit("Erreur : le binaire `claude` (Claude Code) est introuvable dans le PATH.")

    # 2. questionnaire + gate HITL
    print(f"Génération du questionnaire pour : « {args.idee} » …")
    questions = await questionnaire(args.idee)
    reponses = poser_questions(questions)

    brief = f"**Idée :** {args.idee}\n\n**Cadrage :**\n" + "\n".join(
        f"- Q : {q}\n  R : {r}" for q, r in reponses)

    # 3. fan-out — 4 workers en parallèle
    print("\nAnalyse en cours (4 workers en parallèle"
          + (", web actif sur Marché/Chiffrage" if args.web else "") + ") …")
    noms = list(WORKERS)
    resultats = await asyncio.gather(
        *(worker(n, c, brief, web and args.web)
          for n, (c, web) in WORKERS.items()),
        return_exceptions=True)
    sections = {n: section_ou_erreur(n, r) for n, r in zip(noms, resultats)}

    # 4. synthèse
    print("Synthèse …")
    try:
        syn = await synthese(brief, sections)
    except Exception as e:
        syn = f"## Reformulation\n{args.idee}\n\n## Synthèse & recommandation\n⚠️ La synthèse a échoué : {e}"
    reformulation, _, reco = syn.partition("## Synthèse & recommandation")
    reformulation = reformulation.replace("## Reformulation", "").strip()
    reco = reco.strip() or "⚠️ Synthèse non structurée :\n\n" + syn

    # 5. output
    fichier = f"rapport-{slug(args.idee)}.md"
    contenu = f"""# Dossier de faisabilité — {args.idee}

{reformulation}

## Brief (cadrage)

{brief}

## Marché

{sections['Marché']}

## Chiffrage

{sections['Chiffrage']}

## Plan

{sections['Plan']}

## Trajectoires

{sections['Trajectoires']}

## Synthèse & recommandation

{reco}
"""
    with open(fichier, "w") as f:
        f.write(contenu)
    print(f"\n✅ Rapport écrit : {fichier}")


if __name__ == "__main__":
    asyncio.run(main())
