# Product Scope — AdversIA

> **Fonte de verdade do produto.** Se uma decisão nova contradizer este documento, sinalizar a inconsistência antes de implementar. Análise completa e critério da avaliação crítica: `docs/ADVERSIA_PROJECT_FOUNDATION_V1.md`. Decisões: `docs/DECISIONS.md`. Riscos: `docs/RISKS.md`. Métricas: `docs/METRICS.md`. Custos: `docs/COSTS.md`. Backlog: `docs/BACKLOG.md`. Análise de domínio: `docs/ANALISE_CASOS_FAMILIA.md`. Conformidade: `docs/CONFORMIDADE.md`.

> **PIVÔ DE ESCOPO (12/09, tarde):** o produto foi renomeado de ADVERSA para **AdversIA**
> e o domínio foi restringido exclusivamente a **Direito de Família** (divórcio: partilha
> de bens, pensão alimentícia, guarda e convivência). Tagline: "A divorciar? adversIA."
> Isso substitui a formulação genérica ("qualquer área do Direito") do restante deste
> documento e do `ADVERSIA_PROJECT_FOUNDATION_V1.md` — onde os dois divergirem, este pivô
> prevalece (ADR-008, `docs/DECISIONS.md`).

## 1. Problemática
Advogados de família revisam a própria estratégia sozinhos, sem contraditório
estruturado — risco de viés de confirmação e pontos cegos antes do protocolo de uma peça
de divórcio (partilha, alimentos ou guarda). (Foundation v1, §2–3; domínio detalhado em
`docs/ANALISE_CASOS_FAMILIA.md`)

## 2. Usuário
Advogado(a) autônomo(a) ou de pequeno escritório especializado em Direito de Família, sem
rotina formal de revisão por pares, atuando em processos de divórcio litigioso (partilha
de bens, alimentos, guarda/convivência). (Foundation v1, §7–9, adaptado ao domínio)

## 3. Processo atual
Relê documentos sozinho, tenta imaginar ataques da parte contrária, às vezes pede opinião informal a colega, quando há tempo. (Foundation v1, §4)

## 4. Processo com IA
Upload de documentos → Case Model → evidence mapping → detecção de contradições → geração adversarial → verificação → relatório com fontes citadas. (Foundation v1, §5, §14–15)

## 5. Hipótese de valor
Uma IA orientada adversarialmente encontra, a partir dos documentos do caso, vulnerabilidades plausíveis que o advogado ainda não havia percebido. Não comprovada — validar nos Testes Internos/Externos de hoje. (Foundation v1, §31, Perguntas E–H)

## 6. Dados
- Case Knowledge Base (documentos do usuário) — P0.
- Fontes jurídicas externas (jurisprudência/legislação) — P1, não implementado no MVP de hoje (ADR-002).
- Dados gerados por IA — sempre rotulados, nunca misturados com A/B sem rótulo. (Foundation v1, §12–13)

## 7. Arquitetura
Pipeline de 5 prompts em cadeia sobre o LLM da Anthropic, sem backend pesado, sem vector DB, sem persistência — decisão deliberada para o hackathon (ADR-001, ADR-004). Interface web simples HTML/JS com servidor mínimo de proxy (ADR-005). (Foundation v1, §14–19)

## 8. Ferramentas
Ver comparação completa e critério de corte em Foundation v1, §16–17. Resumo: sem FastAPI/Postgres/Qdrant/LangGraph no MVP de hoje; Claude (Anthropic) como único provedor de LLM.

## 9. Métricas
Ver `docs/METRICS.md`. Métrica central proposta: Validated Vulnerability Discovery Rate.

## 10. Riscos
Ver `docs/RISKS.md`. Risco principal: alucinação de contradição/contra-argumento/fonte inexistente.

## 11. Custos
Ver `docs/COSTS.md`. Preço não inventado — fórmula pronta, valores a consultar no provedor.

## 12. MVP
Input: documentos do caso + tese. Output: relatório com 3 vulnerabilidades, evidências, contradições, 3 contra-argumentos, perguntas difíceis, fontes. (Foundation v1, §31)

## 13. Backlog
Ver `docs/BACKLOG.md` — P0 completo até os Testes Externos de hoje (17h30); P1/P2 são evolução pós-hackathon.

## 14. Evolução futura
Piloto: RAG externo de jurisprudência, persistência, LGPD/sigilo profissional. Produto escalável: stack completa (backend real, multiusuário, vector DB). Não confundir os três níveis (hackathon / piloto / produto). (Foundation v1, §30)
