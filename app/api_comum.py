"""Regras da análise real compartilhadas pelo servidor local (app/server.py) e pelas
funções da Vercel (api/analisar.py e api/audiencia.py).

A análise real usa SEMPRE a chave da Anthropic do próprio usuário, enviada no cabeçalho
`X-Anthropic-Key` a cada requisição. A chave não é gravada, não vai para o log e não é
reaproveitada entre requisições. O modo demonstração não passa por aqui: os resultados
dele são arquivos estáticos em app/static/demo/.

As funções não guardam estado entre chamadas (na Vercel cada chamada pode cair numa
instância diferente). Por isso a análise devolve o texto extraído dos documentos, e a
simulação de audiência recebe esse texto de volta do navegador.
"""

from __future__ import annotations

import json
import re
import traceback

import anthropic

from app import pipeline
from app.document_reader import ExtractionError, extrair_texto
from app.llm_client import LLMConfigError, usar_chave_anthropic
from app.multipart_parser import extrair_boundary, parse_multipart

CABECALHO_CHAVE = "X-Anthropic-Key"
_FORMATO_CHAVE = re.compile(r"^sk-ant-[A-Za-z0-9_\-]{20,300}$")

MAX_CORPO_AUDIENCIA = 2 * 1024 * 1024
MAX_TEXTO_DOCUMENTOS = 400_000
MAX_PERGUNTA = 2000
MAX_RESPOSTA = 4000

MSG_CHAVE_AUSENTE = (
    "Para analisar os seus próprios documentos, informe a sua chave da Anthropic. "
    "Sem chave, use o modo demonstração."
)
MSG_CHAVE_FORMATO = (
    "Essa não parece uma chave da Anthropic. Ela começa com “sk-ant-”: confira se copiou "
    "a chave inteira."
)
MSG_ENVIO_INVALIDO = "Não recebemos os dados corretamente. Recarregue a página e tente de novo."
MSG_SEM_DOCUMENTOS = "Envie pelo menos um documento do caso."
MSG_SEM_TESE = "Descreva a tese que você quer testar."
MSG_SEM_CONTEXTO = "Faça uma nova análise para usar a simulação de audiência."
MSG_RESPOSTA_VAZIA = "Escreva ou fale a sua resposta antes de enviar."
MSG_FALHA_ANALISE = "Não foi possível concluir a análise agora. Tente novamente em alguns instantes."
MSG_FALHA_AUDIENCIA = "Não foi possível avaliar a sua resposta agora. Tente enviar de novo."


class ErroParaUsuario(Exception):
    """Falha com status HTTP e mensagem já escrita para o advogado ler na tela."""

    def __init__(self, status: int, mensagem: str):
        super().__init__(mensagem)
        self.status = status
        self.mensagem = mensagem


def ler_chave(cabecalhos) -> str:
    chave = (cabecalhos.get(CABECALHO_CHAVE) or "").strip()
    if not chave:
        raise ErroParaUsuario(401, MSG_CHAVE_AUSENTE)
    if not _FORMATO_CHAVE.match(chave):
        raise ErroParaUsuario(400, MSG_CHAVE_FORMATO)
    return chave


def traduzir_falha(exc: Exception, mensagem_padrao: str) -> ErroParaUsuario:
    """Converte erros do provedor de IA em mensagens que o usuário consegue resolver."""
    if isinstance(exc, anthropic.AuthenticationError):
        return ErroParaUsuario(
            401,
            "A Anthropic não aceitou essa chave. Confira se copiou a chave inteira ou gere "
            "uma nova no painel da Anthropic.",
        )
    if isinstance(exc, anthropic.PermissionDeniedError):
        return ErroParaUsuario(
            403, "Essa chave não tem permissão para usar o modelo. Verifique a conta no painel da Anthropic."
        )
    if isinstance(exc, anthropic.RateLimitError):
        return ErroParaUsuario(
            429, "A sua conta da Anthropic atingiu o limite de uso por agora. Espere alguns minutos e tente de novo."
        )
    if isinstance(exc, anthropic.BadRequestError) and "credit" in str(exc).lower():
        return ErroParaUsuario(
            402, "A sua conta da Anthropic está sem crédito. Adicione crédito no painel da Anthropic e tente de novo."
        )
    if isinstance(exc, anthropic.APIConnectionError):
        return ErroParaUsuario(502, "Não conseguimos falar com o serviço de IA agora. Tente de novo em instantes.")
    if isinstance(exc, LLMConfigError):
        return ErroParaUsuario(401, MSG_CHAVE_AUSENTE)
    return ErroParaUsuario(500, mensagem_padrao)


def _nome_do_arquivo(nome: str) -> str:
    # Descarta qualquer caminho enviado pelo navegador, com barra normal ou invertida.
    return re.split(r"[\\/]", nome)[-1].strip()


