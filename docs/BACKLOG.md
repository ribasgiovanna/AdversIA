# Backlog — AdversIA

Cada tarefa: objetivo, dependências, critério de aceite. Fonte de verdade do produto: `docs/PRODUCT_SCOPE.md`.

> **Execução detalhada**: o bloco P0 abaixo foi formalizado em spec-kit como a feature
> `001-adversarial-vulnerability-report`. Para a lista de tarefas granular e ordenada por
> dependência (com testes e critérios de aceite por campo), use
> `specs/001-adversarial-vulnerability-report/tasks.md` — este backlog continua sendo a
> visão de produto, aquele é o plano de execução.

## P0 — obrigatório para provar o conceito (hoje, até 17h30)

### P0.1 — Criar caso fictício #1 (Golden Dataset) ✅ CONCLUÍDO
- **Objetivo:** ter 2–3 documentos curtos (petição/tese + contestação ou prova) com pelo menos 1 contradição plantada deliberadamente.
- **Dependências:** nenhuma.
- **Critério de aceite:** documentos escritos, contradição identificada e documentada separadamente (gabarito) para checagem posterior.
- **Evidência:** `golden_dataset/case_01/` (3 documentos + `tese.txt` + `gabarito.md`).

### P0.2 — Prompt 1: Case Model ✅ CONCLUÍDO
- **Objetivo:** extrair partes, fatos, pedidos, evidências e tese em JSON estruturado a partir dos documentos.
- **Dependências:** P0.1.
- **Critério de aceite:** rodado contra o caso #1, produz JSON válido com os campos do schema (seção 11 do briefing/Foundation v1), sem inventar fato ausente do texto.
- **Evidência:** `app/pipeline.py::extrair_case_model` + `app/tool_schemas.py::CASE_MODEL_SCHEMA` (tool use — JSON sempre válido).

### P0.3 — Prompt 2: Evidence Mapping ✅ CONCLUÍDO
- **Objetivo:** ligar cada alegação à evidência correspondente, citando trecho.
- **Dependências:** P0.2.
- **Critério de aceite:** toda alegação do Case Model aparece mapeada a uma evidência ou marcada como sem evidência.
- **Evidência:** rodada real de 12/09 sinalizou 4 alegações sem evidência (ver `docs/evidencias/teste_interno_case01_20260912.json`).

### P0.4 — Prompt 3: Detecção de contradições ✅ CONCLUÍDO
- **Objetivo:** encontrar inconsistências entre os documentos/fatos do caso.
- **Dependências:** P0.2.
- **Critério de aceite:** a contradição plantada no caso #1 é encontrada; nenhuma contradição inventada é reportada.
- **Evidência:** contradição plantada (jornada vs. testemunha) e uma segunda inconsistência de data encontradas; `pytest tests/test_pipeline_contradiction.py` — 2/2 passando.

### P0.5 — Prompt 4: Motor Adversarial ✅ CONCLUÍDO
- **Objetivo:** gerar contra-argumentos, perguntas difíceis e hipóteses adversariais plausíveis.
- **Dependências:** P0.2, P0.3, P0.4.
- **Critério de aceite:** ao menos 3 contra-argumentos plausíveis e 3 perguntas difíceis, cada um rotulado como `ADVERSARIAL_HYPOTHESIS`.
- **Evidência:** rodada real gerou 5 contra-argumentos e 6 perguntas difíceis; `pytest tests/test_pipeline_hard_questions.py` — 3/3 passando.

### P0.6 — Prompt 5: Verificação ✅ CONCLUÍDO
- **Objetivo:** checar cada claim do Prompt 4 contra o Case Model; sem lastro → `UNVERIFIED`.
- **Dependências:** P0.5.
- **Critério de aceite:** nenhum item do relatório final aparece sem rótulo de proveniência.
- **Evidência:** 17/17 findings com `provenance` preenchido e `origem` citada na rodada real; `pytest tests/test_pipeline_provenance.py` — 3/3 passando.

### P0.7 — Relatório de Vulnerabilidade Jurídica (montagem final) ✅ CONCLUÍDO
- **Objetivo:** consolidar as saídas dos prompts 1–5 em um relatório legível (3 vulnerabilidades principais, evidências, contradições, contra-argumentos, perguntas difíceis, fontes).
- **Dependências:** P0.2–P0.6.
- **Critério de aceite:** relatório gerado a partir do caso #1, revisado manualmente e sem alucinação identificada.
- **Evidência:** `docs/evidencias/teste_interno_case01_20260912.json` — revisado manualmente, 0 alucinações identificadas (ver `docs/METRICS.md`).

