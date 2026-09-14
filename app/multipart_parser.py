"""Parser mínimo de multipart/form-data.

Python 3.13 removeu o módulo `cgi` (PEP 594), então este parser manual substitui
`cgi.FieldStorage` para o único uso que o MVP precisa: campos de texto + arquivos.
Suficiente para o volume e o formato gerados por um <form> HTML padrão — não é um parser
RFC 2046 completo.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class Part:
    name: str | None
    filename: str | None
    content: bytes


_DISPOSITION_NAME = re.compile(r'name="([^"]*)"')
_DISPOSITION_FILENAME = re.compile(r'filename="([^"]*)"')


def extrair_boundary(content_type: str) -> bytes | None:
    match = re.search(r"boundary=(.+)$", content_type)
    if not match:
        return None
    boundary = match.group(1).strip().strip('"')
    return boundary.encode()


def parse_multipart(body: bytes, boundary: bytes) -> list[Part]:
    delimitador = b"--" + boundary
    partes_brutas = body.split(delimitador)
    resultado: list[Part] = []

    for bruta in partes_brutas:
        bruta = bruta.strip(b"\r\n")
        if not bruta or bruta in (b"", b"--"):
            continue
        if b"\r\n\r\n" not in bruta:
            continue
        cabecalhos_bytes, conteudo = bruta.split(b"\r\n\r\n", 1)
        if conteudo.endswith(b"\r\n"):
            conteudo = conteudo[:-2]

        disposicao = ""
        for linha in cabecalhos_bytes.split(b"\r\n"):
            if linha.lower().startswith(b"content-disposition:"):
                disposicao = linha.decode(errors="replace")
                break

        nome_match = _DISPOSITION_NAME.search(disposicao)
        arquivo_match = _DISPOSITION_FILENAME.search(disposicao)

        resultado.append(
            Part(
                name=nome_match.group(1) if nome_match else None,
                filename=arquivo_match.group(1) if arquivo_match else None,
                content=conteudo,
            )
        )
    return resultado
