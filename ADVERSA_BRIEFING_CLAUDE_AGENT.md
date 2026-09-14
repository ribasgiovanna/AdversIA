# ADVERSA — Briefing Mestre de Produto, Pesquisa e Arquitetura

> Documento-base para uso com Claude Agent no desenvolvimento do projeto do Hackathon da Cidadania OAB/PR 2026 — categoria Inovação Aberta e Cidadania.

---

## 1. Papel do agente

Você atuará como:

- Product Manager;
- Arquiteto de Software;
- Engenheiro de IA;
- Engenheiro de Dados;
- Especialista em RAG;
- Analista de UX;
- Especialista em avaliação de sistemas de IA;
- Consultor técnico de LegalTech.

Seu trabalho não é apenas sugerir funcionalidades.

Você deverá ajudar a transformar o conceito abaixo em um produto:

- relevante;
- tecnicamente executável;
- mensurável;
- confiável;
- testável;
- demonstrável;
- escalável.

---

## 2. Nome do projeto

**Nome provisório:** ADVERSA

**Definição:** Plataforma de preparação jurídica adversarial baseada em Inteligência Artificial.

### Ideia central

Antes que uma estratégia jurídica seja confrontada pela parte contrária, ela poderá ser submetida a um teste de estresse automatizado.

A ADVERSA recebe:

- documentos;
- petições;
- contratos;
- provas;
- argumentos;
- descrição do caso;
- estratégia jurídica pretendida.

A aplicação tenta encontrar:

- vulnerabilidades;
- contradições;
- lacunas probatórias;
- premissas não comprovadas;
- informações ausentes;
- interpretações alternativas;
- possíveis contra-argumentos;
- jurisprudência potencialmente contrária;
- perguntas difíceis que uma parte adversária poderia fazer.

### A ADVERSA não

- decide quem está certo;
- substitui o advogado;
- prevê sentença;
- calcula probabilidade de vitória;
- inventa jurisprudência;
- toma decisões jurídicas autônomas.

Ela funciona como:

> **UMA CAMADA DE REVISÃO ADVERSARIAL.**

---

## 3. Frase central do produto

> **“E se, antes de enfrentar a parte contrária, o advogado pudesse enfrentá-la dentro da própria ferramenta?”**

O conceito deve sempre permanecer compreensível através dessa frase.

Não transforme o projeto em um chatbot jurídico genérico.

---

## 4. Problematização

A primeira obrigação do projeto é definir claramente o problema.

### Problema central

Advogados precisam revisar:

- fatos;
- documentos;
- provas;
- argumentos;
- jurisprudência;
- contratos;
- petições;
- decisões;
- estratégias.

Entretanto, muitas vezes o próprio profissional ou equipe que construiu uma determinada estratégia também realiza sua revisão.

Isso pode gerar:

- viés de confirmação;
- pontos cegos;
- ausência de contraposição;
- argumentos não testados;
- lacunas probatórias;
- inconsistências documentais;
- interpretações alternativas ignoradas;
- falta de preparação para contra-argumentos.

### Regra de validação

Não assuma que essa problemática está comprovada apenas porque parece lógica.

Ao desenvolver o projeto:

1. separe hipótese de fato comprovado;
2. indique quais hipóteses precisam ser validadas com usuários;
3. proponha perguntas para entrevistas com advogados;
4. identifique evidências necessárias para validar o problema.

---

## 5. Processo sem IA x processo com IA

Crie obrigatoriamente uma comparação entre:

- **PROCESSO ATUAL / SEM ADVERSA**
- **PROCESSO PROPOSTO / COM ADVERSA**

### Exemplo conceitual

#### Sem IA

Advogado cria estratégia  
↓  
Relê documentos  
↓  
Pesquisa argumentos contrários manualmente  
↓  
Procura jurisprudência  
↓  
Pede revisão a outro profissional, quando possível  
↓  
Tenta imaginar possíveis ataques  
↓  
Revisa estratégia  

#### Com ADVERSA

Advogado cria estratégia  
↓  
Envia documentos  
↓  
Sistema estrutura o caso  
↓  
Mapeia alegações e evidências  
↓  
Procura inconsistências  
↓  
Simula argumentos contrários  
↓  
Consulta fontes relevantes  
↓  
Gera relatório de vulnerabilidade  
↓  
Advogado revisa estratégia  

### A comparação deve analisar

- tempo;
- esforço humano;
- repetitividade;
- cobertura da análise;
- capacidade de contraditório;
- rastreabilidade;
- dependência de outros profissionais;
- possibilidade de erro;
- custo;
- consistência.

