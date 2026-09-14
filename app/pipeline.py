"""Pipeline do AdversIA.

Case Model -> Evidence Mapping -> Contradições -> Motor Adversarial -> Verificação ->
Plano de provas -> Relatório final. A linha do tempo sai do próprio Case Model, sem
chamada extra ao modelo. A simulação de audiência (`avaliar_resposta_audiencia`) roda
depois do relatório, sob demanda, uma chamada por resposta do advogado. Ver
specs/001-adversarial-vulnerability-report/plan.md (Summary) e data-model.md.

Cada passo usa `chamar_llm_estruturado` (tool use / JSON Schema forçado) em vez de pedir
JSON como texto livre — evita a classe de erro "JSON malformado" (aspas não escapadas,
string cortada) observada nos primeiros testes ponta-a-ponta deste MVP.
"""

from __future__ import annotations

import json
import re
import sys
import traceback
import unicodedata
from collections.abc import Callable
from pathlib import Path

from app.llm_client import chamar_llm_estruturado, imprimir_resumo_uso
from app.schemas import (
    CaseModel,
    Categoria,
    Citation,
    Finding,
    Provenance,
    VulnerabilityReport,
)
from app.tool_schemas import (
    ADVERSARIAL_ENGINE_SCHEMA,
    CASE_MODEL_SCHEMA,
    CONTRADICTIONS_SCHEMA,
    EVIDENCE_MAPPING_SCHEMA,
    PLANO_DE_PROVAS_SCHEMA,
    SIMULACAO_AUDIENCIA_SCHEMA,
    VERIFICATION_SCHEMA,
)

_PROMPTS_DIR = Path(__file__).parent / "prompts"

_DOMINIO_FAMILIA = (_PROMPTS_DIR / "_dominio_familia.md").read_text(encoding="utf-8")

_AVALIACOES_AUDIENCIA = {"convincente", "parcial", "fragil"}
_ORDEM_PRIORIDADE = {"alta": 0, "media": 1, "baixa": 2}
_DATA_ORDENAVEL = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")


def _carregar_prompt(nome_arquivo: str) -> str:
    """Carrega um prompt numerado e prefixa o contexto de domínio (Direito de Família).

    Ver docs/ANALISE_CASOS_FAMILIA.md — o contexto é compartilhado entre as etapas do
    pipeline para não duplicar o vocabulário de domínio em cada arquivo de prompt.
    """
    corpo = (_PROMPTS_DIR / nome_arquivo).read_text(encoding="utf-8")
    return f"{_DOMINIO_FAMILIA}\n---\n\n{corpo}"


def _somente_dicts(valor) -> list[dict]:
    """Defesa em profundidade: mantém só itens que são de fato dicts.

    O tool use força o formato na maioria dos casos, mas nada impede um modelo de
    devolver um item malformado dentro de uma lista corretamente tipada — descartar
    silenciosamente um item ruim é mais seguro do que deixar o pipeline inteiro quebrar
    com AttributeError (Constituição, Princípio I: preferir abstenção a erro não tratado).
    """
    if not isinstance(valor, list):
        return []
    return [item for item in valor if isinstance(item, dict)]


def _texto(valor) -> str:
    return valor.strip() if isinstance(valor, str) else ""


def _lista_de_textos(valor) -> list[str]:
    if not isinstance(valor, list):
        return []
    return [item.strip() for item in valor if isinstance(item, str) and item.strip()]


def _formatar_documentos(documentos: dict[str, str]) -> str:
    partes = []
    for nome, conteudo in documentos.items():
        partes.append(f"--- {nome} ---\n{conteudo}\n")
    return "\n".join(partes)


def _indexar_documentos(documentos: dict[str, str] | None) -> dict[str, str]:
    return {nome.strip().lower(): texto for nome, texto in (documentos or {}).items()}


def _normalizar_para_busca(texto: str) -> str:
    texto = unicodedata.normalize("NFKC", texto or "").lower()
    texto = re.sub(r"[\"“”‘’'«»]", "", texto)
    texto = texto.replace("…", "...")
    return re.sub(r"\s+", " ", texto).strip()


def _trecho_consta(trecho: str, texto_documento: str) -> bool:
    """Confere, no código, se o trecho citado existe de fato no documento enviado.

    Ignora caixa, aspas e espaços/quebras de linha; aceita trechos com reticências ("...")
    desde que cada pedaço exista no documento. É a garantia do Princípio I que não
    depende da boa vontade do modelo: uma citação inventada ou parafraseada aparece para o
    advogado como "confira", nunca como conferida.
    """
    if not trecho or not texto_documento:
        return False
    documento = _normalizar_para_busca(texto_documento)
    pedacos = [p.strip(" .;:,-") for p in _normalizar_para_busca(trecho).split("...")]
    pedacos = [p for p in pedacos if len(p) >= 6]
    return bool(pedacos) and all(p in documento for p in pedacos)


