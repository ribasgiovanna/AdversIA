# AdversIA: documentação técnica

> Documento para auditoria técnica. Descreve arquitetura, módulos, contratos, fluxo de
> dados, segurança, testes e limitações do protótipo apresentado no Hackathon da Cidadania
> OAB/PR 2026. Reflete o código do repositório `ribasgiovanna/AdversIA`, branch `main`,
> em 14/09/2026. Quando um item não foi verificado, o texto diz isso.

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

**Status.** Protótipo de hackathon (MVP). Sem autenticação e sem banco de dados. Publicado
na Vercel (arquivos estáticos + funções Python) **sem nenhuma chave de IA da equipe**
(ADR-014). Dois modos:

- **Demonstração:** 32 casos fictícios com análise preparada previamente, servida como
  arquivo estático (custo zero);
- **Meus documentos:** análise real com a chave da Anthropic do próprio usuário.

---

## 2. Arquitetura

```
┌──────────────────────────── Navegador (qualquer dispositivo) ───────────────────────────┐
│  index.html + app.js + style.css  (SPA sem framework, sem build)                         │
│  - escolha do modo: demonstração ou meus documentos (com a chave da Anthropic)           │
│  - demonstração: lê demo/indice.json e demo/casos/<id>.json (estáticos)                  │
│  - análise real: 1 POST síncrono; guarda documentos extraídos só na memória da aba       │
│  - relatório em 4 abas; simulação de audiência                                           │
│  - acessibilidade: VLibras (script externo gov.br), tema, fonte, contraste, voz          │
└──────────────┬───────────────────────────────────────────────────────────────────────────┘
               │ HTTPS
┌──────────────▼───────────────────────────────────────────────────────────────────────────┐
│ Vercel                                                                                   │
│  estáticos: app/static/** (inclui demo/, gerado por scripts/construir_demo.py)           │
│  funções Python (sem estado, máx. 300 s):                                                │
│   api/analisar.py  ─┐                                                                    │
│   api/audiencia.py ─┴─▶ app/api_comum.py  chave do usuário (X-Anthropic-Key), limites,  │
│                              │            tradução de erros                              │
│        ┌─────────────────────┼───────────────────────────┐                               │
│        ├─ app/document_reader.py   PDF (pypdf) · DOCX (python-docx) · TXT/MD             │
│        ├─ app/multipart_parser.py  multipart/form-data (substitui o módulo cgi)          │
│        └─ app/pipeline.py          6 etapas + simulação + conferência de trechos         │
│               ├─ app/prompts/*.md        instruções por etapa + contexto de domínio      │
│               ├─ app/tool_schemas.py     JSON Schema de saída de cada etapa              │
│               ├─ app/schemas.py          modelos de dados (dataclasses)                  │
│               └─ app/llm_client.py       ÚNICO ponto de acoplamento com o provedor de IA │
└───────────────────────────────────────────────┬──────────────────────────────────────────┘
                                                │ HTTPS (SDK oficial, chave do usuário)
                                        Anthropic: Claude Sonnet 5 + Claude Haiku 4.5

Execução local: app/server.py (http.server, localhost:8000) serve os mesmos estáticos e
as mesmas rotas /api/analisar e /api/audiencia, usando o mesmo app/api_comum.py.
Groq e Gemini continuam disponíveis só para testes locais (LLM_PROVIDER, ADR-009/010).
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
| Hospedagem | Vercel (estáticos + runtime Python), configurada em `vercel.json` | URL HTTPS fixa |

A biblioteca padrão cobre HTTP (`http.server`), threads, JSON, regex, `uuid`, `unicodedata`.
**Não há** Flask/FastAPI, ORM, banco, fila, cache externo nem `python-dotenv` (há um
carregador próprio de `.env`, seção 6.8).

---

## 4. Estrutura do repositório

```
api/
  analisar.py             função da Vercel: POST /api/analisar (4 MB) (23 linhas)
  audiencia.py            função da Vercel: POST /api/audiencia (19)