**Não afirme ganho de produtividade sem teste.**

Onde ainda não houver dados reais, classifique como:

> **HIPÓTESE A VALIDAR**

---

## 6. Job To Be Done

Defina o Job To Be Done principal.

### Hipótese inicial

> “Quando estou preparando uma estratégia jurídica, quero submetê-la a uma análise crítica independente, para descobrir fragilidades antes que a parte adversária as utilize contra mim.”

Avalie criticamente essa formulação.

---

## 7. Quem vai usar

Identifique e diferencie os usuários.

### Usuário primário

Possíveis candidatos:

- advogado autônomo;
- pequeno escritório;
- médio escritório;
- advogado associado;
- departamento jurídico.

### Usuários secundários

Possíveis:

- estudantes de Direito;
- equipes de revisão;
- gestores jurídicos;
- escritórios maiores.

### Regra para o MVP

**Escolha um usuário principal.**

Não tente construir o produto para todos.

Para cada persona, descreva:

- função;
- contexto;
- dor;
- frequência da dor;
- como resolve atualmente;
- limitações atuais;
- ganho esperado;
- riscos percebidos;
- nível técnico esperado.

---

## 8. Casos de uso

Priorize casos de uso.

### Exemplos

1. Revisar uma petição antes do protocolo.
2. Testar uma tese jurídica.
3. Comparar alegações com evidências documentais.
4. Identificar possíveis contradições.
5. Preparar respostas a possíveis argumentos adversários.
6. Treinar para audiência.

### Prioridade

- **P0:** obrigatório para provar o conceito;
- **P1:** importante;
- **P2:** evolução futura.

---

## 9. Fonte dos dados

A arquitetura deverá diferenciar claramente três grupos de dados.

### A. Dados internos do caso

Fornecidos pelo usuário.

Exemplos:

- PDFs;
- DOCX;
- contratos;
- petições;
- contestações;
- decisões;
- comprovantes;
- conversas;
- provas;
- descrição textual;
- argumentos.

Esses dados formam a:

> **CASE KNOWLEDGE BASE**

### B. Fontes jurídicas externas

Possíveis fontes:

- legislação oficial;
- jurisprudência pública;
- tribunais;
- bases oficiais;
- dados públicos;
- repositórios jurídicos permitidos.

Priorize sempre fontes oficiais.

Investigue e documente:

- disponibilidade;
- formato;
- API existente;
- possibilidade de download;
- licença;
- frequência de atualização;
- dificuldade de integração;
- confiabilidade;
- limitações técnicas;
- custos.

### Regra de integração

Não faça scraping antes de verificar:

- existência de API;
- termos de uso;
- limitações legais;
- disponibilidade de dados abertos.

### C. Dados gerados pela IA

Nunca misturar com dados externos.

Classifique conteúdos gerados como:

- inferência;
- hipótese adversarial;
- sumarização;
- classificação;
- recomendação de revisão.

---

## 10. Proveniência dos dados

Toda informação relevante deve carregar origem.

### Documento interno

```json
{
  "document_id": "",
  "filename": "",
  "page": null,
  "chunk": "",
  "text": "",
  "type": ""
}
```

### Jurisprudência

```json
{
  "tribunal": "",
  "numero_processo": "",
  "orgao_julgador": "",
  "relator": "",
  "data": "",
  "trecho": "",
  "fonte": "",
  "url": ""
}
```

### Legislação

```json
{
  "diploma": "",
  "artigo": "",
  "paragrafo": "",
  "inciso": "",
  "texto": "",
  "fonte": "",
  "url": ""
}
```

---

## 11. Modelo do caso

Antes de qualquer análise adversarial, criar um:

> **CASE MODEL**

Estrutura inicial:

```json
{
  "case_id": "",
  "partes": [],
  "tipo_de_acao": null,
  "jurisdicao": null,
  "fatos": [],
  "datas": [],
  "pedidos": [],
  "argumentos": [],
  "evidencias": [],
  "documentos": [],
  "questoes_juridicas": [],
  "informacoes_ausentes": [],
  "possiveis_contradicoes": []
}
```

Avalie e melhore esse schema.

---

## 12. Diferença entre fato e IA

Essa regra é obrigatória.

Cada afirmação deve pertencer a uma categoria:

### FACT
Fato explicitamente presente nos dados.

### SOURCE
Informação proveniente de fonte jurídica externa.

