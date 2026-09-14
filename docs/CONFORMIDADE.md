# Conformidade — Acessibilidade, LGPD, Dados Confidenciais e Segurança

> Revisão feita em 12/09/2026 sobre o código existente do MVP AdversIA (Direito de
> Família). Cada item abaixo é **verificado no código atual** (com referência de arquivo)
> ou marcado explicitamente como **pendente/recomendação**, seguindo a mesma disciplina do
> resto do projeto: não afirmar conformidade sem evidência.

## 1. Acessibilidade (a11y)

### O que já está implementado

| Prática | Onde | Evidência |
|---|---|---|
| `lang="pt-BR"` na página | `app/static/index.html:2` | leitor de tela usa a pronúncia/idioma correto |
| Todo campo de formulário tem `<label for="...">` associado | `index.html` (documentos, tese, confirmação) | navegação por teclado/leitor de tela identifica cada campo |
| Texto de ajuda do campo de upload ligado via `aria-describedby` | `index.html` (`documentos-ajuda`) | leitor de tela lê o formato aceito junto com o campo |
| Anúncio automático de mudança de estado (carregando/erro/relatório) | `index.html` (`aria-live="polite"`/`"assertive"`, `role="alert"`) | usuário de leitor de tela é avisado sem precisar navegar manualmente |
| Foco movido programaticamente para o relatório (sucesso) ou botão de nova tentativa (erro) | `app/static/app.js::analisarCaso` | usuário de teclado não fica "preso" num botão que sumiu da tela |
| Contorno de foco visível (`:focus-visible`) em campos e botões | `app/static/style.css` | usuário de teclado sempre vê onde está o foco |
| Informação nunca depende só de cor | badges de proveniência e categoria têm rótulo textual, não só cor (`app/static/app.js::CATEGORIA_LABEL`/`PROVENANCE_LABEL`) | usuário com daltonismo/baixa visão ainda distingue os tipos de achado |
| Mensagens de erro anunciadas como `role="alert"` | `index.html` (`erro-formulario`) | erro de rede/servidor não passa despercebido |

### Adicionado no dia 2 (13/09/2026) — painel de acessibilidade (ADR-012)

| Prática | Onde | Evidência |
|---|---|---|
| **Libras** via VLibras (widget oficial e gratuito do Governo Federal) | `index.html` (fim do `<body>`) | botão azul fixo na lateral direita traduz o texto selecionado para Libras com avatar; carregamento confirmado (`window.VLibras` presente) em teste com Playwright |
| Tema **claro, escuro ou automático** (segue o sistema operacional) | `style.css` (tokens em `:root`, `prefers-color-scheme`, `[data-theme]`), `app.js::aplicarPreferencias` | prints dos dois temas em 13/09/2026 |
| **Tamanho do texto** de 90% a 175% (6 níveis) | `app.js::ESCALAS`; toda a interface usa `rem`, então tudo escala junto | print do painel em 130% |
| **Alto contraste** (preto/branco puro, em claro e escuro) | `style.css` (`[data-contraste="alto"]`) | — |
| **Texto mais espaçado** (entrelinha, letras e palavras) | `style.css` (`[data-espacamento="amplo"]`) | útil para dislexia |
| **Reduzir animações** + respeito a `prefers-reduced-motion` | `style.css` (`--duracao`) | — |
| **Ouvir relatório** (leitura em voz alta, voz pt-BR do navegador) | `app.js::alternarLeitura` (Web Speech API) | sem serviço externo; botão some se o navegador não suportar |
| Fonte **Atkinson Hyperlegible** (Braille Institute, para baixa visão) + Lexend nos títulos | `index.html` (Google Fonts) com fallback do sistema | — |
| Link **"Pular para o conteúdo"** | `index.html` (`.pular-conteudo`) | aparece ao primeiro Tab |
| Preferências **aplicadas antes da pintura** e lembradas no navegador | `index.html` (script inline no `<head>`), `localStorage` com `try/catch` | não pisca o tema errado; nada é enviado ao servidor |
| **Progresso real anunciado** ao leitor de tela (etapa X de 5) | `app.js::renderizarEtapas` + `#anuncio` (`aria-live`) | usuário cego sabe que a análise de ~1-2 min está andando |
| Layout sem rolagem lateral em 400px (celular) | `style.css` | verificado com Playwright (`scrollWidth <= innerWidth`) |
| **Linguagem sem termos técnicos** em telas, erros e no texto gerado pela IA | `server.py` (`MSG_*`), `document_reader.py`, `pipeline.py::ETAPAS`, regra "ESCRITA PARA O ADVOGADO" em `prompts/_dominio_familia.md` | análise real do caso de guarda em 13/09/2026: nenhum termo interno no relatório |