def extrair_case_model(documentos: dict[str, str], tese: str) -> CaseModel:
    """Passo 1 — Case Model."""
    prompt = _carregar_prompt("01_case_model.md")
    prompt = prompt.replace("<<TESE>>", tese)
    prompt = prompt.replace("<<DOCUMENTOS>>", _formatar_documentos(documentos))
    dados = chamar_llm_estruturado(
        "extracao",
        prompt,
        tool_name="registrar_case_model",
        tool_description="Registra o Case Model estruturado extraído dos documentos.",
        schema=CASE_MODEL_SCHEMA,
    )
    return CaseModel(
        case_id=dados.get("case_id", "case-001"),
        partes=dados.get("partes", []),
        tipo_de_acao=dados.get("tipo_de_acao") or None,
        jurisdicao=dados.get("jurisdicao") or None,
        fatos=dados.get("fatos", []),
        datas=dados.get("datas", []),
        pedidos=dados.get("pedidos", []),
        argumentos=dados.get("argumentos", []),
        evidencias=dados.get("evidencias", []),
        documentos=dados.get("documentos") or list(documentos.keys()),
        questoes_juridicas=dados.get("questoes_juridicas", []),
        informacoes_ausentes=dados.get("informacoes_ausentes", []),
        possiveis_contradicoes=dados.get("possiveis_contradicoes", []),
        linha_do_tempo=_somente_dicts(dados.get("linha_do_tempo", [])),
    )


def montar_linha_do_tempo(case_model: CaseModel, documentos: dict[str, str]) -> list[dict]:
    """Linha do tempo do caso a partir do Case Model — sem chamada extra ao modelo.

    Só entram eventos com data e com documento que o advogado realmente enviou; o trecho
    de cada evento é conferido no texto do documento.
    """
    textos = _indexar_documentos(documentos)
    eventos = []
    for item in case_model.linha_do_tempo:
        documento = _texto(item.get("documento"))
        data = _texto(item.get("data"))
        evento = _texto(item.get("evento"))
        if not data or not evento or documento.lower() not in textos:
            continue
        trecho = _texto(item.get("trecho"))
        ordenacao = _texto(item.get("data_ordenacao"))
        eventos.append(
            {
                "data": data,
                "data_ordenacao": ordenacao if _DATA_ORDENAVEL.match(ordenacao) else "",
                "evento": evento,
                "quem_afirma": _texto(item.get("quem_afirma")),
                "documento": documento,
                "trecho": trecho,
                "trecho_conferido": _trecho_consta(trecho, textos[documento.lower()]),
                "divergencia": _texto(item.get("divergencia")),
            }
        )
    # Sem data ordenável vai para o fim, mantendo a ordem em que apareceu nos documentos.
    eventos.sort(key=lambda e: (e["data_ordenacao"] == "", e["data_ordenacao"]))
    return eventos


def mapear_evidencias(case_model: CaseModel) -> list[dict]:
    """Passo 2 — Evidence Mapping."""
    prompt = _carregar_prompt("02_evidence_mapping.md")
    prompt = prompt.replace(
        "<<CASE_MODEL_JSON>>", json.dumps(case_model.to_dict(), ensure_ascii=False)
    )
    dados = chamar_llm_estruturado(
        "extracao",
        prompt,
        tool_name="registrar_mapeamento_evidencias",
        tool_description="Registra o mapeamento entre alegações e evidências do caso.",
        schema=EVIDENCE_MAPPING_SCHEMA,
    )
    return _somente_dicts(dados.get("mapeamentos", []))


def detectar_contradicoes(case_model: CaseModel) -> list[dict]:
    """Passo 3 — Detecção de Contradições."""
    prompt = _carregar_prompt("03_contradictions.md")
    prompt = prompt.replace(
        "<<CASE_MODEL_JSON>>", json.dumps(case_model.to_dict(), ensure_ascii=False)
    )
    dados = chamar_llm_estruturado(
        "raciocinio_adversarial",
        prompt,
        tool_name="registrar_contradicoes",
        tool_description="Registra as contradições reais e relevantes encontradas no caso.",
        schema=CONTRADICTIONS_SCHEMA,
    )
    return _somente_dicts(dados.get("contradicoes", []))


