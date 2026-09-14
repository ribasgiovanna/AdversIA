# Decision Log — AdversIA

> Fonte de verdade do produto: `docs/PRODUCT_SCOPE.md`. Qualquer decisão nova que contradiga esse documento deve ser sinalizada antes de implementar.

## ADR-001

**DECISÃO:** Cortar backend completo (FastAPI + PostgreSQL + Qdrant) do MVP do hackathon.

**MOTIVO:** Tempo insuficiente (Canvas hoje às 12h, Testes Internos às 15h30); a auditoria de amanhã não premia complexidade de infraestrutura, premia confiabilidade, usabilidade e sofisticação técnica visível na demo.

**ALTERNATIVAS:** Stack completa do briefing original; framework de orquestração (LangGraph).

**VANTAGENS:** Menor risco de "demo quebrada"; mais tempo para qualidade do pipeline de prompts e do Golden Dataset.

**DESVANTAGENS:** Sem persistência entre sessões; escala zero usuários simultâneos — aceitável para hackathon, não para piloto.

**RISCO:** Baixo para o objetivo do hackathon.

**STATUS:** Aceito.

---

## ADR-002

**DECISÃO:** RAG externo (jurisprudência/legislação pública) é P1, não P0.

**MOTIVO:** Sem tempo hábil para validar API/licença/confiabilidade de bases oficiais; risco de citar fonte incorreta é alto e penaliza diretamente a dimensão "Confiabilidade" da auditoria.

**ALTERNATIVAS:** Integrar busca em portal de tribunal/legislação agora; deixar o modelo citar jurisprudência livremente.

**VANTAGENS:** Reduz risco de alucinação de fonte jurídica externa.

**DESVANTAGENS:** Relatório fica limitado ao que está nos documentos do caso — não cobre "jurisprudência potencialmente contrária" no MVP de hoje.

**RISCO:** Médio — pitch deve deixar claro que essa é uma evolução P1, não uma limitação escondida.

**STATUS:** Aceito.

---

## ADR-003

**DECISÃO:** Toda afirmação do relatório carrega rótulo de proveniência obrigatório (`FACT` / `SOURCE` / `INFERENCE` / `ADVERSARIAL_HYPOTHESIS` / `UNVERIFIED`).

**MOTIVO:** É o núcleo conceitual do produto ("camada de revisão adversarial", não oráculo) e é exatamente o que a dimensão "Confiabilidade" da auditoria audita.

**ALTERNATIVAS:** Relatório em texto livre sem rótulos.

**VANTAGENS:** Rastreabilidade, credibilidade, alinhamento com o conceito central do produto.

**DESVANTAGENS:** Mais um passo de verificação no pipeline (custo/latência extra).

**RISCO:** Baixo.

**STATUS:** Aceito.

---

## ADR-004

**DECISÃO:** Provedor de LLM único para o hackathon = Anthropic (Claude), acessado por uma função isolada `chamar_llm(tarefa, prompt)`.

**MOTIVO:** Já disponível para a equipe agora; isolar a chamada evita acoplar lógica de negócio a um provedor específico.

**ALTERNATIVAS:** OpenAI (GPT), Google (Gemini), múltiplos provedores simultâneos.

**VANTAGENS:** Zero tempo de setup adicional; troca futura de provedor não exige reescrever o pipeline.

**DESVANTAGENS:** Nenhuma comparação de qualidade entre provedores foi feita — decisão por disponibilidade, não por benchmark.

**RISCO:** Baixo.

**STATUS:** Aceito.

---

## ADR-005

**DECISÃO:** Demo via interface web simples (HTML/JS): upload de documento(s) + botão + relatório na tela.

**MOTIVO:** Mais tangível como "produto" no pitch/auditoria do que mostrar um chat cru, com esforço de implementação ainda baixo.

**ALTERNATIVAS:** Rodar os prompts ao vivo num chat (Claude/GPT).

**VANTAGENS:** Melhor percepção de usabilidade (dimensão 2 da auditoria); auditor consegue testar sozinho.

