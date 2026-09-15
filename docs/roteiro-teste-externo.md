# Roteiro de Teste Externo — AdversIA

> Texto pronto para enviar a quem for testar (advogado(a) de família, colega, mentor).
> Modelo de coleta de resposta baseado na seção 13 de `docs/testes-internos.md`.

---

## Mensagem para enviar ao tester

Olá! Estamos testando a **AdversIA**, uma ferramenta que revisa uma estratégia jurídica
de forma adversarial: você envia os documentos de um caso de família e ela devolve um
relatório apontando contradições, lacunas probatórias, contra-argumentos e perguntas
difíceis que a parte contrária poderia levantar.

**Link:** _(colar aqui a URL do túnel ativo)_

**O que pedimos:** use a ferramenta sozinho(a), sem ajuda nossa, e depois responda 5
perguntas rápidas. Leva uns 10 minutos no total.

### Como usar

1. Abra o link.
2. Em **"Documentos do caso"**, envie os arquivos do caso (aceita `.txt`, `.md`, `.pdf`).
   Se não tiver um caso à mão, pedimos um dos casos fictícios em anexo.
3. Em **"Descrição da tese jurídica"**, escreva em 2–3 linhas a tese que você quer testar
   (ex.: "pedido de guarda unilateral com base em alegação de alienação parental").
4. Marque o checkbox de confirmação de dados fictícios.
5. Clique em **"Analisar caso"** e aguarde (leva de 1 a 2 minutos — o sistema roda 5
   etapas de análise em sequência).

> **Importante:** use apenas casos **fictícios, anonimizados ou de domínio público.**
> Não envie documento real de cliente — este é um protótipo de hackathon e os documentos
> são processados por um provedor de IA externo.

### Como ler o relatório

Cada achado tem uma **etiqueta de origem** no canto:

| Etiqueta | Significa |
|---|---|
| **Fato** | Está escrito literalmente nos documentos que você enviou |
| **Inferência** | Conclusão que a IA tirou dos documentos, com o trecho citado |
| **Hipótese adversarial** | Linha de ataque possível — não é fato nem entendimento consolidado |
| **Não verificado** | A IA não achou base suficiente nos documentos para sustentar |

Em cada achado, abaixo do texto, aparece **de qual documento e de qual trecho** aquilo
saiu — é para você poder conferir, não acreditar por confiança.

---

## Perguntas pós-teste (responder depois de usar)

1. **Você conseguiu concluir sozinho(a), sem ajuda técnica?** Sim / Parcialmente / Não
2. **A análise foi compreensível?** 1 a 5
3. **Ficou claro de onde veio cada apontamento?** 1 a 5
4. **Ficou clara a diferença entre evidência e hipótese da IA?** 1 a 5
5. **Você usaria uma análise desse tipo antes de protocolar uma peça?** Sim / Talvez / Não

**Perguntas abertas:**
- Qual resultado foi mais útil?
- Houve algum resultado em que você **não** confiou? Por quê?
- O que faltou?

---

## Para a equipe: onde registrar

Anotar cada teste como `EXT-001`, `EXT-002`... em duas camadas:

- **Registro bruto (privado):** perfil do participante, data, tempo de uso, se concluiu sem
  ajuda, notas de 1–5, respostas abertas e qualquer arquivo usado no teste ficam em
  `privado/testes_externos/`, pasta ignorada pelo Git e fora do repositório público.
- **Resumo público:** em `docs/testes-internos.md` (seção 13), só o código do teste, o perfil
  genérico ("advogada de família", "estudante de Direito"), o resultado e as notas, **sem
  nome, contato ou qualquer dado que identifique a pessoa**.

Depoimento só vai para material público **com autorização**. Política completa em
[CONFORMIDADE.md](CONFORMIDADE.md#política-de-publicação-do-repositório).

Casos fictícios prontos para enviar ao tester (pasta de cada um tem os documentos +
`tese.txt`):

| Caso | Tipo de disputa |
|---|---|
| `golden_dataset/case_familia_01` | Partilha de bens — empresa/imóvel anterior ao casamento |
| `golden_dataset/case_familia_03` | Pensão alimentícia — maioridade e continuidade de estudos |
| `golden_dataset/case_familia_04` | Guarda compartilhada — mudança de residência de referência |
| `golden_dataset/case_familia_05` | Guarda — alegação de alienação parental |
| `golden_dataset/case_familia_09` | Exoneração de alimentos entre ex-cônjuges |
