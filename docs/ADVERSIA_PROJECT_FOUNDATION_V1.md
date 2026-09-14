# AdversIA — PROJECT FOUNDATION v1

> Hackathon da Cidadania OAB/PR 2026 — Categoria A (Inovação Aberta e Cidadania).
> Documento produzido conforme exigido pelo `ADVERSA_BRIEFING_CLAUDE_AGENT.md`, seção "Primeira entrega obrigatória".
> **Regra vigente:** só se inicia implementação depois deste documento ser lido e validado pela equipe.

## Pivô de escopo (12/09, tarde) — ler antes do resto do documento

O produto foi renomeado **ADVERSA → AdversIA** e o domínio foi restringido
exclusivamente a **Direito de Família** (divórcio: partilha de bens, pensão alimentícia,
guarda e convivência) — tagline "A divorciar? adversIA." (ADR-008,
`docs/DECISIONS.md`). As seções abaixo foram escritas antes do pivô e descrevem o produto
de forma genérica ("qualquer área do Direito"); onde isso aparecer, leia como
"especializado em Direito de Família". Documentos que refletem o estado pós-pivô e
prevalecem em caso de divergência: `docs/PRODUCT_SCOPE.md` (fonte de verdade),
`docs/ANALISE_CASOS_FAMILIA.md` (análise de domínio que embasou os prompts) e
`app/prompts/_dominio_familia.md` (contexto de domínio injetado no pipeline).

## Nota de alinhamento com o Manual do Hackathon (leitura cruzada)

O briefing mestre foi escrito como se houvesse um ciclo de produto longo (piloto, produção, DevOps). A realidade operacional é mais dura: **hoje (12/09) é Dia 1** e o relógio já está correndo — Canvas 12h, Testes Internos 15h30, Testes Externos 17h30; amanhã (13/09) tem Produto 10h30, Auditoria técnica 10h30–14h30, Slides 14h30 e Pitch a partir das 15h. A auditoria (até 300 pontos) julga só três coisas: **confiabilidade/precisão**, **usabilidade** e **sofisticação técnica** (onde nota 5 = "uso de RAG e sistemas de prompts"). Isso significa:

- Não vale a pena, no tempo restante, montar a stack completa do briefing (FastAPI + PostgreSQL + Qdrant + LangGraph). Isso é arquitetura de **piloto**, não de hackathon.
- O Manual da OAB/PR permite explicitamente construir a solução "com criação de prompts, uso de documentos e agentes inteligentes", **sem necessidade de programação**. Isso é compatível com o conceito AdversIA e reduz risco de "demo quebrada".
- Toda decisão técnica abaixo é filtrada por: *isso aumenta a nota de auditoria ou o valor demonstrável no pitch, dentro do tempo que resta?*

---

## 1. Executive Summary

AdversIA é uma camada de revisão adversarial: o advogado envia o material de um caso (petição, contrato, provas, tese) e a ferramenta devolve um **Relatório de Vulnerabilidade Jurídica** — contradições, lacunas probatórias, contra-argumentos plausíveis e perguntas difíceis, cada afirmação rotulada por proveniência (FACT / SOURCE / INFERENCE / ADVERSARIAL_HYPOTHESIS / UNVERIFIED). Não decide, não prevê sentença, não substitui o advogado. O MVP do hackathon prova uma hipótese única: **uma IA orientada adversarialmente encontra, a partir dos documentos do caso, vulnerabilidades que o advogado ainda não tinha percebido e que um profissional considera plausíveis.**

## 2. Problematização

Fato observável (não hipótese): advogados frequentemente revisam sua própria estratégia, o que é estruturalmente propenso a viés de confirmação — quem constrói o argumento tem dificuldade de atacá-lo com a mesma isenção que a parte contrária teria. Isso é consenso na literatura de raciocínio jurídico e debate adversarial, mas **a intensidade do problema para o público-alvo específico (advogado autônomo/pequeno escritório no PR) ainda não foi medida por nós** — é uma hipótese, não um dado levantado nesta maratona.