**DESVANTAGENS:** Exige um mínimo de camada de servidor para não expor a chave de API no navegador.

**RISCO:** Médio — mitigar com um servidor mínimo (proxy) só para a chamada de API, sem lógica de negócio no cliente.

**STATUS:** Aceito.

---

## ADR-006

**DECISÃO:** Construir o Golden Dataset do zero, começando por 1 caso fictício com contradição plantada deliberadamente.

**MOTIVO:** Nenhum material de teste existia antes do hackathon; um caso bem controlado já gera evidência auditável e demonstrável.

**ALTERNATIVAS:** Buscar caso público real anonimizado; esperar por mais casos antes de testar.

**VANTAGENS:** Rápido de criar, controle total sobre o que deve ser encontrado (evidência objetiva de acerto/erro).

**DESVANTAGENS:** Não comprova validade em caso real complexo — é evidência de MVP, não de piloto.

**RISCO:** Baixo para o objetivo do hackathon.

**STATUS:** Aceito.

---

## ADR-007

**DECISÃO:** As 5 etapas do pipeline usam tool use (function calling) da Anthropic com
JSON Schema forçado, em vez de pedir JSON como texto livre e fazer parsing manual.

**MOTIVO:** A primeira rodada real de testes (12/09, após crédito ser adicionado à conta)
falhou em 9/9 testes com `json.decoder.JSONDecodeError` — o modelo devolvia JSON
malformado como texto (strings não fechadas, provavelmente por aspas literais dentro de
trechos citados dos documentos quebrando o parser). Corrigir prompt-engineering
("responda apenas com JSON válido") reduziria a taxa de erro, mas não a eliminaria por
construção.

**ALTERNATIVAS:** (a) reforçar a instrução no prompt para escapar aspas; (b) adicionar uma
etapa de "reparo" que reenvia JSON malformado ao modelo pedindo correção; (c) tool use com
schema.

**VANTAGENS:** tool use elimina a classe inteira do erro — o SDK garante que
`tool_use.input` é um objeto Python já validado contra o schema, sem parsing de texto.
Depois da troca, 9/9 testes passaram na primeira tentativa, incluindo uma chamada real via
`POST /api/analyze` (evidência em `docs/evidencias/teste_interno_case01_20260912.json`).

**DESVANTAGENS:** acopla a implementação a um recurso específico da API da Anthropic
(tool use) — aceitável porque já isolamos toda chamada em `llm_client.py`
(`chamar_llm_estruturado`), então trocar de provedor no futuro significa reimplementar
essa função, não o pipeline inteiro (ADR-004 continua valendo).

**RISCO:** Baixo — o principal risco (JSON malformado) é justamente o que esta decisão
elimina.

**STATUS:** Aceito.

---

## ADR-008

**DECISÃO:** Renomear o produto de ADVERSA para **AdversIA** e restringir o domínio do
MVP exclusivamente a Direito de Família (divórcio: partilha de bens, pensão alimentícia,
guarda e convivência), com a tagline "A divorciar? adversIA."

**MOTIVO:** Direção explícita da equipe após o MVP genérico (trabalhista) já estar
validado. Um domínio único e bem definido permite prompts mais precisos (vocabulário
jurídico específico, tipos de prova esperados por tipo de pedido) do que um produto
genérico "qualquer área do Direito", e facilita a narrativa do pitch (problema específico
e reconhecível, em vez de "serve para tudo").

**ALTERNATIVAS:** manter o escopo genérico e tratar família como só um exemplo entre
outros; migrar para outro domínio (ex.: cível genérico, penal).

**VANTAGENS:** prompts mais precisos (ver `app/prompts/_dominio_familia.md`, derivado de
`docs/ANALISE_CASOS_FAMILIA.md`); pitch mais claro; aproveita os 5 casos reais fornecidos
pela equipe para calibrar o motor adversarial em vez de depender só do caso trabalhista
sintético original.

