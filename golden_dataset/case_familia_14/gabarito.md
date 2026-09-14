# Gabarito — Caso Fictício de Família #14 (Revisional de Alimentos + Convivência após Mudança de Cidade)

Cenário sintético criado em 13/09/2026 para demonstrar a **linha do tempo do caso**
(ADR-013): os casos anteriores quase não tinham datas explícitas. Nenhuma relação com
pessoas reais.

## Tese descrita pelo usuário

Ver `tese.txt` — tese de Marcos (genitor): reduzir a pensão de 30% para 15% pela perda do
emprego formal e ampliar a convivência, dividindo os custos de deslocamento, porque a mãe
se mudou de cidade sem aviso.

## Documentos

- `peticao_revisional_marcos.txt` (versão do requerente)
- `contestacao_juliana.txt` (versão da requerida)

## Linha do tempo esperada (com as divergências de datas)

| Fato | Versão de Marcos | Versão de Juliana |
|---|---|---|
| Casamento | 12/05/2012 | — |
| Nascimento de Sofia | 03/08/2014 | — |
| Separação de fato | janeiro de 2021 | **outubro de 2020** |
| Divórcio homologado, pensão de 30% | 15/06/2021 | — |
| Demissão de Marcos | 02/03/2023 | março de 2023 (concorda) |
| Início dos atrasos na pensão | abril de 2023 (depois da demissão) | **dezembro de 2022 (antes da demissão)** |
| Novo emprego de Marcos (gerente, salário fixo) | não menciona | maio de 2023, **sem prova** |
| Aviso sobre a mudança | não houve aviso | **mensagem em 20/11/2023** |
| Mudança de cidade | 10/01/2024 | **08/01/2024** |

## Vulnerabilidades centrais esperadas

1. **Cronologia dos atrasos** (a mais grave para a tese): se os depósitos a menor
   começaram em dezembro de 2022, antes da demissão, a perda do emprego não explica o
   inadimplemento — a parte contrária vai explorar isso. Nenhum dos lados junta
   comprovantes de depósito.
2. **Renda atual de Marcos não comprovada**: ele alega renda variável de motorista de
   aplicativo sem extratos da plataforma; Juliana alega emprego com salário fixo sem
   juntar as publicações. Os dois lados têm lacuna probatória.
3. **"Sem aviso prévio"** é contestado por uma mensagem de 20/11/2023 que nenhum dos
   dois juntou — ponto de prova a produzir.

## Lacunas probatórias esperadas

- Comprovantes dos depósitos da pensão (para datar o início dos atrasos).
- Termo de rescisão / carteira de trabalho de Marcos.
- Extratos de ganhos como motorista de aplicativo.
- Prova do alegado emprego na loja de autopeças (publicações, contrato, depoimento).
- A mensagem de 20/11/2023 (captura de tela ou exportação da conversa).
- Custos reais do deslocamento de 300 km.

## O que NÃO deve aparecer (falso positivo a evitar)

- Afirmar como `FACT` que Marcos tem emprego com salário fixo — é alegação sem prova.
- Afirmar como `FACT` que houve (ou não) aviso prévio da mudança.
- Qualquer data, valor ou nome de empresa que não esteja nos dois documentos.