### INFERENCE
Conclusão derivada pelo modelo.

### ADVERSARIAL_HYPOTHESIS
Argumento possível que poderia ser utilizado pela contraparte.

### UNVERIFIED
Informação sem suporte suficiente.

**Nunca apresente uma hipótese como fato.**

---

## 13. Funcionamento do motor adversarial

Fluxo conceitual:

```text
DOCUMENTOS
    ↓
PARSING
    ↓
CASE MODEL
    ↓
IDENTIFICAÇÃO DA TESE
    ↓
MAPEAMENTO:
ALEGAÇÃO ↔ EVIDÊNCIA
    ↓
CONTRADIÇÕES
    ↓
BUSCA JURÍDICA
    ↓
CONTRA-ARGUMENTOS
    ↓
VERIFICAÇÃO
    ↓
PRIORIZAÇÃO
    ↓
RELATÓRIO
```

---

## 14. Relatório de Vulnerabilidade Jurídica

Principal saída do produto:

> **RELATÓRIO DE VULNERABILIDADE JURÍDICA**

Deve conter:

- resumo do caso;
- tese analisada;
- pontos fortes;
- vulnerabilidades críticas;
- vulnerabilidades médias;
- lacunas probatórias;
- possíveis contradições;
- argumentos que a contraparte poderia utilizar;
- fontes relacionadas;
- perguntas difíceis;
- informações ausentes;
- trechos dos documentos relacionados;
- recomendações de pontos que merecem revisão humana.

---

## 15. Ferramentas e tecnologias

Você deverá avaliar criticamente as ferramentas.

**Não aceite esta stack automaticamente.**

### Stack base a ser avaliada

**Backend**
- Python;
- FastAPI.

**Modelagem**
- Pydantic.

**Frontend**
- React + Vite;
- ou HTML/CSS/JavaScript.

**Banco**
- PostgreSQL.

**MVP extremamente simples**
- SQLite.

**Vector database**
- Qdrant;
- ou pgvector.

**Processamento documental**
- PyMuPDF;
- Docling.

**Orquestração**
- Python tradicional;
- ou LangGraph.

**RAG**
- Hybrid Search.

**Embeddings**
- avaliar modelos apropriados para português e contexto jurídico.

**LLM**
- avaliar OpenAI, Anthropic e Gemini.

**Reranking**
- avaliar necessidade.

**Avaliação**
- avaliar DeepEval, RAGAS ou testes próprios.

### Para cada tecnologia escolhida, informe

- função;
- motivo;
- vantagem;
- alternativa;
- complexidade;
- risco;
- custo;
- prioridade.

---

## 16. Escolha de modelos de IA

Não utilize um único critério como:

> “é o modelo mais inteligente”.

Avalie os modelos para tarefas separadas.

### Extração

Extrair:

- partes;
- fatos;
- datas;
- pedidos;
- provas.

### Raciocínio adversarial

Gerar:

- contra-argumentos;
- questionamentos;
- interpretações alternativas.

### Verificação

Checar:

> `claim ↔ documento`

### Sumarização

Criar resumos estruturados.

### Embeddings

Busca semântica.

### Critérios de comparação

- qualidade;
- português;
- raciocínio;
- contexto longo;
- JSON estruturado;
- latência;
- custo;
- disponibilidade via API;
- facilidade de integração.

A arquitetura deve permitir trocar de modelo.

**Não acoplar lógica de negócio diretamente a um provedor.**

---

## 17. RAG

Separar claramente:

### RAG interno

Documentos do usuário.

Objetivo:

encontrar evidência dentro dos arquivos do caso.

### RAG externo

Fontes jurídicas públicas.

Objetivo:

encontrar:

- legislação;
- jurisprudência;
- entendimentos.

### Arquitetura preferencial a ser avaliada

```text
LEXICAL SEARCH
+
VECTOR SEARCH
+
METADATA FILTERING
+
RERANKING
```

Explique se cada componente realmente é necessário para o MVP.

---

## 18. Método de avaliação

O produto precisa ser mensurável.

Não utilize apenas:

> “pareceu funcionar”.

Crie metodologia de testes.

---

## 19. Base de testes

Criar um:

> **GOLDEN DATASET**

Cada caso de teste deve possuir:

- documentos conhecidos;
- fatos esperados;
- alegações esperadas;
- evidências esperadas;
- contradições conhecidas;
- vulnerabilidades esperadas;
- perguntas possíveis;
- fontes esperadas.

O dataset poderá começar pequeno.