**DESVANTAGENS:** o caso trabalhista original (`golden_dataset/case_01`) fica fora do
domínio-alvo — mantido no repositório como evidência de que o pipeline não está
hard-coded para família (generalização), mas não é mais o caso de demonstração principal.

**RISCO:** Baixo — o pipeline (Case Model → Evidence Mapping → Contradições → Motor
Adversarial → Verificação) é agnóstico de domínio por construção; o contexto de domínio
entra como um bloco de prompt isolado (`_dominio_familia.md`), não como lógica de código,
então readequar para outro domínio no futuro é trocar um arquivo de texto, não reescrever
o pipeline.

**STATUS:** Aceito.

---

## ADR-009

**DECISÃO:** Adicionar suporte a um segundo provedor de LLM — Groq (tier gratuito),
selecionável via variável de ambiente `LLM_PROVIDER=groq`, mantendo Anthropic como
padrão. Modelos usados: `openai/gpt-oss-20b` (extração) e `openai/gpt-oss-120b`
(raciocínio adversarial/verificação) — confirmados via `client.models.list()` contra a
chave real da equipe em 12/09/2026 (a documentação pública citava
`llama-3.1-8b-instant`/`llama-3.3-70b-versatile`, que retornaram 404 nesta conta; a lista
real da API prevaleceu sobre a doc). Implementado em
`app/llm_client.py::_chamar_groq_estruturado`, usando o SDK `openai` apontado para o
endpoint compatível da Groq (`https://api.groq.com/openai/v1`).

**MOTIVO:** A conta Anthropic ficou sem crédito repetidamente durante o dia de testes; a
equipe precisava de uma forma de continuar validando o pipeline (incluindo o novo Caso 6)
sem custo, sem interromper o desenvolvimento à espera de reposição de crédito.

**ALTERNATIVAS:** (a) esperar crédito da Anthropic antes de qualquer novo teste; (b)
Google Gemini (tier gratuito, mas formato de function calling mais distante do que já
implementamos); (c) rodar um modelo local (Ollama) — descartado por custo de tempo
(download de modelo multi-GB) e por qualidade de raciocínio jurídico provavelmente
inferior para esta tarefa, ambos incompatíveis com o tempo restante do hackathon.

**VANTAGENS:** zero custo no tier atual da Groq; a API compatível com OpenAI exigiu só
uma função nova (`_chamar_groq_estruturado`), sem tocar em `app/pipeline.py` — prova viva
de que o Princípio IV da Constituição (trocar de provedor sem reescrever o pipeline) está
funcionando como projetado (ver também ADR-004).

**DESVANTAGENS:** modelos abertos tendem a ser menos consistentes que o Claude Sonnet no
raciocínio jurídico adversarial mais sutil — os testes existentes (`tests/`) podem se
comportar de forma diferente rodando com Groq, não por bug, mas por qualidade/estilo do
modelo. Isso deve ser tratado como um provedor de teste de encanamento, não como
substituto definitivo do Anthropic para validar a qualidade do produto.

**RISCO:** Baixo tecnicamente (isolado em uma função); médio para a qualidade dos
resultados se usado além de testes de desenvolvimento — documentar claramente qual
provedor gerou qualquer evidência salva (`docs/evidencias/`).

**ADENDO (12/09, noite):** a cota diária gratuita da Groq (200.000 tokens) é **da conta
inteira, não por modelo** — descoberto ao trocar o raciocínio para `gpt-oss-20b` achando
que teria cota separada e receber o mesmo erro 429 (`Used 198.045/200.000`). Por isso,
`app/llm_client.py` está temporariamente com as 4 tarefas apontando para
`openai/gpt-oss-20b`, e o comentário no código instrui a reverter
`raciocinio_adversarial`/`verificacao` para `openai/gpt-oss-120b` quando a cota resetar.
Isso é uma divergência temporária conhecida entre este ADR e o código.

**STATUS:** Aceito.

---

## ADR-010

