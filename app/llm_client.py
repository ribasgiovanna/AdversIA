"""Único ponto de acoplamento com o provedor de LLM (ADR-004, docs/DECISIONS.md).

Nenhum outro módulo deve importar `anthropic`/`openai` diretamente — toda chamada ao
modelo passa por `chamar_llm()`/`chamar_llm_estruturado()`, para que trocar de provedor
não exija reescrever o pipeline (Constituição, Princípio IV).

Provedor ativo controlado pela variável de ambiente `LLM_PROVIDER`:
- "anthropic" (padrão) — Claude, via SDK `anthropic`, tool use nativo.
- "groq" — modelos abertos via Groq (tier gratuito), usando o SDK `openai` apontado para
  o endpoint compatível da Groq (ADR-009, docs/DECISIONS.md) — para testar o pipeline sem
  custo enquanto o crédito da Anthropic não está disponível.
- "gemini" — Google Gemini (tier gratuito), via SDK `google-genai` (ADR-010,
  docs/DECISIONS.md) — usado para fechar casos de teste quando a cota gratuita da Groq
  se esgota no mesmo dia.
"""

from __future__ import annotations

import contextlib
import contextvars
import json
import os
import sys

import anthropic

_MODELOS_POR_PROVEDOR = {
    "anthropic": {
        # Extração/sumarização: velocidade e custo importam mais que raciocínio profundo.
        "extracao": "claude-haiku-4-5-20251001",
        "sumarizacao": "claude-haiku-4-5-20251001",
        # Raciocínio adversarial e verificação: qualidade é o valor central do produto
        # (docs/ADVERSIA_PROJECT_FOUNDATION_V1.md, §18) — reservar o modelo mais forte.
        "raciocinio_adversarial": "claude-sonnet-5",
        "verificacao": "claude-sonnet-5",
    },
    "groq": {
        # Modelos confirmados via `client.models.list()` (a doc pública citava
        # llama-3.1-8b-instant/llama-3.3-70b-versatile, mas não estavam mais
        # acessíveis nesta conta em 12/09/2026 — lista real da API prevalece).
        #
        # TEMPORÁRIO (12/09, noite): as 4 tarefas usam gpt-oss-20b, não só extração —
        # a cota diária gratuita do gpt-oss-120b esgotou depois dos testes de hoje
        # (197.856/200.000 tokens). Isso reduz a sofisticação do raciocínio
        # adversarial/verificação durante o teste externo com link público. Reverter
        # "raciocinio_adversarial"/"verificacao" para "openai/gpt-oss-120b" assim que a
        # cota resetar (ou trocar de provedor de novo).
        "extracao": "openai/gpt-oss-20b",
        "sumarizacao": "openai/gpt-oss-20b",
        "raciocinio_adversarial": "openai/gpt-oss-20b",
        "verificacao": "openai/gpt-oss-20b",
    },
    "gemini": {
        # gemini-3.6-flash escolhido por ser o modelo rápido/gratuito mais recente
        # confirmado no momento da implementação (12/09/2026) — mesmo padrão da Groq:
        # confirmar contra `client.models.list()` da conta real antes de confiar cego.
        "extracao": "gemini-3.6-flash",
        "sumarizacao": "gemini-3.6-flash",
        "raciocinio_adversarial": "gemini-3.6-flash",
        "verificacao": "gemini-3.6-flash",
    },
}

_MODELO_PADRAO_POR_PROVEDOR = {
    "anthropic": "claude-sonnet-5",
    "groq": "openai/gpt-oss-120b",
    "gemini": "gemini-3.6-flash",
}

_client_anthropic: anthropic.Anthropic | None = None
_client_groq = None  # type: ignore[var-annotated]  # openai.OpenAI, importado sob demanda
_client_gemini = None  # type: ignore[var-annotated]  # google.genai.Client, importado sob demanda