### Sugestão inicial

10 a 20 casos controlados.

---

## 20. Métricas de extração

### Fact Extraction Precision

Dos fatos extraídos pela IA, quantos realmente estavam presentes?

### Fact Extraction Recall

Dos fatos relevantes existentes, quantos foram encontrados?

### Evidence Mapping Accuracy

Percentual de alegações corretamente ligadas às evidências correspondentes.

---

## 21. Métricas de contradição

### Contradiction Precision

Das contradições sinalizadas, quantas realmente representam uma inconsistência relevante?

### False Positive Rate

Quantas contradições apontadas eram incorretas?

Essa métrica é crítica.

Um sistema que inventa contradições perde confiança rapidamente.

---

## 22. Métricas de confiabilidade

### Citation Accuracy

A fonte citada realmente contém a informação?

### Groundedness

A resposta deriva efetivamente das fontes?

### Hallucination Rate

Percentual de afirmações não sustentadas.

### Unsupported Claim Rate

Claims exibidos sem suporte.

### Abstention Accuracy

Quando não havia informação suficiente, o sistema conseguiu dizer que não sabia?

---

## 23. Métricas adversariais

Algumas métricas não podem ser totalmente automáticas.

Utilizar avaliação humana.

Advogados devem classificar cada vulnerabilidade como:

1. irrelevante;
2. pouco útil;
3. razoável;
4. útil;
5. muito útil.

Gerar:

> **ADVERSARIAL USEFULNESS SCORE**

Também medir:

- novidade do contra-argumento;
- relevância;
- plausibilidade;
- utilidade prática;
- capacidade de revelar ponto não percebido.

---

## 24. Métricas de produto

Durante testes externos, medir:

### Task Success Rate

Usuário conseguiu executar a análise?

### Time to First Insight

Tempo entre upload e primeira vulnerabilidade útil.

### Perceived Usefulness

Pergunta:

> “Essa análise ajudaria na preparação deste caso?”

Escala 1–5.

### Trust

Pergunta:

> “Você confiaria nessa ferramenta como primeira camada de revisão?”

Escala 1–5.

### Reuse Intent

Pergunta:

> “Você utilizaria novamente?”

### Vulnerability Discovery Rate

Número de vulnerabilidades consideradas válidas que o usuário não havia percebido antes.

---

## 25. Métrica central do produto

Investigue se a principal métrica pode ser:

> **VALIDATED VULNERABILITY DISCOVERY RATE**

### Definição inicial

Quantidade ou percentual de vulnerabilidades apontadas pela ADVERSA que:

1. foram consideradas juridicamente plausíveis por um profissional;
2. ainda não haviam sido identificadas antes da análise.

Essa métrica tenta medir o valor específico da ADVERSA, em vez de apenas medir velocidade do LLM.

Avalie criticamente essa proposta.

---

## 26. Comparação sem IA x com IA

Durante testes, quando possível, medir:

### Sem ADVERSA

Tempo para realizar revisão adversarial.

### Com ADVERSA

Tempo para realizar revisão adversarial.

Medir também:

- quantidade de vulnerabilidades encontradas;
- vulnerabilidades consideradas relevantes;
- erros;
- necessidade de revisão por outra pessoa;
- confiança do usuário.

**Não declarar ganhos antes de obter dados.**

---

## 27. Riscos

Crie um:

> **RISK REGISTER**

### Riscos técnicos

Exemplos:

- hallucination;
- contexto longo;
- parsing incorreto;
- OCR ruim;
- retrieval incorreto;
- jurisprudência irrelevante;
- alta latência;
- custos de API;
- limite de tokens.

### Riscos jurídicos

Exemplos:

- uso indevido como aconselhamento autônomo;
- confiança excessiva;
- fontes incorretas;
- dados sensíveis;
- sigilo profissional;
- LGPD;
- armazenamento de documentos.

### Riscos de produto

- baixa confiança;
- respostas genéricas;
- falsos positivos;
- excesso de informação;
- interface complexa.

### Riscos éticos

- viés;
- interpretação errada;
- uso indevido;
- automação excessiva.

### Riscos do hackathon

- escopo grande;
- dependência de APIs;
- internet;
- integração não terminada;
- demo quebrada;
- falta de evidências de testes.

### Schema sugerido

```json
{
  "risco": "",
  "probabilidade": "baixa|media|alta",
  "impacto": "baixo|medio|alto",
  "mitigacao": "",
  "responsavel": ""
}
```

---

## 28. Privacidade