## 3. Hipóteses que ainda precisam ser validadas

| # | Hipótese | Como validar (mesmo com pouco tempo) |
|---|---|---|
| H1 | Advogados sentem falta de contraditório interno antes de protocolar | Pergunta direta nos Testes Externos de hoje (17h30): "você já foi pego de surpresa por um argumento da parte contrária que poderia ter antecipado?" |
| H2 | Uma IA consegue gerar contra-argumentos *plausíveis* (não genéricos) a partir só dos documentos | Golden Dataset (seção 23) rodado internamente às 15h30 |
| H3 | Advogado confia em uma "primeira camada" de revisão feita por IA | Pergunta de escala 1–5 (Trust) nos testes externos |
| H4 | O relatório reduz tempo de revisão sem aumentar risco de falso positivo | Não medível com rigor no hackathon; classificar como **HIPÓTESE A VALIDAR EM PILOTO** |

## 4. Processo atual sem IA

Advogado cria estratégia → relê documentos → tenta imaginar ataques da parte contrária → busca jurisprudência manualmente → (às vezes) pede revisão de colega → revisa a peça. Gargalo: as etapas de "imaginar ataques" e "pedir revisão de colega" dependem de tempo e disponibilidade de terceiros — são as que mais falham sob prazo.

## 5. Processo proposto com IA

Advogado envia documentos + descreve a tese → sistema monta um **Case Model** estruturado → mapeia alegação↔evidência → sinaliza contradições e lacunas → gera contra-argumentos e perguntas difíceis → cita a origem de cada achado → devolve relatório priorizado (crítico/médio) → advogado revisa e decide o que muda na estratégia.

## 6. Comparação sem IA x com IA

| Dimensão | Sem AdversIA | Com AdversIA | Status |
|---|---|---|---|
| Tempo de revisão adversarial | Horas, sujeito a agenda de terceiros | Minutos por rodada | HIPÓTESE A VALIDAR |
| Cobertura da análise | Depende da experiência de quem revisa | Sistemática (checklist adversarial + evidência) | HIPÓTESE A VALIDAR |
| Rastreabilidade | Geralmente informal | Cada achado citando fonte/trecho | Estrutural (por design) |
| Dependência de terceiros | Alta | Baixa (mas não substitui revisão humana final) | Estrutural |
| Falsos positivos | N/A | Depende de qualidade do prompt/verificação | Risco central (seção 26) |

Não afirmar ganho de produtividade sem teste — todo "ganho" acima que não vier de medição direta nos testes de hoje deve ser apresentado no pitch como hipótese, não como dado.

## 7. Usuário principal

**Advogado(a) autônomo(a) ou de pequeno escritório**, atuando em contencioso (cível, trabalhista ou similar), que prepara sozinho(a) ou com equipe reduzida as próprias petições e não tem rotina formal de revisão por pares.

- Contexto: pouco tempo, sem departamento de revisão dedicado.
- Dor: medo de ser surpreendido por um argumento óbvio da parte contrária.
- Frequência: recorrente, a cada peça relevante (contestação, réplica, recurso).
- Como resolve hoje: relê sozinho, às vezes pede uma segunda opinião informal.
- Ganho esperado: mais confiança antes do protocolo.
- Risco percebido: confiar demais na IA ou vazar dado sigiloso de cliente.
- Nível técnico: baixo a médio — a interface precisa ser tão simples quanto "enviar documento e ler relatório".

## 8. Personas secundárias

- **Estudante de Direito**: usa como ferramenta de treino para bancas/audiências simuladas (conecta com a lógica de "estress test" da tese). P2 para o MVP.
- **Gestor jurídico de escritório médio**: interessado em padronizar revisão adversarial entre associados. Fora do escopo do MVP (requer múltiplos usuários/permissões).

**Regra do MVP aplicada:** o produto do hackathon é desenhado só para o advogado autônomo/pequeno escritório revisando um caso individual.

