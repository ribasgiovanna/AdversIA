# Catálogo de situações da Vara de Família

Este catálogo explica **de onde vieram os 32 casos do modo demonstração** e quais
situações da Vara de Família cada um cobre.

## Como os casos foram montados

1. **Pesquisa em fontes públicas e confiáveis** (tribunais e STJ) para mapear *que tipos de
   conflito* chegam às Varas de Família e quais pontos costumam ser disputados.
2. **Nenhum dado real foi copiado.** Processos de família correm em segredo de justiça e
   envolvem crianças; por isso não houve raspagem de processos nem de nomes. As fontes
   serviram só para escolher os *temas*.
3. **Casos 100% fictícios** foram escritos a partir desses temas, com documentos das duas
   partes, datas, valores e versões conflitantes. Cada documento traz o aviso
   "CASO FICTÍCIO PARA TESTES".
4. **A análise de cada caso foi preparada previamente** e revisada. Um script
   (`scripts/construir_demo.py`) confere, palavra por palavra, que **todo trecho citado
   existe no documento** do caso. Resultado da última geração: 32 casos e 424 trechos
   conferidos, nenhum faltando.

As fontes abaixo são citadas pelo **tema da notícia ou da página**. O catálogo não
reproduz o conteúdo das decisões nem afirma qual é o entendimento atual sobre cada tema:
isso continua sendo verificação do advogado.

## Situações cobertas

| Tipo | Caso de demonstração | Pasta |
|---|---|---|
| Divórcio e partilha de bens | Empresa e imóvel anteriores ao casamento | `case_familia_01` |
| | Aposentadoria na partilha e pedido de pensão | `case_familia_06` |
| | FGTS acumulado durante o casamento | `case_familia_13` |
| | Previdência privada aberta e fechada | `case_familia_15` |
| | Aluguel pelo uso do imóvel comum | `case_familia_16` |
| | Criptomoedas e empréstimo na partilha | `case_familia_17` |
| União estável | União estável depois da morte do companheiro | `case_familia_18` |
| | Animal de estimação na separação | `case_familia_19` |
| Pensão alimentícia | Perda de emprego e mudança de cidade | `case_familia_14` |
| | Filha maior de idade com renda própria | `case_familia_03` |
| | Ex-esposa voltou a trabalhar | `case_familia_09` |
| | Pensão entre ex-cônjuges há muitos anos | `case_familia_10` |
| | Alimentos durante a gravidez | `case_familia_20` |
| | Pensão cobrada dos avós | `case_familia_21` |
| | Pensão atrasada com pedido de prisão | `case_familia_22` |
| | Alimentos compensatórios até a partilha | `case_familia_23` |
| Guarda e convivência | Alegação de alienação parental | `case_familia_05` |
| | Guarda unilateral ou compartilhada | `case_familia_07` |
| | Mudança de residência do filho | `case_familia_04` |
| | Mudança de país com a filha | `case_familia_24` |
| | Guarda com medida protetiva | `case_familia_25` |
| | Convivência dos avós com a neta | `case_familia_26` |
| Filiação | Investigação de paternidade sem exame de DNA | `case_familia_27` |
| | Negatória de paternidade e vínculo afetivo | `case_familia_28` |
| | Pai biológico e pai registral | `case_familia_29` |
| Curatela e proteção | Curatela de mãe com Alzheimer | `case_familia_30` |
| | Tomada de decisão apoiada | `case_familia_31` |
| Herança | Filha que cuidou do pai | `case_familia_02` |
| | Companheira e parentes do falecido | `case_familia_11` |
| Pensão por morte | Relação paralela ao casamento | `case_familia_08` |
| | Pensão combinada em cartório | `case_familia_12` |
| Responsabilidade na família | Indenização por abandono afetivo | `case_familia_32` |

Os casos `case_familia_01` a `14` já existiam; `15` a `32` foram criados em 14/09/2026.

## Fontes públicas consultadas

### Competência e panorama das Varas de Família

- TJSP, especialidade Família e Sucessões:
  <https://www.tjsp.jus.br/Especialidade/Especialidade/FamiliaSucessoes>
- TJSP, material da área de Família e Sucessões:
  <https://www.tjsp.jus.br/Download/SPI/Downloads/FamiliaSucessoes.pdf>
- TJSP, quadro de competência da Seção de Direito Privado:
  <https://www.tjsp.jus.br/Download/SecaoDireitoPrivado/Quadro_Competencia.pdf>
- TJPR, informativo de jurisprudência de Direito de Família:
  <https://www.tjpr.jus.br/informativo-de-jurisprudencia-direito-de-familia>
