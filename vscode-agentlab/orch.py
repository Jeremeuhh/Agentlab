#!/usr/bin/env python3
"""orch.py — moteur d'exécution d'un pipeline d'agents (JSON).

Deux usages :
  • CLI :        python3 orch.py pipeline.json "texte d'entrée"
  • importé :    await run_pipeline(pipeline, entree, on_event=…, reader=…)
                 (c'est ce que fait agentlab.py pour le run live dans l'UI)

Briques :
  entree  → renvoie le texte d'entrée
  llm     → appel Claude (prompt du nœud + sorties amont), "web": true → WebSearch
  hitl    → questions au clavier si une sortie amont contient {"questions":[…]},
            sinon commentaire libre (dépend du `reader` fourni)
  sortie  → écrit un .md concaténant les sorties amont
"""
import asyncio
import json
import re
import shutil
import sys
import unicodedata

MODEL = "claude-sonnet-4-6"  # passé à `claude --model`


# ---------------------------------------------------------------- appel LLM
# ponytail: seule couture avec le backend — pour passer à l'API anthropic,
# remplacer uniquement cette fonction.
async def ask(prompt: str, web: bool = False) -> str:
    cmd = ["claude", "-p", "--model", MODEL, "--output-format", "json",
           "--strict-mcp-config"]
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


def slug(texte: str) -> str:
    t = unicodedata.normalize("NFKD", texte).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:40] or "sortie"


def _contexte(deps):
    return "\n\n".join(f"## {nom}\n{out}" for nom, out in deps)


# --------------------------------------------------------------- « readers »
# Un reader(prompt:str)->str fournit les réponses humaines. Le CLI lit le
# clavier ; le serveur passe un reader auto (les questions sont « non précisé »
# en mode navigateur — le HITL interactif reste dispo en terminal).
async def terminal_reader(prompt: str) -> str:
    loop = asyncio.get_running_loop()
    try:
        return (await loop.run_in_executor(None, input, prompt)).strip()
    except EOFError:
        return ""


async def auto_reader(prompt: str) -> str:
    return ""


# ------------------------------------------------------------------ briques
async def run_llm(node, deps):
    prompt = (node.get("prompt") or "").strip() or f"Rédige la section « {node['name']} »."
    if deps:
        prompt += "\n\n# Données fournies par les étapes amont\n\n" + _contexte(deps)
    return await ask(prompt, web=bool(node.get("web")))


async def run_hitl(node, deps, reader):
    morceaux, questions = [], None
    for nom, out in deps:
        m = re.search(r"\{.*\}", out, re.DOTALL)
        if questions is None and m:
            try:
                qs = json.loads(m.group(0)).get("questions")
                if isinstance(qs, list) and qs:
                    questions = qs
                    continue
            except (json.JSONDecodeError, AttributeError):
                pass
        morceaux.append(f"## {nom}\n{out}")

    if questions:
        print(f"\n--- {node['name']} (Entrée vide = passer) ---")
        qr = []
        for i, q in enumerate(questions, 1):
            print(f"\n[{i}/{len(questions)}] {q}")
            r = await reader("> ")
            qr.append(f"- Q : {q}\n  R : {r or 'non précisé'}")
        morceaux.append("## Réponses de cadrage\n" + "\n".join(qr))
    else:
        r = await reader(f"\n{node['name']} — commentaire libre > ")
        morceaux.append(f"## Retour humain\n{r or 'non précisé'}")
    return "\n\n".join(morceaux)


def run_sortie(node, deps, entree):
    fichier = f"{slug(node['name'])}-{slug(entree)}.md"
    with open(fichier, "w") as f:
        f.write(f"# {node['name']} — {entree}\n\n" + _contexte(deps) + "\n")
    return fichier


# ------------------------------------------------------------------- moteur
def _deps(i, preds, nodes, outputs):
    return [(nodes[p]["name"], outputs[p]) for p in preds[i]]