## 9. Job To Be Done

> "Quando estou preparando uma estratégia jurídica, quero submetê-la a uma análise crítica independente, para descobrir fragilidades antes que a parte adversária as utilize contra mim."

Avaliação crítica: a formulação é boa, mas mistura dois momentos de uso (preparação da tese vs. véspera do protocolo). Para o MVP, focar no segundo momento — mais concreto, com artefato de entrada bem definido (a minuta já redigida + documentos do caso), mais fácil de demonstrar em 2 minutos de pitch.

## 10. Casos de uso (priorizados)

| Caso de uso | Prioridade |
|---|---|
| Revisar uma petição/minuta antes do protocolo, apontando vulnerabilidades | P0 |
| Comparar alegações com evidências documentais (evidence mapping) | P0 |
| Identificar contradições entre os documentos do caso | P0 |
| Gerar contra-argumentos e perguntas difíceis que a parte adversária poderia usar | P0 |
| Testar uma tese jurídica isolada (sem petição redigida) | P1 |
| Comparar duas versões da estratégia (antes/depois da revisão) | P1 |
| Treinar para audiência (simulação de sustentação oral) | P2 |

## 11. Proposta de valor

"Antes que a parte contrária confronte sua estratégia, a AdversIA confronta primeiro — apontando exatamente onde e por quê, com a fonte de cada achado." Diferencial: não é um chatbot jurídico genérico que responde perguntas; é uma ferramenta de **contraditório estruturado sobre os documentos do próprio caso**.

## 12. Fontes de dados

**A. Case Knowledge Base** (dados internos do caso): PDFs/DOCX enviados pelo usuário — petição, contestação, provas, descrição da tese. Fonte primária e única obrigatória para o MVP.

**B. Fontes jurídicas externas**: legislação e jurisprudência pública. Para o MVP de hoje, tratar como **P1, não P0** — motivo: exige avaliar API/licença/confiabilidade de cada base (ex.: buscas em portais de tribunais, Planalto para legislação), o que consome tempo que o cronograma de hoje não permite investigar com rigor. Se usado, restringir a citação explícita de fonte pública e nunca inventar número de processo/ementa.

**C. Dados gerados pela IA**: sempre rotulados (inferência, hipótese adversarial, sumarização, classificação) e nunca misturados com A ou B sem rótulo.

**Regra de integração**: nenhum scraping de tribunal hoje — risco jurídico/técnico alto e fora do prazo. Se jurisprudência for citada, será via o conhecimento do próprio modelo com aviso explícito de "verificar fonte original antes de usar em peça real", nunca como fato verificado.

## 13. Estratégia de proveniência

Usar os três schemas propostos no briefing (documento interno, jurisprudência, legislação) como contrato de dados interno do Case Model. Cada achado do relatório final carrega `origem` (chunk/trecho + tipo de fonte). Sem origem rastreável, o achado é marcado `UNVERIFIED` e não pode aparecer como vulnerabilidade "crítica".

## 14. Arquitetura mínima (a usar HOJE)

Given a janela de tempo, a arquitetura mínima real para o hackathon é deliberadamente **não um backend completo**, e sim um pipeline de prompts bem desenhado, operável por um humano ou por uma automação leve:

```
Documentos do caso (PDF/DOCX/texto)
        ↓
Extração de texto (leitura direta, ou parsing simples)
        ↓
PROMPT 1 — Estruturação do Case Model (JSON: partes, fatos, pedidos, evidências, tese)
        ↓
PROMPT 2 — Evidence Mapping (alegação ↔ evidência, com citação de trecho)
        ↓
PROMPT 3 — Detecção de contradições (compara fatos/documentos entre si)
        ↓
PROMPT 4 — Motor Adversarial (gera contra-argumentos, perguntas difíceis, hipóteses)
        ↓
PROMPT 5 — Verificação (cada claim do PROMPT 4 é checado contra o Case Model; sem lastro → UNVERIFIED)
        ↓
Relatório de Vulnerabilidade Jurídica (Markdown/HTML)
```