app/
  __init__.py
  api_comum.py            chave do usuário, leitura do envio, tradução de erros, resposta JSON (212)
  server.py               servidor local: estáticos + mesmas rotas da Vercel (208)
  pipeline.py             orquestração das etapas, conferência de trechos (565)
  llm_client.py           provedores de IA, chave por requisição, contagem de uso/custo (496)
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
    index.html            estrutura da página (336)
    app.js                lógica do front-end (1.524)
    style.css             estilos, temas, acessibilidade, animações (1.280)
    logo-adversia.png, favicon.png
    demo/                 GERADO: indice.json + casos/<id>.json (32 casos, ~680 KB)
demo/fontes/<id>.json     análises da demonstração, escritas e revisadas (32)
scripts/construir_demo.py gera app/static/demo/ e confere cada trecho citado (202)
tests/
  conftest.py             carga de casos, cache de relatórios por caso, resumo de custo
  test_pipeline_*.py      testes contra a API real (seção 15)
golden_dataset/
  case_01/                caso genérico com contradição plantada
  case_familia_01..32/    casos fictícios de família: documentos .txt, tese.txt, gabarito.md
specs/001-adversarial-vulnerability-report/  spec, plan, data-model, contracts, research, quickstart
.specify/memory/constitution.md   constituição do projeto (5 princípios), spec-kit
docs/                     decisões (ADRs), conformidade, catálogo de situações, custos, riscos, métricas, testes
vercel.json · .vercelignore · requirements.txt · .env.example · .gitignore · README.md (versão para leigos)
```

---

## 5. Fluxo ponta a ponta de uma análise

### 5.1 Modo demonstração (sem IA, sem custo)

```
Navegador                                          Vercel (estáticos)
   │ GET demo/indice.json ───────────────────────▶ │ [{id, tipo, titulo, descricao}] (32)
   │ usuário escolhe tipo e situação               │
   │ GET demo/casos/<id>.json ───────────────────▶ │ {documentos, tese, relatorio, audiencia}
   │ mostra documentos (só leitura) e tese         │
   │ "Ver a análise deste caso"                    │
   │ etapas com tempos fixos (1,3 a 2,1 s cada, ~10 s)
   │ renderiza o relatório + selo "análise preparada previamente"
   │ simulação: escolhe resposta pronta → mostra avaliação preparada
