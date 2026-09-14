"""Servidor do AdversIA.

http.server puro (sem framework — ADR-001/Constituição Princípio IV). Serve o front-end
estático em app/static/ e expõe:

- POST /api/analises        inicia uma análise em segundo plano e devolve o id
- GET  /api/analises/<id>   etapa atual, e o relatório quando a análise termina
- POST /api/analises/<id>/audiencia  avalia uma resposta na simulação de audiência
- GET  /api/exemplos        casos fictícios prontos para demonstração
- GET  /api/exemplos/<id>   documentos e tese de um caso fictício
- POST /api/analyze         análise síncrona (contrato original, usado nos testes)

Toda mensagem de erro devolvida é lida pelo advogado na tela: fala do que aconteceu e do
que fazer, nunca de detalhes técnicos. O detalhe técnico vai só para o log do servidor.
"""

from __future__ import annotations

import json
import re
import sys
import threading
import time
import traceback
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from app import pipeline
from app.document_reader import ExtractionError, extrair_texto
from app.env import carregar_dotenv
from app.llm_client import LLMConfigError, verificar_configuracao
from app.multipart_parser import extrair_boundary, parse_multipart

carregar_dotenv()

STATIC_DIR = Path(__file__).parent / "static"
GOLDEN_DATASET_DIR = Path(__file__).parent.parent / "golden_dataset"
PORT = 8000

# Limite defensivo contra upload abusivo: um caso de família real (petição + provas) não
# deveria chegar perto disso (docs/CONFORMIDADE.md — Segurança).
MAX_BODY_SIZE = 15 * 1024 * 1024

_CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
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
MSG_ANALISE_NAO_ENCONTRADA = "Esta análise não está mais disponível. Faça uma nova análise."
MSG_RESPOSTA_VAZIA = "Escreva ou fale a sua resposta antes de enviar."
MSG_FALHA_AUDIENCIA = "Não foi possível avaliar a sua resposta agora. Tente enviar de novo."

# Casos fictícios oferecidos na tela para quem não tem documentos à mão (pitch, auditoria,
# testers externos). Lista fechada: o id nunca vira caminho de arquivo diretamente.
# A ordem aqui é a ordem em que tipos e situações aparecem no filtro da tela.
EXEMPLOS = {
    "partilha-empresa-imovel": {
        "tipo": "Partilha de bens",
        "titulo": "Empresa e imóvel anteriores ao casamento",
        "descricao": "A ex-esposa pede metade da empresa e do imóvel que o marido já tinha antes de casar, por ter ajudado a administrar o negócio.",
        "pasta": "case_familia_01",
    },
    "partilha-aposentadoria": {
        "tipo": "Partilha de bens",
        "titulo": "Aposentadoria na partilha e pedido de pensão",
        "descricao": "A ex-esposa pede que os valores da aposentadoria do marido entrem na partilha e pede pensão alimentícia.",
        "pasta": "case_familia_06",
    },
    "partilha-fgts": {
        "tipo": "Partilha de bens",
        "titulo": "FGTS acumulado durante o casamento",
        "descricao": "Um dos cônjuges pede que o FGTS depositado durante o casamento fique fora da partilha.",
        "pasta": "case_familia_13",
    },
    "pensao-perda-emprego": {
        "tipo": "Pensão alimentícia",
        "titulo": "Perda de emprego e mudança de cidade",
        "descricao": "O pai pede para reduzir a pensão depois de ser demitido e ampliar a convivência depois que a mãe se mudou com a filha. As datas das duas versões não batem.",
        "pasta": "case_familia_14",
    },
    "pensao-filha-maior": {
        "tipo": "Pensão alimentícia",
        "titulo": "Filha maior de idade com renda própria",
        "descricao": "O pai pede reduzir ou encerrar a pensão da filha de 18 anos que trabalha meio período e faz curso técnico.",
        "pasta": "case_familia_03",
    },
    "pensao-ex-esposa-trabalho": {
        "tipo": "Pensão alimentícia",
        "titulo": "Ex-esposa voltou a trabalhar",
        "descricao": "O ex-marido pede o fim da pensão paga há mais de seis anos porque a ex-esposa voltou ao mercado de trabalho.",
        "pasta": "case_familia_09",
    },
    "pensao-ex-esposa-tempo": {
        "tipo": "Pensão alimentícia",
        "titulo": "Pensão entre ex-cônjuges há muitos anos",
        "descricao": "O ex-marido pede o fim da pensão pelo tempo passado desde o divórcio. Só a versão dele consta nos documentos.",
        "pasta": "case_familia_10",
    },
    "guarda-alienacao": {
        "tipo": "Guarda e convivência",
        "titulo": "Alegação de alienação parental",
        "descricao": "O pai pede a guarda unilateral alegando que a mãe pratica alienação parental.",
        "pasta": "case_familia_05",
    },
    "guarda-unilateral": {
        "tipo": "Guarda e convivência",
        "titulo": "Guarda unilateral ou compartilhada",
        "descricao": "Um dos pais pede a guarda unilateral, argumentando que a compartilhada prejudica a criança.",
        "pasta": "case_familia_07",
    },
    "guarda-residencia": {
        "tipo": "Guarda e convivência",
        "titulo": "Mudança de residência do filho",
        "descricao": "O pai pede que o filho passe a morar com ele, citando a preferência da criança e a proximidade da escola.",
        "pasta": "case_familia_04",
    },
    "heranca-cuidadora": {
        "tipo": "Herança",
        "titulo": "Filha que cuidou do pai",
        "descricao": "A filha que cuidou do pai por oito anos pede uma parte maior da casa deixada por ele, em disputa com o irmão.",
        "pasta": "case_familia_02",
    },
    "heranca-companheira": {
        "tipo": "Herança",
        "titulo": "Companheira e parentes do falecido",
        "descricao": "Irmãos, tios e sobrinhos de quem morreu sem filhos querem dividir a herança com a companheira.",
        "pasta": "case_familia_11",
    },
    "morte-relacao-paralela": {
        "tipo": "Pensão por morte",
        "titulo": "Relação paralela ao casamento",
        "descricao": "Quem manteve relação paralela a um casamento pede o reconhecimento da família para receber pensão por morte.",
        "pasta": "case_familia_08",
    },
    "morte-escritura": {
        "tipo": "Pensão por morte",
        "titulo": "Pensão combinada em cartório",
        "descricao": "A ex-esposa pede pensão por morte com base na pensão alimentícia definida em escritura de divórcio.",
        "pasta": "case_familia_12",
    },
}

