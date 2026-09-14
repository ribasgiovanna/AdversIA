"""Carregador mínimo de `.env` — sem dependência de `python-dotenv` (Constituição,
Princípio IV: nenhuma dependência nova sem necessidade comprovada).

Lê `.env` na raiz do repositório, se existir, e define no ambiente do processo qualquer
variável que ainda não esteja definida (uma variável já exportada no shell tem
precedência sobre o arquivo).
"""

from __future__ import annotations

import os
from pathlib import Path

_ENV_FILE = Path(__file__).parent.parent / ".env"


def carregar_dotenv() -> None:
    """Carrega `.env` no ambiente do processo.

    Se a mesma chave aparecer mais de uma vez no arquivo, a ÚLTIMA ocorrência vence
    (convenção padrão de arquivos .env — ex.: alguém comentou/trocou de provedor
    adicionando uma linha nova embaixo sem apagar a antiga). Uma variável já exportada
    no shell antes de rodar o processo continua tendo precedência sobre o arquivo.
    """
    if not _ENV_FILE.is_file():
        return
    valores_do_arquivo: dict[str, str] = {}
    for linha in _ENV_FILE.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, valor = linha.split("=", 1)
        chave = chave.strip()
        valor = valor.strip().strip('"').strip("'")
        valores_do_arquivo[chave] = valor  # última ocorrência sobrescreve a anterior

    for chave, valor in valores_do_arquivo.items():
        os.environ.setdefault(chave, valor)