```

O conteúdo dos arquivos `demo/casos/*.json` foi produzido antes (seção 6.3) e tem o mesmo
formato do relatório real, com `conferido: true` calculado pelo script de geração.

### 5.2 Modo "meus documentos" (IA com a chave do usuário)

```
Navegador                          função api/analisar.py → app/api_comum.py → pipeline
   │ POST api/analisar (multipart)     │
   │   cabeçalho X-Anthropic-Key       │ Content-Length ≤ 4 MB? senão 413
   │ ────────────────────────────────▶ │ chave presente (401) e no formato sk-ant-… (400)
   │                                   │ parsing multipart, extração de texto
   │                                   │ with usar_chave_anthropic(chave):
   │   (tela mostra etapas estimadas   │     pipeline.analisar_caso → etapas 1 a 6
   │    por tempo: 0, 15, 35, 60,      │
   │    90 e 125 s)                    │
   │ ◀── 200 {relatorio, documentos, tese} ──  (ou erro traduzido: 401/402/403/429/502/500)
   │ guarda {documentos, tese, chave} só na memória da aba
   │ POST api/audiencia (JSON)         │ função api/audiencia.py
   │   {documentos, tese, pergunta,    │ corpo ≤ 2 MB; texto ≤ 400 mil caracteres
   │    resposta} + X-Anthropic-Key    │ pipeline.avaliar_resposta_audiencia
   │ ◀── 200 {avaliacao, replica, …} ──│
```

**Por que síncrono e sem estado.** Na Vercel cada chamada pode cair numa instância
diferente e não há memória compartilhada; um registro de análises em memória (versão
anterior) não funcionaria. A análise leva de 2 a 3 minutos e cabe no limite de 300 s da
função. Como não há como consultar o progresso, a tela avança as etapas por tempo
estimado (medido nas análises reais) e, ao receber o relatório, marca todas como
concluídas.

---

## 6. Módulos do back-end

### 6.1 `app/api_comum.py`, `api/*.py` e `app/server.py`: a API

**`app/api_comum.py`: regras compartilhadas.** Usado igualmente pelas funções da Vercel e
pelo servidor local, para que os dois ambientes se comportem da mesma forma.

- `ler_chave(cabecalhos)`: lê `X-Anthropic-Key`; ausente → 401 ("informe a sua chave… ou use
  o modo demonstração"); fora do formato `^sk-ant-[A-Za-z0-9_\-]{20,300}$` → 400.
- `responder(requisicao, processar, limite_bytes)`: valida `Content-Length` (vazio → 400;
  acima do limite → 413 **antes de ler o corpo**), lê a chave, chama o processador e grava a
  resposta JSON com `Cache-Control: no-store`, `nosniff` e `no-referrer`.
- `ler_formulario(content_type, corpo)`: parsing multipart; o nome do arquivo passa por
  `_nome_do_arquivo`, que descarta qualquer caminho (barra normal ou invertida); erros de
  extração são acumulados e devolvidos juntos (400); sem documento ou sem tese → 400.
- `analisar(documentos, tese, chave)`: roda `pipeline.analisar_caso` dentro de
  `usar_chave_anthropic(chave)` e devolve `{relatorio, documentos, tese}`.
- `avaliar_audiencia(dados, chave)`: exige `documentos` como objeto `{nome: texto}` de
  strings, com no máximo 400 mil caracteres somados, e `tese`; senão 400 ("faça uma nova
  análise"). Trunca `pergunta` em 2.000 e `resposta` em 4.000 caracteres.
- `traduzir_falha(exc, padrao)`: `AuthenticationError` → 401 (chave recusada),
  `PermissionDeniedError` → 403, `RateLimitError` → 429, `BadRequestError` com "credit" →
  402 (conta sem crédito), `APIConnectionError` → 502, `LLMConfigError` → 401; qualquer
  outra → 500 com mensagem genérica. O traceback vai só para o log; **a chave nunca é
  registrada**.

**`api/analisar.py` e `api/audiencia.py`: funções da Vercel.** Classe `handler
(BaseHTTPRequestHandler)` com `do_POST` que só delega a `api_comum.responder`. Limites:
4 MB na análise (a Vercel recusa corpos acima de 4,5 MB antes de chamar a função; o limite
menor garante a mensagem própria) e 2 MB na simulação. `vercel.json` define
`maxDuration: 300` e `includeFiles: "app/**"` (pipeline, prompts e schemas empacotados na
função).

**`app/server.py`: servidor local.**
- `_ServidorSemBindDuplicado(ThreadingHTTPServer)` com `allow_reuse_address = False`: no
  Windows, `SO_REUSEADDR` permite **dois processos na mesma porta** sem erro, e as
  requisições caem em qualquer um. Isso causou uma falha real em 12/09/2026. Desligado, um
  segundo servidor falha ao subir com mensagem clara. `daemon_threads = True`.
- Bind em `("localhost", 8000)`: **não escuta na rede local**.
- `main()`: sem chave no `.env`, apenas avisa ("modo demonstração e análise com a chave do
  usuário") e sobe normalmente; porta ocupada → explica como encerrar o processo antigo.
- Rotas: `POST /api/analisar` e `POST /api/audiencia` (via `api_comum`, com limite de
  15 MB na análise) e `POST /api/analyze`, análise síncrona com a chave do `.env`, mantida
  para desenvolvimento e medições. As rotas antigas (`/api/analises`, `/api/exemplos`) e o
  registro de análises em memória foram **removidos** em 14/09/2026.
- `_send_static()`: `/` serve `index.html`; o caminho resolvido só é servido se estiver dentro
  de `app/static` (**bloqueia path traversal**); `Content-Type` por extensão, incluindo
  `.json` para os arquivos da demonstração.
- Mensagens `MSG_*` em português simples; detalhe técnico só em `stderr`.

**`llm_client.usar_chave_anthropic(chave)`.** Gerenciador de contexto baseado em
`ContextVar`: enquanto ativo, `_provedor_ativo()` devolve `anthropic` (ignora
`LLM_PROVIDER`) e `_get_anthropic_client()` cria um cliente **só para aquela requisição**
com a chave informada, em vez do cliente global do `.env`. Ao sair do contexto a variável
volta ao valor anterior; a chave não é guardada em nenhum atributo global.

### 6.1.1 `scripts/construir_demo.py`: geração do modo demonstração

- Entrada: `demo/fontes/<id>.json` (tipo, ordem, título, descrição, pasta do golden dataset,
  apontamentos, linha do tempo, plano de provas e perguntas da simulação com respostas e
  avaliações) + documentos `.txt` da pasta (exceto `tese.txt`).
- Para **cada trecho citado** (apontamentos, linha do tempo e apoio das avaliações), aplica
  o mesmo `pipeline._trecho_consta` usado na análise real e grava `conferido`. Trecho não
  encontrado **interrompe a geração** (código de saída 1), salvo com
  `--permitir-nao-conferidos`.
- Também valida: documento citado existe; ids do plano apontam para apontamentos
  existentes; prioridade e veredito da simulação dentro dos valores aceitos; linha do tempo
  montada por `pipeline.montar_linha_do_tempo` (mesma ordenação da análise real).
- Saída: `app/static/demo/indice.json` (ordenado por tipo e `ordem`) e
  `app/static/demo/casos/<id>.json`. Última execução (14/09/2026): **32 casos e 424
  trechos conferidos**.
- Uso: `python scripts/construir_demo.py`.

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

Base: domínio da Vercel ou `http://localhost:8000`. Toda resposta da API é
`application/json; charset=utf-8`. Erros seguem o formato `{"erro": "<mensagem ao usuário>"}`.

| Método e rota | Entrada | Sucesso | Erros |
|---|---|---|---|
| `GET /` e estáticos | — | 200 arquivo | 404 (inexistente ou fora de `static/`) |
| `GET demo/indice.json` | — | 200 `[{id, tipo, titulo, descricao}]` (32), estático | 404 |
| `GET demo/casos/<id>.json` | id da lista | 200 `{id, tipo, titulo, descricao, documentos:[{nome, conteudo}], tese, relatorio, audiencia:[{pergunta, respostas:[{rotulo, texto, avaliacao}]}]}`, estático | 404 |
| `POST /api/analisar` | cabeçalho `X-Anthropic-Key`; `multipart/form-data`: `documentos` (1..n arquivos), `tese` | 200 `{relatorio, documentos:{nome: texto}, tese}` | 400 (formato, chave malformada, extração, sem documento/tese), 401 (sem chave ou chave recusada), 402 (sem crédito), 403, 413 (>4 MB na Vercel, >15 MB local), 429, 502, 500 |
| `POST /api/audiencia` | cabeçalho `X-Anthropic-Key`; JSON `{documentos, tese, pergunta, resposta}` (≤2 MB) | 200 `{avaliacao, resumo, pontos_fortes[], pontos_frageis[], sugestao, apoio_nos_documentos[{documento, trecho, conferido}], replica}` | 400, 401, 402, 403, 413, 429, 502, 500 |
| `POST /api/analyze` (só local) | `multipart/form-data` sem chave; usa `.env` | 200 relatório completo | 400, 413, 500 |
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
| Modos | `configurarModo`/`aplicarModo`: rádios "Demonstração" e "Meus documentos"; troca títulos, ajudas e campos visíveis (`data-modo` no formulário); a validação muda por modo |
| Casos de exemplo | componente próprio de lista de seleção (padrão ARIA *select-only combobox*: setas, Home/End, Enter/Espaço, Esc, Tab, busca por letra, fecha ao clicar fora); lê `demo/indice.json`; ao escolher, busca `demo/casos/<id>.json` e mostra documentos e tese somente leitura |
| Análise (demonstração) | `executarDemonstracao`: etapas com duração fixa (`DURACAO_ETAPAS_DEMO`, ~10 s), anunciadas ao leitor de tela; depois renderiza o relatório pré-montado com o selo de demonstração |
| Análise (real) | `executarAnaliseReal`: um `POST api/analisar` com `X-Anthropic-Key`; etapas avançam por tempo estimado (`INICIO_ETAPAS_REAL`); guarda `{documentos, tese, chave}` em `contextoReal`, só em memória |
| Relatório | nomes numerados por categoria ("Falta de prova 2"); cartões com selo de conferência; placar; abas com teclado (setas, Home, End) |
| Linha do tempo | lista ordenada, marcador de divergência, selo de conferência |
| Plano de provas | agrupado por prioridade, checkbox com contador, botões de vínculo que trocam de aba, rolam até o apontamento e o destacam |
| Simulação | demonstração: botões com respostas prontas (`escolherRespostaDemo`) e avaliação pré-montada; real: resposta digitada ou por **ditado** (`SpeechRecognition`, pt-BR), `POST api/audiencia` com documentos e tese da memória, avaliação, réplica (só no modo real), próxima pergunta, resumo final |
| Leitura em voz alta | `speechSynthesis`, voz pt-BR quando disponível |

**Segurança no DOM:** **nenhum uso de `innerHTML`, `insertAdjacentHTML`, `eval` ou
`document.write`** (verificado por busca no código). Todo texto vindo da IA ou do usuário
entra por `textContent`, o que elimina XSS por conteúdo gerado.

**Estado no navegador:** só preferências de acessibilidade (`localStorage`). Documentos,
relatório, respostas da simulação e a **chave da Anthropic** ficam apenas em memória da
aba (variáveis JavaScript), nunca em `localStorage`, `sessionStorage` ou cookie.

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
| Nenhuma chave da equipe em produção | site público usa só a chave do usuário (ADR-014); `.env` no `.gitignore` e no `.vercelignore`; `.env.example` sem valores |
| Chave do usuário | só por HTTPS, cabeçalho próprio; formato validado; cliente por requisição (`ContextVar`); nunca gravada, registrada em log ou devolvida; campo `type="password"`; não vai para `localStorage` |
| Bind local só em `localhost` | o servidor local não escuta na rede |
| Limite de upload | 413 **antes** de ler o corpo: 4 MB na Vercel, 15 MB local |
| Limite da simulação | corpo ≤ 2 MB; documentos ≤ 400 mil caracteres; pergunta ≤ 2.000 e resposta ≤ 4.000 |
| Path traversal | resolução de caminho + checagem de pai no servidor local; nomes de arquivo sem caminho nos uploads |
| Demonstração estática | casos de demonstração são arquivos gerados; nenhum id vira caminho no servidor |
| XSS | front-end sem `innerHTML`/`eval`; tudo via `textContent` |
| Cabeçalhos | `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer`; `Cache-Control: no-store` na API; `X-Frame-Options: DENY` na Vercel |
| Erros sem detalhe interno | usuário recebe mensagem genérica; traceback só no log |
| Servidor duplicado | `allow_reuse_address=False` evita dois processos na mesma porta |
| Transporte público | HTTPS da Vercel |
| Repositório | público no GitHub, histórico limpo, sem dados pessoais nem segredos |
| Prompt injection (mitigação parcial) | saída forçada por schema; na simulação, delimitadores e instrução para ignorar comandos embutidos; filtros de citação independentes do modelo |

### 11.2 Lacunas conhecidas (aceitas para o protótipo)

| Lacuna | Risco | Recomendação |
|---|---|---|
| **Sem autenticação** | qualquer pessoa usa o site; o custo de IA recai sobre a chave de quem usa, e as chamadas às funções contam no limite do plano da Vercel da equipe | login; limites por usuário |
| **Chave digitada no navegador** | uma extensão maliciosa no navegador do usuário poderia lê-la | orientar o uso de chave dedicada, com limite de gasto, apagada depois; em produção, conta própria do escritório no servidor |
| Sem rate limiting próprio | uso intenso pode esgotar o limite gratuito das funções | limite por IP na borda |
| Corpo lido em memória | até 4 MB (Vercel) ou 15 MB (local) por requisição | streaming ou limite de concorrência |
| Sem CSP nem HSTS próprio | defesa em profundidade reduzida | adicionar CSP restrita (fonts.googleapis, vlibras.gov.br) |
| **Script de terceiro** (VLibras) sem SRI | se `vlibras.gov.br` for comprometido, o script roda na página | CSP + avaliação de hospedar cópia versionada |
| Sem proteção contra requisições de outra origem | um site pode disparar `POST` multipart e gastar crédito (não lê a resposta) | autenticação + verificação de `Origin` |
| Prompt injection residual | documento malicioso pode tentar influenciar a análise | validações atuais limitam o impacto (schema, citações conferidas), mas não eliminam |
| PDF e DOCX de terceiros | `pypdf` e `python-docx` processam arquivos não confiáveis; DOCX é zip (risco de "zip bomb" além dos 15 MB compactados) | sandbox/processo isolado, limites de páginas e tamanho descompactado |
| Logs podem conter conteúdo | `LLMStructuredOutputError` inclui a resposta bruta do modelo, que pode trazer trechos do caso, no `stderr` | mascarar ou remover conteúdo dos logs |
| Parser multipart simplificado | casos de borda do RFC não tratados | biblioteca madura em produção |
| Contagem de uso sem lock | números de custo podem subcontar com concorrência | lock ou contador por análise |
| Plano gratuito da Vercel | limites de uso e de duração (300 s) sem SLA; análise muito longa pode estourar o tempo | plano pago ou fila assíncrona com armazenamento |

---

## 12. Dados pessoais e LGPD

- **Natureza:** processos de família contêm dados pessoais sensíveis, inclusive de
  **crianças e adolescentes**. Por isso a demonstração exige **dados fictícios ou
  anonimizados**, com checkbox obrigatório antes de cada análise e aviso fixo em todo
  relatório.
- **Onde os dados passam:**
  1. modo demonstração: **nenhum dado do usuário sai do navegador**; só arquivos estáticos
     fictícios são baixados;
  2. modo real: navegador → Vercel (HTTPS) → API da Anthropic com a chave do usuário
     (processamento **fora do Brasil**: transferência internacional, art. 33 da LGPD, que
     exige base legal e contrato em uso real);
  3. **ditado por voz** (opcional): no Chrome, o áudio é processado pelo serviço de
     reconhecimento do Google.
- **Retenção:**
  - nada é gravado em disco ou banco; as funções não guardam estado entre chamadas;
  - o texto extraído dos documentos, a tese e a chave ficam **só na memória da aba** do
    usuário, para a simulação; somem ao fechar ou recarregar a página;
  - os casos de demonstração são fictícios e versionados no repositório; foram criados a
    partir de temas pesquisados em fontes públicas, **sem raspagem de processos reais**
    (`docs/CATALOGO_DE_SITUACOES.md`);
  - no navegador, só preferências de acessibilidade são persistidas.
- **Minimização:** a análise devolve ao próprio usuário apenas o texto que ele mesmo enviou,
  para evitar guardar qualquer coisa no servidor.
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
  Sem `ANTHROPIC_API_KEY` no ambiente, todos os testes são pulados (`skip`). Com os 33
  casos do golden dataset, a suíte completa custa cerca de 33 análises; para rodar só um
  subconjunto, use `pytest -k`.
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
| `test_pipeline_todos_os_casos.py` | **parametrizado sobre todas as pastas do golden dataset** (33 casos): roda sem erro, resumo presente, 2 avisos, invariante FACT/SOURCE, citações só de documentos reais |

**Golden dataset:** `case_01` (genérico, contradição plantada) e `case_familia_01..32`
(fictícios), cada um com documentos, `tese.txt` e **`gabarito.md`** com a vulnerabilidade
central esperada, as lacunas, as perguntas aceitáveis e os **falsos positivos a evitar**.
O caso 14 foi criado para exercitar datas conflitantes; os casos 15 a 32 (14/09/2026)
ampliam a cobertura para união estável, alimentos gravídicos/avoengos/compensatórios,
prisão civil, guarda internacional e com medida protetiva, convivência de avós, filiação,
curatela, tomada de decisão apoiada e abandono afetivo.

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
- **Modo demonstração e chave do usuário (14/09/2026):** `construir_demo.py` com 32 casos e
  424 trechos conferidos; fluxo de demonstração no navegador (Playwright) com seleção de
  casos novos, relatório, selo, abas e simulação com respostas prontas, sem erros de
  JavaScript; `POST /api/analisar` sem chave (401), chave malformada (400) e chave falsa
  (401 traduzido da Anthropic), sem custo.
- Registros anteriores de testes internos e do teste externo: `docs/testes-internos.md`,
  `docs/roteiro-teste-externo.md`, `docs/evidencias/`.

---

## 16. Configuração, execução e hospedagem

### 16.1 Variáveis de ambiente

Nenhuma é obrigatória para o site funcionar (ADR-014).

| Variável | Obrigatória | Padrão | Uso |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | não | — | só para `pytest` e `POST /api/analyze` locais |
| `LLM_PROVIDER` | não | `anthropic` | `anthropic`, `groq` ou `gemini` (ignorada quando o usuário informa a chave) |
| `GROQ_API_KEY` | se `groq` | — | testes gratuitos locais |
| `GEMINI_API_KEY` | se `gemini` | — | testes gratuitos locais |

### 16.2 Execução local
```bash
pip install -r requirements.txt
python -m app.server               # http://localhost:8000 (sem chave: demonstração + chave do usuário)
python scripts/construir_demo.py   # regenera app/static/demo/ depois de editar demo/fontes/
python -m pytest                   # suíte completa: exige ANTHROPIC_API_KEY e tem custo
```

### 16.3 Hospedagem: Vercel (ADR-014)

- **Configuração (`vercel.json`):** `buildCommand` vazio (não há build), `outputDirectory:
  app/static`, funções `api/*.py` com `maxDuration: 300` e `includeFiles: app/**`;
  cabeçalhos `nosniff`, `no-referrer`, `X-Frame-Options: DENY`; `Cache-Control` de 5
  minutos para `demo/*`. Dependências Python lidas de `requirements.txt`.
- **`.vercelignore`:** exclui `.env`, `tests/`, `golden_dataset/`, `demo/`, `scripts/`,
  `docs/`, `specs/`, `.specify/`, `.claude/`, PDFs, PPTX e caches.
- **Publicação:** importar o repositório `ribasgiovanna/AdversIA` no painel da Vercel; cada
  push na `main` gera nova publicação. Nenhuma variável de ambiente precisa ser configurada.
- **Domínio:** subdomínio gratuito `*.vercel.app` (o nome depende da disponibilidade no
  momento da importação).
- **Não verificado ainda:** comportamento das funções Python na Vercel com uma análise
  real completa (o fluxo foi validado no servidor local, com o mesmo `api_comum.py`).
- **Histórico:** até 13/09/2026 o acesso externo era por Cloudflare Quick Tunnel a partir de
  um notebook (ADR-011), com a chave da equipe; substituído por esta configuração.

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
| 014 | Vercel, modo demonstração pré-montado (32 casos fictícios) e chave da Anthropic do próprio usuário |

- **Outros documentos:** `CONFORMIDADE.md` (acessibilidade, LGPD, segurança),
  `CATALOGO_DE_SITUACOES.md` (casos fictícios e fontes públicas dos temas), `COSTS.md`,
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
- Sem estado no servidor: recarregar a página perde o relatório e a simulação daquela
  análise.
- Plano gratuito da Vercel: limites de uso e duração máxima de 300 s por função.
- Dependência de serviços externos: Vercel, Anthropic, Google Fonts, VLibras.
- A análise real exige que o usuário tenha conta e crédito na Anthropic.
- A demonstração mostra análises preparadas previamente, não geradas na hora (a tela
  informa isso).

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
