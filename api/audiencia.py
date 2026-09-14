"""Função da Vercel: avaliação de uma resposta na simulação de audiência, com a chave da
Anthropic do próprio usuário.

Mesmo contrato de `POST /api/audiencia` no servidor local (app/server.py). O navegador
reenvia o texto dos documentos e a tese, porque a função não guarda nada entre chamadas.
"""

import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import api_comum  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        api_comum.responder(self, api_comum.processar_audiencia, api_comum.MAX_CORPO_AUDIENCIA)
