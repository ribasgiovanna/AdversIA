# Gabarito — Caso Fictício de Família #3 (Pensão Alimentícia — Maioridade)

Baseado no "Caso 7" de `docs/casos hackathon.md` (cenário sintético, sem relação com
pessoas reais), analisado em `docs/ANALISE_CASOS_FAMILIA.md` (padrão do binômio
necessidade-possibilidade, já discutido para o Caso 3).

## Tese descrita pelo usuário

Ver `tese.txt` — tese de Roberto (genitor), pedindo redução/encerramento da pensão para
Mariana com base na maioridade civil e renda própria dela.

## Documentos

- `peticao_roberto.txt` (alegações do genitor/alimentante)
- `contestacao_mariana.txt` (defesa da filha/alimentanda)

## A vulnerabilidade jurídica central esperada (o achado mais importante deste caso)

A maioridade civil, isoladamente, **não extingue automaticamente** o dever de prestar
alimentos quando o alimentando ainda está comprovadamente em formação/qualificação
profissional (curso técnico) e sua renda é insuficiente para autossustento — esse é um
entendimento amplamente consolidado na prática de Direito de Família. A petição de
Roberto se apoia só na maioridade + existência de renda, sem enfrentar diretamente o
argumento de que Mariana ainda estuda e a renda alegada é insuficiente.

**O que se espera do relatório**: um `Finding` (categoria `contra_argumento` ou
`pergunta_dificil`, `provenance` = `INFERENCE` ou `ADVERSARIAL_HYPOTHESIS`, **nunca
`FACT`**) apontando que a tese de Roberto é juridicamente incompleta por não enfrentar a
continuidade dos estudos e a insuficiência de renda alegadas — sem citar número de
súmula/artigo como se fosse verificado (Constituição, Princípio III — nenhum texto de lei
foi fornecido nos documentos).

## Lacunas probatórias esperadas (categoria `lacuna_probatoria`)

1. Roberto não apresenta nenhum documento comprovando sua própria capacidade financeira
   atual — relevante porque o binômio necessidade-possibilidade também depende de quanto
   ELE pode pagar, não só de quanto ELA ganha.
2. Mariana alega renda de ~R$ 1.400/mês e despesas insuficientes, mas nenhum documento é
   citado (holerite, contrato de trabalho, comprovantes de despesas).
3. Nenhum documento comprova a matrícula ou frequência de Mariana no curso técnico —
   apenas alegação.
4. Nenhum documento comprova a alegação de Mariana de que Roberto tem "condições
   econômicas melhores".

## Perguntas difíceis esperadas (exemplos aceitáveis, não exaustivos)

- A maioridade civil, isoladamente, é suficiente para extinguir o dever alimentar quando
  o alimentando comprovadamente ainda está em formação educacional?
- Existe comprovação documental (holerite, contrato) do valor exato da renda de Mariana e
  de que ela é insuficiente para suas despesas básicas?
- Há comprovação de matrícula ativa e frequência regular no curso técnico?
- Qual é a real capacidade financeira atual de Roberto, e como ela se compara à de
  Mariana?
- Uma redução proporcional (não a extinção total) seria mais compatível com o fato de
  Mariana já ter alguma renda própria, ainda que insuficiente?

## O que NÃO deve aparecer (falso positivo a evitar)

- Nenhuma afirmação categórica (`FACT`) sobre se a pensão deve continuar, ser reduzida ou
  encerrada — é uma questão jurídica em aberto.
- Nenhuma contradição inventada entre os dois documentos (eles não se contradizem sobre
  os fatos básicos — maioridade, curso técnico, emprego de meio período, valor da renda —
  divergem apenas na conclusão jurídica sobre esses fatos).
- Nenhum valor monetário, data ou detalhe além dos mencionados nos dois documentos.