def gerar_motor_adversarial(
    case_model: CaseModel, contradicoes: list[dict], evidence_mapping: list[dict]
) -> dict:
    """Passo 4 — Motor Adversarial."""
    prompt = _carregar_prompt("04_adversarial_engine.md")
    prompt = prompt.replace(
        "<<CASE_MODEL_JSON>>", json.dumps(case_model.to_dict(), ensure_ascii=False)
    )
    prompt = prompt.replace(
        "<<CONTRADICOES_JSON>>", json.dumps(contradicoes, ensure_ascii=False)
    )
    prompt = prompt.replace(
        "<<EVIDENCE_MAPPING_JSON>>", json.dumps(evidence_mapping, ensure_ascii=False)
    )
    return chamar_llm_estruturado(
        "raciocinio_adversarial",
        prompt,
        tool_name="registrar_motor_adversarial",
        tool_description="Registra contra-argumentos e perguntas difíceis específicos ao caso.",
        schema=ADVERSARIAL_ENGINE_SCHEMA,
    )


def _montar_candidatos(
    contradicoes: list[dict],
    evidence_mapping: list[dict],
    motor: dict,
) -> list[dict]:
    candidatos: list[dict] = []
    for c in _somente_dicts(contradicoes):
        candidatos.append(
            {
                "categoria": "contradicao",
                "texto": c.get("descricao", ""),
                "detalhe": f"Lado A: {c.get('lado_a', '')} | Lado B: {c.get('lado_b', '')}",
            }
        )
    for item in _somente_dicts(evidence_mapping):
        if item.get("categoria") == "lacuna_probatoria":
            candidatos.append(
                {
                    "categoria": "lacuna_probatoria",
                    "texto": f"Alegação sem prova nos documentos: {item.get('alegacao', '')}",
                    "detalhe": "",
                }
            )
    for ca in _somente_dicts(motor.get("contra_argumentos", [])):
        candidatos.append(
            {
                "categoria": "contra_argumento",
                "texto": ca.get("texto", ""),
                "detalhe": ca.get("baseado_em", ""),
            }
        )
    for pd in _somente_dicts(motor.get("perguntas_dificeis", [])):
        candidatos.append(
            {
                "categoria": "pergunta_dificil",
                "texto": pd.get("texto", ""),
                "detalhe": pd.get("baseado_em", ""),
            }
        )
    return candidatos


def verificar_candidatos(
    case_model: CaseModel,
    candidatos: list[dict],
    documentos: dict[str, str] | None = None,
) -> list[Finding]:
    """Passo 5 — Verificação. Devolve Finding já com provenance atribuído.

    Com `documentos`, o modelo recebe o texto original para copiar trechos literais e cada
    citação é conferida no código (Citation.conferido).
    """
    prompt = _carregar_prompt("05_verification.md")
    prompt = prompt.replace(
        "<<CASE_MODEL_JSON>>", json.dumps(case_model.to_dict(), ensure_ascii=False)
    )
    prompt = prompt.replace(
        "<<DOCUMENTOS>>",
        _formatar_documentos(documentos) if documentos else "(não fornecidos nesta chamada)",
    )
    prompt = prompt.replace(
        "<<CANDIDATOS_JSON>>", json.dumps(candidatos, ensure_ascii=False)
    )
    dados = chamar_llm_estruturado(
        "verificacao",
        prompt,
        tool_name="registrar_findings_verificados",
        tool_description="Registra os achados finais, cada um com proveniência e origem.",
        schema=VERIFICATION_SCHEMA,
    )
    itens = _somente_dicts(dados.get("findings", []))

    textos = _indexar_documentos(documentos)
    documentos_validos = set(textos) or {d.strip().lower() for d in case_model.documentos}
    ids_usados: set[str] = set()
    findings: list[Finding] = []
    for i, item in enumerate(itens):
        try:
            categoria = Categoria(item.get("categoria"))
        except ValueError:
            continue
        try:
            provenance = Provenance(item.get("provenance", "UNVERIFIED"))
        except ValueError:
            provenance = Provenance.UNVERIFIED

        # Ids únicos: o plano de provas aponta para os achados por id.
        id_base = _texto(item.get("id")) or f"apontamento-{i + 1}"
        id_final, sufixo = id_base, 2
        while id_final in ids_usados:
            id_final, sufixo = f"{id_base}-{sufixo}", sufixo + 1
        ids_usados.add(id_final)

        origem = []
        for o in _somente_dicts(item.get("origem", [])):
            nome = _texto(o.get("documento"))
            # Defesa em profundidade: só aceita citação de um documento realmente
            # enviado pelo usuário. Sem isso, o modelo às vezes "cita" a estrutura
            # interna do Case Model (ex.: documento="case_model", trecho='"evidencias":
            # []') para satisfazer a exigência de origem em achados de categoria
            # lacuna_probatoria, que por definição não têm evidência real para citar.
            if nome.lower() not in documentos_validos:
                continue
            trecho = _texto(o.get("trecho"))
            origem.append(
                Citation(
                    documento=nome,
                    trecho=trecho,
                    pagina=o.get("pagina"),
                    conferido=_trecho_consta(trecho, textos[nome.lower()]) if textos else None,
                )
            )
        findings.append(
            Finding(
                id=id_final,
                categoria=categoria,
                texto=item.get("texto", ""),
                provenance=provenance,
                origem=origem,
            )
        )
    return findings


