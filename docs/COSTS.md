# Cost Model — AdversIA

**Regra vigente: nunca inventar preço.** Preço atual deve ser consultado diretamente no provedor (Anthropic) no momento da implementação/uso real.

**Preço vigente consultado em 12/09/2026** (claude.com/pricing): Claude Sonnet 5 —
US$ 2/milhão de tokens de entrada, US$ 10/milhão de saída. Claude Haiku 4.5 — US$
1/milhão de entrada, US$ 5/milhão de saída. Reconsultar a página oficial se muito tempo
tiver passado desde essa data (`app/llm_client.py::_PRECOS_POR_MILHAO_USD`).

**Medição real (não estimada)**: `app/llm_client.py` agora registra `usage.input_tokens`/
`usage.output_tokens` de toda chamada real à API e calcula o custo com a tabela acima.
`imprimir_resumo_uso()` roda ao final de cada `analisar_caso()` (visível no console do
servidor) e o resumo final da suíte de testes aparece no terminal do `pytest` (hook
`pytest_terminal_summary` em `tests/conftest.py`) — não é mais preciso estimar.

## Fórmula conceitual

```
Custo por análise =
  tokens de entrada (Case Model + Evidence Mapping + Contradições + Motor Adversarial + Verificação)
  + tokens de saída (das mesmas 5 etapas)
  + custo de parsing (zero no MVP — leitura direta de texto/PDF)
  + storage (zero no MVP — sem persistência)
  + requests externas (zero no MVP — RAG externo é P1, não implementado hoje)
```

O pipeline do MVP dispara ~5 chamadas de LLM por análise (seção 14 do Foundation v1). O custo real depende do tamanho dos documentos do caso (tokens de entrada) e do tamanho do relatório final (tokens de saída) — ambos variáveis por caso, não fixos.

## Cenários a calcular (quando o preço for consultado)

- 10 análises/mês
- 100 análises/mês
- 1.000 análises/mês
- 10.000 análises/mês

Cada cenário = (custo médio por análise) × (volume) — preencher assim que a tabela de preço vigente da Anthropic for consultada.

## Custo de desenvolvimento (hackathon)

Apenas tempo humano da equipe — sem custo de infraestrutura paga (sem servidor dedicado, sem banco gerenciado, sem vector DB no MVP, conforme ADR-001).

## Estratégia de redução de custos

- Modelo mais barato/rápido nas etapas de extração e sumarização; modelo mais forte reservado para raciocínio adversarial e verificação (onde a qualidade importa mais).
- Extrair o Case Model uma única vez e reutilizá-lo como contexto compartilhado entre as etapas seguintes, em vez de reprocessar os documentos originais a cada chamada.
- Chunking só se o documento ultrapassar o limite de contexto do modelo — a maioria dos casos jurídicos individuais cabe inteiro no contexto de um LLM moderno.

### Lição aprendida em 12/09: testes compartilhando a mesma análise

Nas primeiras rodadas do dia, cada função de teste chamava `analisar_caso()` (5 chamadas
de LLM) de forma independente, mesmo quando várias funções testavam o **mesmo** relatório
(ex.: 3 funções em `test_pipeline_provenance.py` rodando o Caso Fictício #1 três vezes em
vez de uma). Isso multiplicou o consumo de crédito sem necessidade e foi a causa principal
de esgotar o crédito da conta mais rápido do que o esperado.

**Correção**: `tests/conftest.py` agora expõe fixtures de escopo de sessão
(`relatorio_case_01`, `relatorio_case_familia_01`, `relatorio_case_familia_02`) que rodam
`analisar_caso()` uma única vez por caso por execução da suíte inteira, compartilhada por
todas as funções de teste que precisarem dele. Isso reduziu o consumo esperado da suíte em
cerca de 6× (de ~9 análises completas do Caso Fictício #1 para 1 análise compartilhada
entre os 4 arquivos de teste que o usam).