### Pendente / recomendação (não verificado ainda)

- **Contraste de cor medido**: as paletas foram escolhidas para contraste alto e revisadas
  visualmente, mas **não foram medidas com ferramenta automatizada (axe, Lighthouse,
  WAVE)** — recomendação antes de qualquer uso além do hackathon.
- **Teste com leitor de tela real** (NVDA/VoiceOver): a implementação segue boas práticas
  de ARIA, mas não foi testada com um leitor de tela de verdade.
- **VLibras depende de internet** e de `vlibras.gov.br` estar no ar; se o site do governo
  cair, o restante da página funciona normalmente, só o botão de Libras não aparece.
- **Teste com pessoas surdas/usuárias de Libras**: a tradução automática do VLibras tem
  limitações conhecidas com vocabulário jurídico; não foi validada com usuários.

## 2. LGPD (Lei Geral de Proteção de Dados)

### Natureza dos dados tratados

Documentos de processos de Direito de Família contêm, por definição, **dados pessoais
sensíveis**: identificação de partes, situação financeira (pensão), e — nos casos de
guarda/convivência — **dados de crianças e adolescentes**, que recebem proteção reforçada
pela LGPD (art. 14) e pelo ECA. Isso torna a área de família mais sensível do que o
domínio genérico original do MVP.

### O que já está implementado

| Prática | Onde | Evidência |
|---|---|---|
| Checkbox de confirmação obrigatória antes de enviar qualquer documento | `index.html` (`confirmacao-dados`, `required`) | opera o Princípio V da Constituição de forma ativa, não só um aviso passivo |
| Aviso fixo em toda resposta do sistema | `app/schemas.py::AVISOS_FIXOS` | usuário é lembrado a cada relatório, não só na tela inicial |
| Sem persistência de documentos em disco ou banco | `app/pipeline.py`, `app/server.py` — nenhuma escrita em disco/banco dos documentos enviados | dado do usuário só existe na memória do processo |
| Retenção em memória limitada para a simulação de audiência (ADR-013) | `app/server.py::_iniciar_analise` — documentos e tese guardados junto da análise, nunca devolvidos pela API (chaves com `_`), no máximo 50 análises, apagados ao reiniciar o servidor | a simulação avalia respostas sobre os mesmos documentos sem pedir novo upload |
| Chave de API nunca exposta ao navegador | `app/llm_client.py` (chamada só no servidor) + `.env` no `.gitignore` | dado não pode ser interceptado no lado do cliente |
| Mensagens de erro não vazam detalhe interno ao cliente | `app/server.py::do_POST` (exceção genérica loga no servidor, resposta ao cliente é só uma mensagem amigável) | reduz risco de vazamento de informação técnica/dado em trânsito |

### Pendente / recomendação — importante para o pitch e para além do hackathon

- **Ditado por voz na simulação de audiência**: usa o reconhecimento de voz do próprio
  navegador; no Chrome o áudio é processado por servidores do Google. Com dados reais,
  avisar o usuário antes de ativar o microfone ou oferecer só a digitação.
- **Expiração das análises em memória**: hoje saem só pelo limite de 50 ou ao reiniciar;
  para uso real, apagar automaticamente após um prazo curto (ex.: 1 hora).

- **Transferência internacional de dados**: os documentos enviados são processados pela
  API da Anthropic (processamento fora do Brasil). Isso é uma transferência internacional
  de dados sob a LGPD (art. 33) — para uso real (não fictício), o escritório precisaria
  de base legal e, idealmente, de um contrato com cláusulas de proteção de dados com o
  provedor. **Recomendação explícita ao usuário**: nunca enviar dado real de cliente
  neste MVP — só fictício/anonimizado (já operacionalizado pelo checkbox).
- **Dados de crianças e adolescentes**: casos de guarda/convivência mencionam menores.
  Mesmo em dado fictício, o sistema foi instruído (`app/prompts/_dominio_familia.md`) a
  nunca apresentar como `FACT` conclusões sensíveis (ex. alienação parental) — mas isso é
  mitigação de **qualidade do output**, não impede que o próprio upload de um caso real
  envolvendo criança aconteça. A defesa real contra isso é o processo humano (só
  documentos fictícios), não um controle técnico automatizado no MVP atual.