def gerar_plano_de_provas(
    case_model: CaseModel, tese: str, findings: list[Finding]
) -> list[dict] | None:
    """Passo 6 — Plano de provas: o que providenciar para fechar cada ponto fraco.

    Devolve None se a geração falhar — o relatório continua válido sem o plano, e a tela
    avisa o advogado em vez de esconder a falha.
    """
    if not findings:
        return []
    apontamentos = [
        {"id": f.id, "categoria": f.categoria.value, "texto": f.texto} for f in findings
    ]
    prompt = _carregar_prompt("06_plano_de_provas.md")
    prompt = prompt.replace("<<TESE>>", tese)
    prompt = prompt.replace(
        "<<CASE_MODEL_JSON>>", json.dumps(case_model.to_dict(), ensure_ascii=False)
    )
    prompt = prompt.replace(
        "<<APONTAMENTOS_JSON>>", json.dumps(apontamentos, ensure_ascii=False)
    )
    try:
        dados = chamar_llm_estruturado(
            "raciocinio_adversarial",
            prompt,
            tool_name="registrar_plano_de_provas",
            tool_description="Registra as provas a providenciar para fortalecer a tese.",
            schema=PLANO_DE_PROVAS_SCHEMA,
            # Casos com muitos apontamentos geram plano longo; 8192 chegou a cortar a resposta.
            max_tokens=16000,
        )
    except Exception:
        traceback.print_exc(file=sys.stderr)
        return None

    ids_validos = {f.id for f in findings}
    itens = []
    for item in _somente_dicts(dados.get("itens", [])):
        prova = _texto(item.get("prova"))
        if not prova:
            continue
        prioridade = item.get("prioridade")
        itens.append(
            {
                "prova": prova,
                "finalidade": _texto(item.get("finalidade")),
                "como_obter": _texto(item.get("como_obter")),
                "prioridade": prioridade if prioridade in _ORDEM_PRIORIDADE else "media",
                "apontamentos": [
                    i for i in _lista_de_textos(item.get("apontamentos")) if i in ids_validos
                ],
            }
        )
    if not itens:
        # Com apontamentos para resolver, plano vazio indica resposta malformada ou cortada —
        # tratar como falha para a tela avisar, e não dizer "nenhuma prova sugerida".
        tipo_itens = type(dados.get("itens")).__name__
        print(
            f"[AdversIA] AVISO: plano de provas sem itens válidos (campos: {sorted(dados)}, "
            f"'itens' do tipo {tipo_itens}).",
            file=sys.stderr,
        )
        return None
    itens.sort(key=lambda i: _ORDEM_PRIORIDADE[i["prioridade"]])
    return itens


