# Gabarito — Caso Fictício #1

Caso fictício (nenhuma relação com pessoas ou empresas reais) criado para validar o
pipeline AdversIA, conforme `docs/BACKLOG.md` (P0.1) e
`specs/001-adversarial-vulnerability-report/tasks.md` (T003).

## Tese descrita pelo usuário (campo `tese` do request)

"Reclamação trabalhista pleiteando horas extras habituais (jornada de 07h30 às 19h00, de
segunda a sábado, durante toda a contratação de 03/03/2021 a 15/01/2024) e diferenças de
comissões não pagas nos últimos seis meses de contrato."

## Documentos

- `peticao_inicial.txt`
- `testemunha_autor.txt`
- `whatsapp_print.txt`

## Contradição plantada (deve ser encontrada — categoria `contradicao`)

A petição alega jornada constante de **07h30 às 19h00, de segunda a sábado, durante toda
a contratação** (03/03/2021 a 15/01/2024). A própria testemunha juntada pelo autor
(`testemunha_autor.txt`) descreve, para o período em que efetivamente conviveu com o
Reclamante (janeiro/2022 a junho/2023), uma jornada de **08h00 às 18h00 na maior parte da
semana**, com saída às 19h **apenas nas sextas-feiras** em dias de reposição de estoque.

O único documento de apoio horário específico (`whatsapp_print.txt`) registra um único dia
— sexta-feira, 14/07/2023 — e é consistente com a exceção descrita pela testemunha (saída
mais tarde só às sextas), não com a regra de 07h30–19h alegada como habitual na petição.

**Um sistema adversarial correto deve sinalizar**: a evidência apresentada pelo próprio
Reclamante não sustenta a jornada de 07h30-19h todos os dias — sustenta, no máximo, uma
jornada menor (08h-18h) com uma exceção pontual às sextas-feiras, e apenas para uma janela
de tempo (jan/2022–jun/2023) que não cobre todo o período contratual alegado
(mar/2021–jan/2024).

## Inconsistência interna adicional (categoria `contradicao`, menor)

A petição afirma admissão em **03/03/2021**, mas no mesmo parágrafo descreve a jornada
alegada como vigente "desde o início do contrato em **maio de 2021**" — as duas datas de
início não coincidem dentro do mesmo documento.

## Lacuna probatória esperada (categoria `lacuna_probatoria`)

O pedido de "diferenças de comissões não pagas nos últimos seis meses" não tem nenhum
documento de suporte — a própria petição admite não haver, no momento, cópia do contrato
de comissionamento ou dos relatórios de vendas. Um sistema correto deve sinalizar essa
alegação como sem evidência apresentada.

## O que NÃO deve aparecer (falso positivo a evitar)

- Nenhuma contradição envolvendo datas de nascimento, valores de salário ou cláusulas
  contratuais não mencionadas nos documentos acima — nada disso está nos documentos, então
  não deve ser inventado.
- O sistema não deve afirmar como fato qual jornada realmente ocorreu (isso é uma
  conclusão jurídica/factual que cabe ao processo, não ao sistema) — deve apenas apontar a
  inconsistência entre o alegado e a prova apresentada, rotulada como `contradicao` ou
  `INFERENCE`, nunca como `FACT`.

## Perguntas difíceis esperadas (exemplos aceitáveis, não exaustivos)

- Por que a testemunha arrolada pelo próprio autor descreve uma jornada menor do que a
  alegada na petição?
- O print de WhatsApp de um único dia é suficiente para comprovar uma jornada "habitual"
  de segunda a sábado?
- Há explicação para a divergência entre as datas de início do contrato (03/03/2021 vs.
  "maio de 2021") mencionadas na própria petição?
- Como se comprova a jornada alegada para o período não coberto pela testemunha (março de
  2021 a dezembro de 2021, e julho de 2023 a janeiro de 2024)?