- TJMG, Varas de Família: <https://www.tjmg.jus.br/portal-tjmg/acoes-e-programas/gestao-de-primeira/varas-familia/>
- TJDFT, guia da Justiça Comunitária:
  <https://www.tjdft.jus.br/informacoes/cidadania/justica-comunitaria/publicacoes/arquivos/GuiadeEncVolI.pdf>

### Temas usados para criar os casos (notícias do STJ)

| Tema | Casos inspirados | Fonte |
|---|---|---|
| Previdência privada aberta e fechada na partilha | 15 | [31/05/2022](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/31052022-Terceira-Turma-entende-que-valor-de-previdencia-privada-aberta-deve-ser-partilhado-na-separacao-do-casal-.aspx) · [23/02/2022](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/23022022-Deposito-em-entidade-aberta-de-previdencia-privada-deve-ser-partilhado-apos-a-separacao-do-casal.aspx) · [03/03/2022](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/03032022-Saldo-depositado-em-previdencia-fechada-durante-a-vida-conjugal-nao-integra-o-patrimonio-comum.aspx) |
| Aluguel pelo uso exclusivo do imóvel comum | 16 | [16/07/2024](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2024/16072024-Mulher-que-mora-com-a-filha-nao-tera-de-indenizar-ex-marido-pelo-uso-de-imovel-comum.aspx) · [05/05/2021](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/05052021-Ex-marido-que-mora-com-a-filha-no-imovel-comum-nao-e-obrigado-a-pagar-alugueis-a-ex-mulher.aspx) |
| Dissolução de casamento e união estável | 17, 18 | [Jurisprudência em Teses, 31/10/2018](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias-antigas/2018/2018-10-31_09-13_Jurisprudencia-em-Teses-trata-da-dissolucao-da-sociedade-conjugal-e-da-uniao-estavel.aspx) |
| Animais de estimação | 19 | [29/04/2026](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2026/29042026-Decisoes-do-STJ-mostram-que-a-vida-animal-importa.aspx) |
| Prisão civil por pensão atrasada | 22 | [28/01/2026](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2026/28012026-Quarta-Turma-invalida-prisao-de-devedor-de-alimentos-intimado-pelo-WhatsApp.aspx) · [26/10/2023](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2023/26102023-Terceira-Turma-revoga-prisao-de-devedor-de-alimentos-por-falta-de-risco-a-subsistencia-da-alimentanda.aspx) · [18/08/2023](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2023/18082023-Para-Terceira-Turma--prisao-do-devedor-de-alimentos-por-ate-tres-meses-prevalece-sobre-regra-anterior.aspx) |
| Alimentos que não geram prisão | 23 | [18/05/2022](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/18052022-Falta-de-pagamento-de-alimentos-indenizatorios-nao-gera-prisao-civil--confirma-Terceira-Turma.aspx) |
| Guarda compartilhada com pais em cidades ou países diferentes | 24 | [07/02/2023](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2023/07022023-Guarda-compartilhada-nao-impede-mudanca-da-crianca-para-o-exterior--define-Terceira-Turma.aspx) · [23/06/2021](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/23062021-Guarda-compartilhada-e-possivel-mesmo-que-pais-morem-em-cidades-diferentes.aspx) |
| Guarda e melhor interesse da criança | 25, 26 | [06/08/2020](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/06082020-Terceira-Turma-considera-melhor-interesse-da-crianca-e-mantem-decisao-que-deu-guarda-unilateral-ao-pai.aspx) · [alienação parental, 2019](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias-antigas/2019/O-empenho-da-Justica-para-evitar-os-danos-da-alienacao-parental.aspx) |
| Filiação socioafetiva e erro no registro | 28, 29 | [17/08/2025](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2025/17082025-O-STJ-e-as-relacoes-de-filiacao-construidas-com-base-no-amor-e-na-convivencia.aspx) · [14/12/2020](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/14122020-Longo-periodo-de-vinculo-socioafetivo-nao-impede-desconstituicao-da-paternidade-fundada-em-erro-induzido.aspx) |

Os casos 20, 21, 27, 30, 31 e 32 (alimentos gravídicos, avoengos, investigação de
paternidade, curatela, tomada de decisão apoiada e abandono afetivo) vieram do panorama de
competência das Varas de Família listado acima.

## Como acrescentar um caso novo

1. Crie `golden_dataset/case_familia_NN/` com os documentos `.txt` das partes, `tese.txt`
   e `gabarito.md`, sempre fictícios e com o aviso no topo.
2. Crie `demo/fontes/<id>.json` com a análise (apontamentos, linha do tempo, plano de
   provas e perguntas da simulação), copiando os trechos **literalmente** dos documentos.
3. Rode `python scripts/construir_demo.py`. O script recusa o caso se algum trecho citado
   não estiver no documento.
