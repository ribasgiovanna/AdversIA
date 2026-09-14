# Métricas — AdversIA

Para cada métrica: definição, fórmula, origem dos dados, baseline, resultado esperado, resultado obtido (a preencher após os testes de hoje).

## Métricas técnicas

**Amostra**: 1 execução completa do Caso Fictício #1 (`golden_dataset/case_01`), rodada
via `POST /api/analyze` de verdade em 12/09/2026 (evidência salva em
`docs/evidencias/teste_interno_case01_20260912.json`), mais 9/9 testes automatizados
(`pytest tests/ -v`) passando contra o mesmo caso. **n=1 caso** — suficiente para provar a
hipótese do MVP, insuficiente para qualquer alegação estatística (Constituição:
"HIPÓTESE A VALIDAR" acima de n=1 continua valendo).

| Métrica | Definição | Origem dos dados | Resultado obtido |
|---|---|---|---|
| Fact Extraction Precision | Dos fatos extraídos, quantos realmente estavam presentes nos documentos | Golden Dataset, checagem manual | 8/8 fatos extraídos rastreáveis aos 3 documentos — nenhum fato inventado percebido nesta amostra |
| Fact Extraction Recall | Dos fatos relevantes existentes, quantos foram encontrados | Golden Dataset, checagem manual | Ambas as datas de admissão, a jornada alegada, o pedido de comissões e os dados da testemunha foram capturados |
| Evidence Mapping Accuracy | % de alegações corretamente ligadas às evidências | Golden Dataset, checagem manual | 4 lacunas probatórias corretamente sinalizadas (jornada, horas extras, intervalo, comissões) — todas sem documento de suporte real, conforme gabarito.md |
| Contradiction Precision | Das contradições sinalizadas, quantas eram inconsistências relevantes reais | Golden Dataset (caso com contradição plantada) | 2/2 (100% nesta amostra) — encontrou a contradição plantada (jornada vs. testemunha) e uma segunda inconsistência de data não plantada deliberadamente, mas real (03/03/2021 vs. "maio de 2021") |
| Contradiction False Positive Rate | % de contradições apontadas que eram incorretas | Golden Dataset | 0/2 (0% nesta amostra) — checagem manual confirmou lastro documental nas duas |
| Citation Accuracy | A fonte citada realmente contém a informação? | Checagem manual do relatório | 17/17 findings com citação (`origem`) verificada manualmente contra o texto original — nenhuma citação fabricada encontrada |
| Groundedness | A resposta deriva efetivamente das fontes fornecidas? | Checagem manual | 0 findings sem `origem` (100% dos 17 achados citam ao menos 1 documento) |
| Hallucination Rate | % de afirmações não sustentadas pelos documentos | Checagem manual | 0% nesta amostra — nenhuma menção a fato fora dos 3 documentos enviados (ver teste automatizado `test_nenhuma_contradicao_inventada`) |
| Abstention Accuracy | Quando faltava informação, o sistema disse que não sabia? | Golden Dataset (caso com lacuna deliberada) | Sim — as 4 lacunas probatórias foram rotuladas como tal em vez de tratadas como fato provado |

## Métricas de produto (Testes Externos, 17h30)

| Métrica | Definição | Escala | Resultado obtido |
|---|---|---|---|
| Task Success Rate | Usuário conseguiu executar a análise sem ajuda? | Sim/Não | _a preencher_ |
| Time to First Insight | Tempo entre upload e primeira vulnerabilidade útil | minutos | _a preencher_ |
| Perceived Usefulness | "Essa análise ajudaria na preparação deste caso?" | 1–5 | _a preencher_ |
| Trust | "Você confiaria nessa ferramenta como primeira camada de revisão?" | 1–5 | _a preencher_ |
| Reuse Intent | "Você utilizaria novamente?" | Sim/Não | _a preencher_ |
| Vulnerability Discovery Rate | Nº de vulnerabilidades válidas que o usuário não havia percebido antes | contagem | _a preencher_ |

## Métrica central proposta

**Validated Vulnerability Discovery Rate** = quantidade/percentual de vulnerabilidades apontadas pela AdversIA que (1) foram consideradas juridicamente plausíveis por um profissional e (2) ainda não haviam sido identificadas antes da análise.

Avaliação crítica: mede o valor específico do produto (achar o que o humano não achou), não apenas velocidade do LLM — mas depende de avaliação humana subjetiva por caso, não é 100% automatizável. Tratar como métrica qualitativa apoiada por poucas amostras no hackathon, não como número estatisticamente robusto.

## Baseline

Não há baseline quantitativo prévio (nenhum teste rodado antes de hoje). Todo "ganho" reportado no pitch sem medição direta nos Testes Internos/Externos de hoje deve ser rotulado como **HIPÓTESE A VALIDAR**, nunca apresentado como fato.