Interface de demonstração: uma página simples (HTML/Vite ou até um documento estruturado) onde se sobe o(s) arquivo(s) e se lê o relatório. Não precisa banco de dados persistente para o MVP — armazenamento em arquivo/sessão é suficiente e reduz risco de bug em auditoria.

## 15. Fluxo de dados

`Upload → extração de texto → Case Model (JSON validado) → pipeline de prompts em cadeia (cada etapa consome o output validado da anterior) → relatório final com citações → tela de leitura`. Nenhum dado sai do fluxo sem rótulo de proveniência (seção 13).

## 16. Ferramentas recomendadas (avaliação crítica, não aceitação automática da stack do briefing)

| Camada | Opção do briefing | Avaliação para HOJE | Recomendação |
|---|---|---|---|
| Backend | FastAPI/Python | Complexidade desnecessária para provar a hipótese em horas | **Não usar hoje**; considerar no piloto |
| Frontend | React+Vite ou HTML/CSS/JS | HTML/JS simples é suficiente para demo | Usar HTML/CSS/JS simples |
| Banco | PostgreSQL/SQLite | Persistência não é crítica para o pitch | Dispensar ou, no máximo, SQLite local |
| Vector DB | Qdrant/pgvector | Monta risco de integração sem ganho perceptível no pitch de 2 min | **Fora do MVP de hoje** |
| Processamento documental | PyMuPDF/Docling | Necessário só se o parsing manual falhar em PDFs reais | Usar leitura direta de PDF/texto; Docling só se sobrar tempo |
| Orquestração | Python/LangGraph | Cadeia de prompts pode ser feita sem framework | Cadeia simples de prompts, sem framework |
| RAG | Hybrid Search | Ver seção 19 | RAG "leve" apenas sobre os documentos do caso |
| LLM | OpenAI/Anthropic/Gemini | Ver seção 18 | Claude (Sonnet/Opus) como principal |