async def run_pipeline(pipeline, entree, on_event=None, reader=None):
    """Exécute le graphe. Émet des événements (dict) via on_event au fil de l'eau.
    Types : pipeline_start · node_running · node_done · node_error · pipeline_done.
    Renvoie {node_id: sortie}."""
    emit = on_event or (lambda e: None)
    reader = reader or terminal_reader
    nodes = {n["id"]: n for n in pipeline["nodes"]}
    preds = {i: [] for i in nodes}
    for a, b in pipeline["edges"]:
        if a in nodes and b in nodes:
            preds[b].append(a)

    outputs = {}
    emit({"type": "pipeline_start", "nodes": len(nodes)})
    restants = set(nodes)

    while restants:
        prets = [i for i in restants if all(p in outputs for p in preds[i])]
        if not prets:
            emit({"type": "error", "message": f"cycle ou dépendance manquante : {restants}"})
            raise RuntimeError("cycle ou dépendance manquante")

        async def do_llm(i):
            n = nodes[i]
            emit({"type": "node_running", "id": i, "name": n["name"], "kind": "llm"})
            try:
                out = await run_llm(n, _deps(i, preds, nodes, outputs))
                outputs[i] = out
                emit({"type": "node_done", "id": i, "name": n["name"], "output": out})
            except Exception as e:  # un agent qui plante ne casse pas le reste
                outputs[i] = f"⚠️ L'agent « {n['name']} » a échoué : {e}"
                emit({"type": "node_error", "id": i, "name": n["name"], "error": str(e)})

        llm_tasks = [asyncio.create_task(do_llm(i))
                     for i in prets if nodes[i]["type"] == "llm"]

        for i in prets:
            n = nodes[i]
            if n["type"] == "entree":
                outputs[i] = entree
                emit({"type": "node_done", "id": i, "name": n["name"], "output": entree})
            elif n["type"] == "hitl":
                emit({"type": "node_running", "id": i, "name": n["name"], "kind": "hitl"})
                outputs[i] = await run_hitl(n, _deps(i, preds, nodes, outputs), reader)
                emit({"type": "node_done", "id": i, "name": n["name"], "output": outputs[i]})
            elif n["type"] == "sortie":
                emit({"type": "node_running", "id": i, "name": n["name"], "kind": "sortie"})
                fichier = run_sortie(n, _deps(i, preds, nodes, outputs), entree)
                outputs[i] = fichier
                emit({"type": "node_done", "id": i, "name": n["name"], "output": fichier})

        if llm_tasks:
            await asyncio.gather(*llm_tasks)
        restants -= set(prets)

    emit({"type": "pipeline_done"})
    return outputs


# --------------------------------------------------------------------- CLI
def main():
    # --events : émet un JSON machine par ligne sur stdout (consommé par
    # l'extension VS Code / tout hôte). Sinon : log humain + HITL au clavier.
    args = sys.argv[1:]
    events = False
    if args and args[0] == "--events":
        events, args = True, args[1:]
    if len(args) < 2:
        sys.exit(__doc__)
    if not shutil.which("claude"):
        sys.exit("Erreur : le binaire `claude` (Claude Code) est introuvable dans le PATH.")
    with open(args[0]) as f:
        pipeline = json.load(f)

    if events:
        def emit(e):
            print(json.dumps(e, ensure_ascii=False), flush=True)
        asyncio.run(run_pipeline(pipeline, args[1], on_event=emit, reader=auto_reader))
        return

    def log(e):
        t = e["type"]
        if t == "pipeline_start":
            print(f"Pipeline — {e['nodes']} briques", flush=True)
        elif t == "node_running" and e["kind"] == "llm":
            print(f"… agent : {e['name']}", flush=True)
        elif t == "node_done" and str(e["output"]).endswith(".md"):
            print(f"✅ Fichier écrit : {e['output']}", flush=True)
        elif t == "node_error":
            print(f"⚠️ {e['name']} : {e['error']}", flush=True)

    asyncio.run(run_pipeline(pipeline, args[1], on_event=log, reader=terminal_reader))


if __name__ == "__main__":
    main()