**DECISÃO:** Adicionar um terceiro provedor de LLM — Google Gemini (tier gratuito),
selecionável via `LLM_PROVIDER=gemini`, usando o SDK `google-genai` (function calling
via `types.FunctionDeclaration`/`ToolConfig`/`FunctionCallingConfig(mode="ANY")`).
Modelo usado: **`gemini-3.6-flash`** para as 4 etapas do pipeline.

**MOTIVO:** Ao rodar os 14 casos do golden_dataset em 12/09/2026 contra a Groq, a conta
esgotou a cota diária de tokens do modelo forte (`openai/gpt-oss-120b`: 197.856/200.000
usados) antes de terminar — 4 dos 14 casos falharam por limite de taxa/cota, não por bug
(2 por TPM/TPD estourado, 2 por falha intermitente do próprio Groq ao validar a tool
call gerada pelo modelo). Trocar de provedor permitiu fechar esses 4 casos no mesmo dia
sem esperar o reset da cota da Groq nem gastar crédito da Anthropic.

**ALTERNATIVAS:** (a) esperar ~27min+ o reset parcial da cota da Groq; (b) usar crédito
Anthropic pago só para os 4 casos pendentes; (c) Gemini gratuito.

**VANTAGENS:** zero custo adicional; mesma prova do Princípio IV da Constituição que o
ADR-009 já demonstrou — adicionar um terceiro provedor não tocou em `app/pipeline.py`,
só em `app/llm_client.py` (`_chamar_gemini_estruturado`). Ter 3 provedores intercambiáveis
reduz a chance de qualquer cota isolada travar o desenvolvimento de novo.

**DESVANTAGENS:** mais uma dependência opcional (`google-genai`); a primeira tentativa
usou `gemini-2.5-flash`, que a própria API rejeitou com 404 e a mensagem "no longer
available to new users. Please update your code to use models/gemini-3.6-flash" —
corrigido para `gemini-3.6-flash`. Terceira vez no dia em que a lista/mensagem real da
API prevaleceu sobre documentação e sobre suposição minha (Groq 404, Gemini 404): a
lição operacional é sempre confirmar o identificador de modelo contra a conta real antes
de confiar em doc pública.