# Preço por milhão de tokens (USD). Fonte: claude.com/pricing, consultado em 12/09/2026
# (docs/COSTS.md, Constituição Princípio II — nunca inventar preço; reconsultar a
# página oficial se muito tempo tiver passado desde essa data). Modelos Groq no tier
# gratuito não têm custo por token no momento — 0.0 é o preço real do tier atual, não
# uma omissão.
_PRECOS_POR_MILHAO_USD = {
    "claude-sonnet-5": {"input": 2.0, "output": 10.0},
    "claude-haiku-4-5-20251001": {"input": 1.0, "output": 5.0},
    "openai/gpt-oss-20b": {"input": 0.0, "output": 0.0},
    "openai/gpt-oss-120b": {"input": 0.0, "output": 0.0},
    "gemini-3.6-flash": {"input": 0.0, "output": 0.0},
}

# Acumulado desde o início do processo — cada chamada real ao modelo soma aqui.
_uso_acumulado: dict[str, dict[str, int]] = {}


# Chave da Anthropic do próprio usuário na requisição atual (análise real no site). Vale só
# dentro de `usar_chave_anthropic`, tem prioridade sobre a variável de ambiente e força o
# provedor Anthropic. É um ContextVar para nunca vazar de uma requisição para outra.
_chave_anthropic_da_requisicao: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "chave_anthropic_da_requisicao", default=None
)


@contextlib.contextmanager
def usar_chave_anthropic(chave: str):
    marcador = _chave_anthropic_da_requisicao.set(chave)
    try:
        yield
    finally:
        _chave_anthropic_da_requisicao.reset(marcador)


def _provedor_ativo() -> str:
    if _chave_anthropic_da_requisicao.get():
        return "anthropic"
    return os.environ.get("LLM_PROVIDER", "anthropic").strip().lower()


def _registrar_uso(modelo: str, input_tokens: int, output_tokens: int) -> None:
    registro = _uso_acumulado.setdefault(modelo, {"input_tokens": 0, "output_tokens": 0})
    registro["input_tokens"] += input_tokens
    registro["output_tokens"] += output_tokens


def resumo_uso() -> dict:
    """Uso acumulado (tokens reais medidos pela API) e custo estimado com o preço
    atual (ver _PRECOS_POR_MILHAO_USD). Isto é medido, não estimado — ao contrário do
    número de tokens, que a API só informa depois da chamada."""
    total_usd = 0.0
    detalhe = {}
    for modelo, uso in _uso_acumulado.items():
        precos = _PRECOS_POR_MILHAO_USD.get(modelo, {"input": 0.0, "output": 0.0})
        custo_modelo = (
            uso["input_tokens"] / 1_000_000 * precos["input"]
            + uso["output_tokens"] / 1_000_000 * precos["output"]
        )
        total_usd += custo_modelo
        detalhe[modelo] = {**uso, "custo_usd_estimado": round(custo_modelo, 6)}
    return {"por_modelo": detalhe, "custo_total_usd_estimado": round(total_usd, 6)}


def imprimir_resumo_uso() -> None:
    resumo = resumo_uso()
    print(
        f"[AdversIA] custo acumulado nesta execução ({_provedor_ativo()}): "
        f"US$ {resumo['custo_total_usd_estimado']:.4f} "
        f"({resumo['por_modelo']})",
        file=sys.stderr,
    )


class LLMConfigError(RuntimeError):
    """Levantado quando a configuração do provedor de LLM está ausente/inválida."""


def _get_anthropic_client() -> anthropic.Anthropic:
    global _client_anthropic
    chave_do_usuario = _chave_anthropic_da_requisicao.get()
    if chave_do_usuario:
        # Um cliente por requisição: a chave de um usuário nunca é reaproveitada para outro.
        return anthropic.Anthropic(api_key=chave_do_usuario)
    if _client_anthropic is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise LLMConfigError(
                "ANTHROPIC_API_KEY não está definida no ambiente. Defina a variável "
                "antes de iniciar o servidor (ver quickstart.md)."
            )
        _client_anthropic = anthropic.Anthropic(api_key=api_key)
    return _client_anthropic