# Análises em andamento/concluídas ficam só na memória (ADR-001: sem persistência).
_ANALISES: dict[str, dict] = {}
_ANALISES_TRAVA = threading.Lock()
_MAX_ANALISES_GUARDADAS = 50
_ID_ANALISE = re.compile(r"^[0-9a-f]{32}$")
_ROTA_AUDIENCIA = re.compile(r"^/api/analises/([0-9a-f]{32})/audiencia$")
# Pergunta + resposta da simulação de audiência: texto curto, nunca arquivo.
MAX_CORPO_AUDIENCIA = 64 * 1024
MAX_PERGUNTA = 2000
MAX_RESPOSTA = 4000


def _mensagem_de_falha(exc: Exception) -> str:
    if isinstance(exc, LLMConfigError):
        return MSG_SERVICO_INDISPONIVEL
    return MSG_FALHA_ANALISE


def _iniciar_analise(documentos: dict[str, str], tese: str) -> str:
    analise_id = uuid.uuid4().hex
    registro = {
        "estado": "processando",
        "etapa_atual": 0,
        "relatorio": None,
        "erro": None,
        "criada_em": time.time(),
        # Guardados só na memória, para a simulação de audiência avaliar respostas sobre
        # os mesmos documentos. Nunca são devolvidos pela API (chaves com "_").
        "_documentos": documentos,
        "_tese": tese,
    }
    with _ANALISES_TRAVA:
        while len(_ANALISES) >= _MAX_ANALISES_GUARDADAS:
            mais_antiga = min(_ANALISES, key=lambda chave: _ANALISES[chave]["criada_em"])
            del _ANALISES[mais_antiga]
        _ANALISES[analise_id] = registro

    def ao_avancar(etapa: int) -> None:
        with _ANALISES_TRAVA:
            registro["etapa_atual"] = etapa

    def executar() -> None:
        try:
            relatorio = pipeline.analisar_caso(documentos, tese, ao_avancar=ao_avancar)
        except Exception as exc:
            traceback.print_exc()
            with _ANALISES_TRAVA:
                registro["estado"] = "erro"
                registro["erro"] = _mensagem_de_falha(exc)
        else:
            with _ANALISES_TRAVA:
                registro["estado"] = "concluida"
                registro["etapa_atual"] = len(pipeline.ETAPAS)
                registro["relatorio"] = relatorio.to_dict()

    threading.Thread(target=executar, daemon=True).start()
    return analise_id


