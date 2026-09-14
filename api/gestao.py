"""Função da Vercel: confere o código de acesso da gestão (ADR-015).

Não faz análise nem chama a IA. Responde 200 quando o cabeçalho `X-Codigo-Gestao` bate com a
variável de ambiente `ADVERSIA_CODIGO_GESTAO`, e 403 caso contrário.
"""

import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import api_comum  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        api_comum.responder_gestao(self)
