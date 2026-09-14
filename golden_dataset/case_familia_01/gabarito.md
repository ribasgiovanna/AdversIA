# Gabarito — Caso Fictício de Família #1 (Partilha de Bens)

Baseado no "Caso 1" de `docs/casos hackathon.md` (cenário sintético, sem relação com
pessoas reais), analisado em `docs/ANALISE_CASOS_FAMILIA.md`. Testa se o pipeline
generaliza do domínio trabalhista (`case_01`) para Direito de Família.

## Tese descrita pelo usuário

Ver `tese.txt` — tese da Autora (Mariana), pedindo metade do valor da empresa e do imóvel
comercial anteriores ao casamento, com base em contribuição indireta não documentada.

## Documentos

- `peticao_mariana.txt` (alegações da Autora)
- `contestacao_rafael.txt` (defesa do Réu)

## Diferença deste caso em relação ao `case_01` (trabalhista)

Este caso **não tem uma contradição factual "gotcha"** plantada — é uma disputa jurídica
legítima em que as duas narrativas são internamente consistentes. O valor adversarial
esperado aqui é **mapeamento de lacunas probatórias e geração de perguntas difíceis**, não
detecção de contradição. Isso testa uma dimensão diferente do pipeline.

## Lacunas probatórias esperadas (categoria `lacuna_probatoria`)

1. A petição alega que a Autora administrava efetivamente o negócio (contas, contratos,
   atendimento), mas nenhum documento é citado para comprovar essa administração (e-mails,
   contratos assinados por ela, procuração, etc.) — deve ser sinalizado como alegação sem
   evidência apresentada.
2. A contestação alega que os recursos usados para criar/expandir a empresa vieram
   exclusivamente do patrimônio anterior do Réu, mas nenhum documento é citado para
   comprovar a origem exclusiva desses recursos (extrato bancário, rastreamento de
   capital) — também deve ser sinalizado como alegação sem evidência apresentada.
3. Nenhuma das partes junta avaliação pericial do valor da empresa/imóvel em datas
   diferentes (na data do casamento vs. hoje) — sem isso, o valor da "valorização durante
   o casamento" é apenas alegado, não demonstrado.

## Perguntas difíceis esperadas (exemplos aceitáveis, não exaustivos)

- Existe algum documento (contrato assinado, e-mail, procuração, registro de acesso a
  sistema da empresa) que comprove a administração efetiva do negócio pela Autora, além
  da alegação na petição?
- Os recursos usados para expandir a empresa vieram comprovadamente do patrimônio
  particular do Réu anterior ao casamento, ou houve mistura ("confusão patrimonial") com
  recursos do casal ao longo da união?
- Há avaliação pericial do valor da empresa e do imóvel na data do casamento (2014) e na
  data atual, para demonstrar objetivamente quanto da valorização ocorreu durante a união?
- A ausência de registro formal da Autora como sócia impede, por si só, o reconhecimento
  de contribuição para fins de partilha, ou a contribuição indireta pode ser reconhecida
  independentemente do registro societário?

## O que NÃO deve aparecer (falso positivo a evitar)

- Nenhuma afirmação categórica (`FACT`) sobre quem tem razão na disputa — isso é uma
  questão jurídica em aberto, não um fato extraível dos documentos.
- Nenhuma contradição inventada entre os dois documentos (eles não se contradizem sobre os
  fatos básicos — casamento em 2014, existência do imóvel anterior, crescimento da
  empresa — divergem apenas na qualificação jurídica desses fatos).
- Nenhum valor monetário, data ou detalhe societário além dos mencionados nos dois
  documentos.