### P0.8 — Interface web mínima (upload + relatório) ✅ CONCLUÍDO
- **Objetivo:** página HTML/JS para subir documento(s) e ler o relatório gerado.
- **Dependências:** P0.7; servidor mínimo de proxy para a API da Anthropic (ADR-005).
- **Critério de aceite:** auditor consegue rodar sozinho, sem ajuda da equipe (dimensão "Usabilidade" da auditoria).
- **Evidência:** `app/server.py` + `app/static/` — testado via `curl` contra o servidor real rodando em `localhost:8000`, HTTP 200.

### P0.9 — Testes Internos (evidência para 15h30) ✅ CONCLUÍDO
- **Objetivo:** rodar o pipeline completo contra o caso #1 e registrar prints/logs.
- **Dependências:** P0.1–P0.8.
- **Critério de aceite:** evidência salva no repositório antes das 15h30.
- **Evidência:** `docs/evidencias/teste_interno_case01_20260912.json` (chamada real via servidor) + 9/9 testes automatizados passando (`pytest tests/ -v`, log em `specs/001-adversarial-vulnerability-report/tasks.md`).

### P0.10 — Testes Externos (evidência para 17h30) ⬜ PENDENTE
- **Objetivo:** 2–3 pessoas de fora da equipe usam a ferramenta e respondem Perceived Usefulness/Trust.
- **Dependências:** P0.8 (concluído — o servidor já pode ser usado por qualquer pessoa).
- **Critério de aceite:** depoimento/print no repositório antes das 17h30.
- **Status:** único item do P0 que depende de pessoas reais fora da equipe — não pode ser feito por automação. Rodar `python -m app.server`, mostrar para 2–3 pessoas e coletar Perceived Usefulness (1–5) e Trust (1–5) em `docs/METRICS.md`.

## Pivô de domínio e conformidade (12/09, tarde) ✅ CONCLUÍDO

Trabalho adicional pedido após o P0 original estar validado — rebranding, foco em
Direito de Família e revisão de acessibilidade/LGPD/segurança (ADR-008,
`docs/DECISIONS.md`).

- **Rebrand ADVERSA → AdversIA**: renomeado em todo o código, docs e specs (busca por
  `\bADVERSA\b`, preservando `ADVERSARIAL_HYPOTHESIS` que é um valor de enum não
  relacionado à marca). Tagline "A divorciar? adversIA." na UI.
- **Análise de 5 casos reais de Direito de Família** fornecidos pela equipe (`docs/casos
  hackathon.md`, Casos 1–5) — ver `docs/ANALISE_CASOS_FAMILIA.md`: padrões de disputa
  (partilha de bens, pensão, guarda, alienação parental), tipo de prova tipicamente
  ausente por tipo de pedido, e vocabulário de domínio.
- **Prompts com contexto de domínio**: `app/prompts/_dominio_familia.md` injetado nas 5
  etapas do pipeline (`app/pipeline.py::_carregar_prompt`), derivado diretamente da
  análise acima.
- **Novo caso no Golden Dataset**: `golden_dataset/case_familia_01/` (partilha de bens,
  baseado no Caso 1 analisado) — testa um padrão diferente do `case_01` original
  (lacunas probatórias em vez de contradição factual), com testes dedicados em
  `tests/test_pipeline_familia.py`.
- **Acessibilidade**: `aria-live`, `role="alert"`, gestão de foco programática, contorno
  de foco visível, rótulos textuais (não só cor) — ver `docs/CONFORMIDADE.md`, seção 1.
- **LGPD / dados confidenciais**: checkbox obrigatório de confirmação de dado
  fictício/anonimizado antes do envio (`index.html`), revisão de transferência
  internacional de dados e de dados de crianças/adolescentes — ver `docs/CONFORMIDADE.md`,
  seções 2–3, e novos riscos em `docs/RISKS.md`.
- **Segurança**: limite de 15MB por upload (`app/server.py::MAX_BODY_SIZE`), checagem de
  path traversal verificada manualmente, mensagens de erro 500 sem vazar detalhe interno
  ao cliente — ver `docs/CONFORMIDADE.md`, seção 4.

## P1 — importante (evolução após o MVP de hoje)

- Jurisprudência externa citada com verificação explícita de fonte (depende de ADR-002 ser revisitado).
- Ranking de vulnerabilidades por severidade (crítica/média).
- Comparação entre versões da tese (antes/depois da revisão).
- UI refinada (estado de carregamento, histórico de análises na sessão).

## P2 — evolução futura

- Simulação de audiência / treino de sustentação oral.
- Múltiplos casos salvos, histórico entre sessões.
- Suporte a voz.
- Monitoramento processual.
