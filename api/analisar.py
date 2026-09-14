"""Função da Vercel: análise real com a chave da Anthropic do próprio usuário.

Mesmo contrato de `POST /api/analisar` no servidor local (app/server.py). É síncrona: a
análise leva de 2 a 3 minutos, dentro do limite de 300 s do plano gratuito da Vercel
(configurado em vercel.json).
"""

import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import api_comum  # noqa: E402

# A Vercel recusa corpos acima de 4,5 MB antes de chamar a função; o limite fica abaixo
# disso para o usuário receber a nossa mensagem, e não um erro genérico.
MAX_CORPO = 4 * 1024 * 1024


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        api_comum.responder(self, api_comum.processar_analise, MAX_CORPO)