**LIMITE DESCOBERTO NA PRÁTICA:** o tier gratuito do `gemini-3.6-flash` permite apenas
**20 requisições/dia** (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`). Como o
pipeline consome ~5 requisições por análise, isso significa **~4 análises por dia** — o
suficiente para fechar casos de teste pontuais, insuficiente para teste externo com
vários usuários.

**RISCO:** Baixo tecnicamente (isolado em uma função); qualidade dos resultados com
modelo gratuito tem a mesma ressalva do ADR-009 — tratar como provedor de teste de
encanamento, documentar qual provedor gerou qualquer evidência salva.

**STATUS:** Aceito.

---

## ADR-011

**DECISÃO:** Expor o MVP para teste externo via **Cloudflare Quick Tunnel**
(`cloudflared tunnel --url http://localhost:8000`), gerando uma URL pública HTTPS
temporária, em vez de fazer deploy em PaaS/nuvem. Provedor de LLM durante o teste
externo: **Anthropic** (pago).

**MOTIVO:** O teste externo exige que um terceiro acesse a ferramenta de outro
dispositivo. A auditoria do hackathon, por outro lado, é presencial com "laptop à
disposição do auditor" (Manual OAB/PR) — ou seja, não exige hospedagem permanente.
Túnel entrega URL pública em ~2 minutos, sem alterar uma linha de código (o servidor
continua o mesmo `http.server` local), sem criar conta em plataforma, e sem o risco de
introduzir bugs de deploy na véspera da apresentação.

**ALTERNATIVAS:** (a) deploy em Render/Railway/Fly.io (exigiria adaptar bind para
`0.0.0.0`/`$PORT`, configurar variáveis de ambiente na plataforma, e depurar ambiente
novo sob pressão de tempo); (b) ngrok (exige conta + authtoken, mais atrito); (c) não
fazer teste externo remoto e só testar presencialmente.

**POR QUE ANTHROPIC E NÃO OS GRATUITOS:** os dois provedores gratuitos esgotaram cota no
mesmo dia — Groq bateu o limite diário de 200.000 tokens **da conta inteira** (não por
modelo, como eu havia suposto erradamente: o modelo fraco falhou com a mesma cota do
forte), e Gemini tem apenas 20 requisições/dia. Para testers reais, travar no meio da
análise custaria mais (credibilidade na dimensão "Confiabilidade") do que os centavos por
análise do Anthropic. Comparação de qualidade observada no mesmo caso (FAM-005): Groq
`gpt-oss-20b` produziu 14 achados mecânicos, todos `UNVERIFIED`; Anthropic produziu 17
achados com distinção correta entre tese jurídica (`UNVERIFIED`) e alegação factual sem
prova (`INFERENCE`) — evidência salva em
`docs/evidencias/teste_externo_publico_case_familia_05_20260912.json`.

**DESVANTAGENS:** URL temporária (morre quando o processo do túnel para — não serve como
endereço permanente); sem autenticação, então qualquer pessoa com o link consome crédito
pago da equipe (mitigação: link não é indexável/adivinhável, compartilhado só com os
testers convidados, e é derrubado depois do teste); a análise depende do laptop da equipe
estar ligado e conectado.

**RISCO:** Médio-baixo, limitado no tempo. Para um piloto real, substituir por deploy
próprio com autenticação e rate limiting por usuário (já registrado em
`docs/CONFORMIDADE.md`, seção 4, como limitação conhecida).

**STATUS:** Aceito para a fase de teste externo.

---

## ADR-012

**DATA:** 13/09/2026 (dia 2 — pitch)

**DECISÃO:** Acessibilidade com **VLibras** (biblioteca pronta, oficial) para Libras e
**controles próprios, sem biblioteca**, para tema claro/escuro, tamanho do texto, alto
contraste, espaçamento, redução de animações e leitura em voz alta. Junto: redesenho da
interface a partir da logo (tinta preta sobre papel) e reescrita de todo texto visível ao
usuário sem termos técnicos.

**MOTIVO:**
- **Libras**: não existe forma razoável de fazer em casa — exige avatar 3D e dicionário de
  sinais. O VLibras é gratuito, mantido pelo Governo Federal (MGI/UFPB) e é o padrão
  usado em sites gov.br, o que dá legitimidade para um projeto da OAB.
- **Demais controles**: são poucas dezenas de linhas de CSS/JS sobre tokens de cor e
  `rem`. Os widgets prontos de "overlay" (UserWay, accessiBe, EqualWeb) foram descartados
  porque carregam scripts de rastreamento de terceiros (problema de LGPD num produto que
  recebe dados de família), costumam ser pagos para uso real e são criticados pela própria
  comunidade de acessibilidade por mascarar problemas em vez de corrigi-los (a página
  precisa ser acessível por si só, não por uma camada por cima).
- **Leitura em voz alta**: Web Speech API do próprio navegador — sem custo e sem enviar o
  relatório (dado sensível) a um serviço de voz externo.
- **Progresso real**: a análise leva ~1-2 min. Em vez de um "carregando" mudo, o servidor
  roda a análise em segundo plano (`POST /api/analises` + `GET /api/analises/<id>`) e a
  tela mostra as 5 etapas conforme acontecem. O endpoint síncrono `POST /api/analyze`
  continua existindo com o mesmo contrato.
- **Casos de exemplo na tela**: os 13 casos fictícios de família do golden dataset, escolhidos
  por um filtro (tipo de caso → situação) — partilha de bens, pensão alimentícia, guarda e
  convivência, herança e pensão por morte — para o pitch e para quem testa sem documentos
  (Princípio V — só dados fictícios).

**ALTERNATIVAS:** (a) overlay pronto (UserWay/accessiBe) para tudo — descartado pelos
motivos acima; (b) não oferecer Libras — descartado, é requisito explícito da equipe e do
público do hackathon; (c) Hand Talk (plugin comercial de Libras) — pago para sites.

**DESVANTAGENS:** VLibras depende de internet e da disponibilidade de `vlibras.gov.br`, e
carrega um script externo (do governo, não de empresa de publicidade). A tradução
automática tem limitações com jargão jurídico. As análises em segundo plano ficam só na
memória do servidor (máx. 50, perdidas ao reiniciar), coerente com ADR-001.

**RISCO:** Baixo. Se o VLibras falhar ao carregar, o `try/catch` impede erro na página e
todo o resto continua funcionando.

**STATUS:** Aceito. Validado em 13/09/2026 com análise real (Anthropic) do caso de guarda e
alienação parental pela interface nova: 14 apontamentos, US$ 0,1055, nenhum termo técnico
no texto do relatório, nenhum erro de JavaScript, sem rolagem lateral em 400px.

---

## ADR-013

**DATA:** 13/09/2026 (dia 2 — pitch)

**DECISÃO:** Três diferenciais no relatório, organizados em abas: **Linha do tempo do
caso**, **Plano de provas** e **Simulação de audiência** — e, junto com eles, a
**conferência automática de cada trecho citado** no texto do documento enviado.

**COMO FUNCIONA:**
- **Conferência de trechos** (`pipeline._trecho_consta`): o código procura cada trecho
  citado no documento real (ignorando caixa, aspas e quebras de linha). Conferido aparece
  como "✓ Trecho conferido no documento"; não encontrado, como "Não localizamos este
  trecho exato — confira". A etapa de verificação passou a receber o texto original dos
  documentos para copiar trechos literais. É o Princípio I aplicado por código, sem
  depender do modelo.
- **Linha do tempo**: extraída na própria etapa 1 (mesma chamada ao modelo), com data,
  evento, quem afirma, documento, trecho literal e divergência entre versões. O código
  descarta eventos sem documento real, confere o trecho e ordena por data.
- **Plano de provas**: etapa 6 (uma chamada ao modelo de raciocínio). Transforma os
  apontamentos em provas concretas a providenciar, com finalidade, caminho lícito para
  obter, prioridade e vínculo clicável com os apontamentos que resolve. Se falhar, o
  relatório continua válido e a tela avisa.
- **Simulação de audiência**: `POST /api/analises/<id>/audiencia`. A IA faz as perguntas
  difíceis como advogado da parte contrária; o advogado responde digitando ou falando
  (reconhecimento de voz do navegador) e recebe veredito (convincente / convence em parte /
  frágil), o que funcionou, o que ficou frágil, como fortalecer usando só fatos dos
  documentos, trechos de apoio conferidos e a réplica do outro lado.

**MOTIVO:** o relatório mostra onde a tese é fraca; os três diferenciais levam o advogado
do diagnóstico à ação (o que provar), ao contexto (quando cada fato aconteceu e onde as
versões divergem) e ao treino (como responder na audiência) — sem deixar de ser uma
ferramenta de revisão, não de decisão.

**ALTERNATIVAS:** gerar a peça da parte contrária (descartada: pareceria peça pronta e
contraria o compromisso de não substituir o advogado); nota ou "score" da tese
(descartado: número sem base metodológica induziria confiança falsa).

**CUSTO:** plano de provas ≈ 1 chamada ao modelo de raciocínio por análise; simulação ≈
1 chamada por resposta. Medido em 13/09/2026: análise completa do caso "Ex-esposa voltou
a trabalhar" em 89 s; avaliação de uma resposta em 12 s.

**DESVANTAGENS:** os documentos do caso ficam na memória do servidor enquanto a análise
estiver guardada (máx. 50 análises, apagadas ao reiniciar) para a simulação funcionar; o
ditado por voz usa o serviço de reconhecimento do navegador (no Chrome, o áudio vai para
servidores do Google). A linha do tempo depende de os documentos terem datas explícitas —
nos casos de exemplo antigos quase não há datas, e o sistema mostra isso em vez de
inventar.

**RISCO:** Baixo-médio (custo por uso da simulação num link público sem autenticação).

**STATUS:** Aceito. Validado em 13/09/2026 com análise real (Anthropic): 17 apontamentos,
14 de 14 citações conferidas no documento, plano com 8 provas e 22 vínculos, simulação
apontando corretamente que a resposta afirmava um fato ausente dos documentos.

**ADENDO (13/09/2026):** criado o caso fictício `case_familia_14` (revisional de alimentos
+ mudança de cidade), com cronologia rica e datas conflitantes, porque os 13 casos
anteriores quase não tinham datas. Análise real: 13 fatos na linha do tempo, 3 a 4 pontos
com versões diferentes (separação, mudança de cidade), todos os trechos conferidos,
~150 s. Na primeira rodada o plano de provas desse caso veio vazio sem erro; corrigido em
`llm_client._desserializar_campos` (lista devolvida como texto JSON é convertida),
limite de 16.000 tokens para o plano e aviso no log quando uma resposta é cortada. Plano
vazio com apontamentos a resolver agora é tratado como falha (a tela avisa). Segunda
rodada: plano com 10 provas.

---

## ADR-014

**DATA:** 14/09/2026

**DECISÃO:** Publicar o site na **Vercel** (arquivos estáticos + funções Python), sem
nenhuma chave de IA da equipe. O site passa a ter dois modos:
1. **Demonstração** (padrão): 32 casos fictícios com a análise **preparada previamente** e
   servida como arquivo estático; custo zero para qualquer visitante.
2. **Meus documentos**: análise real que usa a **chave da Anthropic da própria pessoa**
   (*bring your own key*), enviada no cabeçalho `X-Anthropic-Key` a cada requisição.

**COMO FUNCIONA:**
- **Demonstração:** `demo/fontes/<id>.json` (análise escrita e revisada) +
  `golden_dataset/case_familia_NN/` (documentos) → `scripts/construir_demo.py` gera
  `app/static/demo/indice.json` e `app/static/demo/casos/<id>.json`. O script usa o mesmo
  `_trecho_consta` do pipeline e **falha** se algum trecho citado não estiver no documento
  (32 casos, 424 trechos conferidos em 14/09/2026). A tela mostra as seis etapas com
  tempos fixos (~10 s no total) e o selo "Caso fictício de demonstração · análise preparada
  previamente". Na simulação, a pessoa escolhe entre respostas prontas, cada uma com a
  avaliação preparada.
- **Chave do usuário:** `app/api_comum.py` valida o formato (`sk-ant-…`), abre
  `llm_client.usar_chave_anthropic(chave)` (ContextVar: força o provedor Anthropic e cria um
  cliente só para aquela requisição) e traduz erros da Anthropic em mensagens resolvíveis
  (chave recusada 401, sem permissão 403, limite 429, sem crédito 402, falha de conexão 502).
  A chave não é gravada, não vai para o log e não é guardada no navegador.
- **Sem estado no servidor:** cada chamada da Vercel pode cair numa instância diferente.
  `POST /api/analisar` devolve `{relatorio, documentos, tese}`; o navegador guarda o texto
  extraído só na memória da aba e o reenvia em `POST /api/audiencia`. As rotas antigas
  com análise em segundo plano e registro em memória (`/api/analises`, `/api/exemplos`)
  foram removidas.
- **Vercel:** `vercel.json` publica `app/static` e as funções `api/analisar.py` e
  `api/audiencia.py` (duração máxima 300 s, `includeFiles: app/**`). Corpo limitado a 4 MB
  na análise (a plataforma recusa acima de 4,5 MB). `.vercelignore` exclui `.env`, testes,
  golden dataset, fontes da demonstração e documentação.
- **Novos casos:** pesquisa em fontes públicas (STJ, TJSP, TJPR, TJMG, TJDFT) só para mapear
  os **tipos** de conflito; casos inteiramente fictícios (`case_familia_15` a `32`). Nenhum
  processo real foi raspado: ações de família correm em segredo de justiça e envolvem
  crianças. Detalhes em `docs/CATALOGO_DE_SITUACOES.md`.

**MOTIVO:** com o repositório público e o link aberto para testes, manter a chave da
equipe no servidor permitiria que qualquer pessoa consumisse crédito pago. A demonstração
pré-montada deixa qualquer avaliador ver o produto completo sem custo e sem cadastro; a
chave própria permite a análise real sem que a equipe pague por ela. A Vercel substitui o
túnel temporário (ADR-011): URL fixa, HTTPS e nada dependendo de um notebook ligado.

**ALTERNATIVAS:** manter a chave da equipe com limite por IP (descartada: sem banco, o
limite não sobrevive entre instâncias e o custo continua exposto); só modo demonstração
(descartada: esconderia que a análise real funciona); Render/Railway com servidor
contínuo (descartada: planos gratuitos dormem ou têm horas limitadas; a Vercel foi a
escolha da equipe).

**DESVANTAGENS:** a demonstração não é gerada pela IA na hora; por isso a tela declara que
a análise foi preparada previamente. Colar uma chave de API num site exige confiança; a
tela explica que a chave não fica guardada e aponta para o painel oficial da Anthropic. A
análise real é síncrona (2 a 3 minutos numa única requisição) e depende do limite de 300 s
da função; sem progresso real, a tela mostra etapas estimadas por tempo. O limite de
upload cai de 15 MB (servidor local) para 4 MB (Vercel).

**RISCO:** Baixo para custo da equipe (zero). Médio para confiança do usuário ao informar
a chave.

**STATUS:** Aceito. Validado localmente em 14/09/2026: fluxo de demonstração no navegador
sem erros de JavaScript; `/api/analisar` sem chave (401), com chave malformada (400) e com
chave falsa (401, mensagem da Anthropic traduzida), sem custo. Publicação na Vercel
depende de a equipe conectar o repositório à conta dela.

---

## ADR-015

**DATA:** 14/09/2026

**DECISÃO:** A **análise com documentos** passa a ser exclusiva da **gestão**. Visitantes
veem só a demonstração gratuita; a opção "Analisar documentos" aparece depois que alguém
clica em "Acesso da gestão" e informa o código correto.

**COMO FUNCIONA:**
- O código fica na variável de ambiente `ADVERSIA_CODIGO_GESTAO` (painel da Vercel ou
  `.env` local), **nunca no código-fonte**.
- `POST /api/gestao` confere o código e libera a opção na tela. `POST /api/analisar` e
  `POST /api/audiencia` conferem o código **de novo, antes de qualquer outra checagem**: esconder
  o botão não basta, a proteção real é no servidor.
- Comparação por `hmac.compare_digest`; código errado espera 1 s antes do 403; sem a
  variável configurada, a análise real fica desligada (falha fechada).
- No navegador, o código fica só na memória da aba (some ao recarregar), como a chave.

**MOTIVO:** documentos de família são sensíveis; manter a análise real aberta a qualquer
visitante contraria o uso só com dados fictícios e a responsabilidade da equipe sobre o que
entra no sistema. A demonstração continua pública para avaliadores e interessados.

**ALTERNATIVAS:** login individual por e-mail (mais seguro e auditável, mas exige serviço de
autenticação e mais tempo); link separado para a gestão (descartado: quem descobre o link
entra).

**DESVANTAGENS:** código compartilhado por toda a gestão, sem identificar quem usou; trocar o
código exige atualizar a variável e publicar de novo; sem contagem de tentativas entre
instâncias (mitigado pela espera de 1 s e por um código longo).

**RISCO:** Baixo, desde que o código seja longo e não seja divulgado.

**STATUS:** Aceito. Validado localmente em 14/09/2026 (ver seção de testes da documentação
técnica).
