"""Servidor local do AdversIA.

http.server puro (sem framework — ADR-001/Constituição Princípio IV). Serve o front-end
estático em app/static/ (incluindo os casos de demonstração pré-montados em
app/static/demo/) e expõe as mesmas rotas das funções da Vercel (api/*.py, ADR-014):

- POST /api/analisar        análise real com a chave do usuário (cabeçalho X-Anthropic-Key)
- POST /api/audiencia       avaliação de uma resposta na simulação, com a chave do usuário
- POST /api/analyze         análise síncrona com a chave do .env (desenvolvimento e testes)

Toda mensagem de erro devolvida é lida pelo advogado na tela: fala do que aconteceu e do
que fazer, nunca de detalhes técnicos. O detalhe técnico vai só para o log do servidor.
"""

from __future__ import annotations

import json
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from app import api_comum, pipeline
from app.document_reader import ExtractionError, extrair_texto
from app.env import carregar_dotenv
from app.llm_client import LLMConfigError, verificar_configuracao
from app.multipart_parser import extrair_boundary, parse_multipart

carregar_dotenv()

STATIC_DIR = Path(__file__).parent / "static"
PORT = 8000

# Limite defensivo contra upload abusivo: um caso de família real (petição + provas) não
# deveria chegar perto disso (docs/CONFORMIDADE.md — Segurança). Na Vercel o limite da
# plataforma é menor (4,5 MB), por isso api/analisar.py usa 4 MB.
MAX_BODY_SIZE = 15 * 1024 * 1024

_CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".json": "application/json; charset=utf-8",
}

MSG_ENVIO_INVALIDO = "Não recebemos os arquivos corretamente. Recarregue a página e tente de novo."
MSG_ARQUIVOS_GRANDES = (
    f"Os arquivos somam mais de {MAX_BODY_SIZE // (1024 * 1024)} MB. "
    "Envie menos documentos ou arquivos menores."
)
MSG_SEM_DOCUMENTOS = "Envie pelo menos um documento do caso."
MSG_SEM_TESE = "Descreva a tese que você quer testar."
MSG_SERVICO_INDISPONIVEL = "O serviço de análise está indisponível no momento. Avise a equipe responsável."
MSG_FALHA_ANALISE = "Não foi possível concluir a análise agora. Tente novamente em alguns instantes."
MSG_NAO_ENCONTRADO = "Endereço não encontrado."


class AdversIARequestHandler(BaseHTTPRequestHandler):
    def _cabecalhos_comuns(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")

    def _send_json(self, status: int, payload) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._cabecalhos_comuns()
        self.end_headers()
        self.wfile.write(body)

    def _send_static(self, caminho: str) -> None:
        rel = "index.html" if caminho in ("", "/") else caminho.lstrip("/")
        arquivo = STATIC_DIR / rel
        if not arquivo.is_file() or STATIC_DIR.resolve() not in arquivo.resolve().parents:
            self.send_error(404, "Página não encontrada")
            return
        conteudo = arquivo.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", _CONTENT_TYPES.get(arquivo.suffix, "application/octet-stream"))
        self.send_header("Content-Length", str(len(conteudo)))
        self.send_header("Cache-Control", "no-cache")
        self._cabecalhos_comuns()
        self.end_headers()
        self.wfile.write(conteudo)

    def do_GET(self) -> None:  # noqa: N802 (nome exigido pela biblioteca padrão)
        caminho = unquote(urlsplit(self.path).path)
        if caminho.startswith("/api/"):
            self._send_json(404, {"erro": MSG_NAO_ENCONTRADO})
            return
        self._send_static(caminho)

    def _ler_formulario(self) -> tuple[dict[str, str], str] | None:
        """Lê documentos + tese do formulário. Em caso de problema, já responde ao cliente
        com uma mensagem para o usuário e devolve None."""
        boundary = extrair_boundary(self.headers.get("Content-Type", ""))
        try:
            tamanho = int(self.headers.get("Content-Length", 0))
        except ValueError:
            tamanho = 0

        if boundary is None or tamanho <= 0:
            self._send_json(400, {"erro": MSG_ENVIO_INVALIDO})
            return None
        if tamanho > MAX_BODY_SIZE:
            self._send_json(413, {"erro": MSG_ARQUIVOS_GRANDES})
            return None

        partes = parse_multipart(self.rfile.read(tamanho), boundary)
        documentos: dict[str, str] = {}
        tese = ""
        erros: list[str] = []
        for parte in partes:
            if parte.name == "tese":
                tese = parte.content.decode("utf-8", errors="replace").strip()
            elif parte.name == "documentos" and parte.filename:
                nome = Path(parte.filename).name
                try:
                    documentos[nome] = extrair_texto(nome, parte.content)
                except ExtractionError as exc:
                    erros.append(str(exc))

        if erros:
            self._send_json(400, {"erro": " ".join(erros)})
            return None
        if not documentos:
            self._send_json(400, {"erro": MSG_SEM_DOCUMENTOS})
            return None
        if not tese:
            self._send_json(400, {"erro": MSG_SEM_TESE})
            return None
        return documentos, tese

    def do_POST(self) -> None:  # noqa: N802
        caminho = urlsplit(self.path).path
        if caminho == "/api/analisar":
            api_comum.responder(self, api_comum.processar_analise, MAX_BODY_SIZE)
            return
        if caminho == "/api/audiencia":
            api_comum.responder(self, api_comum.processar_audiencia, api_comum.MAX_CORPO_AUDIENCIA)
            return
        if caminho != "/api/analyze":
            self._send_json(404, {"erro": MSG_NAO_ENCONTRADO})
            return

        formulario = self._ler_formulario()
        if formulario is None:
            return
        documentos, tese = formulario
        try:
            relatorio = pipeline.analisar_caso(documentos, tese)
        except Exception as exc:
            traceback.print_exc()
            erro = MSG_SERVICO_INDISPONIVEL if isinstance(exc, LLMConfigError) else MSG_FALHA_ANALISE
            self._send_json(500, {"erro": erro})
        else:
            self._send_json(200, relatorio.to_dict())

    def log_message(self, format: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), format % args))


class _ServidorSemBindDuplicado(ThreadingHTTPServer):
    # No Windows, SO_REUSEADDR (ligado por padrão em http.server) permite dois processos
    # escutarem na MESMA porta sem erro — e as requisições vão parar em um dos dois de forma
    # imprevisível (causa real de uma falha em 12/09/2026, ADR/F-003). Desligar faz um
    # segundo servidor falhar alto e claro.
    allow_reuse_address = False
    daemon_threads = True


def main() -> None:
    try:
        verificar_configuracao()
    except LLMConfigError:
        # Sem chave no servidor o site funciona do mesmo jeito: modo demonstração e análise
        # real com a chave do próprio usuário (/api/analisar e /api/audiencia).
        print(
            "Sem chave de IA no servidor: modo demonstração e análise com a chave do usuário.",
            file=sys.stderr,
        )

    try:
        servidor = _ServidorSemBindDuplicado(("localhost", PORT), AdversIARequestHandler)
    except OSError as exc:
        print(
            f"ERRO AO INICIAR O SERVIDOR na porta {PORT}: {exc}\n"
            "Provavelmente já existe outro `python -m app.server` rodando. No Windows: "
            f"`netstat -ano | findstr :{PORT}` para achar o PID e `taskkill /PID <pid> /F`.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    print(f"AdversIA rodando em http://localhost:{PORT}")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        servidor.shutdown()


if __name__ == "__main__":
    main()
