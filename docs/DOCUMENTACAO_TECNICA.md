# AdversIA: documentação técnica

> Documento para auditoria técnica. Descreve arquitetura, módulos, contratos, fluxo de
> dados, segurança, testes e limitações do protótipo apresentado no Hackathon da Cidadania
> OAB/PR 2026. Reflete o código do repositório `ribasgiovanna/AdversIA`, branch `main`,
> em 13/09/2026. Quando um item não foi verificado, o texto diz isso.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Stack e dependências](#3-stack-e-dependências)
4. [Estrutura do repositório](#4-estrutura-do-repositório)
5. [Fluxo ponta a ponta de uma análise](#5-fluxo-ponta-a-ponta-de-uma-análise)
6. [Módulos do back-end](#6-módulos-do-back-end)
7. [Contrato da API HTTP](#7-contrato-da-api-http)
8. [O pipeline de análise em detalhe](#8-o-pipeline-de-análise-em-detalhe)
9. [Front-end](#9-front-end)
10. [Garantias de confiabilidade das respostas](#10-garantias-de-confiabilidade-das-respostas)
11. [Segurança](#11-segurança)
12. [Dados pessoais e LGPD](#12-dados-pessoais-e-lgpd)
13. [Acessibilidade (implementação)](#13-acessibilidade-implementação)
14. [Desempenho e custo medidos](#14-desempenho-e-custo-medidos)
15. [Testes e validação](#15-testes-e-validação)
16. [Configuração, execução e hospedagem](#16-configuração-execução-e-hospedagem)
17. [Governança do projeto e decisões registradas](#17-governança-do-projeto-e-decisões-registradas)
18. [Limitações conhecidas e riscos](#18-limitações-conhecidas-e-riscos)
19. [Evolução recomendada para produção](#19-evolução-recomendada-para-produção)

---

## 1. Visão geral

**Problema.** Em Direito de Família (divórcio, partilha, pensão, guarda), o advogado que
constrói uma tese tende a não enxergar as próprias fragilidades: datas que não batem,
alegações sem prova, perguntas difíceis que surgem só na audiência.

**Solução.** Aplicação web que recebe os documentos do caso e a tese do advogado e usa
modelos de linguagem (LLMs) para produzir uma **revisão adversarial**, isto é, a análise do
caso do ponto de vista da parte contrária. A saída tem quatro partes:

| Parte | O que entrega |
|---|---|
| Pontos vulneráveis | Contradições, lacunas probatórias, contra-argumentos e perguntas difíceis, cada um com rótulo de proveniência e citação do documento |
| Linha do tempo | Fatos datados, ordenados, com a parte que afirma e as divergências entre versões |
| Plano de provas | Provas a produzir, com prioridade, forma lícita de obtenção e vínculo com os apontamentos |
| Simulação de audiência | A IA pergunta como advogado da parte contrária, avalia a resposta do advogado com base só nos documentos e devolve a réplica |

**Princípio de projeto central.** O sistema **não decide o mérito** e não substitui o
advogado. Toda afirmação carrega a sua origem, e cada trecho citado é **conferido por
código** no texto do documento enviado (seção 10).

**Status.** Protótipo de hackathon (MVP). Sem autenticação, sem banco de dados, rodando num
notebook e exposto por túnel público temporário (seção 16).

---

## 2. Arquitetura

```
┌──────────────────────────── Navegador (qualquer dispositivo) ───────────────────────────┐
│  index.html + app.js + style.css  (SPA sem framework, sem build)                         │
│  - formulário de upload/tese, filtro de casos de exemplo                                 │
│  - tela de progresso (polling a cada 1,5 s)                                              │
│  - relatório em 4 abas; simulação de audiência                                           │
│  - acessibilidade: VLibras (script externo gov.br), tema, fonte, contraste, voz          │
└──────────────┬───────────────────────────────────────────────────────────────────────────┘
               │ HTTPS (terminado na Cloudflare)
┌──────────────▼──────────────┐
│ Cloudflare Quick Tunnel     │  cloudflared no mesmo notebook, URL *.trycloudflare.com
└──────────────┬──────────────┘
               │ HTTP → localhost:8000
┌──────────────▼───────────────────────────────────────────────────────────────────────────┐
│ app/server.py  (http.server da biblioteca padrão, ThreadingHTTPServer)                   │
│  - arquivos estáticos · API JSON · parsing multipart                                     │
│  - registro de análises em memória (dict + threading.Lock, máx. 50)                      │
│  - uma thread de trabalho por análise                                                    │
│        │                                                                                 │
│        ├─ app/document_reader.py   PDF (pypdf) · DOCX (python-docx) · TXT/MD             │
│        ├─ app/multipart_parser.py  multipart/form-data (substitui o módulo cgi)          │
│        └─ app/pipeline.py          6 etapas + simulação + conferência de trechos         │
│               │                                                                          │
│               ├─ app/prompts/*.md        instruções por etapa + contexto de domínio      │
│               ├─ app/tool_schemas.py     JSON Schema de saída de cada etapa              │
│               ├─ app/schemas.py          modelos de dados (dataclasses)                  │
│               └─ app/llm_client.py       ÚNICO ponto de acoplamento com o provedor de IA │
└───────────────────────────────────────────────┬──────────────────────────────────────────┘
                                                │ HTTPS (SDKs oficiais)
                         ┌──────────────────────┼──────────────────────┐
                   Anthropic (padrão)      Groq (testes)        Google Gemini (testes)
                   Claude Sonnet 5 +       gpt-oss-20b          gemini-3.6-flash
                   Claude Haiku 4.5
```

**Decisões estruturais** (detalhes na seção 17):

- **Sem framework web e sem banco** (ADR-001). É um servidor de biblioteca padrão com estado
  só em memória. Escolhido pelo prazo do hackathon e pela superfície mínima.
- **Saída estruturada por tool use / function calling** (ADR-007). Nenhuma etapa pede JSON
  como texto livre: o modelo é obrigado a chamar uma "ferramenta" cujo parâmetro é
  validado por JSON Schema.
- **Provedor de IA isolado** (ADR-004). Trocar Anthropic, Groq ou Gemini é uma variável de
  ambiente; o pipeline não conhece o provedor.

---

## 3. Stack e dependências

| Item | Versão / valor | Uso |
|---|---|---|
| Python | 3.13 (validado em 3.13.15) | back-end inteiro |
| `anthropic` | `>=0.40,<1.0` | provedor padrão (Claude) |
| `pypdf` | `>=5.0,<7.0` (validado 6.18.1) | extração de texto de PDF |
| `python-docx` | `>=1.1,<2.0` | extração de texto de .docx |
| `openai` | `>=1.50,<2.0` | só se `LLM_PROVIDER=groq` (API compatível) |
| `google-genai` | `>=1.0,<2.0` | só se `LLM_PROVIDER=gemini` |
| `pytest` | `>=8.0,<9.0` | testes |
| Front-end | HTML5, CSS, JavaScript puro (ES2020+) | sem framework, sem bundler, sem `npm` |
| Recursos externos no navegador | Google Fonts (Atkinson Hyperlegible, Lexend); script VLibras de `vlibras.gov.br` | tipografia e Libras |
| Exposição pública | `cloudflared` (Cloudflare Quick Tunnel), instalado via winget | URL HTTPS temporária |

A biblioteca padrão cobre HTTP (`http.server`), threads, JSON, regex, `uuid`, `unicodedata`.
**Não há** Flask/FastAPI, ORM, banco, fila, cache externo nem `python-dotenv` (há um
carregador próprio de `.env`, seção 6.8).

---

## 4. Estrutura do repositório

```
app/
  __init__.py
  server.py               servidor HTTP, rotas, registro de análises (445 linhas)
  pipeline.py             orquestração das etapas, conferência de trechos (565)
  llm_client.py           provedores de IA, contagem de uso/custo (471)
  tool_schemas.py         JSON Schemas das saídas estruturadas (215)
  schemas.py              dataclasses: CaseModel, Finding, Citation, VulnerabilityReport (128)
  document_reader.py      extração de texto PDF/DOCX/TXT (104)
  multipart_parser.py     parser multipart/form-data (65)
  env.py                  carregador de .env (38)
  prompts/
    _dominio_familia.md   contexto de domínio + regras de escrita, prefixado em TODOS
    01_case_model.md      etapa 1: extração estruturada (+ linha do tempo)
    02_evidence_mapping.md etapa 2: alegação × evidência
    03_contradictions.md  etapa 3: contradições reais
    04_adversarial_engine.md etapa 4: contra-argumentos e perguntas difíceis
    05_verification.md    etapa 5: rótulo de proveniência e citações literais
    06_plano_de_provas.md etapa 6: plano de provas
    07_simulacao_audiencia.md simulação de audiência (sob demanda)
  static/
    index.html            estrutura da página (300)
    app.js                lógica do front-end (1.373)
    style.css             estilos, temas, acessibilidade, animações (1.186)
    logo-adversia.png, favicon.png
tests/
  conftest.py             carga de casos, cache de relatórios por caso, resumo de custo
  test_pipeline_*.py      testes contra a API real (seção 15)
golden_dataset/
  case_01/                caso genérico com contradição plantada
  case_familia_01..14/    casos fictícios de família: documentos .txt, tese.txt, gabarito.md
specs/001-adversarial-vulnerability-report/  spec, plan, data-model, contracts, research, quickstart
.specify/memory/constitution.md   constituição do projeto (5 princípios), spec-kit
docs/                     decisões (ADRs), conformidade, custos, riscos, métricas, testes, README técnico
requirements.txt · .env.example · .gitignore · README.md (versão para leigos)
```

---

## 5. Fluxo ponta a ponta de uma análise

```
Navegador                              server.py                       pipeline.py / llm_client.py
   │ POST /api/analises (multipart)       │                                   │
   │ ───────────────────────────────────▶ │ valida Content-Type/Length        │
   │                                      │ lê corpo (≤15 MB) e faz parsing   │
   │                                      │ extrai texto de cada arquivo      │
   │                                      │ cria registro {estado:processando}│
   │                                      │ inicia thread ───────────────────▶│ etapa 1 … etapa 6
   │ ◀─────────── 202 {id, etapas[6]} ─── │                                   │ (ao_avancar(n) atualiza
   │                                      │                                   │  etapa_atual sob lock)
   │ GET /api/analises/<id>  (a cada 1,5s)│                                   │
   │ ───────────────────────────────────▶ │ copia registro sob lock           │
   │ ◀── 200 {estado, etapa_atual, …} ─── │ remove campos internos            │
   │            …                         │                                   │
   │ ◀── 200 {estado:"concluida",         │ ◀──────────── VulnerabilityReport │
   │         relatorio:{…}} ───────────── │                                   │
   │ renderiza 4 abas                     │                                   │
   │ POST /api/analises/<id>/audiencia    │                                   │
   │ ───────────────────────────────────▶ │ busca documentos/tese em memória ▶│ avaliar_resposta_audiencia
   │ ◀── 200 {avaliacao, replica, …} ──── │ ◀─────────────────────────────────│
```

**Por que assíncrono.** Uma análise leva de 1,5 a 2,5 minutos (seção 14). Uma requisição
síncrona desse tamanho estoura timeouts de proxy/túnel e não dá retorno ao usuário. O
servidor devolve um id na hora e processa em thread; o front-end consulta o estado. A rota
síncrona original (`POST /api/analyze`) foi mantida por compatibilidade.

---

## 6. Módulos do back-end

### 6.1 `app/server.py`: servidor HTTP e API

**Responsabilidades:** servir o front-end, expor a API JSON, receber uploads, manter o
registro de análises e isolar o usuário de mensagens técnicas.

**Classe de servidor: `_ServidorSemBindDuplicado(ThreadingHTTPServer)`**
- `allow_reuse_address = False`: no Windows, `SO_REUSEADDR` (ligado por padrão no
  `http.server`) permite **dois processos escutando a mesma porta** sem erro, e as
  requisições caem em qualquer um dos dois. Isso causou uma falha real em 12/09/2026
  (processo antigo respondendo com código velho). Desligado, um segundo servidor falha ao
  subir com mensagem clara.
- `daemon_threads = True`: threads de requisição não seguram o encerramento do processo.
- Bind em `("localhost", 8000)`: **não escuta na rede local**; o acesso externo passa só pelo
  túnel.

**Inicialização: `main()`**
1. `verificar_configuracao()` valida, antes de abrir a porta, se existe a chave de API do
   provedor ativo. Sem chave, encerra com código 1 e instrução de como definir.
2. Tenta o bind; se a porta estiver ocupada, explica como achar e encerrar o processo.
3. `serve_forever()`; `Ctrl+C` chama `shutdown()`.

**Registro de análises (estado em memória)**
- `_ANALISES: dict[str, dict]`, protegido por `_ANALISES_TRAVA = threading.Lock()`.
- Cada registro contém `estado` (`processando` | `concluida` | `erro`), `etapa_atual`,
  `relatorio`, `erro`, `criada_em`, e os campos internos `_documentos` e `_tese`.
- Campos iniciados por `_` e `criada_em` **nunca são serializados** na resposta do GET.
- Limite `_MAX_ANALISES_GUARDADAS = 50`: ao criar a 51ª, remove a mais antiga
  (`min` por `criada_em`).
- Id: `uuid.uuid4().hex` (32 caracteres hexadecimais, 122 bits aleatórios). Validado por
  regex `^[0-9a-f]{32}$` antes de consultar o dicionário.

**`_iniciar_analise(documentos, tese)`**: cria o registro e dispara
`threading.Thread(daemon=True)`. A thread chama `pipeline.analisar_caso(..., ao_avancar=)`.
O callback atualiza `etapa_atual` sob o lock. Em exceção: `traceback.print_exc()` no log e
mensagem amigável no registro (`_mensagem_de_falha`: `LLMConfigError` vira "serviço
indisponível"; qualquer outra vira "não foi possível concluir a análise").

**Leitura do formulário: `_ler_formulario()`**
1. Exige `Content-Type` com `boundary` e `Content-Length > 0`; senão, 400.
2. `Content-Length > MAX_BODY_SIZE (15 MB)`: 413, **sem ler o corpo**.
3. Lê exatamente `Content-Length` bytes e faz o parsing multipart.
4. Para cada parte `documentos` com `filename`: aplica `Path(filename).name` (descarta
   qualquer caminho enviado pelo cliente) e chama `extrair_texto`. Erros de extração são
   **acumulados** e devolvidos juntos (400), para o usuário corrigir tudo de uma vez.
5. Sem documento válido: 400. Sem tese: 400.

**Arquivos estáticos: `_send_static()`**
- `/` serve `index.html`. O caminho é resolvido e só é servido se `STATIC_DIR.resolve()`
  estiver entre os pais do arquivo resolvido; isso **bloqueia path traversal** (`/../.env`
  devolve 404, testado).
- `Content-Type` por extensão (`.html .js .css .png .svg .ico`); o restante vai como
  `application/octet-stream`.
- Cabeçalhos: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `Cache-Control: no-cache` (estáticos) e `no-store` (JSON).

**Casos de exemplo: `EXEMPLOS`**
- Lista **fechada** de 14 entradas (`id → tipo, título, descrição, pasta`). O id da URL só
  é usado como chave do dicionário; **nunca vira caminho de arquivo**.
- `_carregar_exemplo(pasta)` lê todos os `.txt` da pasta, exceto `tese.txt`. O `gabarito.md`
  não é `.txt` e nunca é enviado.

**Simulação: `_responder_audiencia(analise_id)`**
- `Content-Length` entre 1 e 64 KB (`MAX_CORPO_AUDIENCIA`); JSON válido e objeto; senão, 400.
- `pergunta` truncada em 2.000 caracteres e `resposta` em 4.000.
- Só funciona para análise existente com `estado == "concluida"`; senão, 404.
- Chama `pipeline.avaliar_resposta_audiencia` de forma **síncrona** (cerca de 12 s).

**Mensagens ao usuário.** Constantes `MSG_*` em português simples. Detalhe técnico vai só
para `stderr`. `log_message` escreve o access log em `stderr` (IP e linha da requisição).

### 6.2 `app/pipeline.py`: orquestração e regras de confiabilidade

É o núcleo do produto. Funções públicas:

| Função | Etapa | Chama IA? | Tarefa (modelo) |
|---|---|---|---|
| `extrair_case_model(documentos, tese)` | 1 | sim | `extracao` (Haiku 4.5) |
| `montar_linha_do_tempo(case_model, documentos)` | 1 (derivada) | **não** | — |
| `mapear_evidencias(case_model)` | 2 | sim | `extracao` (Haiku 4.5) |
| `detectar_contradicoes(case_model)` | 3 | sim | `raciocinio_adversarial` (Sonnet 5) |
| `gerar_motor_adversarial(case_model, contradicoes, mapeamento)` | 4 | sim | `raciocinio_adversarial` (Sonnet 5) |
| `_montar_candidatos(...)` | 5 (preparo) | não | — |
| `verificar_candidatos(case_model, candidatos, documentos)` | 5 | sim | `verificacao` (Sonnet 5) |
| `gerar_plano_de_provas(case_model, tese, findings)` | 6 | sim | `raciocinio_adversarial` (Sonnet 5) |
| `montar_relatorio(...)` | final | não | — |
| `analisar_caso(documentos, tese, ao_avancar=None)` | orquestra 1 a 6 | — | — |
| `avaliar_resposta_audiencia(documentos, tese, pergunta, resposta)` | sob demanda | sim | `raciocinio_adversarial` (Sonnet 5) |

`ETAPAS` é a lista de 6 nomes em linguagem simples exibidos na tela de progresso, na
mesma ordem das chamadas.

**Montagem de prompt: `_carregar_prompt(nome)`** lê `prompts/<nome>` e **prefixa**
`_dominio_familia.md`, lido uma vez na importação. Os valores entram por
`str.replace` em marcadores `<<TESE>>`, `<<DOCUMENTOS>>`, `<<CASE_MODEL_JSON>>` etc.
Documentos são formatados como `--- nome.txt ---\n<conteúdo>`.

**Utilitários de robustez**
- `_somente_dicts(valor)`: mantém só itens `dict` de uma lista; qualquer outra coisa vira
  lista vazia. Evita que um item malformado derrube a análise com `AttributeError`.
- `_texto(valor)` e `_lista_de_textos(valor)`: normalizam strings e descartam tipos
  inesperados.
- `_indexar_documentos(documentos)`: dicionário `nome.lower() → texto`, para comparação de
  nomes sem diferença de maiúsculas.

**Conferência de trechos: `_trecho_consta(trecho, texto_documento)`** (detalhe na seção 10)
1. Normaliza os dois textos: Unicode NFKC, minúsculas, remove aspas (`" “ ” ‘ ’ ' « »`),
   `…` vira `...`, colapsa espaços e quebras de linha.
2. Divide o trecho por `...`, limpa pontuação das pontas e descarta pedaços com menos de 6
   caracteres.
3. Retorna `True` só se há ao menos um pedaço e **todos** existem como substring do
   documento.

**Etapa 1 com linha do tempo.** O schema da etapa 1 exige `linha_do_tempo` (data, data
ordenável, evento, quem afirma, documento, trecho literal, divergência). A mesma chamada
à IA gera a extração e a cronologia, sem custo de chamada adicional.
`montar_linha_do_tempo`:
- descarta eventos sem data, sem descrição ou cujo `documento` não é um arquivo enviado;
- aceita `data_ordenacao` só no formato `AAAA`, `AAAA-MM` ou `AAAA-MM-DD` (regex);
- confere o trecho (`trecho_conferido`);
- ordena de forma estável: primeiro os que têm data ordenável, em ordem cronológica; os
  demais vão para o fim, na ordem em que apareceram.

**Etapa 5: verificação**
- Recebe o Case Model, os **documentos originais** (para copiar trechos literais) e os
  candidatos (contradições, lacunas do mapeamento, contra-argumentos, perguntas).
- Converte `categoria` e `provenance` para os enums. Categoria inválida: item descartado.
  Provenance inválida: `UNVERIFIED`.
- **Ids únicos**: se o modelo repetir um id, recebe sufixo `-2`, `-3`… O plano de provas
  referencia apontamentos por id.
- **Filtro de citações**: só aceita citação cujo `documento` seja um arquivo realmente
  enviado. Motivo registrado: o modelo chegou a "citar" a estrutura interna
  (`documento: "case_model"`) para preencher o campo em lacunas probatórias.
- Cada citação recebe `conferido` (`True`/`False`) pela conferência de trechos.

**Etapa 6: plano de provas**
- Sem apontamentos: `[]`.
- Chamada com `max_tokens=16000`, porque planos longos chegaram a ser cortados com 8.192.
- Exceção na chamada: `traceback` no log e retorno `None`; o relatório segue sem o plano e
  a tela avisa.
- Pós-processamento: descarta itens sem `prova`; `prioridade` fora de `alta|media|baixa`
  vira `media`; `apontamentos` mantém **só ids existentes**; ordena por prioridade.
- **Plano vazio com apontamentos a resolver é tratado como falha (`None`)**, com log do
  tipo recebido. Isso impede a tela de dizer "nenhuma prova sugerida" quando a resposta
  veio malformada.

**Simulação: `avaliar_resposta_audiencia`**
- Prompt com tese, documentos, pergunta e resposta; a pergunta e a resposta ficam entre
  delimitadores `[INÍCIO DA …]` / `[FIM DA …]`, com instrução explícita para ignorar
  comandos dentro deles (mitigação de *prompt injection*, seção 11).
- `max_tokens=2048`. `avaliacao` fora de `convincente|parcial|fragil` vira `parcial`.
- `apoio_nos_documentos`: só documentos reais, cada um com `conferido`.

**`montar_relatorio`**
- Resumo em linguagem natural com pluralização correta (sem "(s)").
- Ordena os apontamentos por categoria: crítica, contradição, média, lacuna,
  contra-argumento, pergunta.
- Anexa `linha_do_tempo` e `plano_de_provas` (lista, ou `None` se falhou).

**`analisar_caso`** chama `ao_avancar(n)` no início de cada etapa (1 a 6) e, ao final,
`imprimir_resumo_uso()` (custo acumulado no log).

### 6.3 `app/llm_client.py`: provedores de IA

**Único módulo que importa SDK de IA** (ADR-004). O resto do código chama só
`chamar_llm_estruturado(tarefa, prompt, tool_name, tool_description, schema, max_tokens)`.

**Seleção de provedor:** `LLM_PROVIDER` (`anthropic` padrão, `groq`, `gemini`).

**Mapeamento tarefa → modelo** (`_MODELOS_POR_PROVEDOR`)

| Tarefa | Anthropic | Groq | Gemini |
|---|---|---|---|
| `extracao` | `claude-haiku-4-5-20251001` | `openai/gpt-oss-20b` | `gemini-3.6-flash` |
| `sumarizacao` | `claude-haiku-4-5-20251001` | `openai/gpt-oss-20b` | `gemini-3.6-flash` |
| `raciocinio_adversarial` | `claude-sonnet-5` | `openai/gpt-oss-20b`* | `gemini-3.6-flash` |
| `verificacao` | `claude-sonnet-5` | `openai/gpt-oss-20b`* | `gemini-3.6-flash` |

\* Temporário, registrado no código: o ideal é `gpt-oss-120b`, trocado porque a cota
gratuita diária da Groq (200 mil tokens por **conta**) esgotou. Groq e Gemini foram usados
só para testes sem custo; **a demonstração usa Anthropic.**

**Caminho Anthropic**
- `client.messages.create(..., tools=[{name, description, input_schema: schema}],
  tool_choice={"type": "tool", "name": tool_name})`: o modelo é **obrigado** a chamar a
  ferramenta.
- Registra tokens de entrada e saída.
- `stop_reason == "max_tokens"`: grava aviso no log (resposta possivelmente incompleta).
- Retorna o `input` do bloco `tool_use` depois de `_desserializar_campos`.
- Sem bloco `tool_use`: `LLMStructuredOutputError`, com a resposta bruta na mensagem.
- Novas tentativas: comportamento padrão do SDK `anthropic`; o projeto não define
  retry próprio para esse provedor.

**Caminho Groq** (API compatível com OpenAI, `base_url=https://api.groq.com/openai/v1`)
- `tools=[{type: function, function: {name, description, parameters: schema}}]` e
  `tool_choice` forçado.
- Até 3 tentativas: `BadRequestError` (ex.: `tool_use_failed`, JSON inválido gerado pelo
  modelo aberto) tenta de novo na hora; `RateLimitError` espera 5 s. Esgotado, propaga o
  último erro.
- `json.loads(arguments)` da tool call.

**Caminho Gemini** (`google-genai`)
- `FunctionDeclaration(parameters_json_schema=schema)` e
  `FunctionCallingConfig(mode="ANY", allowed_function_names=[tool_name])`.
- Até 3 tentativas em `genai_errors.APIError`.

**`_desserializar_campos(dados, schema)`**: se um campo que o schema declara `array` ou
`object` chegar como **string JSON**, converte de volta (só aceita se o tipo convertido
bater). Correção de um defeito real de 13/09/2026: o plano de provas chegou vazio sem erro.

**Clientes:** criados sob demanda e reutilizados (globais do módulo). Os SDKs de Groq e
Gemini são importados só se usados. Chave ausente: `LLMConfigError`.

**Uso e custo**
- `_registrar_uso(modelo, entrada, saída)` soma num dicionário global **por processo**
  (acumulado desde a subida do servidor, não por análise). Não há lock nessa soma; com
  análises simultâneas, a contagem pode perder incrementos. É um valor informativo, não
  cobrança.
- `_PRECOS_POR_MILHAO_USD`: Sonnet 5 US$ 2 entrada / US$ 10 saída; Haiku 4.5 US$ 1 / US$ 5
  (fonte: claude.com/pricing, consultada em 12/09/2026). Modelos gratuitos: 0,0.
- `resumo_uso()` e `imprimir_resumo_uso()`: relatório no log e no final da suíte de testes.

**Outros:** `verificar_configuracao()` (usada na subida); `chamar_llm()` (texto livre,
**não usada** pelo pipeline, mantida por simetria).

### 6.4 `app/tool_schemas.py`: contratos de saída da IA

JSON Schemas passados como parâmetro da ferramenta forçada. Todas as listas de itens têm
campos `required`, e campos categóricos usam `enum`.

| Schema | Campos principais |
|---|---|
| `CASE_MODEL_SCHEMA` | `case_id, partes[], tipo_de_acao, jurisdicao, fatos[], datas[], pedidos[], argumentos[], evidencias[], documentos[], questoes_juridicas[], informacoes_ausentes[], possiveis_contradicoes[], linha_do_tempo[{data, data_ordenacao, evento, quem_afirma, documento, trecho, divergencia}]` |
| `EVIDENCE_MAPPING_SCHEMA` | `mapeamentos[{alegacao, evidencia_encontrada, categoria ∈ {evidencia_mapeada, lacuna_probatoria}}]` |
| `CONTRADICTIONS_SCHEMA` | `contradicoes[{descricao, lado_a, lado_b, severidade ∈ {critica, media}}]` |
| `ADVERSARIAL_ENGINE_SCHEMA` | `contra_argumentos[{texto, baseado_em}], perguntas_dificeis[{texto, baseado_em}]` |
| `VERIFICATION_SCHEMA` | `findings[{id, categoria ∈ {contradicao, lacuna_probatoria, contra_argumento, pergunta_dificil}, texto, provenance ∈ {FACT, SOURCE, INFERENCE, ADVERSARIAL_HYPOTHESIS, UNVERIFIED}, origem[{documento, trecho}]}]` |
| `PLANO_DE_PROVAS_SCHEMA` | `itens[{prova, finalidade, como_obter, prioridade ∈ {alta, media, baixa}, apontamentos[]}]` |
| `SIMULACAO_AUDIENCIA_SCHEMA` | `avaliacao ∈ {convincente, parcial, fragil}, resumo, pontos_fortes[], pontos_frageis[], sugestao, apoio_nos_documentos[{documento, trecho}], replica` |

**Importante:** o schema garante o **formato**, não a **veracidade**. A veracidade é
tratada pelos filtros e pela conferência de trechos (seção 10).

### 6.5 `app/schemas.py`: modelos de dados

Dataclasses sem ORM:

- **`Provenance(str, Enum)`**: `FACT`, `SOURCE`, `INFERENCE`, `ADVERSARIAL_HYPOTHESIS`,
  `UNVERIFIED`.
- **`Categoria(str, Enum)`**: `vulnerabilidade_critica`, `vulnerabilidade_media`,
  `contradicao`, `lacuna_probatoria`, `contra_argumento`, `pergunta_dificil`. As duas
  primeiras existem no modelo e na ordenação, mas **o schema atual da etapa 5 não as
  produz**.
- **`Citation`**: `documento`, `trecho`, `pagina` (opcional), `conferido` (`True`, `False`
  ou `None` = não conferido).
- **`Finding`**: `id`, `categoria`, `texto`, `provenance`, `origem[Citation]`.
  **Invariante em `__post_init__`**: se `provenance` é `FACT` ou `SOURCE` e `origem` está
  vazia, é **rebaixado para `UNVERIFIED`**. Essa regra vale em qualquer ponto do código,
  mesmo se o modelo errar.
- **`CaseModel`**: estrutura extraída na etapa 1, incluindo `linha_do_tempo[dict]`.
- **`VulnerabilityReport`**: `resumo_do_caso`, `tese_analisada`, `findings`, `avisos`
  (dois avisos fixos, sempre presentes), `linha_do_tempo`, `plano_de_provas`
  (`list | None`), propriedade derivada `perguntas_dificeis`, e `to_dict()` para a API.

### 6.6 `app/document_reader.py`: extração de texto

`extrair_texto(nome_arquivo, conteudo: bytes) -> str`, com `ExtractionError(ValueError)`
e mensagens voltadas ao usuário (sem nome de biblioteca).

| Formato | Implementação | Observações |
|---|---|---|
| `.txt`, `.md` | tenta `utf-8-sig` e depois `cp1252` | arquivos do Bloco de Notas do Windows costumam vir em cp1252 |
| `.pdf` | `pypdf.PdfReader`; tenta `decrypt("")` se criptografado; junta `extract_text()` das páginas | PDF só imagem (escaneado) não tem texto e gera mensagem específica; **sem OCR** |
| `.docx` | `python-docx`: parágrafos e células de tabelas (`" | "` entre células) | `.doc` antigo não é suportado (mensagem pede salvar como .docx) |
| outros | recusado | mensagem lista os formatos aceitos |

Arquivo vazio ou sem texto extraível gera erro. Imports de `pypdf` e `docx` são tardios:
se a biblioteca faltar, o erro é amigável.

### 6.7 `app/multipart_parser.py`: parsing de upload

O Python 3.13 removeu o módulo `cgi` (PEP 594), então existe um parser mínimo próprio.
- `extrair_boundary(content_type)`: regex `boundary=(.+)$`, remove aspas.
- `parse_multipart(body, boundary)`: divide o corpo por `--boundary`, separa cabeçalhos do
  conteúdo por `\r\n\r\n`, remove o `\r\n` final e extrai `name` e `filename` do
  `Content-Disposition` por regex. Devolve `Part(name, filename, content)`.
- **Limitações declaradas:** não é um parser RFC 2046 completo. Não trata `filename*=`
  (RFC 5987), cabeçalhos dobrados nem boundary contido no conteúdo. É suficiente para o
  que um `<form>`/`FormData` de navegador gera. O corpo inteiro fica em memória (limitado a
  15 MB antes da leitura).

### 6.8 `app/env.py`: configuração

`carregar_dotenv()` lê `.env` na raiz, se existir. Ignora linhas vazias, comentários e
linhas sem `=`, e remove aspas simples ou duplas dos valores. **Chave repetida: vale a
última ocorrência.** Usa `os.environ.setdefault`, então **variável já exportada no shell
tem precedência** sobre o arquivo. Não depende de `python-dotenv`.

### 6.9 `app/prompts/`: instruções da IA

- **`_dominio_familia.md`** (prefixado em todas as etapas):
  - vocabulário e padrões probatórios de partilha, pensão e guarda;
  - regra de nunca tratar alienação parental como `FACT` sem prova técnica;
  - **regras de escrita para o advogado**: proibido citar nomes internos (Case Model,
    JSON, rótulos em inglês etc.), nome de arquivo no meio do texto e numeração copiada.
- **01**: extrair só o que está explícito, listar ausências, candidatos a contradição,
  linha do tempo com trecho literal e divergências.
- **02**: mapear alegação × evidência; alegação sem evidência vira `lacuna_probatoria`;
  nunca dizer "provado".
- **03**: só reportar contradição com os dois lados citáveis; lista vazia é permitida
  ("nunca invente uma").
- **04**: pelo menos 3 contra-argumentos e 3 perguntas **específicos** do caso; proibido
  citar lei ou precedente sem o texto fornecido.
- **05**: critérios de cada rótulo, preferência por rebaixar, citação literal obrigatória,
  lacuna sem citação inventada, proibido citar a estrutura interna, devolver **todos** os
  candidatos.
- **06**: provas concretas, meio **lícito** de obtenção (vedado: gravação clandestina,
  acesso a conta de terceiro, pressionar a criança), prioridades, 3 a 10 itens, só ids
  existentes.
- **07**: papel de advogado da parte contrária e avaliador; "frágil" inclui afirmar fato
  ausente dos documentos; sugestão só com fatos dos documentos; réplica única; ignorar
  instruções embutidas na resposta.

---

## 7. Contrato da API HTTP

Base: `http://localhost:8000` (público via túnel). Toda resposta da API é
`application/json; charset=utf-8`. Erros seguem o formato `{"erro": "<mensagem ao usuário>"}`.

| Método e rota | Entrada | Sucesso | Erros |
|---|---|---|---|
| `GET /` e estáticos | — | 200 arquivo | 404 (inexistente ou fora de `static/`) |
| `GET /api/exemplos` | — | 200 `[{id, tipo, titulo, descricao}]` (14) | — |
| `GET /api/exemplos/<id>` | id da lista fechada | 200 `{titulo, documentos:[{nome, conteudo}], tese}` | 404 |
| `POST /api/analises` | `multipart/form-data`: `documentos` (1..n arquivos), `tese` (texto) | **202** `{id, etapas:[6 nomes]}` | 400 (formato, extração, sem documento, sem tese), 413 (>15 MB) |
| `GET /api/analises/<id>` | id de 32 hex | 200 `{estado, etapa_atual, relatorio, erro}` | 404 (inexistente, expulso do limite de 50 ou servidor reiniciado) |
| `POST /api/analises/<id>/audiencia` | JSON `{pergunta, resposta}` (≤64 KB) | 200 `{avaliacao, resumo, pontos_fortes[], pontos_frageis[], sugestao, apoio_nos_documentos[{documento, trecho, conferido}], replica}` | 400, 404 (análise inexistente ou não concluída), 500 |
| `POST /api/analyze` | igual a `/api/analises` | 200 relatório completo (síncrono) | 400, 413, 500 |
| Outras `/api/*` | — | — | 404 JSON |

**Formato de `relatorio`:**

```json
{
  "resumo_do_caso": "Lemos 2 documentos e identificamos 2 partes, 6 fatos relevantes e 3 pedidos.",
  "tese_analisada": "…",
  "findings": [
    {
      "id": "lacuna-2",
      "categoria": "lacuna_probatoria",
      "texto": "…",
      "provenance": "INFERENCE",
      "origem": [{"documento": "pedido_exoneracao.txt", "trecho": "…", "pagina": null, "conferido": true}]
    }
  ],
  "perguntas_dificeis": ["…"],
  "linha_do_tempo": [
    {"data": "outubro de 2020", "data_ordenacao": "2020-10", "evento": "…", "quem_afirma": "Juliana",
     "documento": "contestacao_juliana.txt", "trecho": "…", "trecho_conferido": true, "divergencia": "…"}
  ],
  "plano_de_provas": [
    {"prova": "…", "finalidade": "…", "como_obter": "…", "prioridade": "alta", "apontamentos": ["lacuna-2"]}
  ],
  "avisos": [
    "Este relatório não é parecer jurídico: revise cada apontamento antes de usá-lo.",
    "Versão de demonstração: use apenas documentos fictícios ou anonimizados."
  ]
}
```

---

## 8. O pipeline de análise em detalhe

| # | Nome na tela | Entrada | Saída | Modelo | Validação em código |
|---|---|---|---|---|---|
| 1 | Lendo os documentos do caso | documentos, tese | `CaseModel` + linha do tempo | Haiku 4.5 | `_somente_dicts`; timeline: doc real, data válida, trecho conferido, ordenação |
| 2 | Relacionando cada alegação com as provas | `CaseModel` | mapeamentos | Haiku 4.5 | `_somente_dicts` |
| 3 | Procurando contradições | `CaseModel` | contradições | Sonnet 5 | `_somente_dicts` |
| 4 | Pensando como a parte contrária | `CaseModel`, contradições, mapeamento | contra-argumentos, perguntas | Sonnet 5 | `_somente_dicts` |
| 5 | Conferindo cada apontamento nos documentos | `CaseModel`, **documentos**, candidatos | `Finding[]` | Sonnet 5 | enums, ids únicos, citação só de doc real, `conferido`, invariante FACT/SOURCE |
| 6 | Montando o plano de provas | `CaseModel`, tese, findings | itens do plano | Sonnet 5 | itens válidos, prioridade, ids existentes, vazio = falha |
| — | Simulação (sob demanda) | documentos, tese, pergunta, resposta | avaliação | Sonnet 5 | enum, citações de doc real, `conferido` |

**Por que dois modelos.** Extração e mapeamento pesam mais em volume do que em
raciocínio, e usam o modelo mais barato e rápido (Haiku). Contradições, ataque,
verificação e plano são o valor do produto e usam o modelo mais forte (Sonnet).

**Por que etapas separadas, e não um prompt único.** Cada etapa tem um schema pequeno e
verificável, falhas ficam localizadas, e a etapa 5 atua como revisora independente das
etapas 3 e 4. Também permite o progresso real na tela.

---

## 9. Front-end

**Arquitetura:** página única, sem framework e sem build. Três arquivos servidos pelo
próprio back-end. `app.js` em `"use strict"`, carregado no fim do `<body>`.

### 9.1 `index.html`
- Script inline no `<head>` aplica tema, contraste, espaçamento, animação e escala **antes
  da primeira pintura** (lê `localStorage["adversia:acessibilidade"]` dentro de
  `try/catch`).
- Estrutura: link "Pular para o conteúdo"; topo com logo e botão de acessibilidade (painel
  com `aria-expanded`/`aria-controls`); `main` com as telas formulário, progresso, erro e
  relatório, alternadas pelo atributo `hidden`; região `aria-live` para anúncios.
- Relatório: `role="tablist"` com 4 `role="tab"` e 4 `role="tabpanel"`.
- Widget **VLibras** e seu script externo no final, com a instanciação em `try/catch`.

### 9.2 `app.js`: blocos

| Bloco | Responsabilidade |
|---|---|
| Dicionários de texto | `CATEGORIAS`, `GRUPOS`, `ORIGENS`, `AVALIACOES`: traduzem valores internos para rótulos em linguagem simples |
| Utilitários | `el()` cria elementos só com `textContent` e `setAttribute`; `plural()`; `anunciar()` (região live) |
| Movimento | `movimentoReduzido()`, digitação do título (50 ms por letra), digitação do exemplo da tese, preenchimento "digitado" do caso, troca suave, `revelarAoRolar` (IntersectionObserver) |
| Acessibilidade | preferências (tema, escala 0,9 a 1,75, contraste, espaçamento, animações) persistidas em `localStorage` |
| Formulário | lista de arquivos (sem duplicar nome), arrastar e soltar, validação local com foco no campo com erro |
| Casos de exemplo | componente próprio de lista de seleção (padrão ARIA *select-only combobox*: setas, Home/End, Enter/Espaço, Esc, Tab, busca por letra, fecha ao clicar fora); ao usar o caso, cria objetos `File` a partir do texto e envia pelo mesmo fluxo de upload |
| Análise | `POST /api/analises`; polling `GET` a cada 1,5 s; 4 falhas de rede seguidas geram mensagem de conexão; etapas com estados aguardando/andamento/concluída anunciados ao leitor de tela |
| Relatório | nomes numerados por categoria ("Falta de prova 2"); cartões com selo de conferência; placar; abas com teclado (setas, Home, End) |
| Linha do tempo | lista ordenada, marcador de divergência, selo de conferência |
| Plano de provas | agrupado por prioridade, checkbox com contador, botões de vínculo que trocam de aba, rolam até o apontamento e o destacam |
| Simulação | pergunta atual, resposta digitada ou por **ditado** (`SpeechRecognition`, pt-BR, resultados parciais), envio, avaliação renderizada, réplica, próxima pergunta, resumo final |
| Leitura em voz alta | `speechSynthesis`, voz pt-BR quando disponível |

**Segurança no DOM:** **nenhum uso de `innerHTML`, `insertAdjacentHTML`, `eval` ou
`document.write`** (verificado por busca no código). Todo texto vindo da IA ou do usuário
entra por `textContent`, o que elimina XSS por conteúdo gerado.

**Estado no navegador:** só preferências de acessibilidade (`localStorage`). Documentos,
relatório e respostas da simulação ficam apenas em memória da aba.

### 9.3 `style.css`
- **Tokens** em `:root` (cores, raio, espaçamentos, fontes). Tema escuro por
  `prefers-color-scheme` e por `[data-theme]`; alto contraste por `[data-contraste]`, com
  variantes clara e escura.
- `[hidden] { display: none !important }`, para que nenhuma regra de layout reexiba telas
  ocultas. Isso corrigiu um defeito real.
- Escala de texto por `html { font-size: calc(100% * var(--escala)) }`, com a interface
  toda em `rem`.
- Movimento: `@keyframes` com curva `cubic-bezier(0.22, 1, 0.36, 1)`, anulados por
  `prefers-reduced-motion` ou `[data-movimento="reduzido"]`.
- Impressão: esconde controles e a simulação, mostra todas as abas e força visíveis os
  blocos ainda não revelados.
- Responsivo: grids com `auto-fit`/`minmax`; linha do tempo muda de 3 para 2 colunas abaixo
  de 600 px; sem rolagem horizontal em 400 px (verificado).

---

## 10. Garantias de confiabilidade das respostas

LLMs erram e inventam. A arquitetura não confia no modelo: aplica camadas de contenção.

| Camada | Onde | Garante |
|---|---|---|
| Saída forçada por schema | `llm_client` + `tool_schemas` | formato, enums e campos obrigatórios |
| Tolerância a itens malformados | `_somente_dicts`, `_texto`, `_desserializar_campos` | um item ruim não derruba a análise nem some em silêncio |
| Rótulo de proveniência obrigatório | etapa 5 + `Finding` | todo apontamento diz se é fato, inferência, hipótese ou não verificado |
| Invariante FACT/SOURCE | `Finding.__post_init__` | "fato" sem origem é rebaixado por código |
| Citação só de documento enviado | `verificar_candidatos`, `montar_linha_do_tempo`, simulação | impede citar arquivo inexistente ou estrutura interna |
| **Conferência literal do trecho** | `_trecho_consta` | o selo "✓ Trecho conferido" só aparece se o trecho existe no documento; senão, "confira" |
| Prompts conservadores | `prompts/*.md` | preferir rebaixar; proibido citar lei ou precedente sem texto; proibido decidir mérito |
| Avisos fixos | `AVISOS_FIXOS` | todo relatório declara que não é parecer e exige revisão |
| Falha explícita | plano `None`, mensagens de erro | ausência de resultado nunca é apresentada como "nada encontrado" |

**Limite da conferência:** ela prova que o trecho **existe** no documento, não que o
trecho **sustenta** a conclusão. A pertinência continua sendo julgamento do advogado.

---

## 11. Segurança

### 11.1 Controles implementados

| Controle | Implementação |
|---|---|
| Segredos fora do código | `ANTHROPIC_API_KEY` só em variável de ambiente ou `.env`; `.env` no `.gitignore` (verificado a cada commit); `.env.example` sem valores |
| Chave nunca no navegador | toda chamada à IA parte do servidor |
| Bind só em `localhost` | sem exposição direta na rede; acesso externo só pelo túnel |
| Limite de upload | 413 acima de 15 MB **antes** de ler o corpo |
| Limite da simulação | corpo ≤ 64 KB; pergunta ≤ 2.000 e resposta ≤ 4.000 caracteres |
| Path traversal | resolução de caminho + checagem de pai; `Path(filename).name` nos uploads |
| Ids não adivinháveis | `uuid4` (122 bits) + validação por regex |
| Lista fechada de exemplos | id nunca vira caminho |
| XSS | front-end sem `innerHTML`/`eval`; tudo via `textContent` |
| Cabeçalhos | `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer`; `Cache-Control: no-store` na API |
| Erros sem detalhe interno | usuário recebe mensagem genérica; traceback só no log |
| Servidor duplicado | `allow_reuse_address=False` evita dois processos na mesma porta |
| Transporte público | HTTPS terminado na Cloudflare |
| Repositório | privado no GitHub |
| Prompt injection (mitigação parcial) | saída forçada por schema; na simulação, delimitadores e instrução para ignorar comandos embutidos; filtros de citação independentes do modelo |

### 11.2 Lacunas conhecidas (aceitas para o protótipo)

| Lacuna | Risco | Recomendação |
|---|---|---|
| **Sem autenticação** | qualquer pessoa com o link usa o sistema e consome crédito pago | login; link só com convidados enquanto isso |
| **Sem rate limiting** | abuso de custo; várias análises simultâneas | limite por IP/usuário e fila |
| Threads sem limite | muitas análises simultâneas consomem memória e CPU e multiplicam custo | pool/fila com concorrência máxima |
| Corpo lido em memória | até 15 MB por requisição × requisições concorrentes | streaming ou limite de concorrência |
| Sem CSP, HSTS ou `X-Frame-Options` | defesa em profundidade reduzida; página pode ser embutida em iframe | adicionar CSP restrita (fonts.googleapis, vlibras.gov.br), `frame-ancestors 'none'` |
| **Script de terceiro** (VLibras) sem SRI | se `vlibras.gov.br` for comprometido, o script roda na página | CSP + avaliação de hospedar cópia versionada |
| Sem proteção contra requisições de outra origem | um site pode disparar `POST` multipart e gastar crédito (não lê a resposta) | autenticação + verificação de `Origin` |
| Prompt injection residual | documento malicioso pode tentar influenciar a análise | validações atuais limitam o impacto (schema, citações conferidas), mas não eliminam |
| PDF e DOCX de terceiros | `pypdf` e `python-docx` processam arquivos não confiáveis; DOCX é zip (risco de "zip bomb" além dos 15 MB compactados) | sandbox/processo isolado, limites de páginas e tamanho descompactado |
| Logs podem conter conteúdo | `LLMStructuredOutputError` inclui a resposta bruta do modelo, que pode trazer trechos do caso, no `stderr` | mascarar ou remover conteúdo dos logs |
| Parser multipart simplificado | casos de borda do RFC não tratados | biblioteca madura em produção |
| Contagem de uso sem lock | números de custo podem subcontar com concorrência | lock ou contador por análise |
| URL do túnel temporária | sem SLA; cai se o notebook desligar | hospedagem gerenciada |

---

## 12. Dados pessoais e LGPD

- **Natureza:** processos de família contêm dados pessoais sensíveis, inclusive de
  **crianças e adolescentes**. Por isso a demonstração exige **dados fictícios ou
  anonimizados**, com checkbox obrigatório antes de cada análise e aviso fixo em todo
  relatório.
- **Onde os dados passam:**
  1. navegador → Cloudflare (túnel, HTTPS) → servidor local;
  2. servidor → API da Anthropic (processamento **fora do Brasil**: transferência
     internacional, art. 33 da LGPD, que exige base legal e contrato em uso real);
  3. **ditado por voz** (opcional): no Chrome, o áudio é processado pelo serviço de
     reconhecimento do Google.
- **Retenção:**
  - nada é gravado em disco ou banco pelo sistema;
  - documentos e tese ficam **em memória** junto da análise, só para a simulação (máximo
    de 50 análises, apagados ao reiniciar);
  - os casos de exemplo são arquivos fictícios versionados no repositório;
  - no navegador, só preferências de acessibilidade.
- **Minimização no front-end:** a API nunca devolve os documentos armazenados.
- **Pendências para uso real:** expiração automática (ex.: 1 hora), contrato e DPA com o
  provedor de IA, autenticação, aviso antes do microfone, logs sem conteúdo do caso.
  Detalhado em `docs/CONFORMIDADE.md`.

---

## 13. Acessibilidade (implementação)

| Recurso | Implementação |
|---|---|
| Libras | VLibras (Governo Federal), widget oficial |
| Tamanho do texto | 6 níveis (90% a 175%) via variável CSS `--escala` |
| Tema | claro, escuro, automático (`prefers-color-scheme`) |
| Alto contraste | paletas próprias, clara e escura; bordas reforçadas em etiquetas |
| Espaçamento | entrelinha 1,95, espaçamento de letras e palavras |
| Movimento | desligável; respeita `prefers-reduced-motion` |
| Leitura em voz alta | relatório e pergunta da simulação (Web Speech API) |
| Resposta por voz | simulação (SpeechRecognition, pt-BR) |
| Teclado | link de pular conteúdo; abas e lista de seleção com padrão ARIA completo; foco visível; foco movido nas trocas de tela |
| Leitor de tela | `aria-live` para progresso, erros e resultados; título digitado tem versão completa oculta visualmente e a versão animada com `aria-hidden` |
| Tipografia | Atkinson Hyperlegible (Braille Institute) no texto; Lexend nos títulos |
| Linguagem | nenhuma mensagem técnica ao usuário; regra de escrita também imposta à IA |
| Informação não depende só de cor | todo estado tem rótulo textual |

**Não verificado:** medição automatizada de contraste (axe/Lighthouse), teste com leitor
de tela real (NVDA/VoiceOver) e teste com pessoas usuárias de Libras.

---

## 14. Desempenho e custo medidos

Medições reais em 13/09/2026, provedor Anthropic:

| Cenário | Tempo | Custo medido |
|---|---|---|
| Análise antes das novas funções (5 etapas, caso de guarda) | ~80 a 90 s | US$ 0,1055 |
| Análise completa, caso "Ex-esposa voltou a trabalhar" (2 docs sem datas) | 89 s | não isolado |
| Análise completa, caso 14 (13 eventos datados, 20 apontamentos) | 159 s | US$ 0,2448 |
| Análise completa, caso 14 (rodada após correção) | 149 s | US$ 0,2340 |
| Análise completa pelo **link público** (caso 14) | 148 s | não isolado |
| Avaliação de uma resposta na simulação | 12 s | não isolado |

Composição típica (caso 14): Haiku cerca de 11 mil tokens de entrada e 6 mil de saída
(≈ US$ 0,04); Sonnet cerca de 44 a 46 mil de entrada e 11 mil de saída (≈ US$ 0,19 a 0,20).
O aumento de custo em relação à versão anterior vem do plano de provas e do envio dos
documentos originais para a verificação.

Carga de páginas pelo túnel: arquivos estáticos entre 0,19 s e 0,36 s.

---

## 15. Testes e validação

### 15.1 Suíte automatizada (`pytest`)
- **Chama a API real** (não usa mock): mede a qualidade real do modelo e custa dinheiro.
  Sem `ANTHROPIC_API_KEY`, todos os testes são pulados (`skip`).
- **Cache por caso** (`conftest._obter_relatorio`): cada caso é analisado **uma vez por
  execução** e compartilhado entre testes. Isso reduziu o custo da suíte várias vezes,
  depois de uma lição de 12/09 em que cada teste refazia a análise.
- `pytest_terminal_summary` imprime o custo total medido.

| Arquivo | Testes |
|---|---|
| `test_pipeline_contradiction.py` | contradição plantada é encontrada; nenhuma contradição inventada |
| `test_pipeline_evidence_gap.py` | alegação sem evidência vira lacuna |
| `test_pipeline_hard_questions.py` | ≥ 3 perguntas; não genéricas; referenciam fatos do caso |
| `test_pipeline_provenance.py` | todo finding tem proveniência; FACT/SOURCE sempre com origem; avisos fixos presentes |
| `test_pipeline_familia.py` | lacunas de partilha sinalizadas; nenhuma conclusão de mérito como fato; perguntas sobre partilha |
| `test_pipeline_todos_os_casos.py` | **parametrizado sobre todas as pastas do golden dataset** (15 casos): roda sem erro, resumo presente, 2 avisos, invariante FACT/SOURCE, citações só de documentos reais |

**Golden dataset:** `case_01` (genérico, contradição plantada) e `case_familia_01..14`
(fictícios), cada um com documentos, `tese.txt` e **`gabarito.md`** com a vulnerabilidade
central esperada, as lacunas, as perguntas aceitáveis e os **falsos positivos a evitar**.
O caso 14 foi criado para exercitar datas conflitantes.

### 15.2 Lacunas de cobertura (declaradas)
- As funções de 13/09/2026 (linha do tempo, plano de provas, simulação, conferência de
  trechos, `_desserializar_campos`) **não têm testes automatizados na suíte**.
- Não há testes unitários sem IA (mock) para o servidor, o parser multipart e o leitor de
  documentos.
- Não há teste de carga.

### 15.3 Validações executadas manualmente (13/09/2026)
- **Verificações offline em script:**
  - `_trecho_consta`: literal (✓), com reticências (✓), inventado (✗);
  - `montar_linha_do_tempo`: ordenação, doc em maiúsculas aceito, doc inexistente
    descartado;
  - `_desserializar_campos`: string JSON convertida; texto qualquer mantido;
  - `node --check app/static/app.js`: sem erro de sintaxe.
- **Ponta a ponta no navegador (Playwright):** fluxo completo com casos de exemplo, abas,
  vínculo do plano para o apontamento, simulação com avaliação e réplica, temas claro e
  escuro, largura de 400 px, modo de movimento reduzido, **zero erros de JavaScript** no
  console.
- **Erros e segurança via `curl`:** envio sem arquivos, tipo não aceito (`.exe`), sem tese,
  análise inexistente, path traversal (404).
- **Resultados de qualidade:** 14 de 14 e 21 de 21 citações conferidas; linha do tempo com
  13 eventos e divergências corretas (separação e mudança de cidade); plano com 8 e 10
  provas; simulação classificou como "frágil" uma resposta que alegava fato inexistente
  nos documentos.
- Registros anteriores de testes internos e do teste externo: `docs/testes-internos.md`,
  `docs/roteiro-teste-externo.md`, `docs/evidencias/`.

---

## 16. Configuração, execução e hospedagem

### 16.1 Variáveis de ambiente

| Variável | Obrigatória | Padrão | Uso |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | sim (provedor padrão) | — | chave da Anthropic |
| `LLM_PROVIDER` | não | `anthropic` | `anthropic`, `groq` ou `gemini` |
| `GROQ_API_KEY` | se `groq` | — | testes gratuitos |
| `GEMINI_API_KEY` | se `gemini` | — | testes gratuitos |

### 16.2 Execução local
```bash
pip install -r requirements.txt
# criar .env na raiz com ANTHROPIC_API_KEY=... (nunca commitar)
python -m app.server          # http://localhost:8000
python -m pytest              # suíte completa: chama a API real e tem custo
```

### 16.3 Hospedagem atual: Cloudflare Quick Tunnel (ADR-011)
```bash
cloudflared tunnel --url http://localhost:8000
```
- Gera uma URL `https://<aleatório>.trycloudflare.com`, com HTTPS na borda da Cloudflare e
  tráfego encaminhado ao `localhost:8000` do notebook.
- **Características:** sem conta, sem configuração de DNS e sem abrir portas no roteador;
  URL **temporária** (muda ao reiniciar o túnel); sem SLA; depende de o notebook estar
  ligado, conectado e sem suspensão.
- **Escolha consciente para o hackathon.** Para produção, ver seção 19.

---

## 17. Governança do projeto e decisões registradas

- **Spec-driven development** com GitHub spec-kit: `specs/001-adversarial-vulnerability-report/`
  (spec, plano, modelo de dados, contrato, pesquisa, quickstart) e
  `.specify/memory/constitution.md` (v1.0.0, ratificada em 12/09/2026).
- **Constituição, 5 princípios:**
  1. **Proveniência obrigatória** (inegociável).
  2. **Sem preço inventado** (custos só de fonte oficial ou medidos).
  3. **Citação verificável** (nada de lei ou jurisprudência sem texto fornecido).
  4. **MVP leve e agnóstico de provedor.**
  5. **Somente dados fictícios ou anonimizados.**
- **Decisões arquiteturais (`docs/DECISIONS.md`):**

| ADR | Decisão |
|---|---|
| 001 | Cortar back-end completo (FastAPI + PostgreSQL + Qdrant) do MVP |
| 002 | Busca em jurisprudência/legislação externa (RAG) fica para depois do MVP |
| 003 | Rótulo de proveniência obrigatório em toda afirmação |
| 004 | Provedor de IA isolado em um único módulo |
| 005 | Demonstração por interface web simples |
| 006 | Golden dataset construído do zero, com contradição plantada |
| 007 | Todas as etapas com tool use (saída estruturada forçada) |
| 008 | Renomear para AdversIA e restringir a Direito de Família |
| 009 | Groq como provedor gratuito de testes (e cota por conta) |
| 010 | Gemini como segundo provedor gratuito (limite de 20 requisições/dia) |
| 011 | Cloudflare Quick Tunnel para teste externo, com Anthropic |
| 012 | Acessibilidade: VLibras pronto + controles próprios (sem widgets de overlay com rastreamento) |
| 013 | Linha do tempo, plano de provas, simulação de audiência e conferência de trechos |

- **Outros documentos:** `CONFORMIDADE.md` (acessibilidade, LGPD, segurança), `COSTS.md`,
  `RISKS.md`, `METRICS.md`, `BACKLOG.md`, `PRODUCT_SCOPE.md`, `ANALISE_CASOS_FAMILIA.md`,
  `ADVERSIA_PROJECT_FOUNDATION_V1.md`.

---

## 18. Limitações conhecidas e riscos

**Funcionais**
- Somente Direito de Família e somente português.
- Sem OCR: PDF escaneado não é lido.
- Linha do tempo depende de datas explícitas nos documentos.
- Nenhuma consulta a legislação ou jurisprudência (por decisão; evita citação inventada).
- Qualidade depende do modelo: pode haver apontamentos irrelevantes ou lacunas não
  detectadas. A divergência entre versões nem sempre é marcada em todos os pares.
- Resultados não são determinísticos: duas análises do mesmo caso podem variar.

**Operacionais**
- Estado só em memória: reiniciar o servidor perde análises (e a simulação delas).
- Um único processo num notebook; sem redundância, monitoramento ou backup.
- Dependência de serviços externos: Anthropic, Cloudflare, Google Fonts, VLibras.
- Custo por uso sem teto técnico (seção 11.2).

---

## 19. Evolução recomendada para produção

1. **Identidade e acesso:** login por escritório/advogado, papéis, trilha de auditoria.
2. **Controle de abuso e custo:** rate limiting, fila de análises com concorrência máxima,
   orçamento por conta.
3. **Hospedagem gerenciada:** container, HTTPS próprio, domínio, monitoramento, logs
   estruturados **sem conteúdo do caso**.
4. **Dados:** expiração automática, criptografia em repouso se houver persistência,
   contrato/DPA com o provedor de IA, avaliação de impacto (RIPD) por envolver dados de
   crianças.
5. **Cabeçalhos e front-end:** CSP, HSTS, `frame-ancestors`, SRI ou hospedagem controlada
   de scripts de terceiros.
6. **Upload:** parser multipart maduro, isolamento do processamento de PDF/DOCX, limites de
   páginas e tamanho descompactado, OCR.
7. **Qualidade:** testes automatizados das novas funções; testes unitários com IA simulada
   (mock); avaliação periódica contra o golden dataset com métricas de acerto e de falsos
   positivos.
8. **Acessibilidade:** auditoria com axe/Lighthouse, leitor de tela real e usuários de
   Libras.
