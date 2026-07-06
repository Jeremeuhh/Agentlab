#!/usr/bin/env python3
"""agentlab.py — l'app locale : UI d'orchestration + run live, sur ton abonnement.

    python3 agentlab.py            # sert l'UI sur http://localhost:8765 et l'ouvre

Serveur en Python pur (zéro dépendance). Il sert agentlab.html, expose ta
bibliothèque d'agents (dossier agents/) et tes pipelines (dossier pipelines/),
et exécute un pipeline en streamant les événements au navigateur (les briques
s'allument en direct). Les appels au modèle passent par `claude -p` (abonnement).
"""
import asyncio
import json
import os
import shutil
import sys
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import orch  # moteur partagé

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8765
AGENTS_DIR = os.path.join(ROOT, "agents")
PIPES_DIR = os.path.join(ROOT, "pipelines")
os.makedirs(AGENTS_DIR, exist_ok=True)
os.makedirs(PIPES_DIR, exist_ok=True)


def _list_json(d):
    out = []
    for f in sorted(os.listdir(d)):
        if f.endswith(".json"):
            try:
                with open(os.path.join(d, f)) as fh:
                    out.append({"file": f, "data": json.load(fh)})
            except (json.JSONDecodeError, OSError):
                pass
    return out


def _safe(name):
    # empêche la traversée de répertoire : garde un simple nom de fichier .json
    name = os.path.basename(name)
    return name if name.endswith(".json") else name + ".json"


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass  # silencieux

    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False)
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # -------------------------------------------------------------- GET
    def do_GET(self):
        if self.path == "/" or self.path.startswith("/index"):
            try:
                with open(os.path.join(ROOT, "agentlab.html"), "rb") as f:
                    self._send(200, f.read(), "text/html")
            except OSError:
                self._send(500, {"error": "agentlab.html introuvable à côté de agentlab.py"})
        elif self.path == "/agents":
            self._send(200, _list_json(AGENTS_DIR))
        elif self.path == "/pipelines":
            self._send(200, _list_json(PIPES_DIR))
        else:
            self._send(404, {"error": "not found"})

    # -------------------------------------------------------------- POST
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            return self._send(400, {"error": "JSON invalide"})

        if self.path == "/pipelines/save":
            name = _safe(payload.get("name", "pipeline"))
            with open(os.path.join(PIPES_DIR, name), "w") as f:
                json.dump(payload.get("pipeline", {}), f, ensure_ascii=False, indent=2)
            return self._send(200, {"saved": name})

        if self.path == "/run":
            return self._run_stream(payload)

        self._send(404, {"error": "not found"})

    # ----------------------------------------------------- run streamé
    def _run_stream(self, payload):
        pipeline = payload.get("pipeline")
        entree = payload.get("entree", "")
        if not pipeline or not pipeline.get("nodes"):
            return self._send(400, {"error": "pipeline vide"})

        self.send_response(200)
        self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()

        def write(evt):
            # une ligne JSON par événement ; flush pour du live réel
            try:
                self.wfile.write((json.dumps(evt, ensure_ascii=False) + "\n").encode("utf-8"))
                self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass

        try:
            asyncio.run(orch.run_pipeline(
                pipeline, entree, on_event=write, reader=orch.auto_reader))
        except Exception as e:  # remonte l'erreur au navigateur puis termine
            write({"type": "fatal", "error": str(e)})


def main():
    if not shutil.which("claude"):
        sys.exit("Erreur : le binaire `claude` (Claude Code) est introuvable dans le PATH.")
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://localhost:{PORT}/"
    print(f"AgentLab prêt → {url}")
    print("  agents/    : ta bibliothèque d'agents prédéfinis")
    print("  pipelines/ : tes flux sauvegardés")
    print("  Ctrl-C pour arrêter.")
    try:
        webbrowser.open(url)
    except Exception:
        pass
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nArrêt.")
        srv.shutdown()


if __name__ == "__main__":
    main()