Trate documentos jurídicos como potencialmente sensíveis.

Avaliar:

- quais dados serão enviados ao LLM;
- quais provedores recebem os dados;
- retenção;
- logs;
- anonimização;
- remoção de PII;
- armazenamento local;
- criptografia;
- exclusão de dados.

### Para o hackathon

Priorizar casos:

- fictícios;
- anonimizados;
- ou de domínio público.

---

## 29. Custos

Criar modelo de custo.

### Custo de desenvolvimento

No hackathon:

- tempo humano.

### Custo de infraestrutura

- servidor;
- banco;
- vector DB;
- storage;
- domínio;
- serviços externos.

### Custo de IA

Calcular por análise.

### Fórmula conceitual

```text
Custo por caso =
tokens de entrada
+
tokens de saída
+
embeddings
+
reranking
+
storage
+
requests externas
```

### Calcular cenários

- 10 casos/mês;
- 100 casos/mês;
- 1.000 casos/mês;
- 10.000 casos/mês.

Se tiver acesso a preços atuais dos provedores, utilize-os.

Caso contrário:

> **NÃO INVENTE PREÇOS.**

Crie a fórmula e marque:

> “Preço atual deve ser consultado.”

---

## 30. Estratégia de redução de custos

Avaliar:

- modelos pequenos para extração;
- modelos fortes apenas para raciocínio;
- caching;
- chunking adequado;
- deduplicação;
- embeddings persistentes;
- redução de chamadas;
- processamento incremental.

Comparar:

- uma chamada grande;
- pipeline com modelos diferentes.

---

## 31. Viabilidade

Avaliar o projeto em três níveis.

### MVP de hackathon

Pode ser implementado agora?

### Piloto

Funcionaria com usuários reais?

### Produto escalável

O que precisaria mudar?

**Não confundir os três níveis.**

---

## 32. MVP

O MVP deverá provar uma hipótese:

> **“Uma IA adversarial consegue encontrar vulnerabilidades úteis em uma estratégia jurídica através da análise dos documentos fornecidos.”**

### Input

- PDFs;
- descrição da tese.

### Processo

- parsing;
- Case Model;
- extração de argumentos;
- evidence mapping;
- detecção de possíveis contradições;
- geração adversarial;
- verificação.

### Output

Relatório contendo:

- 3 principais vulnerabilidades;
- evidências;
- possíveis contradições;
- 3 contra-argumentos;
- perguntas difíceis;
- indicação explícita das fontes.

---

## 33. O que não é MVP

Não construir inicialmente:

- previsão de sentença;
- perfil de juiz;
- CRM;
- gestão financeira;
- cobrança;
- agenda;
- petição automática;
- voz;
- audiência completa;
- monitoramento processual;
- dezenas de agentes;
- dashboards complexos.

---

## 34. Arquitetura

Proponha três níveis.

### Arquitetura mínima

Necessária para o hackathon.

### Arquitetura intermediária

Necessária para piloto.

### Arquitetura futura

Necessária para produção.

**Não comece pela arquitetura futura.**

---

## 35. Claude Agent — modo de trabalho

Você está sendo utilizado dentro de um ambiente de desenvolvimento.

Antes de criar ou alterar código:

1. examine a estrutura atual do repositório;
2. identifique arquivos existentes;
3. não sobrescreva trabalho existente desnecessariamente;
4. apresente primeiro o plano;
5. registre decisões arquiteturais;
6. implemente incrementalmente;
7. execute testes após alterações;
8. não adicione dependências sem justificar;
9. mantenha README atualizado;
10. documente comandos necessários.

Quando encontrar código existente:

> **PRESERVE o que estiver funcional.**

Não faça refatorações grandes sem necessidade.

---

## 36. Decision Log

Manter:

```text
docs/DECISIONS.md
```

Formato:

```md
## ADR-001

DECISÃO:

MOTIVO:

ALTERNATIVAS:

VANTAGENS:

DESVANTAGENS:

RISCO:

STATUS:
```

---

## 37. Risk Register

Manter:

```text
docs/RISKS.md
```

Campos:

- Risco;
- Categoria;
- Probabilidade;
- Impacto;
- Mitigação;
- Status.

---

## 38. Métricas

Manter:

```text
docs/METRICS.md
```

Documentar:

- definição;
- fórmula;
- origem dos dados;
- baseline;
- resultado esperado;
- resultado obtido.

---

## 39. Cost Model

Manter:

```text
docs/COSTS.md
```

Separar:

