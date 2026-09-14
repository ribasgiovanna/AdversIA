# Gabarito — Caso Fictício de Família #2 (Herança entre Irmãos)

Baseado no "Caso 6" de `docs/casos hackathon.md` (marcado na fonte como "só uma das
partes" — cenário sintético, sem relação com pessoas reais), analisado em
`docs/ANALISE_CASOS_FAMILIA.md`.

## Nota de escopo

Este caso é de **Direito das Sucessões** (herança entre irmãos), não de divórcio — está,
portanto, fora do recorte estrito da tagline "A divorciar? adversIA." (ADR-008). Está
sendo usado aqui como **teste de generalização/estresse**, no mesmo espírito do
`golden_dataset/case_01` (trabalhista): confirma que o pipeline não está hard-coded só
para partilha de bens de divórcio, mas usa o mesmo mecanismo (Case Model → Evidence
Mapping → Contradições → Motor Adversarial → Verificação) para qualquer disputa
familiar. Se a equipe decidir expandir oficialmente o escopo para sucessões, isso deve
virar uma atualização explícita de `docs/PRODUCT_SCOPE.md`, não uma expansão silenciosa.

## Tese descrita pelo usuário

Ver `tese.txt` — tese da Requerente (Fernanda), pedindo parcela maior da herança por ter
cuidado diretamente do pai durante 8 anos.

## Documentos

- `alegacoes_fernanda.txt` (lado bem desenvolvido, com lista explícita de argumentos)
- `manifestacao_carlos.txt` (lado deliberadamente breve — reflete a assimetria real da
  fonte: "só uma das partes" foi detalhada no material original)

## A vulnerabilidade jurídica central esperada (o achado mais importante deste caso)

A tese de Fernanda pede uma **parcela maior da herança** com base nos cuidados prestados.
Isso é juridicamente diferente de pedir **indenização por serviços prestados** (uma ação
distinta, por enriquecimento sem causa/prestação de serviços) — herança legítima
costuma ser dividida igualmente entre herdeiros da mesma classe, independentemente de quem
cuidou mais do falecido, salvo disposição testamentária em contrário (não mencionada nos
documentos).

**O que se espera do relatório**: um `Finding` (categoria `contra_argumento` ou
`pergunta_dificil`, `provenance` = `INFERENCE` ou `ADVERSARIAL_HYPOTHESIS`, **nunca
`FACT`**) levantando que o pedido de "parcela maior da herança" pode não ser o instrumento
jurídico correto para compensar os cuidados prestados, sem citar número de artigo de lei
específico como se fosse verificado (Constituição, Princípio III — o texto da lei não foi
fornecido nos documentos).

## Lacunas probatórias esperadas (categoria `lacuna_probatoria`)

1. Fernanda alega ter "deixado de trabalhar em determinados períodos" para cuidar do pai,
   mas nenhum documento é citado para comprovar isso (comprovante de afastamento,
   declaração de imposto de renda mostrando queda de renda, etc.).
2. Fernanda alega ter administrado medicamentos e acompanhado consultas, mas nenhum
   registro formal é citado (diário de cuidados, recibos, relatórios médicos).
3. Carlos alega ter enviado dinheiro mensalmente, mas nenhum comprovante (transferência
   bancária, recibo) é citado.
4. Não há menção a testamento — deve ser listado em `informacoes_ausentes` se o sistema
   perguntar se a sucessão é legítima (sem testamento) ou testamentária.

## Perguntas difíceis esperadas (exemplos aceitáveis, não exaustivos)

- Existe testamento do pai que disponha diferentemente da divisão igualitária entre os
  herdeiros, ou a sucessão é legítima (sem testamento)?
- Há comprovação documental (extratos bancários, recibos) dos valores que Carlos afirma
  ter enviado mensalmente?
- Há comprovação de que Fernanda efetivamente deixou de trabalhar ou reduziu sua renda
  para cuidar do pai (declaração de IR, carta de demissão, etc.)?
- O pedido de "parcela maior da herança" é o instrumento jurídico adequado para
  reconhecer os cuidados prestados, ou seria mais apropriado pleitear indenização por
  serviços prestados em ação própria?

## O que NÃO deve aparecer (falso positivo a evitar)

- Nenhum argumento inventado "em nome de Carlos" além do que está em
  `manifestacao_carlos.txt` — o documento dele é deliberadamente curto; o sistema deve
  sinalizar a assimetria (`informacoes_ausentes`: "argumentação detalhada do herdeiro
  Carlos não apresentada"), não preencher a lacuna com suposições.
- Nenhuma afirmação categórica (`FACT`) sobre se Fernanda tem ou não direito à parcela
  maior — é uma questão jurídica em aberto.
- Nenhum número de artigo de lei citado como se fosse texto verificado — os documentos não
  contêm texto de lei.