- **Direitos do titular (acesso, exclusão, portabilidade)**: não se aplicam hoje porque
  não há persistência — mas se o produto evoluir para um piloto com armazenamento de
  casos, isso precisa ser desenhado antes (está fora do MVP, mas registrado aqui para não
  ser esquecido).
- **Registro de operações de tratamento (RIPD/DPIA)**: não feito — recomendação para
  antes de qualquer piloto com dado real.

## 3. Dados confidenciais / sigilo profissional (advogado-cliente)

- O sigilo profissional (Estatuto da OAB, art. 34/35 e Código de Ética) é uma camada
  **acima** da LGPD: mesmo dado anonimizado que ainda permita identificar as partes por
  contexto (nome de empresa única, datas muito específicas) pode violar sigilo. O aviso
  fixo e o checkbox cobrem a intenção, mas a responsabilidade final de anonimizar de
  verdade (não só trocar nomes) é do usuário — o sistema não tem como validar
  tecnicamente se um documento está "anonimizado o suficiente".
- **Recomendação**: adicionar, na documentação de uso (quickstart/README), uma orientação
  explícita de que **anonimizar não é só trocar o nome da parte** — datas, valores muito
  específicos e nomes de empresas/local de trabalho também podem reidentificar alguém.

## 4. Segurança contra ataques

### O que já está implementado

| Ataque | Mitigação | Onde |
|---|---|---|
| Path traversal (ler arquivo fora de `app/static/`) | checagem `STATIC_DIR not in arquivo.resolve().parents` antes de servir qualquer arquivo | `app/server.py::_send_static` — testado manualmente em 12/09 com `../server.py`, `../../requirements.txt` etc.: todos bloqueados |
| Negação de serviço por upload gigante | corpo da requisição limitado a 15MB, com erro 413 explícito | `app/server.py::do_POST` (`MAX_BODY_SIZE`) — valor confirmado em 12/09 |
| XSS (script injetado via texto do caso/relatório) | toda inserção de texto no DOM usa `textContent`, nunca `innerHTML` com dado do usuário | `app/static/app.js::el()` e `renderFinding()` |
| Vazamento de detalhe interno (stack trace, caminho de arquivo) em erro 500 | exceção genérica loga completo só no servidor (`stderr`), resposta ao cliente é mensagem fixa | `app/server.py::do_POST` |
| Exposição da chave de API no cliente | chave só existe no processo do servidor (`.env`, nunca enviada ao navegador) | `app/llm_client.py`, `.gitignore` |
| Credencial commitada por engano no repositório público (exigência do hackathon) | `.env` no `.gitignore`; só `.env.example` (vazio) é versionado | `.gitignore`, `.env.example` |

### Pendente / recomendação — limitações conhecidas do MVP de hackathon

- **Sem HTTPS**: o servidor roda em `http://localhost` — aceitável para demo local, mas
  **nunca deve ser exposto à internet nessa forma**. Documentado aqui para não virar uma
  suposição errada em uso futuro.
- **Sem autenticação/autorização**: qualquer processo que consiga acessar `localhost:8000`
  pode usar a API — aceitável para demo de um usuário só; um piloto real precisaria de
  login e isolamento por usuário/escritório.
- **Sem rate limiting**: nada impede múltiplas chamadas simultâneas (e, portanto, custo de
  API descontrolado) se o servidor for exposto além de localhost — mitigação real é não
  expor além de localhost neste estágio.
- **Sem validação de tipo de arquivo por conteúdo (magic bytes)**: `document_reader.py`
  confia na extensão do nome do arquivo; um arquivo malicioso renomeado para `.txt` seria
  lido como texto (baixo risco, já que o conteúdo só é enviado a um LLM como texto, nunca
  executado), mas é uma limitação a documentar.

## Resumo para o pitch

O MVP implementa proteções técnicas reais e verificáveis (path traversal, limite de
upload, XSS, vazamento de erro, chave de API isolada) e opera a proteção de dados por
**design de produto** (sem persistência, consentimento ativo via checkbox, avisos fixos)
mais do que por controle técnico de conteúdo — o que é a decisão correta para o estágio
de hackathon (Constituição, Princípio IV: não resolver problemas de piloto/produção
antes da hora), mas deve ser apresentado como tal: **hipótese de conformidade validada
para hackathon com dado fictício, não uma certificação de produção.**