def ler_formulario(content_type: str, corpo: bytes) -> tuple[dict[str, str], str]:
    boundary = extrair_boundary(content_type or "")
    if boundary is None or not corpo:
        raise ErroParaUsuario(400, MSG_ENVIO_INVALIDO)

    documentos: dict[str, str] = {}
    tese = ""
    erros: list[str] = []
    for parte in parse_multipart(corpo, boundary):
        if parte.name == "tese":
            tese = parte.content.decode("utf-8", errors="replace").strip()
        elif parte.name == "documentos" and parte.filename:
            nome = _nome_do_arquivo(parte.filename)
            try:
                documentos[nome] = extrair_texto(nome, parte.content)
            except ExtractionError as exc:
                erros.append(str(exc))

    if erros:
        raise ErroParaUsuario(400, " ".join(erros))
    if not documentos:
        raise ErroParaUsuario(400, MSG_SEM_DOCUMENTOS)
    if not tese:
        raise ErroParaUsuario(400, MSG_SEM_TESE)
    return documentos, tese


def ler_json(corpo: bytes) -> dict:
    try:
        dados = json.loads(corpo.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise ErroParaUsuario(400, MSG_ENVIO_INVALIDO) from None
    if not isinstance(dados, dict):
        raise ErroParaUsuario(400, MSG_ENVIO_INVALIDO)
    return dados


def analisar(documentos: dict[str, str], tese: str, chave: str) -> dict:
    try:
        with usar_chave_anthropic(chave):
            relatorio = pipeline.analisar_caso(documentos, tese)
    except Exception as exc:
        traceback.print_exc()
        raise traduzir_falha(exc, MSG_FALHA_ANALISE) from exc
    return {"relatorio": relatorio.to_dict(), "documentos": documentos, "tese": tese}


def avaliar_audiencia(dados: dict, chave: str) -> dict:
    documentos = dados.get("documentos")
    tese = str(dados.get("tese") or "").strip()
    if (
        not isinstance(documentos, dict)
        or not documentos
        or not all(isinstance(n, str) and isinstance(t, str) for n, t in documentos.items())
        or sum(len(t) for t in documentos.values()) > MAX_TEXTO_DOCUMENTOS
        or not tese
    ):
        raise ErroParaUsuario(400, MSG_SEM_CONTEXTO)

    pergunta = str(dados.get("pergunta") or "").strip()[:MAX_PERGUNTA]
    resposta = str(dados.get("resposta") or "").strip()[:MAX_RESPOSTA]
    if not pergunta or not resposta:
        raise ErroParaUsuario(400, MSG_RESPOSTA_VAZIA)

    try:
        with usar_chave_anthropic(chave):
            return pipeline.avaliar_resposta_audiencia(documentos, tese, pergunta, resposta)
    except Exception as exc:
        traceback.print_exc()
        raise traduzir_falha(exc, MSG_FALHA_AUDIENCIA) from exc


def processar_analise(cabecalhos, corpo: bytes, chave: str) -> dict:
    documentos, tese = ler_formulario(cabecalhos.get("Content-Type", ""), corpo)
    return analisar(documentos, tese, chave)


def processar_audiencia(cabecalhos, corpo: bytes, chave: str) -> dict:
    return avaliar_audiencia(ler_json(corpo), chave)


def responder(requisicao, processar, limite_bytes: int) -> None:
    """Atende um POST de análise real num `BaseHTTPRequestHandler` (servidor local ou Vercel)."""
    try:
        try:
            tamanho = int(requisicao.headers.get("Content-Length", 0))
        except ValueError:
            tamanho = 0
        if tamanho <= 0:
            raise ErroParaUsuario(400, MSG_ENVIO_INVALIDO)
        if tamanho > limite_bytes:
            raise ErroParaUsuario(
                413,
                f"O envio passou do limite de {limite_bytes // (1024 * 1024)} MB. "
                "Envie menos documentos ou arquivos menores.",
            )
        chave = ler_chave(requisicao.headers)
        corpo = requisicao.rfile.read(tamanho)
        status, conteudo = 200, processar(requisicao.headers, corpo, chave)
    except ErroParaUsuario as erro:
        status, conteudo = erro.status, {"erro": erro.mensagem}

    dados = json.dumps(conteudo, ensure_ascii=False).encode("utf-8")
    requisicao.send_response(status)
    requisicao.send_header("Content-Type", "application/json; charset=utf-8")
    requisicao.send_header("Content-Length", str(len(dados)))
    requisicao.send_header("Cache-Control", "no-store")
    requisicao.send_header("X-Content-Type-Options", "nosniff")
    requisicao.send_header("Referrer-Policy", "no-referrer")
    requisicao.end_headers()
    requisicao.wfile.write(dados)