Critério de decisão explícito: cada ferramenta abaixo do corte foi cortada porque **não muda a nota de auditoria hoje** e aumenta risco de "demo quebrada" (risco #1 do hackathon, seção 26).

## 17. Comparação das alternativas técnicas

- **Cadeia de prompts sem framework** vs. **LangGraph**: para 4–5 etapas lineares (seção 14), um framework de orquestração de agentes é overhead. LangGraph vale a pena só se houver ramificação condicional complexa — não é o caso do MVP.
- **RAG completo (lexical+vetorial+rerank)** vs. **citação direta por contexto longo**: com poucos documentos por caso (o cenário típico de um caso jurídico individual cabe no contexto de um LLM moderno), inserir o texto completo no prompt e pedir citação de trecho é mais simples, mais barato e mais fácil de auditar do que montar um índice vetorial — a etapa de "sofisticação técnica RAG" pode ser demonstrada de forma mais simples com retrieval lexical (busca por trecho) sobre os documentos, sem vetor DB.

## 18. Modelo de IA recomendado

Separar por tarefa, como o briefing pede:

| Tarefa | Recomendação | Motivo |
|---|---|---|
| Extração (Case Model) | Modelo com bom suporte a JSON estruturado e português jurídico | Precisão > criatividade |
| Raciocínio adversarial | Modelo com raciocínio mais forte (ex.: Claude Sonnet/Opus) | Qualidade do contra-argumento é o valor central do produto |
| Verificação (claim↔documento) | Mesmo modelo do raciocínio, com prompt restrito e temperatura baixa | Reduzir alucinação na etapa mais sensível |
| Sumarização | Modelo mais barato/rápido | Custo, não é a etapa crítica |

**Não acoplar lógica de negócio a um provedor específico**: todas as chamadas devem passar por uma função `chamar_llm(tarefa, prompt)` isolada, mesmo que hoje só exista um provedor implementado — isso é barato de fazer agora e caro de corrigir depois.

## 19. Estratégia de RAG

RAG interno (documentos do caso) é **necessário mínimo** — é a base de todo o produto. RAG externo (jurisprudência/legislação pública) é **P1**, não P0, pelos motivos da seção 12. Componentes avaliados:

- **Lexical search**: necessário e barato (buscar trecho por palavra-chave/regex nos documentos do caso para fundamentar citações).
- **Vector search**: não necessário no MVP — poucos documentos por caso cabem em contexto direto do LLM.
- **Metadata filtering**: útil só quando há múltiplos documentos de tipos diferentes (petição vs. prova vs. contrato) — implementar como tag simples no Case Model, não como filtro de banco.
- **Reranking**: desnecessário sem vetor DB.

## 20. Estratégia de segurança contra hallucination

1. Toda afirmação do relatório carrega rótulo (`FACT`/`SOURCE`/`INFERENCE`/`ADVERSARIAL_HYPOTHESIS`/`UNVERIFIED`) — nunca hipótese apresentada como fato.
2. Etapa de verificação obrigatória (Prompt 5, seção 14): todo contra-argumento gerado é checado contra o Case Model antes de entrar no relatório final.
3. Prompt de verificação instruído a preferir abstenção ("não há base suficiente nos documentos para afirmar isso") a invenção.
4. Nunca citar jurisprudência/artigo de lei específico sem que o texto tenha sido fornecido no prompt ou marcado explicitamente como "não verificado, checar fonte original".

## 21. Métricas técnicas

- Fact Extraction Precision/Recall (seção 20 do briefing).
- Evidence Mapping Accuracy.
- Contradiction Precision e False Positive Rate (crítica — falso positivo destrói confiança).
- Citation Accuracy, Groundedness, Hallucination Rate, Unsupported Claim Rate, Abstention Accuracy.

Para hoje: medir manualmente sobre o Golden Dataset (seção 23), com 10–20 casos não é viável em horas; usar **3 a 5 casos controlados** como golden dataset mínimo do hackathon (ver seção 23), suficiente para gerar evidência de teste interno sem consumir o tempo que falta para o pitch.

## 22. Métricas de produto

- Task Success Rate, Time to First Insight, Perceived Usefulness (1–5), Trust (1–5), Reuse Intent, Vulnerability Discovery Rate — coletadas nos Testes Externos de hoje (17h30) com usuários reais (advogados presentes no evento, mentores, ou contatos externos).

## 23. Golden Dataset

Para o hackathon: **3 a 5 casos fictícios ou de domínio público**, cada um com: documentos conhecidos, fatos esperados, alegações/evidências esperadas, contradições conhecidas (inseridas de propósito em pelo menos 1 caso), vulnerabilidades esperadas, perguntas possíveis. Motivo do número reduzido: o briefing sugere 10–20, mas isso é meta de piloto — hoje o volume que importa é ter pelo menos **um caso com contradição plantada deliberadamente**, para provar que o sistema a encontra (evidência objetiva e fácil de mostrar no pitch).

## 24. Estratégia de validação com usuários

Testes internos (15h30): a própria equipe roda o Golden Dataset e audita manualmente falsos positivos/negativos. Testes externos (17h30): pelo menos 2–3 pessoas de fora da equipe (advogados, mentores, outros participantes) usam com um caso real ou fictício e respondem Perceived Usefulness e Trust (seção 22). Depoimento/print vai para o repositório conforme exigido pelo Manual (Entrega 3).

## 25. Comparação de resultado sem IA x com IA

Se houver tempo, medir com 1 pessoa: tempo para listar 3 vulnerabilidades "no olho" vs. tempo para revisar o relatório da AdversIA e validar 3 vulnerabilidades. Se não houver tempo hábil, **declarar explicitamente no pitch como hipótese não testada**, nunca como dado.

## 26. Risk Register

| Risco | Categoria | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| Alucinação de jurisprudência/artigo | Técnico | Média | Alto | Não citar sem fonte fornecida (seção 20) |
| Demo quebrada no dia da auditoria | Hackathon | Média | Alto | Preferir pipeline simples e testado, sem dependências externas frágeis (seção 14/16) |
| Parsing incorreto de PDF real (assinatura digital, imagem escaneada) | Técnico | Média | Médio | Ter fallback: colar texto manualmente se extração falhar |
| Falso positivo de contradição | Produto | Média | Alto | Prompt de verificação (seção 20) + revisão humana no relatório |
| Uso indevido como aconselhamento autônomo | Jurídico | Baixa-Média | Alto | Disclaimers explícitos no relatório: "não é parecer jurídico, requer revisão humana" |
| Dado sensível de cliente exposto a provedor de LLM | Jurídico/Privacidade | Média | Alto | Usar só casos fictícios/públicos/anonimizados no hackathon (seção 27) |
| Escopo maior que o tempo disponível | Hackathon | Alta | Alto | MVP estritamente cortado nas seções 30/31 |
| Falta de evidência de teste (checkpoint "não existe sem evidência") | Hackathon | Média | Alto | Print/log de cada teste salvo no repositório imediatamente após rodar |

## 27. Privacidade e segurança

Para o hackathon: usar exclusivamente casos **fictícios ou de domínio público** — nunca documentos reais de clientes. Nenhum dado enviado ao LLM deve conter PII real. Não há necessidade de criptografia/retention policy sofisticada hoje, mas o relatório final deve deixar explícito, como parte do próprio produto, que em uso real: (a) documentos sensíveis exigem avaliação de LGPD e sigilo profissional antes de qualquer envio a provedor externo de IA; (b) isso é responsabilidade do usuário/escritório, não do MVP.

## 28. Modelo de custos

Fórmula conceitual (sem inventar preço): `custo por análise = tokens de entrada + tokens de saída (das 5 etapas de prompt) + eventuais custos de parsing`. **Preço atual deve ser consultado diretamente nos provedores (Anthropic/OpenAI/Google) no momento da implementação** — não incluído aqui por não termos acesso a tabela de preço vigente confiável para setembro de 2026. Cenários a calcular quando os preços forem consultados: 10, 100, 1.000 e 10.000 análises/mês, considerando que cada análise dispara ~5 chamadas de LLM (Case Model, Evidence Mapping, Contradições, Motor Adversarial, Verificação).

## 29. Estratégia de redução de custos

- Usar modelo mais barato/rápido nas etapas de extração/sumarização e reservar o modelo mais forte só para raciocínio adversarial e verificação (seção 18).
- Evitar reprocessar o mesmo documento em múltiplas etapas sem necessidade — extrair o Case Model uma vez e reutilizar como contexto compartilhado.
- Chunking só quando o documento ultrapassar o limite de contexto do modelo; para o MVP, a maioria dos casos jurídicos cabe inteiro no contexto.

## 30. Viabilidade (três níveis)

- **MVP de hackathon**: sim, implementável nas próximas horas com a arquitetura da seção 14.
- **Piloto**: viável com usuários reais desde que se resolvam RAG externo de jurisprudência, persistência de casos, autenticação e política de dados sensíveis (LGPD).
- **Produto escalável**: exigiria a stack completa do briefing (backend real, vector DB, múltiplos usuários, auditoria de custo por escritório) — não confundir com o que se constrói hoje.

## 31. MVP

**Hipótese a provar**: uma IA adversarial encontra vulnerabilidades úteis em uma estratégia jurídica a partir dos documentos fornecidos.

- **Input**: PDFs/texto do caso + descrição da tese.
- **Processo**: parsing → Case Model → evidence mapping → detecção de contradições → geração adversarial → verificação.
- **Output**: relatório com 3 vulnerabilidades principais, evidências, contradições, 3 contra-argumentos, perguntas difíceis, fontes indicadas.

## 32. O que fica fora do MVP

Previsão de sentença, perfil de juiz, CRM, gestão financeira, cobrança, agenda, petição automática, voz, simulação de audiência completa, monitoramento processual, múltiplos agentes complexos, dashboards, vector DB/RAG externo, múltiplos usuários/autenticação, persistência em banco de dados.

## 33. Backlog P0/P1/P2

Ver seção separada `docs/BACKLOG.md` (a criar em seguida) — resumo aqui:

- **P0** (hoje, até 17h30): upload de documento(s) → Case Model → evidence mapping → contradições → contra-argumentos → relatório com fontes.
- **P1**: jurisprudência externa citada com verificação explícita, ranking de vulnerabilidades por severidade, UI refinada, comparação entre versões da tese.
- **P2**: simulação de audiência, múltiplos casos salvos, histórico, voz.

## 34. Cronograma de implementação (mapeado ao relógio real do hackathon)

| Horário | Entrega oficial | O que a equipe faz |
|---|---|---|
| Agora → 12h | Canvas (100 pts) | Preencher canvas com o conteúdo deste documento (problema, usuário, proposta de valor, MVP) |
| 12h → 15h30 | Testes Internos (100 pts) | Construir o pipeline de prompts (seção 14) e rodar contra 1–3 casos do Golden Dataset; registrar prints/logs |
| 15h30 → 17h30 | Testes Externos (100 pts) | Colocar 2–3 pessoas reais para usar; coletar depoimento/print para o repositório |
| 17h30 → fim do dia 1 | — | Ajustar o relatório final com base no feedback; documentar decisões (seção 35) |
| Dia 2, até 10h30 | Produto (100 pts) | Documentação de uso + dados de teste prontos no repositório; laptop funcional para o auditor |
| 10h30–14h30 | Auditoria | Garantir que o auditor consiga rodar sozinho um caso e ver o relatório com fontes citadas |
| até 14h30 | Slides (50 pts) | Deck de 2 minutos: Problema → Solução → Demo → Impacto |
| a partir das 15h | Pitch | Ensaiar o corte de 2 minutos; treinar a demonstração ao vivo |

## 35. Decision Log inicial

Ver `docs/DECISIONS.md` (a criar). Primeiras decisões já tomadas neste documento:

- ADR-001: Cortar backend completo (FastAPI/Postgres/Qdrant) do MVP do hackathon — motivo: tempo, risco de demo quebrada, sem ganho de nota de auditoria.
- ADR-002: RAG externo (jurisprudência/legislação) é P1, não P0 — motivo: risco de alucinação/citação incorreta sem tempo para validar fontes.
- ADR-003: Cada afirmação do relatório carrega rótulo de proveniência obrigatório — motivo: exigência do próprio conceito do produto e da dimensão "Confiabilidade" da auditoria.
- ADR-004: Provedor de LLM único para o hackathon = Anthropic (Claude), acessado por uma função isolada `chamar_llm()` — motivo: já disponível para a equipe, evita gasto de tempo configurando múltiplos provedores; troca futura de provedor não deve exigir reescrever lógica de negócio.
- ADR-005: Demo via interface web simples (HTML/JS) com upload + relatório na tela, sem framework de front-end — motivo: mais tangível para o pitch/auditoria do que mostrar um chat, com risco de implementação ainda baixo dado o escopo mínimo.
- ADR-006: Golden Dataset construído do zero, começando por 1 caso fictício com contradição plantada — motivo: nenhum material de teste existia; um único caso bem controlado já gera evidência auditável para os Testes Internos das 15h30.

## 36. Principais dúvidas — status

Resolvidas em 12/09:

- **Provedor de LLM**: Claude (Anthropic). Confirma a recomendação da seção 18; a função `chamar_llm()` (seção 18) será implementada sobre o SDK/API da Anthropic, mantida isolada para não acoplar lógica de negócio ao provedor.
- **Formato da demo**: interface web simples (HTML/JS) — upload de documento(s) + botão + relatório na tela. Reforça a seção 14 (sem backend pesado): front-end estático fazendo chamadas a uma função/servidor mínimo que só encaminha para a API da Anthropic.
- **Golden Dataset**: ainda não existe — será criado agora (ver Backlog, item P0 "Criar caso fictício #1"). Pelo menos 1 caso deve conter uma contradição plantada deliberadamente (seção 23).

Ainda em aberto:

- Quantas pessoas da equipe têm perfil jurídico (mínimo 2 exigido pelo edital) e qual a disponibilidade de cada uma para os testes externos de hoje (17h30)? — depende da equipe, não é um bloqueio técnico.

## 37. Recomendação final

Construir o MVP como um pipeline de prompts em cadeia (seção 14), sem framework/backend pesado, com um Golden Dataset de 3–5 casos fictícios (pelo menos 1 com contradição plantada), interface mínima de upload+leitura de relatório, e proveniência obrigatória em cada achado. Priorizar ter algo **testável pelo auditor sem ajuda da equipe** (dimensão 2 da auditoria) acima de qualquer sofisticação extra.

## 38. Próxima ação concreta

**Nos próximos 30–60 minutos**: (1) responder as dúvidas da seção 36; (2) montar 1 caso fictício simples (2–3 documentos curtos, com 1 contradição plantada); (3) escrever o Prompt 1 (Case Model) e testá-lo manualmente contra esse caso. Isso já produz evidência para o Canvas das 12h.

---

# Perguntas obrigatórias

### A. Qual é o problema exato que estamos resolvendo?
Advogados revisam a própria estratégia sozinhos, sem contraditório estruturado, o que favorece pontos cegos antes do protocolo de uma peça.

### B. Quem sente esse problema?
Advogado(a) autônomo(a) ou de pequeno escritório, sem rotina formal de revisão por pares.

### C. Como essa pessoa resolve hoje?
Relê os próprios documentos, tenta imaginar ataques da parte contrária, às vezes pede uma opinião informal a um colega — quando há tempo e disponibilidade de terceiros.

### D. O que muda quando introduzimos a AdversIA?
A revisão adversarial deixa de depender de imaginação isolada ou de terceiros disponíveis: passa a ser sistemática, com mapeamento de evidência, detecção de contradição e citação de fonte para cada achado.

### E. Qual dado comprovaria que a AdversIA gera valor?
Vulnerabilidades apontadas que um advogado real, nos testes externos de hoje, classifica como plausíveis e que ele não havia identificado antes (Validated Vulnerability Discovery Rate, seção 25 do briefing).

### F. Qual métrica provaria que o projeto funciona?
Validated Vulnerability Discovery Rate combinada com False Positive Rate baixa — encontrar vulnerabilidades reais sem gerar ruído de contradições inventadas.

### G. Qual é o maior risco de o projeto falhar?
Alucinação (citar contradição, contra-argumento ou fonte que não existe nos documentos) — é o risco que mais rapidamente destrói a confiança do usuário e a nota de "Confiabilidade" na auditoria.

### H. Qual é a menor versão do produto capaz de validar a hipótese?
Upload de 1–3 documentos de um caso fictício → Case Model → relatório com 3 vulnerabilidades, evidências e fontes citadas — sem banco de dados, sem múltiplos usuários, sem jurisprudência externa.

### I. Qual é o custo aproximado de uma análise?
Não calculável com precisão sem consultar preço vigente dos provedores de LLM (regra: não inventar preço). Fórmula: tokens de entrada + tokens de saída das ~5 chamadas do pipeline (seção 28); calcular assim que a chave/provedor for definido (seção 36).

### J. O que devemos construir nas próximas 3 horas?
O pipeline de prompts (Case Model → Evidence Mapping → Contradições → Motor Adversarial → Verificação) rodando contra 1 caso fictício com contradição plantada, com relatório de saída legível — suficiente para os Testes Internos das 15h30.