def avaliar_resposta_audiencia(
    documentos: dict[str, str], tese: str, pergunta: str, resposta: str
) -> dict:
    """Simulação de audiência: avalia a resposta do advogado e devolve a réplica.

    Avaliação ancorada só nos documentos do caso; os trechos de apoio são conferidos no
    texto original, como nas citações do relatório.
    """
    prompt = _carregar_prompt("07_simulacao_audiencia.md")
    prompt = prompt.replace("<<TESE>>", tese)
    prompt = prompt.replace("<<DOCUMENTOS>>", _formatar_documentos(documentos))
    prompt = prompt.replace("<<PERGUNTA>>", pergunta)
    prompt = prompt.replace("<<RESPOSTA>>", resposta)
    dados = chamar_llm_estruturado(
        "raciocinio_adversarial",
        prompt,
        tool_name="registrar_avaliacao_audiencia",
        tool_description="Registra a avaliação da resposta do advogado e a réplica da parte contrária.",
        schema=SIMULACAO_AUDIENCIA_SCHEMA,
        max_tokens=2048,
    )

    textos = _indexar_documentos(documentos)
    apoio = []
    for citacao in _somente_dicts(dados.get("apoio_nos_documentos", [])):
        nome = _texto(citacao.get("documento"))
        if nome.lower() not in textos:
            continue
        trecho = _texto(citacao.get("trecho"))
        apoio.append(
            {
                "documento": nome,
                "trecho": trecho,
                "conferido": _trecho_consta(trecho, textos[nome.lower()]),
            }
        )

    avaliacao = dados.get("avaliacao")
    resultado = {
        "avaliacao": avaliacao if avaliacao in _AVALIACOES_AUDIENCIA else "parcial",
        "resumo": _texto(dados.get("resumo")),
        "pontos_fortes": _lista_de_textos(dados.get("pontos_fortes")),
        "pontos_frageis": _lista_de_textos(dados.get("pontos_frageis")),
        "sugestao": _texto(dados.get("sugestao")),
        "apoio_nos_documentos": apoio,
        "replica": _texto(dados.get("replica")),
    }
    imprimir_resumo_uso()
    return resultado


def montar_relatorio(
    case_model: CaseModel,
    tese: str,
    findings: list[Finding],
    linha_do_tempo: list[dict] | None = None,
    plano_de_provas: list[dict] | None = None,
) -> VulnerabilityReport:
    """Monta o VulnerabilityReport final."""

    def contar(n: int, singular: str, plural: str) -> str:
        return f"{n} {singular if n == 1 else plural}"

    # Frase lida pelo advogado no topo do relatório — linguagem natural, sem "(s)".
    resumo = (
        f"Lemos {contar(len(case_model.documentos), 'documento', 'documentos')} e "
        f"identificamos {contar(len(case_model.partes), 'parte', 'partes')}, "
        f"{contar(len(case_model.fatos), 'fato relevante', 'fatos relevantes')} e "
        f"{contar(len(case_model.pedidos), 'pedido', 'pedidos')}."
    )

    ordem_categoria = {
        Categoria.VULNERABILIDADE_CRITICA: 0,
        Categoria.CONTRADICAO: 1,
        Categoria.VULNERABILIDADE_MEDIA: 2,
        Categoria.LACUNA_PROBATORIA: 3,
        Categoria.CONTRA_ARGUMENTO: 4,
        Categoria.PERGUNTA_DIFICIL: 5,
    }
    findings_ordenados = sorted(
        findings, key=lambda f: ordem_categoria.get(f.categoria, 99)
    )

    return VulnerabilityReport(
        resumo_do_caso=resumo,
        tese_analisada=tese,
        findings=findings_ordenados,
        linha_do_tempo=linha_do_tempo or [],
        plano_de_provas=plano_de_provas,
    )


# Nomes das etapas como o advogado as vê na tela de progresso — na mesma ordem das
# chamadas em `analisar_caso`.
ETAPAS = [
    "Lendo os documentos do caso",
    "Relacionando cada alegação com as provas",
    "Procurando contradições",
    "Pensando como a parte contrária",
    "Conferindo cada apontamento nos documentos",
    "Montando o plano de provas",
]


def analisar_caso(
    documentos: dict[str, str],
    tese: str,
    ao_avancar: Callable[[int], None] | None = None,
) -> VulnerabilityReport:
    """Orquestra o pipeline completo e devolve o relatório final.

    `ao_avancar(n)` é chamado no início de cada etapa (1 a 6, ver ETAPAS), para a tela
    mostrar o progresso real em vez de uma espera sem retorno.
    """

    def avancar(etapa: int) -> None:
        if ao_avancar is not None:
            ao_avancar(etapa)

    avancar(1)
    case_model = extrair_case_model(documentos, tese)
    linha_do_tempo = montar_linha_do_tempo(case_model, documentos)
    avancar(2)
    evidence_mapping = mapear_evidencias(case_model)
    avancar(3)
    contradicoes = detectar_contradicoes(case_model)
    avancar(4)
    motor = gerar_motor_adversarial(case_model, contradicoes, evidence_mapping)
    avancar(5)
    candidatos = _montar_candidatos(contradicoes, evidence_mapping, motor)
    findings = verificar_candidatos(case_model, candidatos, documentos)
    avancar(6)
    plano = gerar_plano_de_provas(case_model, tese, findings)
    relatorio = montar_relatorio(
        case_model, tese, findings, linha_do_tempo=linha_do_tempo, plano_de_provas=plano
    )
    imprimir_resumo_uso()  # custo acumulado real (medido pela API), não estimado
    return relatorio