def _get_groq_client():
    global _client_groq
    if _client_groq is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise LLMConfigError(
                "GROQ_API_KEY não está definida no ambiente, mas LLM_PROVIDER=groq. "
                "Crie uma chave gratuita em console.groq.com/keys e defina a variável "
                "(ver .env.example)."
            )
        import openai  # import local: só é uma dependência real se groq for usado

        _client_groq = openai.OpenAI(
            base_url="https://api.groq.com/openai/v1", api_key=api_key
        )
    return _client_groq


def _get_gemini_client():
    global _client_gemini
    if _client_gemini is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise LLMConfigError(
                "GEMINI_API_KEY não está definida no ambiente, mas LLM_PROVIDER=gemini. "
                "Crie uma chave gratuita em aistudio.google.com/apikey e defina a "
                "variável (ver .env.example)."
            )
        from google import genai

        _client_gemini = genai.Client(api_key=api_key)
    return _client_gemini


def verificar_configuracao() -> None:
    """Valida a presença da chave de API do provedor ativo cedo (na subida do
    servidor), não na 1ª request. Levanta LLMConfigError com mensagem clara se ausente.
    """
    provedor = _provedor_ativo()
    if provedor == "groq":
        if not os.environ.get("GROQ_API_KEY"):
            raise LLMConfigError(
                "LLM_PROVIDER=groq, mas GROQ_API_KEY não está definida. Crie uma chave "
                "gratuita em console.groq.com/keys e defina a variável, por exemplo:\n"
                "  PowerShell: $env:GROQ_API_KEY = 'sua-chave-aqui'\n"
                "  Bash:       export GROQ_API_KEY='sua-chave-aqui'"
            )
        return
    if provedor == "gemini":
        if not os.environ.get("GEMINI_API_KEY"):
            raise LLMConfigError(
                "LLM_PROVIDER=gemini, mas GEMINI_API_KEY não está definida. Crie uma "
                "chave gratuita em aistudio.google.com/apikey e defina a variável, por "
                "exemplo:\n"
                "  PowerShell: $env:GEMINI_API_KEY = 'sua-chave-aqui'\n"
                "  Bash:       export GEMINI_API_KEY='sua-chave-aqui'"
            )
        return
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise LLMConfigError(
            "ANTHROPIC_API_KEY não está definida no ambiente. Defina a variável antes "
            "de iniciar o servidor, por exemplo:\n"
            "  PowerShell: $env:ANTHROPIC_API_KEY = 'sua-chave-aqui'\n"
            "  Bash:       export ANTHROPIC_API_KEY='sua-chave-aqui'\n"
            "Ver specs/001-adversarial-vulnerability-report/quickstart.md."
        )