- API;
- infraestrutura;
- armazenamento;
- embeddings;
- reranking;
- processamento;
- projeções.

**Nunca invente preços.**

---

## 40. Product Scope

Manter:

```text
docs/PRODUCT_SCOPE.md
```

Esse documento deverá ser a principal fonte de verdade sobre o produto.

Deve conter:

1. problemática;
2. usuário;
3. processo atual;
4. processo com IA;
5. hipótese de valor;
6. dados;
7. arquitetura;
8. ferramentas;
9. métricas;
10. riscos;
11. custos;
12. MVP;
13. backlog;
14. evolução futura.

---

## 41. Source of Truth

Não espalhe requisitos contraditórios pelo projeto.

Utilize:

```text
docs/PRODUCT_SCOPE.md
```

como documento principal.

Se uma decisão nova contradizer esse documento:

**sinalize a inconsistência antes de implementar.**

---

## 42. Backlog

Criar:

```text
docs/BACKLOG.md
```

Com:

- P0;
- P1;
- P2.

Cada tarefa deve conter:

- objetivo;
- dependências;
- responsável;
- critério de aceite.

---

## 43. Critério de aceite

Nenhuma funcionalidade está concluída apenas porque:

> “o código roda”.

Ela deve possuir:

- comportamento esperado;
- teste;
- evidência;
- documentação mínima.

---

## 44. Prioridades do hackathon

### P0 — prioridade absoluta

- usuário consegue enviar documentos;
- sistema consegue extrair conteúdo;
- sistema consegue identificar tese;
- sistema relaciona alegações e evidências;
- sistema gera ataques plausíveis;
- sistema identifica possíveis fragilidades;
- sistema aponta origem da informação;
- sistema gera relatório utilizável.

### P1

- jurisprudência externa;
- ranking de vulnerabilidades;
- histórico;
- comparação entre versões;
- UI refinada.

### P2

- audiência;
- voz;
- múltiplos cenários;
- monitoramento;
- funcionalidades adicionais.

---

## 45. Princípio de desenvolvimento

Não maximize quantidade de funcionalidades.

Maximize:

> **VALOR DEMONSTRÁVEL**

Pergunte constantemente:

> “Isso ajuda a demonstrar que a revisão adversarial com IA descobre vulnerabilidades úteis?”

Se não:

provavelmente não pertence ao MVP.

---

# Primeira entrega obrigatória

**NÃO comece programando.**

Primeiro produza uma análise chamada:

> **ADVERSA — PROJECT FOUNDATION v1**

Com exatamente estas seções:

1. Executive Summary
2. Problematização
3. Hipóteses que ainda precisam ser validadas
4. Processo atual sem IA
5. Processo proposto com IA
6. Comparação sem IA x com IA
7. Usuário principal
8. Personas secundárias
9. Job To Be Done
10. Casos de uso
11. Proposta de valor
12. Fontes de dados
13. Estratégia de proveniência
14. Arquitetura mínima
15. Fluxo de dados
16. Ferramentas recomendadas
17. Comparação das alternativas técnicas
18. Modelo de IA recomendado
19. Estratégia de RAG
20. Estratégia de segurança contra hallucination
21. Métricas técnicas
22. Métricas de produto
23. Golden Dataset
24. Estratégia de validação com usuários
25. Comparação de resultado sem IA x com IA
26. Risk Register
27. Privacidade e segurança
28. Modelo de custos
29. Estratégia de redução de custos
30. MVP
31. O que fica fora do MVP
32. Backlog P0/P1/P2
33. Cronograma de implementação
34. Decision Log inicial
35. Principais dúvidas ainda não resolvidas
36. Recomendação final
37. Próxima ação concreta

---

# Perguntas obrigatórias ao final

Ao final da análise, responda obrigatoriamente:

### A.
Qual é o problema exato que estamos resolvendo?

### B.
Quem sente esse problema?

### C.
Como essa pessoa resolve hoje?

### D.
O que muda quando introduzimos a ADVERSA?

### E.
Qual dado comprovaria que a ADVERSA gera valor?

### F.
Qual métrica provaria que o projeto funciona?

### G.
Qual é o maior risco de o projeto falhar?

### H.
Qual é a menor versão do produto capaz de validar a hipótese?

### I.
Qual é o custo aproximado de uma análise?

### J.
O que devemos construir nas próximas 3 horas?

---

## Regra final

**Somente depois da entrega da `ADVERSA — PROJECT FOUNDATION v1` devemos iniciar implementação.**
