# Gabarito — Caso Fictício de Família #4 (Guarda Compartilhada — Residência de Referência)

Baseado no "Caso 8" de `docs/casos hackathon.md` (cenário sintético, sem relação com
pessoas reais), analisado em `docs/ANALISE_CASOS_FAMILIA.md` (mesma família de disputas
dos Casos 4/5 — melhor interesse da criança, decisão não deve caber a um só critério).

## Tese descrita pelo usuário

Ver `tese.txt` — tese de Daniel (genitor), pedindo transferência da residência de
referência de Lucas para a casa dele.

## Documentos

- `pedido_daniel.txt` (alegações do requerente, com lista explícita de argumentos)
- `manifestacao_patricia.txt` (oposição da requerida — deliberadamente breve, reflete a
  assimetria do material original, como em `case_familia_02`)

## A vulnerabilidade jurídica central esperada

A tese de Daniel se apoia quase inteiramente em **critérios de conveniência logística**
(proximidade da escola, trânsito, flexibilidade de horário) e na **preferência informal**
relatada pela própria criança — sem nenhuma avaliação técnica sobre o impacto da mudança
no vínculo com a mãe, na estabilidade emocional de Lucas, ou na continuidade do
acompanhamento escolar/médico que Patrícia alega já fazer. Mudança de residência de
referência em guarda compartilhada deve considerar o melhor interesse da criança de forma
ampla, não apenas logística — a preferência da criança é um elemento relevante, mas não é
por si só decisivo, especialmente sem ter sido colhida por profissional especializado.

**O que se espera do relatório**: um `Finding` (categoria `contra_argumento` ou
`pergunta_dificil`, `provenance` = `INFERENCE` ou `ADVERSARIAL_HYPOTHESIS`, **nunca
`FACT`**) apontando que a tese de Daniel é construída majoritariamente sobre conveniência
e relato informal, sem avaliação técnica do impacto da mudança sobre o vínculo com a mãe
e a estabilidade da criança.

## Lacunas probatórias esperadas (categoria `lacuna_probatoria`)

1. Nenhuma oitiva técnica (psicóloga/assistente social) da criança é mencionada — a
   preferência de Lucas é relatada apenas pelos pais, não colhida formalmente.
2. Nenhum documento comprova objetivamente a diferença de distância/tempo de trajeto até
   a escola entre as duas residências (mapa, tempo médio, relatório).
3. Nenhum documento comprova a alegada flexibilidade de horário de trabalho de Daniel
   (declaração do empregador, contrato).
4. Patrícia alega ter sido a principal responsável pela rotina escolar/médica, mas não
   apresenta nenhum comprovante (agendas, atas de reunião escolar, receituários,
   comprovantes de consulta).

## Perguntas difíceis esperadas (exemplos aceitáveis, não exaustivos)

- A preferência de Lucas foi colhida por profissional especializado (psicólogo,
  assistente social), ou é apenas relato informal dos pais?
- Existe comprovação objetiva (mapa, tempo médio de trajeto) da diferença real de
  deslocamento entre as duas residências até a escola?
- Há prova documental da flexibilidade de horário de trabalho de Daniel?
- Como ficaria a continuidade do acompanhamento escolar e médico que Patrícia alega já
  fazer, caso a residência de referência mude?
- Quais evidências sustentam que Patrícia foi, de fato, a principal responsável pela
  rotina escolar/médica até o momento?

## O que NÃO deve aparecer (falso positivo a evitar)

- Nenhuma afirmação categórica (`FACT`) sobre se a mudança de residência é ou não do
  melhor interesse de Lucas — é questão de mérito em aberto.
- Nenhuma contradição inventada entre os dois documentos (eles não se contradizem sobre
  os fatos básicos — divórcio há quatro anos, guarda compartilhada, rotina atual — apenas
  divergem na conclusão sobre a mudança).
- Nenhum detalhe (nome de escola, endereço, horário específico) além do que está nos dois
  documentos.