def chamar_llm(tarefa: str, prompt: str, *, max_tokens: int = 4096) -> str:
    """Chama o LLM para uma tarefa nomeada e devolve o texto de resposta (sem tool use).

    Não usada pelo pipeline atual (todas as etapas usam `chamar_llm_estruturado`);
    mantida por simetria da API. Só suporta o provedor Anthropic.
    """
    modelo = _MODELOS_POR_PROVEDOR["anthropic"].get(tarefa, _MODELO_PADRAO_POR_PROVEDOR["anthropic"])
    client = _get_anthropic_client()
    resposta = client.messages.create(
        model=modelo,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    _registrar_uso(modelo, resposta.usage.input_tokens, resposta.usage.output_tokens)
    partes_texto = [bloco.text for bloco in resposta.content if bloco.type == "text"]
    return "".join(partes_texto)


class LLMStructuredOutputError(RuntimeError):
    """Levantado quando o modelo não devolve o tool_use estruturado esperado."""


def _desserializar_campos(dados, schema: dict) -> dict:
    """Converte de volta campos que o modelo devolveu como TEXTO JSON dentro da tool call.

    Em saídas grandes, o modelo às vezes entrega um array/objeto aninhado como string
    ('[{"prova": ...}]') em vez da estrutura. Sem isto, o campo vira lista vazia mais
    adiante e o resultado some sem erro nenhum (visto no plano de provas em 13/09/2026).
    """
    if not isinstance(dados, dict):
        return {}
    propriedades = schema.get("properties", {})
    corrigido = dict(dados)
    for chave, valor in dados.items():
        tipo = propriedades.get(chave, {}).get("type")
        if tipo not in ("array", "object") or not isinstance(valor, str):
            continue
        try:
            convertido = json.loads(valor)
        except json.JSONDecodeError:
            continue
        if isinstance(convertido, list if tipo == "array" else dict):
            corrigido[chave] = convertido
    return corrigido


def chamar_llm_estruturado(
    tarefa: str,
    prompt: str,
    *,
    tool_name: str,
    tool_description: str,
    schema: dict,
    max_tokens: int = 8192,
) -> dict:
    """Chama o LLM forçando saída estruturada via tool use (function calling).

    Evita por construção a classe de erro "JSON malformado devolvido como texto livre"
    (aspas não escapadas, string cortada, etc.) — o SDK já valida/parseia o argumento da
    tool call. `tarefa` seleciona o modelo (por provedor) mas nunca a lógica de negócio —
    quem chama isto não sabe (nem precisa saber) qual provedor/formato está por trás.
    """
    provedor = _provedor_ativo()
    modelos = _MODELOS_POR_PROVEDOR.get(provedor, _MODELOS_POR_PROVEDOR["anthropic"])
    modelo = modelos.get(tarefa, _MODELO_PADRAO_POR_PROVEDOR.get(provedor, "claude-sonnet-5"))

    if provedor == "groq":
        return _desserializar_campos(_chamar_groq_estruturado(
            modelo, prompt, tool_name=tool_name, tool_description=tool_description,
            schema=schema, max_tokens=max_tokens,
        ), schema)

    if provedor == "gemini":
        return _desserializar_campos(_chamar_gemini_estruturado(
            modelo, prompt, tool_name=tool_name, tool_description=tool_description,
            schema=schema, max_tokens=max_tokens,
        ), schema)

    client = _get_anthropic_client()
    resposta = client.messages.create(
        model=modelo,
        max_tokens=max_tokens,
        tools=[
            {
                "name": tool_name,
                "description": tool_description,
                "input_schema": schema,
            }
        ],
        tool_choice={"type": "tool", "name": tool_name},
        messages=[{"role": "user", "content": prompt}],
    )
    _registrar_uso(modelo, resposta.usage.input_tokens, resposta.usage.output_tokens)
    if resposta.stop_reason == "max_tokens":
        print(
            f"[AdversIA] AVISO: resposta cortada no limite de {max_tokens} tokens "
            f"(tarefa '{tarefa}', ferramenta '{tool_name}') — o resultado pode estar incompleto.",
            file=sys.stderr,
        )
    for bloco in resposta.content:
        if bloco.type == "tool_use" and bloco.name == tool_name:
            return _desserializar_campos(bloco.input, schema)
    raise LLMStructuredOutputError(
        f"O modelo não devolveu a tool_use esperada ('{tool_name}') para a tarefa "
        f"'{tarefa}'. Resposta bruta: {resposta.content!r}"
    )


def _chamar_groq_estruturado(
    modelo: str,
    prompt: str,
    *,
    tool_name: str,
    tool_description: str,
    schema: dict,
    max_tokens: int,
    max_tentativas: int = 3,
) -> dict:
    """Mesma função de `chamar_llm_estruturado`, mas no formato de tool calling da API
    compatível com OpenAI usada pela Groq (ADR-009). Isolada aqui para que o resto do
    pipeline nunca precise saber que o formato de request é diferente por provedor.

    Inclui retry para duas falhas observadas em 12/09/2026 ao rodar os 14 casos do
    golden_dataset contra modelos abertos da Groq — nenhuma delas é bug do nosso código:
    (a) `tool_use_failed` (400): o próprio Groq rejeita a geração do modelo por ela não
        ser JSON válido antes mesmo de nos devolver — variância do modelo aberto, uma
        nova tentativa com o mesmo prompt costuma resolver;
    (b) `rate_limit_exceeded` (429): limite de tokens por minuto/dia do tier gratuito —
        uma pequena espera pode ajudar se for o limite por minuto; se for o limite
        diário, o retry falha nas mesmas condições e o erro é propagado (não há como
        contornar uma cota diária esgotada).
    """
    import time as _time

    import openai as _openai_sdk

    client = _get_groq_client()
    ultimo_erro: Exception | None = None
    resposta = None

    for tentativa in range(max_tentativas):
        try:
            resposta = client.chat.completions.create(
                model=modelo,
                max_tokens=max_tokens,
                tools=[
                    {
                        "type": "function",
                        "function": {
                            "name": tool_name,
                            "description": tool_description,
                            "parameters": schema,
                        },
                    }
                ],
                tool_choice={"type": "function", "function": {"name": tool_name}},
                messages=[{"role": "user", "content": prompt}],
            )
            break
        except _openai_sdk.BadRequestError as exc:
            ultimo_erro = exc
            continue
        except _openai_sdk.RateLimitError as exc:
            ultimo_erro = exc
            if tentativa < max_tentativas - 1:
                _time.sleep(5)
            continue
    else:
        raise ultimo_erro  # type: ignore[misc]

    uso = resposta.usage
    if uso is not None:
        _registrar_uso(modelo, uso.prompt_tokens, uso.completion_tokens)

    mensagem = resposta.choices[0].message
    tool_calls = mensagem.tool_calls or []
    for chamada in tool_calls:
        if chamada.function.name == tool_name:
            return json.loads(chamada.function.arguments)
    raise LLMStructuredOutputError(
        f"O modelo Groq não devolveu a tool call esperada ('{tool_name}'). "
        f"Resposta bruta: {mensagem!r}"
    )


def _chamar_gemini_estruturado(
    modelo: str,
    prompt: str,
    *,
    tool_name: str,
    tool_description: str,
    schema: dict,
    max_tokens: int,
    max_tentativas: int = 3,
) -> dict:
    """Mesma função de `chamar_llm_estruturado`, mas no formato de function calling do
    Gemini (SDK `google-genai`, ADR-010, docs/DECISIONS.md) — isolada aqui para que o
    resto do pipeline nunca precise saber que o formato de request é diferente por
    provedor.
    """
    from google.genai import errors as genai_errors
    from google.genai import types

    client = _get_gemini_client()

    config = types.GenerateContentConfig(
        tools=[
            types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name=tool_name,
                        description=tool_description,
                        parameters_json_schema=schema,
                    )
                ]
            )
        ],
        tool_config=types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(
                mode="ANY",
                allowed_function_names=[tool_name],
            )
        ),
        max_output_tokens=max_tokens,
    )

    ultimo_erro: Exception | None = None
    resposta = None
    for tentativa in range(max_tentativas):
        try:
            resposta = client.models.generate_content(
                model=modelo, contents=prompt, config=config
            )
            break
        except genai_errors.APIError as exc:
            # Cota/limite de taxa do tier gratuito ou erro transitório do servidor —
            # mesma filosofia da Groq (_chamar_groq_estruturado): retry imediato pode
            # ajudar se for um limite por minuto; se for cota diária, falha de novo e
            # propaga (nada a fazer sem esperar ou trocar de provedor).
            ultimo_erro = exc
            continue
    else:
        raise ultimo_erro  # type: ignore[misc]

    uso = getattr(resposta, "usage_metadata", None)
    if uso is not None:
        _registrar_uso(
            modelo,
            uso.prompt_token_count or 0,
            uso.candidates_token_count or 0,
        )

    if resposta.candidates:
        for part in resposta.candidates[0].content.parts:
            chamada = getattr(part, "function_call", None)
            if chamada is not None and chamada.name == tool_name:
                return dict(chamada.args)
    raise LLMStructuredOutputError(
        f"O modelo Gemini não devolveu a function_call esperada ('{tool_name}'). "
        f"Resposta bruta: {resposta!r}"
    )
