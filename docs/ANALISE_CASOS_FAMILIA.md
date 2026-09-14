# Análise de Casos — Direito de Família (base para o pivô AdversIA)

> Fonte: `docs/casos hackathon.md` (9 casos fictícios fornecidos pela equipe). Este
> documento analisa os **5 primeiros casos** — todos diretamente ligados a divórcio
> (partilha de bens, pensão alimentícia, guarda) — para calibrar o AdversIA no domínio de
> Direito de Família. Os Casos 6 e 9 (sucessão entre irmãos) e 7–8 (variações de guarda e
> pensão) não entram nesta rodada de análise, mas ficam registrados como candidatos a P1
> (ver `docs/BACKLOG.md`).

## Por que analisar antes de programar

Cada caso já vem estruturado como uma disputa de duas partes com argumentos explícitos —
isso é, na prática, o formato mais próximo de "petição + contestação" que o AdversIA
precisa saber processar. Analisá-los antes de mexer nos prompts evita generalizar o motor
adversarial a partir de um único domínio (trabalhista, do Caso Fictício #1 original) para
um domínio com lógica jurídica bem diferente.

## Caso 1 — Partilha de bens: patrimônio anterior + contribuição indireta

**Disputa**: Mariana pede metade do valor de uma empresa e de um imóvel comercial que
Rafael já possuía antes do casamento, alegando ter contribuído com trabalho não
remunerado (administração do negócio, cuidado dos filhos) que permitiu o crescimento do
patrimônio.

**Estrutura jurídica por trás do conflito**: bem particular anterior ao casamento não se
comunica automaticamente (regra geral da comunhão parcial), mas a valorização do bem
durante a união e o esforço comum (inclusive indireto/não financeiro) podem ser
disputados. O ponto de tensão central é sempre o mesmo: **contribuição informal e não
documentada vs. patrimônio formalmente registrado em nome de um só cônjuge.**

**Tipo de evidência que normalmente falta em casos assim**: contrato social/alterações
societárias, comprovação formal de sócia ou de remuneração, documentos que provem a
administração efetiva (e-mails, contratos assinados, extratos de conta empresarial
movimentados pela parte), avaliação pericial do valor da empresa/imóvel em datas
diferentes (antes e depois do casamento).

**Padrão de lacuna probatória**: a parte que alega contribuição indireta raramente tem
prova documental formal dela (é trabalho doméstico/administrativo, não registrado); a
parte que nega precisa provar que os recursos usados vieram exclusivamente do patrimônio
particular, o que também costuma faltar.

**Perguntas difíceis típicas**: Há algum documento (contrato, e-mail, procuração) que
mostre a autora administrando efetivamente o negócio? Os recursos usados para expandir a
empresa vieram comprovadamente do patrimônio particular anterior, ou houve mistura
("confusão patrimonial") com recursos do casal? Existe perícia contábil sobre o valor da
empresa nas duas datas (casamento e divórcio)?

## Caso 2 — Partilha de bens: herança usada em bem comum financiado

**Disputa**: Camila usou R$ 180 mil de herança como entrada de um imóvel financiado
durante o casamento; o restante foi pago pelos dois ao longo de 8 anos. Ela quer que essa
contribuição inicial seja "preservada" antes da divisão; Lucas quer divisão equilibrada
considerando parcelas, reformas e despesas que ele também pagou.

**Estrutura jurídica**: herança é bem particular por origem, mas quando usada para
adquirir um bem em comum, discute-se **sub-rogação** (o valor da herança "vira" parte do
imóvel comum) vs. simples contribuição inicial que não afasta a comunicabilidade do bem
adquirido na constância do casamento.

**Tipo de evidência que normalmente falta**: comprovante bancário rastreando o valor da
herança até o pagamento da entrada (sem isso, a alegação de origem é só narrativa);
comprovantes de reformas/impostos pagos por Lucas; extrato consolidado de todas as
parcelas pagas por cada um.

**Padrão de lacuna probatória**: a parte que alega uma contribuição "especial" (entrada
com herança) raramente rastreia formalmente o dinheiro até o pagamento; a parte que
alega ter pago reformas/impostos raramente tem todos os comprovantes organizados.

**Perguntas difíceis típicas**: Existe rastreamento bancário direto da herança até o
pagamento da entrada, ou é só alegação? Quanto, em valor absoluto e percentual, cada um
efetivamente pagou ao longo dos 8 anos (parcelas + reformas + impostos)? A valorização do
imóvel decorre do mercado ou de melhorias custeadas por um dos cônjuges especificamente?

## Caso 3 — Pensão alimentícia: pedido de redução por queda de renda

**Disputa**: Ricardo pede redução da pensão (de 30% para 15%) alegando perda de emprego e
renda menor como autônomo. Laura contesta com fotos de viagens recentes, alegando padrão
de vida incompatível com a renda declarada.

**Estrutura jurídica**: rege-se pelo binômio **necessidade (de quem recebe) x
possibilidade (de quem paga)** — típico de ação revisional de alimentos. Redução exige
prova de queda **real e não temporária** de capacidade financeira.

**Tipo de evidência que normalmente falta**: declaração de Imposto de Renda atualizada,
extratos bancários dos últimos meses, comprovante formal de desligamento do emprego,
comprovação da data das viagens (antes ou depois da alegada perda de renda) — esse é o
ponto mais explorável do caso: **a cronologia** das fotos de viagem em relação à data da
perda de renda é o que decide se a evidência apresentada por Laura é ou não relevante.

**Padrão de contradição a procurar**: alegação de dificuldade financeira atual + evidência
(mesmo que informal, tipo fotos) sugerindo padrão de vida incompatível — a peça central da
análise adversarial aqui não é achar quem mente, é **verificar se a datação das provas
apresentadas realmente contradiz o período alegado**.

**Perguntas difíceis típicas**: As viagens nas fotos ocorreram antes ou depois da perda de
emprego alegada? Há declaração de IR ou extrato bancário comprovando a renda atual como
autônomo? A redução pleiteada (de 30% para 15%) é proporcional à queda de renda
efetivamente comprovada, ou arbitrária?

## Caso 4 — Guarda compartilhada: mudança de cidade (relocation)

**Disputa**: Juliana quer se mudar de estado com os filhos por uma proposta de emprego
melhor; André, com guarda compartilhada, se opõe por causa da convivência cotidiana.

**Estrutura jurídica**: nenhuma das partes está "certa" por padrão — a decisão gira em
torno do **melhor interesse da criança** (ECA/CC), ponderando ganho financeiro/qualidade
de vida contra a manutenção do vínculo de convivência cotidiana com o outro genitor.

**Tipo de evidência que normalmente falta**: proposta de emprego formal por escrito (não
só alegação verbal), plano concreto de convivência alternativa (quem paga passagens, com
que frequência, logística de férias/feriados), levantamento do custo de vida na cidade de
destino, e — quando aplicável — oitiva/manifestação da própria criança.

**Padrão de lacuna probatória**: a parte que quer se mudar raramente formaliza o "plano B"
de convivência (é promessa, não documento); a parte contrária raramente quantifica
concretamente o prejuízo (normalmente é só alegação genérica de "dificultar a
convivência").

**Perguntas difíceis típicas**: Existe uma proposta de emprego formal (carta, contrato) ou
é só uma possibilidade em negociação? Qual é o plano concreto e viável de convivência
(custos, frequência, quem organiza)? As crianças foram ouvidas sobre a mudança, e sua
opinião foi considerada?

## Caso 5 — Convivência / possível alienação parental

**Disputa**: Sofia resiste a ficar com o pai (Eduardo) após o divórcio. Eduardo alega
alienação parental por parte da mãe (Camila); Camila alega que a filha relatou
desconforto/medo em episódios durante as visitas e pede convivência acompanhada.

**Estrutura jurídica**: tensão clássica entre a Lei da Alienação Parental (12.318/2010) e
a proteção da criança (ECA) — **nenhuma das duas hipóteses (alienação vs. risco real) pode
ser presumida sem prova técnica.** É o caso mais sensível dos 5: qualquer conclusão
apressada do sistema (a favor de qualquer um dos lados) seria um risco sério.

**Tipo de evidência que normalmente falta em ambos os lados**: laudo psicológico
(ausente até a análise ser feita), boletim de ocorrência ou relatório formal dos
"episódios" alegados por Camila, e qualquer prova concreta (além do relato) de conduta
inadequada de Eduardo ou de influência da mãe.

**Padrão de lacuna probatória — o mais importante deste caso**: as DUAS partes fazem
alegações graves (alienação parental de um lado, conduta inadequada do outro) **sem
nenhuma prova técnica de nenhum dos lados**. O valor adversarial aqui não é "descobrir quem
tem razão" — é sinalizar explicitamente que ambas as alegações estão, no estágio atual,
sem lastro pericial, e que medidas provisórias (convivência acompanhada) são
proporcionalmente mais defensáveis do que decisões definitivas em qualquer direção.

**Perguntas difíceis típicas**: Existe laudo psicológico ou perícia que avalie a criança
antes de qualquer decisão definitiva? Os "episódios" alegados por Camila foram registrados
formalmente (BO, relatório escolar, atendimento médico) ou são só relato? Há prova
concreta de conduta de alienação por parte da mãe, ou é inferência a partir da mudança de
comportamento da criança?

## Padrões transversais aos 5 casos (o que isso ensina ao motor adversarial)

1. **A prova documental formal quase sempre falta dos dois lados** — o valor do AdversIA
   em Direito de Família não é achar "a mentira", é mapear sistematicamente onde cada
   alegação carece do tipo específico de prova que aquele tipo de pedido normalmente exige
   (extrato rastreável, laudo pericial, proposta formal por escrito, declaração de IR).
2. **Cronologia é o ponto de contradição mais comum** — em pensão (Caso 3) e em partilha
   (Casos 1 e 2), a pergunta "isso aconteceu antes ou depois do fato alegado?" é
   recorrente e frequentemente decisiva.
3. **Casos envolvendo criança (4 e 5) exigem uma trava extra**: nunca apresentar como
   `FACT` uma conclusão sobre o que é "melhor para a criança" ou se houve alienação
   parental — são sempre `INFERENCE` ou `ADVERSARIAL_HYPOTHESIS`, e o sistema deve
   favorecer sinalizar a necessidade de perícia/oitiva em vez de "resolver" o mérito.
4. **Vocabulário de domínio que os prompts precisam reconhecer**: comunhão parcial/
   universal de bens, patrimônio particular vs. comum, sub-rogação, meação, binômio
   necessidade-possibilidade (alimentos), exoneração/revisional de alimentos, guarda
   compartilhada/unilateral, melhor interesse da criança, alienação parental,
   convivência familiar assistida.

## Como isso foi aplicado no código

- `app/prompts/_dominio_familia.md` — bloco de contexto de domínio, injetado em todas as
  5 etapas do pipeline (ver `app/pipeline.py`), com o vocabulário e os padrões acima.
- `golden_dataset/case_familia_01/` — Caso 1 (Mariana x Rafael) formatado como par
  petição/contestação, usado para validar que o pipeline generaliza para o novo domínio.
- `docs/PRODUCT_SCOPE.md` e `docs/ADVERSIA_PROJECT_FOUNDATION_V1.md` atualizados para
  refletir o escopo exclusivo em Direito de Família (ver seção de pivô em cada um).