def _carregar_exemplo(pasta: str) -> dict:
    diretorio = GOLDEN_DATASET_DIR / pasta
    documentos = [
        {"nome": arquivo.name, "conteudo": arquivo.read_text(encoding="utf-8")}
        for arquivo in sorted(diretorio.glob("*.txt"))
        if arquivo.name != "tese.txt"
    ]
    tese = (diretorio / "tese.txt").read_text(encoding="utf-8").strip()
    return {"documentos": documentos, "tese": tese}


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

        if caminho == "/api/exemplos":
            self._send_json(
                200,
                [
                    {"id": chave, "tipo": e["tipo"], "titulo": e["titulo"], "descricao": e["descricao"]}
                    for chave, e in EXEMPLOS.items()
                ],
            )
            return

        if caminho.startswith("/api/exemplos/"):
            exemplo = EXEMPLOS.get(caminho.removeprefix("/api/exemplos/"))
            if exemplo is None:
                self._send_json(404, {"erro": "Caso de exemplo não encontrado."})
                return
            self._send_json(200, {"titulo": exemplo["titulo"], **_carregar_exemplo(exemplo["pasta"])})
            return

        if caminho.startswith("/api/analises/"):
            analise_id = caminho.removeprefix("/api/analises/")
            with _ANALISES_TRAVA:
                registro = dict(_ANALISES[analise_id]) if _ID_ANALISE.match(analise_id) and analise_id in _ANALISES else None
            if registro is None:
                self._send_json(404, {"erro": MSG_ANALISE_NAO_ENCONTRADA})
                return
            publico = {k: v for k, v in registro.items() if not k.startswith("_") and k != "criada_em"}
            self._send_json(200, publico)
            return

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

    def _responder_audiencia(self, analise_id: str) -> None:
        try:
            tamanho = int(self.headers.get("Content-Length", 0))
        except ValueError:
            tamanho = 0
        if tamanho <= 0 or tamanho > MAX_CORPO_AUDIENCIA:
            self._send_json(400, {"erro": MSG_RESPOSTA_VAZIA if tamanho <= 0 else MSG_ENVIO_INVALIDO})
            return
        try:
            corpo = json.loads(self.rfile.read(tamanho).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"erro": MSG_ENVIO_INVALIDO})
            return
        if not isinstance(corpo, dict):
            corpo = {}
        pergunta = str(corpo.get("pergunta") or "").strip()[:MAX_PERGUNTA]
        resposta = str(corpo.get("resposta") or "").strip()[:MAX_RESPOSTA]
        if not pergunta or not resposta:
            self._send_json(400, {"erro": MSG_RESPOSTA_VAZIA})
            return

        with _ANALISES_TRAVA:
            registro = _ANALISES.get(analise_id)
            contexto = (
                (registro["_documentos"], registro["_tese"])
                if registro and registro["estado"] == "concluida"
                else None
            )
        if contexto is None:
            self._send_json(404, {"erro": MSG_ANALISE_NAO_ENCONTRADA})
            return

        try:
            avaliacao = pipeline.avaliar_resposta_audiencia(*contexto, pergunta, resposta)
        except Exception as exc:
            traceback.print_exc()
            erro = MSG_SERVICO_INDISPONIVEL if isinstance(exc, LLMConfigError) else MSG_FALHA_AUDIENCIA
            self._send_json(500, {"erro": erro})
        else:
            self._send_json(200, avaliacao)

    def do_POST(self) -> None:  # noqa: N802
        caminho = urlsplit(self.path).path
        rota_audiencia = _ROTA_AUDIENCIA.match(caminho)
        if rota_audiencia:
            self._responder_audiencia(rota_audiencia.group(1))
            return
        if caminho not in ("/api/analises", "/api/analyze"):
            self._send_json(404, {"erro": MSG_NAO_ENCONTRADO})
            return

        formulario = self._ler_formulario()
        if formulario is None:
            return
        documentos, tese = formulario

        if caminho == "/api/analises":
            self._send_json(202, {"id": _iniciar_analise(documentos, tese), "etapas": pipeline.ETAPAS})
            return

        try:
            relatorio = pipeline.analisar_caso(documentos, tese)
        except Exception as exc:
            traceback.print_exc()
            self._send_json(500, {"erro": _mensagem_de_falha(exc)})
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
    except LLMConfigError as exc:
        print(f"ERRO DE CONFIGURAÇÃO: {exc}", file=sys.stderr)
        raise SystemExit(1)

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
