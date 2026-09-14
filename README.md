<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/imagens/logo-adversia-branca.png">
    <img src="app/static/logo-adversia.png" alt="AdversIA" width="420">
  </picture>
</p>

<h3 align="center">A divorciar? adversIA.</h3>

<p align="center">
  <strong>Veja a sua tese pelos olhos da parte contrária.</strong><br>
  Revisão adversarial de estratégias em Direito de Família, com inteligência artificial.
</p>

<p align="center">
  Hackathon da Cidadania OAB/PR 2026 · Trilha Inovação Aberta e Cidadania
</p>

<p align="center">
  <img src="docs/imagens/01_inicio.png" alt="Tela inicial da AdversIA" width="860">
</p>

---

## Sumário

- [O que é](#o-que-é)
- [O problema](#o-problema)
- [A solução](#a-solução)
- [Como funciona](#como-funciona)
- [O sistema em imagens](#o-sistema-em-imagens)
- [Por que dá para confiar](#por-que-dá-para-confiar)
- [Acessibilidade](#acessibilidade)
- [Privacidade e cuidados](#privacidade-e-cuidados)
- [Escopo do projeto](#escopo-do-projeto)
- [Casos de exemplo](#casos-de-exemplo)
- [Como rodar](#como-rodar)
- [Documentação](#documentação)
- [Integrantes](#integrantes)

---

## O que é

A **AdversIA** é uma assistente para advogados que atuam em **Direito de Família**:
divórcio, partilha de bens, pensão alimentícia, guarda e convivência.

O advogado envia os documentos do caso e descreve, em poucas linhas, o que pretende
defender. A AdversIA lê tudo **como se fosse o advogado da outra parte** e mostra onde a
estratégia pode ser atacada, **antes** que isso aconteça na audiência.

Ela não decide o caso, não substitui o advogado e não é parecer jurídico. É uma revisão
crítica para o advogado chegar mais preparado.

---

## O problema

Quem constrói uma tese tende a enxergar os pontos fortes e subestimar os fracos. Em
Direito de Família isso pesa ainda mais: as provas costumam ser informais, as versões das
partes divergem e há muita emoção envolvida. Na prática, os problemas aparecem tarde
demais:

- **datas e versões que não batem** entre a petição e a contestação;
- **alegações importantes sem nenhuma prova** que as sustente;
- **perguntas difíceis** do juiz ou da outra parte que ninguém tinha previsto;
- falta de clareza sobre **quais provas ainda precisam ser produzidas**.

Revisar tudo isso manualmente, caso a caso, consome tempo que o advogado muitas vezes não
tem, principalmente o advogado que atende a população com menos recursos.

---

## A solução

Uma ferramenta que faz o papel do "advogado do diabo" em minutos e entrega um relatório
em quatro partes:

| | O que entrega |
|---|---|
| **Pontos vulneráveis** | Contradições, alegações sem prova, argumentos que a outra parte pode usar e perguntas difíceis, cada um mostrando de onde veio |
| **Linha do tempo do caso** | Os fatos com data, em ordem, com destaque onde as versões das partes não batem |
| **Plano de provas** | O que providenciar para fechar cada ponto fraco, por prioridade e com a forma lícita de obter |
| **Simulação de audiência** | Um treino em que a IA faz as perguntas da parte contrária e avalia a resposta do advogado |

E um compromisso que atravessa tudo: **cada trecho citado é conferido, palavra por
palavra, no documento enviado.**

---

## Como funciona

1. **Envie os documentos do caso**: petição, contestação, acordos, declarações (PDF,
   Word ou texto). Ou escolha um dos casos fictícios prontos.
2. **Escreva a sua tese**: o que você quer sustentar e em nome de qual parte.
3. **Confirme** que os documentos são fictícios ou anonimizados.
4. **Acompanhe a análise**: seis etapas, de 1 a 3 minutos.
5. **Leia o relatório** e treine na simulação de audiência.

---

## O sistema em imagens

### Casos de exemplo prontos
Filtro por tipo de caso e situação, para testar sem documentos próprios.

<p align="center"><img src="docs/imagens/02_casos_de_exemplo.png" alt="Filtro de casos de exemplo" width="760"></p>

### Análise em etapas
O progresso real aparece na tela enquanto o caso é analisado.

<p align="center"><img src="docs/imagens/03_progresso.png" alt="Tela de progresso da análise" width="760"></p>

### Pontos vulneráveis
Placar do que a parte contrária pode explorar e cada apontamento com a sua origem e o
trecho conferido no documento.

<p align="center"><img src="docs/imagens/04_pontos_vulneraveis.png" alt="Relatório de pontos vulneráveis" width="860"></p>

### Linha do tempo do caso
Fatos datados, em ordem, com as divergências entre as versões destacadas.

<p align="center"><img src="docs/imagens/05_linha_do_tempo.png" alt="Linha do tempo do caso" width="860"></p>

### Plano de provas
O que providenciar, por prioridade, com vínculo direto para o ponto fraco que cada prova
resolve.

<p align="center"><img src="docs/imagens/06_plano_de_provas.png" alt="Plano de provas" width="860"></p>

### Simulação de audiência
A IA pergunta como advogado da parte contrária, avalia a resposta com base nos
documentos, sugere como fortalecê-la e devolve a réplica.

<p align="center"><img src="docs/imagens/07_simulacao_de_audiencia.png" alt="Simulação de audiência" width="860"></p>

### Acessibilidade, tema escuro e celular

<p align="center"><img src="docs/imagens/08_acessibilidade.png" alt="Painel de acessibilidade" width="860"></p>

<p align="center">
  <img src="docs/imagens/09_tema_escuro.png" alt="Tema escuro" width="600">
  &nbsp;
  <img src="docs/imagens/10_celular.png" alt="Versão para celular" width="220">
</p>

---

## Por que dá para confiar

- **Tudo mostra de onde veio.** Cada apontamento traz uma etiqueta: *Está nos
  documentos*, *Conclusão tirada dos documentos*, *Possível argumento da outra parte* ou
  *Sem base suficiente, confira*.
- **Cada trecho citado é conferido automaticamente** no documento enviado:
  *"✓ Trecho conferido no documento"* ou *"Não localizamos este trecho exato, confira"*.
- **Não inventa leis nem decisões.** Nenhum número de lei, artigo ou processo é citado
  sem estar nos documentos.
- **Na dúvida, é cautelosa.** Quando falta base, ela diz isso em vez de afirmar.
- **O advogado sempre decide.** Todo relatório avisa que não é parecer jurídico.

---

## Acessibilidade

Pensada para ser usada por todos. No botão **Acessibilidade**, no topo:

- **Libras** pelo **VLibras**, ferramenta oficial e gratuita do Governo Federal;
- **tamanho do texto** de 90% a 175%;
- **tema claro, escuro ou automático**, e **alto contraste**;
- **texto mais espaçado**, que ajuda pessoas com dislexia;
- **reduzir animações**;
- **ouvir o relatório** e as perguntas em voz alta, e **responder falando** na simulação;
- letra criada para pessoas com baixa visão (Atkinson Hyperlegible);
- uso completo pelo teclado, compatível com leitores de tela, e versão para celular;
- **linguagem simples**, sem termos técnicos.

---

## Privacidade e cuidados

- Versão de demonstração: **use apenas documentos fictícios ou anonimizados**. A tela
  pede essa confirmação antes de cada análise.
- **Nada é gravado permanentemente.** Os documentos ficam só na memória enquanto o
  sistema está ligado, para permitir a simulação de audiência.
- Casos de família envolvem dados sensíveis, inclusive de crianças. Para uso com clientes
  reais, seriam necessários login, prazo automático para apagar documentos e contrato com
  o fornecedor da inteligência artificial.
- O relatório é apoio à revisão, **não é parecer jurídico**.

---

## Escopo do projeto

**Dentro do escopo (entregue):**
- Direito de Família: partilha de bens, pensão alimentícia, guarda e convivência (e casos
  relacionados de herança e pensão por morte nos exemplos).
- Leitura de PDF com texto, Word (.docx) e arquivos de texto.
- Relatório de pontos vulneráveis com origem de cada apontamento e conferência dos
  trechos.
- Linha do tempo, plano de provas e simulação de audiência.
- 14 casos fictícios prontos para demonstração.
- Painel de acessibilidade completo e interface em linguagem simples.

**Fora do escopo desta versão:**
- Outras áreas do Direito.
- Consulta a legislação e jurisprudência externas.
- Leitura de documentos escaneados (só imagem).
- Login, cadastro de escritórios e armazenamento de casos.

**Próximos passos:** login para escritórios, apagamento automático de documentos, leitura
de documentos escaneados, novas áreas do Direito e testes com advogados e com pessoas
usuárias de Libras e de leitores de tela.

---

## Casos de exemplo

Todos os casos são **fictícios**, sem relação com pessoas reais.

| Tipo | Situações |
|---|---|
| Partilha de bens | Empresa e imóvel anteriores ao casamento · Aposentadoria na partilha e pedido de pensão · FGTS acumulado durante o casamento |
| Pensão alimentícia | Perda de emprego e mudança de cidade (**melhor para ver a linha do tempo**) · Filha maior de idade com renda própria · Ex-esposa voltou a trabalhar · Pensão entre ex-cônjuges há muitos anos |
| Guarda e convivência | Alegação de alienação parental · Guarda unilateral ou compartilhada · Mudança de residência do filho |
| Herança | Filha que cuidou do pai · Companheira e parentes do falecido |
| Pensão por morte | Relação paralela ao casamento · Pensão combinada em cartório |

---

## Como rodar

Requer Python 3.13 e uma chave da Anthropic.

```bash
pip install -r requirements.txt
# crie um arquivo .env na raiz com: ANTHROPIC_API_KEY=sua-chave
python -m app.server
# abra http://localhost:8000
```

Cada análise completa custa cerca de US$ 0,23 em uso da inteligência artificial.

---

## Documentação

- [Documentação técnica](docs/DOCUMENTACAO_TECNICA.md): arquitetura, módulos, API,
  segurança, testes e limitações.
- [Decisões do projeto](docs/DECISIONS.md): o porquê de cada escolha.
- [Conformidade](docs/CONFORMIDADE.md): acessibilidade, LGPD e segurança.
- [Testes internos](docs/testes-internos.md) e [roteiro de teste externo](docs/roteiro-teste-externo.md).

---

## Integrantes

- **Giovanna Ribas dos Reis**
- **Emelize Bonfim Mlot**
- **Ana Beatriz Patussi**
- **Julia Fernanda Zuchi**
- **Natan Bombini Roth**

---

<p align="center"><sub>AdversIA · Hackathon da Cidadania OAB/PR 2026 · Protótipo de demonstração</sub></p>
