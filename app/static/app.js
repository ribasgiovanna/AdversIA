"use strict";

/* ==========================================================================
   AdversIA — interface (ADR-020).
   Uma tarefa por tela: início → escolha do caso (ou documentos, na área da gestão)
   → análise → relatório. Texto enxuto, detalhes sob demanda e transições suaves.
   Nenhum termo interno aparece na tela: as chaves à esquerda são o que o servidor
   devolve; os rótulos à direita são o que a pessoa lê.
   ========================================================================== */

const CATEGORIAS = {
  vulnerabilidade_critica: { grupo: "criticos", rotulo: "Ponto crítico", icone: "critico" },
  vulnerabilidade_media: { grupo: "criticos", rotulo: "Ponto de atenção", icone: "atencao" },
  contradicao: { grupo: "contradicoes", rotulo: "Contradição", icone: "contradicao" },
  lacuna_probatoria: { grupo: "lacunas", rotulo: "Falta de prova", icone: "lacuna" },
  contra_argumento: { grupo: "argumentos", rotulo: "Argumento contrário", icone: "argumento" },
  pergunta_dificil: { grupo: "perguntas", rotulo: "Pergunta difícil", icone: "pergunta" },
};

const GRUPOS = [
  { id: "criticos", titulo: "Pontos críticos", descricao: "O que mais ameaça a estratégia.", classe: "grupo-critico", icone: "critico", placar: null },
  { id: "contradicoes", titulo: "Contradições", descricao: "Informações que não batem entre os documentos.", classe: "grupo-contradicao", icone: "contradicao", placar: ["contradição", "contradições"] },
  { id: "lacunas", titulo: "Alegações sem prova", descricao: "Afirmado, mas sem documento que sustente.", classe: "grupo-lacuna", icone: "lacuna", placar: ["sem prova", "sem prova"] },
  { id: "argumentos", titulo: "Argumentos da outra parte", descricao: "Como o outro lado pode atacar a tese.", classe: "grupo-argumento", icone: "argumento", placar: ["argumento contrário", "argumentos contrários"] },
  { id: "perguntas", titulo: "Perguntas difíceis", descricao: "O que o juiz ou a outra parte pode perguntar.", classe: "grupo-pergunta", icone: "pergunta", placar: ["pergunta difícil", "perguntas difíceis"] },
];

const ORIGENS = {
  FACT: { rotulo: "Está nos documentos", classe: "etiqueta-fato" },
  SOURCE: { rotulo: "Fonte jurídica citada", classe: "etiqueta-conclusao" },
  INFERENCE: { rotulo: "Conclusão tirada dos documentos", classe: "etiqueta-conclusao" },
  ADVERSARIAL_HYPOTHESIS: { rotulo: "Possível argumento da outra parte", classe: "etiqueta-hipotese" },
  UNVERIFIED: { rotulo: "Sem base suficiente — confira", classe: "etiqueta-sembase" },
};

const MENSAGEM_FALHA_PADRAO = "Não foi possível concluir a análise agora. Tente novamente em alguns instantes.";
const MENSAGEM_SEM_CONEXAO = "Perdemos a conexão com o servidor. Verifique a internet e tente de novo.";

// Mesmos nomes de app/pipeline.py::ETAPAS.
const ETAPAS = [
  "Lendo os documentos do caso",
  "Relacionando cada alegação com as provas",
  "Procurando contradições",
  "Pensando como a parte contrária",
  "Conferindo cada apontamento nos documentos",
  "Montando o plano de provas",
];
// Segundo em que cada etapa costuma começar numa análise real (medições de 13/09/2026).
const INICIO_ETAPAS_REAL = [0, 15, 35, 60, 90, 125];
// Ritmo das etapas no modo demonstração, em milissegundos.
const DURACAO_ETAPAS_DEMO = [1300, 1600, 1500, 2100, 1800, 1500];

/* ---------- estado ---------- */

// "demo": resultados preparados para casos fictícios; "chave": análise real (área da gestão).
let modo = "demo";
let exemplos = [];
let tipoAtivo = "";
let exemploEscolhido = null;
let casoDemo = null;
let contextoReal = null; // { documentos, tese, chave, codigo } da última análise real, para a simulação
let codigoGestao = null; // código da gestão já conferido pelo servidor; só na memória desta aba
const arquivos = new Map();

/* ---------- utilidades ---------- */

const $ = (id) => document.getElementById(id);

function el(tag, propriedades = {}, filhos = []) {
  const no = document.createElement(tag);
  for (const [chave, valor] of Object.entries(propriedades)) {
    if (valor === undefined || valor === null) continue;
    if (chave === "texto") no.textContent = valor;
    else if (chave === "classe") no.className = valor;
    else no.setAttribute(chave, valor);
  }
  for (const filho of [].concat(filhos)) if (filho) no.appendChild(filho);
  return no;
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

function plural(n, [singular, pluralTexto]) {
  return n === 1 ? singular : pluralTexto;
}

function anunciar(texto) {
  const anuncio = $("anuncio");
  anuncio.textContent = "";
  setTimeout(() => { anuncio.textContent = texto; }, 60);
}

async function lerJson(resposta) {
  try { return await resposta.json(); } catch { return {}; }
}

function movimentoReduzido() {
  return (
    document.documentElement.getAttribute("data-movimento") === "reduzido" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* ---------- ícones (SVG criados por código, sem innerHTML) ---------- */

const ICONES = {
  critico: ["M12 3.5 2.8 19.5h18.4L12 3.5Z", "M12 10v4.5", "M12 17.2v.3"],
  atencao: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M12 7.5v5.5", "M12 16.2v.3"],
  contradicao: ["M4 8h14", "m14.5 4.5 3.5 3.5-3.5 3.5", "M20 16H6", "m9.5 12.5-3.5 3.5 3.5 3.5"],
  lacuna: ["M6 3h8l4 4v14H6V3Z", "M14 3v4h4", "M10.2 11.3a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4", "M12 17.3v.2"],
  argumento: ["M4 5h16v11H9l-5 4V5Z", "M8.5 9.5h7", "M8.5 12.5h4.5"],
  pergunta: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6", "M12 16.8v.2"],
  ajuda: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6", "M12 16.8v.2"],
  documento: ["M6 3h8l4 4v14H6V3Z", "M14 3v4h4", "M9 12h6", "M9 16h4"],
  busca: ["M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z", "m20 20-4.8-4.8"],
  alvo: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z", "M12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z"],
  relogio: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M12 7v5l3.2 2"],
  lista: ["M10 6h10", "M10 12h10", "M10 18h10", "m3.5 6 1.3 1.3L7 5", "m3.5 12 1.3 1.3L7 11", "m3.5 18 1.3 1.3L7 17"],
  chat: ["M20.5 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 20.5 12Z"],
  escudo: ["M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6l-7-3Z", "m9 12 2 2 4-4"],
  balanca: ["M12 4v16", "M8 20h8", "M5 7h14", "M5 7l-2.5 6a2.8 2.8 0 0 0 5 0L5 7Z", "M19 7l-2.5 6a2.8 2.8 0 0 0 5 0L19 7Z"],
  acessivel: ["M12 3.3a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z", "M4.5 9c2.5.7 5 1 7.5 1s5-.3 7.5-1", "M12 10v4.5l-3 6", "M12 14.5l3 6"],
  cadeado: ["M6 11h12v9H6v-9Z", "M8.5 11V8a3.5 3.5 0 0 1 7 0v3"],
  voltar: ["M19 12H5", "m11 6-6 6 6 6"],
  seta: ["M5 12h14", "m13 6 6 6-6 6"],
  som: ["M4 9h4l5-4v14l-5-4H4V9Z", "M16.5 8.5a5 5 0 0 1 0 7", "M19 6a8.5 8.5 0 0 1 0 12"],
  impressora: ["M7 8V3h10v5", "M6 17H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-2", "M7 14h10v7H7v-7Z"],
  expandir: ["m7 9 5-5 5 5", "m7 15 5 5 5-5"],
  recolher: ["m7 4 5 5 5-5", "m7 20 5-5 5 5"],
  fechar: ["M6 6l12 12", "M18 6 6 18"],
  check: ["m5 12.5 4.5 4.5L19 7.5"],
  olho: ["M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z", "M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"],
  microfone: ["M9 6a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V6Z", "M5.5 11a6.5 6.5 0 0 0 13 0", "M12 17.5V21"],
  enviar: ["M4 12 20 4l-4.5 16-3.5-6.5L4 12Z", "m12 13.5 8-9.5"],
};

function criarIcone(nome) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "icone");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  (ICONES[nome] || ICONES.atencao).forEach((desenho) => {
    const caminho = document.createElementNS("http://www.w3.org/2000/svg", "path");
    caminho.setAttribute("d", desenho);
    caminho.setAttribute("fill", "none");
    caminho.setAttribute("stroke", "currentColor");
    caminho.setAttribute("stroke-width", "1.8");
    caminho.setAttribute("stroke-linecap", "round");
    caminho.setAttribute("stroke-linejoin", "round");
    svg.appendChild(caminho);
  });
  return svg;
}

function preencherIcones(raiz = document) {
  raiz.querySelectorAll("[data-icone]").forEach((no) => {
    if (!no.querySelector("svg")) no.prepend(criarIcone(no.dataset.icone));
  });
}

const iconeAbrir = () => el("span", { classe: "icone-abrir", "aria-hidden": "true" });

/* ---------- movimento ---------- */

async function animarTitulo() {
  const alvo = $("titulo-digitado");
  const texto = alvo.dataset.texto;
  if (movimentoReduzido()) {
    alvo.classList.add("concluido");
    return;
  }
  alvo.textContent = "";
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch { /* segue */ }
  await esperar(650);
  let letras = 0;
  const relogio = setInterval(() => {
    letras += 1;
    alvo.textContent = texto.slice(0, letras);
    if (letras >= texto.length) {
      clearInterval(relogio);
      setTimeout(() => alvo.classList.add("concluido"), 2200);
    }
  }, 50);
}

function trocarTextoSuave(elemento, texto) {
  if (movimentoReduzido() || elemento.textContent === texto) {
    elemento.textContent = texto;
    return;
  }
  elemento.classList.add("trocando");
  setTimeout(() => {
    elemento.textContent = texto;
    elemento.classList.remove("trocando");
  }, 150);
}

// Números do placar sobem de 0 até o total, em 0,7 s.
function contarAte(no, alvo) {
  if (movimentoReduzido() || alvo <= 1) {
    no.textContent = String(alvo);
    return;
  }
  const inicio = performance.now();
  const passo = (agora) => {
    const t = Math.min(1, (agora - inicio) / 700);
    no.textContent = String(Math.round(alvo * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(passo);
  };
  no.textContent = "0";
  requestAnimationFrame(passo);
}

/* ==========================================================================
   Telas — uma de cada vez, com transição suave entre elas.
   ========================================================================== */

const TELAS = {
  inicio: "tela-inicio",
  casos: "tela-casos",
  documentos: "tela-documentos",
  progresso: "secao-progresso",
  erro: "secao-erro",
  relatorio: "secao-relatorio",
};

function trocarTela(nome, depois) {
  const aplicar = () => {
    Object.entries(TELAS).forEach(([chave, id]) => { $(id).hidden = chave !== nome; });
    document.body.dataset.tela = nome;
    window.scrollTo({ top: 0, behavior: "instant" });
    if (depois) depois();
  };
  if (document.startViewTransition && !movimentoReduzido()) document.startViewTransition(aplicar);
  else aplicar();
}

function irParaCasos() {
  modo = "demo";
  trocarTela("casos", () => $("titulo-casos").focus({ preventScroll: true }));
}

function irParaDocumentos() {
  modo = "chave";
  trocarTela("documentos", () => $("titulo-documentos").focus({ preventScroll: true }));
}

function acompanharAlturaDoTopo() {
  const topo = document.querySelector(".topo");
  const atualizar = () => document.documentElement.style.setProperty("--altura-topo", `${topo.offsetHeight}px`);
  atualizar();
  if ("ResizeObserver" in window) new ResizeObserver(atualizar).observe(topo);
}

function mostrarErro(id, mensagem, focarEm) {
  const erro = $(id);
  erro.textContent = mensagem;
  erro.hidden = false;
  if (focarEm) focarEm.focus();
}

const esconderErro = (id) => { $(id).hidden = true; };

/* ---------- janelas (<dialog> nativo: foco preso e Esc para fechar) ---------- */

function abrirDialogo(dialogo, focarEm) {
  if (typeof dialogo.showModal === "function") dialogo.showModal();
  else dialogo.setAttribute("open", "");
  if (focarEm) focarEm.focus();
}

function configurarDialogos() {
  document.querySelectorAll("dialog.dialogo").forEach((dialogo) => {
    dialogo.addEventListener("click", (evento) => { if (evento.target === dialogo) dialogo.close(); });
    dialogo.querySelectorAll("[data-fechar]").forEach((botao) => botao.addEventListener("click", () => dialogo.close()));
  });
}

/* ==========================================================================
   Acessibilidade — preferências salvas no navegador da própria pessoa.
   ========================================================================== */

const CHAVE_PREFERENCIAS = "adversia:acessibilidade";
const ESCALAS = [0.9, 1, 1.15, 1.3, 1.5, 1.75];
const PREFERENCIAS_PADRAO = { tema: "auto", escala: 1, contraste: false, espacamento: false, semAnimacoes: false };

function lerPreferencias() {
  try {
    return Object.assign({}, PREFERENCIAS_PADRAO, JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS) || "{}"));
  } catch {
    return Object.assign({}, PREFERENCIAS_PADRAO);
  }
}

let preferencias = lerPreferencias();

function salvarPreferencias() {
  try { localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(preferencias)); } catch { /* navegação privada */ }
}

function aplicarPreferencias() {
  const raiz = document.documentElement;
  if (preferencias.tema === "claro") raiz.setAttribute("data-theme", "light");
  else if (preferencias.tema === "escuro") raiz.setAttribute("data-theme", "dark");
  else raiz.removeAttribute("data-theme");

  raiz.toggleAttribute("data-contraste", preferencias.contraste);
  if (preferencias.contraste) raiz.setAttribute("data-contraste", "alto");
  raiz.toggleAttribute("data-espacamento", preferencias.espacamento);
  if (preferencias.espacamento) raiz.setAttribute("data-espacamento", "amplo");
  raiz.toggleAttribute("data-movimento", preferencias.semAnimacoes);
  if (preferencias.semAnimacoes) raiz.setAttribute("data-movimento", "reduzido");

  raiz.style.setProperty("--escala", preferencias.escala);
  $("valor-tamanho").textContent = `${Math.round(preferencias.escala * 100)}%`;
  $("diminuir-texto").disabled = preferencias.escala <= ESCALAS[0];
  $("aumentar-texto").disabled = preferencias.escala >= ESCALAS[ESCALAS.length - 1];

  document.querySelectorAll("[data-tema]").forEach((botao) => {
    botao.setAttribute("aria-checked", String(botao.dataset.tema === preferencias.tema));
  });
  $("alto-contraste").checked = preferencias.contraste;
  $("espacamento-amplo").checked = preferencias.espacamento;
  $("reduzir-animacoes").checked = preferencias.semAnimacoes;
}

function atualizarPreferencia(mudanca) {
  preferencias = Object.assign({}, preferencias, mudanca);
  salvarPreferencias();
  aplicarPreferencias();
}

function mudarEscala(direcao) {
  const indiceAtual = ESCALAS.findIndex((e) => e >= preferencias.escala - 0.001);
  const proximo = Math.min(ESCALAS.length - 1, Math.max(0, (indiceAtual === -1 ? 1 : indiceAtual) + direcao));
  atualizarPreferencia({ escala: ESCALAS[proximo] });
}

function configurarPainelAcessibilidade() {
  const botaoAbrir = $("abrir-acessibilidade");
  const painel = $("painel-acessibilidade");
  const abrir = (abrirPainel) => {
    painel.hidden = !abrirPainel;
    botaoAbrir.setAttribute("aria-expanded", String(abrirPainel));
    if (abrirPainel) $("diminuir-texto").focus();
  };

  botaoAbrir.addEventListener("click", () => abrir(painel.hidden));
  $("fechar-acessibilidade").addEventListener("click", () => { abrir(false); botaoAbrir.focus(); });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !painel.hidden) { abrir(false); botaoAbrir.focus(); }
  });
  $("diminuir-texto").addEventListener("click", () => mudarEscala(-1));
  $("aumentar-texto").addEventListener("click", () => mudarEscala(1));
  document.querySelectorAll("[data-tema]").forEach((botao) => {
    botao.addEventListener("click", () => atualizarPreferencia({ tema: botao.dataset.tema }));
  });
  $("alto-contraste").addEventListener("change", (e) => atualizarPreferencia({ contraste: e.target.checked }));
  $("espacamento-amplo").addEventListener("change", (e) => atualizarPreferencia({ espacamento: e.target.checked }));
  $("reduzir-animacoes").addEventListener("change", (e) => atualizarPreferencia({ semAnimacoes: e.target.checked }));
  $("restaurar-acessibilidade").addEventListener("click", () => {
    atualizarPreferencia(Object.assign({}, PREFERENCIAS_PADRAO));
    anunciar("Configurações de acessibilidade restauradas.");
  });
  aplicarPreferencias();
}

/* ==========================================================================
   Escolha do caso (demonstração)
   ========================================================================== */

async function carregarExemplos() {
  try {
    const resposta = await fetch("demo/indice.json");
    if (!resposta.ok) throw new Error(`indice ${resposta.status}`);
    exemplos = await resposta.json();
    if (!exemplos.length) throw new Error("indice vazio");
    renderizarFiltroTipos();
    renderizarCasos();
  } catch (erro) {
    // Os casos são o conteúdo principal da demonstração: sem eles, avisar em vez de deixar a tela vazia.
    console.warn("Casos de demonstração indisponíveis:", erro);
    mostrarErro("erro-casos", "Não conseguimos carregar os casos. Recarregue a página em instantes.");
  }
}

function renderizarFiltroTipos() {
  const contagem = new Map();
  exemplos.forEach((exemplo) => contagem.set(exemplo.tipo, (contagem.get(exemplo.tipo) || 0) + 1));
  const opcoes = [["", "Todos", exemplos.length], ...Array.from(contagem, ([tipo, total]) => [tipo, tipo, total])];
  $("filtro-tipos").replaceChildren(
    ...opcoes.map(([valor, rotulo, total]) => {
      const chip = el("button", { type: "button", classe: "chip", "aria-pressed": String(valor === tipoAtivo), "data-tipo": valor }, [
        el("span", { texto: rotulo }),
        el("span", { classe: "chip-contagem", texto: String(total) }),
      ]);
      chip.addEventListener("click", () => {
        tipoAtivo = valor;
        document.querySelectorAll("#filtro-tipos .chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        renderizarCasos();
        anunciar(`${total} ${plural(total, ["caso", "casos"])}.`);
      });
      return chip;
    })
  );
}

function renderizarCasos() {
  const visiveis = exemplos.filter((exemplo) => !tipoAtivo || exemplo.tipo === tipoAtivo);
  $("grade-casos").replaceChildren(
    ...visiveis.map((exemplo, i) => {
      const escolhido = Boolean(exemploEscolhido && exemploEscolhido.id === exemplo.id);
      const cartao = el("button", { type: "button", classe: "cartao-caso", "aria-pressed": String(escolhido), "data-caso": exemplo.id }, [
        el("span", { classe: "cartao-caso-tipo", texto: exemplo.tipo }),
        el("span", { classe: "cartao-caso-titulo", texto: exemplo.titulo }),
        el("span", { classe: "cartao-caso-descricao", texto: exemplo.descricao }),
        el("span", { classe: "cartao-caso-marca", "aria-hidden": "true" }, [criarIcone("check")]),
      ]);
      cartao.style.setProperty("--ordem", String(Math.min(i, 16)));
      cartao.addEventListener("click", () => escolherCaso(exemplo, cartao));
      return el("li", {}, [cartao]);
    })
  );
}

async function escolherCaso(exemplo, cartao) {
  exemploEscolhido = exemplo;
  document.querySelectorAll(".cartao-caso").forEach((c) => c.setAttribute("aria-pressed", String(c === cartao)));
  $("caso-escolhido-titulo").textContent = exemplo.titulo;
  $("barra-caso").hidden = false;
  $("analisar-caso").disabled = true;
  $("ver-documentos").disabled = true;
  esconderErro("erro-casos");
  try {
    const resposta = await fetch(`demo/casos/${encodeURIComponent(exemplo.id)}.json`);
    if (!resposta.ok) throw new Error();
    const caso = await resposta.json();
    if (exemploEscolhido !== exemplo) return; // outro caso foi escolhido enquanto este carregava
    casoDemo = caso;
    $("analisar-caso").disabled = false;
    $("ver-documentos").disabled = false;
    anunciar(`Caso escolhido: ${exemplo.titulo}.`);
  } catch {
    casoDemo = null;
    mostrarErro("erro-casos", "Não conseguimos carregar este caso. Tente de novo.");
  }
}

function mostrarDocumentosDoCaso() {
  if (!casoDemo) return;
  $("titulo-dialogo-documentos").textContent = casoDemo.titulo;
  $("dialogo-tese").textContent = casoDemo.tese;
  $("dialogo-lista-docs").replaceChildren(
    ...casoDemo.documentos.map((doc) =>
      el("details", { classe: "documento recolhivel" }, [
        el("summary", {}, [criarIcone("documento"), el("span", { texto: doc.nome }), iconeAbrir()]),
        el("pre", { classe: "documento-conteudo", texto: doc.conteudo }),
      ])
    )
  );
  const dialogo = $("dialogo-documentos");
  abrirDialogo(dialogo, dialogo.querySelector("[data-fechar]"));
}

/* ==========================================================================
   Área da gestão e envio de documentos (ADR-015)
   ========================================================================== */

function abrirAreaGestao() {
  if (codigoGestao) {
    irParaDocumentos();
    return;
  }
  esconderErro("gestao-erro");
  $("codigo-gestao").value = "";
  abrirDialogo($("dialogo-gestao"), $("codigo-gestao"));
}

async function entrarGestao(evento) {
  evento.preventDefault();
  const campo = $("codigo-gestao");
  const codigo = campo.value.trim();
  esconderErro("gestao-erro");
  if (!codigo) {
    mostrarErro("gestao-erro", "Digite o código de acesso da gestão.", campo);
    return;
  }
  const botao = $("entrar-gestao");
  botao.disabled = true;
  try {
    let resposta;
    try {
      resposta = await fetch("api/gestao", { method: "POST", headers: { "X-Codigo-Gestao": codigo } });
    } catch {
      throw new Error(MENSAGEM_SEM_CONEXAO);
    }
    const dados = await lerJson(resposta);
    if (!resposta.ok) throw new Error(dados.erro || MENSAGEM_FALHA_PADRAO);
    codigoGestao = codigo;
    campo.value = "";
    $("botao-gestao-rotulo").textContent = "Analisar documentos";
    $("dialogo-gestao").close();
    anunciar("Acesso da gestão liberado.");
    irParaDocumentos();
  } catch (falha) {
    mostrarErro("gestao-erro", falha.message || MENSAGEM_FALHA_PADRAO, campo);
  } finally {
    botao.disabled = false;
  }
}

function formatarTamanho(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function renderizarArquivos() {
  const lista = $("lista-arquivos");
  lista.replaceChildren(
    ...Array.from(arquivos.values(), (arquivo) => {
      const remover = el("button", { type: "button", classe: "arquivo-remover", "aria-label": `Remover ${arquivo.name}`, texto: "Remover" });
      remover.addEventListener("click", () => {
        arquivos.delete(arquivo.name);
        renderizarArquivos();
        anunciar(`${arquivo.name} removido.`);
        $("documentos").focus();
      });
      return el("li", {}, [
        el("span", {}, [el("span", { classe: "arquivo-nome", texto: arquivo.name }), el("span", { classe: "arquivo-tamanho", texto: formatarTamanho(arquivo.size) })]),
        remover,
      ]);
    })
  );
}

function adicionarArquivos(lista) {
  const novos = Array.from(lista || []);
  novos.forEach((arquivo) => arquivos.set(arquivo.name, arquivo));
  renderizarArquivos();
  if (novos.length) {
    esconderErro("erro-formulario");
    anunciar(`${novos.length} ${plural(novos.length, ["documento adicionado", "documentos adicionados"])}.`);
  }
}

function configurarEnvioDeArquivos() {
  const entrada = $("documentos");
  const zona = $("zona-arquivos");
  entrada.addEventListener("change", () => {
    adicionarArquivos(entrada.files);
    entrada.value = "";
  });
  ["dragenter", "dragover"].forEach((tipo) =>
    zona.addEventListener(tipo, (evento) => { evento.preventDefault(); zona.classList.add("arrastando"); })
  );
  ["dragleave", "drop"].forEach((tipo) => zona.addEventListener(tipo, () => zona.classList.remove("arrastando")));
  zona.addEventListener("drop", (evento) => {
    evento.preventDefault();
    adicionarArquivos(evento.dataTransfer.files);
  });
}

function validarFormulario() {
  if (!codigoGestao) {
    mostrarErro("erro-formulario", "A análise com documentos está disponível só para a gestão.", $("botao-gestao"));
    return null;
  }
  const tese = $("tese").value.trim();
  if (arquivos.size === 0) {
    mostrarErro("erro-formulario", "Envie pelo menos um documento do caso.", $("documentos"));
    return null;
  }
  if (!tese) {
    mostrarErro("erro-formulario", "Descreva a tese que você quer testar.", $("tese"));
    return null;
  }
  const chave = $("chave-anthropic").value.trim();
  if (!chave) {
    mostrarErro("erro-formulario", "Informe a chave da Anthropic para fazer a análise.", $("chave-anthropic"));
    return null;
  }
  if (!/^sk-ant-/.test(chave)) {
    mostrarErro("erro-formulario", "Essa não parece uma chave da Anthropic. Ela começa com “sk-ant-”.", $("chave-anthropic"));
    return null;
  }
  if (!$("confirmacao-dados").checked) {
    mostrarErro("erro-formulario", "Confirme que os documentos são fictícios ou anonimizados.", $("confirmacao-dados"));
    return null;
  }
  return tese;
}

/* ==========================================================================
   Análise: progresso e resultado
   ========================================================================== */

function renderizarEtapas(etapaAtual, concluida) {
  const lista = $("etapas");
  if (lista.children.length !== ETAPAS.length) {
    lista.replaceChildren(
      ...ETAPAS.map((texto) =>
        el("li", { classe: "etapa", "data-estado": "aguardando" }, [
          el("span", { classe: "etapa-marcador", "aria-hidden": "true" }),
          el("span", { classe: "etapa-texto", texto }),
          el("span", { classe: "visualmente-oculto etapa-situacao", texto: ", aguardando" }),
        ])
      )
    );
  }
  Array.from(lista.children).forEach((item, i) => {
    const numero = i + 1;
    let situacao = "aguardando";
    if (concluida || numero < etapaAtual) situacao = "concluida";
    else if (numero === etapaAtual) situacao = "andamento";
    if (item.dataset.estado === situacao) return;
    item.dataset.estado = situacao;
    item.querySelector(".etapa-marcador").textContent = situacao === "concluida" ? "✓" : "";
    item.querySelector(".etapa-situacao").textContent =
      situacao === "concluida" ? ", concluída" : situacao === "andamento" ? ", em andamento" : ", aguardando";
    if (situacao === "andamento") anunciar(`Etapa ${numero} de ${ETAPAS.length}: ${ETAPAS[i]}.`);
  });
  const feitas = concluida ? ETAPAS.length : Math.max(0, etapaAtual - 1);
  const avanco = concluida ? 100 : ((feitas + 0.5) / ETAPAS.length) * 100;
  $("barra-progresso-preenchimento").style.width = `${avanco}%`;
  $("barra-progresso").setAttribute("aria-valuenow", String(feitas));
  trocarTextoSuave($("etapa-atual"), concluida ? "Relatório pronto" : ETAPAS[etapaAtual - 1]);
}

function mostrarProgresso(apoio) {
  $("apoio-progresso").textContent = apoio;
  $("etapas").replaceChildren();
  $("etapa-atual").textContent = "";
  renderizarEtapas(1, false);
  trocarTela("progresso", () => $("titulo-progresso").focus({ preventScroll: true }));
}

function mostrarFalha(erro) {
  $("erro-texto").textContent = erro.message || MENSAGEM_FALHA_PADRAO;
  trocarTela("erro", () => $("titulo-erro").focus({ preventScroll: true }));
}

async function analisarCasoDemo() {
  if (!casoDemo) {
    mostrarErro("erro-casos", "Escolha um caso para continuar.");
    return;
  }
  modo = "demo";
  const botao = $("analisar-caso");
  botao.disabled = true;
  try {
    mostrarProgresso("Demonstração com análise preparada previamente.");
    for (let etapa = 1; etapa <= ETAPAS.length; etapa += 1) {
      renderizarEtapas(etapa, false);
      await esperar(movimentoReduzido() ? 250 : DURACAO_ETAPAS_DEMO[etapa - 1]);
    }
    renderizarEtapas(ETAPAS.length, true);
    await esperar(movimentoReduzido() ? 50 : 450);
    contextoReal = null;
    renderizarRelatorio(casoDemo.relatorio);
  } catch (erro) {
    mostrarFalha(erro);
  } finally {
    botao.disabled = false;
  }
}

async function analisarDocumentos(evento) {
  evento.preventDefault();
  esconderErro("erro-formulario");
  const tese = validarFormulario();
  if (tese === null) return;
  modo = "chave";
  const chave = $("chave-anthropic").value.trim();
  const dadosFormulario = new FormData();
  for (const arquivo of arquivos.values()) dadosFormulario.append("documentos", arquivo, arquivo.name);
  dadosFormulario.append("tese", tese);

  const botao = $("botao-analisar");
  botao.disabled = true;
  mostrarProgresso("Costuma levar de 2 a 3 minutos.");
  // A análise real roda numa única chamada; a tela avança pelas etapas no tempo típico de cada uma.
  const inicio = Date.now();
  const relogio = setInterval(() => {
    const segundos = (Date.now() - inicio) / 1000;
    renderizarEtapas(INICIO_ETAPAS_REAL.filter((s) => segundos >= s).length, false);
  }, 1000);
  try {
    let resposta;
    try {
      resposta = await fetch("api/analisar", {
        method: "POST",
        headers: { "X-Anthropic-Key": chave, "X-Codigo-Gestao": codigoGestao },
        body: dadosFormulario,
      });
    } catch {
      throw new Error(MENSAGEM_SEM_CONEXAO);
    }
    const dados = await lerJson(resposta);
    if (!resposta.ok) throw new Error(dados.erro || MENSAGEM_FALHA_PADRAO);
    renderizarEtapas(ETAPAS.length, true);
    contextoReal = { documentos: dados.documentos, tese: dados.tese, chave, codigo: codigoGestao };
    renderizarRelatorio(dados.relatorio);
  } catch (erro) {
    mostrarFalha(erro);
  } finally {
    clearInterval(relogio);
    botao.disabled = false;
  }
}

/* ==========================================================================
   Relatório
   ========================================================================== */

let nomesDosAchados = new Map();
const ABAS = ["pontos", "linha", "plano", "audiencia"];

function idDoAchado(id) {
  return `achado-${String(id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

/* ---------- seções que abrem e fecham (padrão accordion do W3C) ---------- */

function criarSecaoRecolhivel({ id, nivel, titulo, contagem, descricao, classe, aberta, conteudo, icone }) {
  const idCorpo = `${id}-corpo`;
  const botao = el("button", { type: "button", classe: "secao-alternar", "aria-expanded": String(aberta), "aria-controls": idCorpo }, [
    icone ? el("span", { classe: "secao-icone", "aria-hidden": "true" }, [criarIcone(icone)]) : el("span", { classe: "secao-marca", "aria-hidden": "true" }),
    el("span", { classe: "secao-titulo", texto: titulo }),
    contagem === undefined ? null : el("span", { classe: "secao-contagem", texto: String(contagem) }),
    iconeAbrir(),
  ]);
  const corpo = el("div", { classe: "secao-corpo", id: idCorpo, "data-aberta": String(aberta) }, [
    el("div", { classe: "secao-corpo-interno" }, [descricao ? el("p", { classe: "secao-descricao", texto: descricao }) : null, conteudo]),
  ]);
  corpo.inert = !aberta;
  const secao = el("section", { classe: `secao-recolhivel ${classe}`, id: `${id}-secao`, "aria-labelledby": id }, [
    el(nivel, { classe: "secao-cabecalho", id }, [botao]),
    corpo,
  ]);
  botao.addEventListener("click", () => abrirSecao(secao, !secaoAberta(secao)));
  return secao;
}

const secaoAberta = (secao) => secao.querySelector(".secao-corpo").dataset.aberta === "true";

function abrirSecao(secao, abrir) {
  secao.querySelector(".secao-alternar").setAttribute("aria-expanded", String(abrir));
  const corpo = secao.querySelector(".secao-corpo");
  corpo.dataset.aberta = String(abrir);
  corpo.inert = !abrir;
}

function alternarTudo(container, abrir) {
  container.querySelectorAll(".secao-recolhivel").forEach((secao) => abrirSecao(secao, abrir));
  container.querySelectorAll("details.recolhivel").forEach((detalhe) => { detalhe.open = abrir; });
  anunciar(abrir ? "Todos os itens foram abertos." : "Todos os itens foram recolhidos.");
}

function configurarControlesRecolher() {
  document.querySelectorAll(".controles-recolher").forEach((grupo) => {
    grupo.querySelectorAll("button").forEach((botao) => {
      botao.addEventListener("click", () => alternarTudo($(grupo.dataset.alvo), botao.dataset.abrir === "true"));
    });
  });
}

/* ---------- documento para impressão e PDF (ADR-022) ----------
   Na impressão (botão ou Ctrl+P) sai um documento formal, com linguagem técnica e sem os
   elementos visuais da página. */

let relatorioAtual = null;
let tituloDaPagina = null;

const CATEGORIA_TECNICA = {
  vulnerabilidade_critica: "Vulnerabilidade crítica",
  vulnerabilidade_media: "Vulnerabilidade moderada",
  contradicao: "Contradição",
  lacuna_probatoria: "Lacuna probatória",
  contra_argumento: "Contra-argumento",
  pergunta_dificil: "Pergunta de audiência",
};
const SECAO_TECNICA = {
  criticos: "Vulnerabilidades críticas e moderadas",
  contradicoes: "Contradições entre documentos",
  lacunas: "Lacunas probatórias",
  argumentos: "Contra-argumentos da parte adversa",
  perguntas: "Perguntas prováveis em audiência",
};
const ORIGEM_TECNICA = {
  FACT: "fato documentado",
  SOURCE: "fonte citada nos autos",
  INFERENCE: "inferência a partir dos documentos",
  ADVERSARIAL_HYPOTHESIS: "hipótese adversarial",
  UNVERIFIED: "não verificado nos documentos",
};
const PRIORIDADE_TECNICA = { alta: "Alta", media: "Média", baixa: "Baixa" };

function tabelaImpressao(cabecalhos, linhas, classe = "") {
  // Sem cabeçalho, a primeira coluna rotula a linha (tabela de identificação).
  const celula = (texto, i) => (cabecalhos ? el("td", { texto }) : el(i === 0 ? "th" : "td", { scope: i === 0 ? "row" : null, texto }));
  return el("table", { classe: `di-tabela ${classe}`.trim() }, [
    cabecalhos ? el("thead", {}, [el("tr", {}, cabecalhos.map((texto) => el("th", { scope: "col", texto })))]) : null,
    el("tbody", {}, linhas.map((celulas) => el("tr", {}, celulas.map(celula)))),
  ]);
}

// "Lemos 2 documentos e identificamos 3 partes, ..." → "2 documentos analisados; 3 partes, ... identificados."
function resumoTecnico(resumo) {
  if (!resumo) return "—";
  const partes = resumo.match(/^Lemos (.+?) e identificamos (.+?)\.?$/);
  if (!partes) return resumo;
  return `${partes[1]} ${/^1 /.test(partes[1]) ? "analisado" : "analisados"}; ${partes[2]} identificados.`;
}

function montarDocumentoImpressao() {
  const relatorio = relatorioAtual;
  const destino = $("documento-impressao");
  if (!relatorio) {
    destino.replaceChildren();
    return;
  }
  const demonstracao = !contextoReal;
  const tituloCaso = demonstracao && casoDemo ? casoDemo.titulo : "Caso analisado";
  const emissao = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const achados = relatorio.findings || [];
  const secoes = [];
  let numeroSecao = 0;
  const secao = (titulo) => { numeroSecao += 1; secoes.push(el("h2", { texto: `${numeroSecao}. ${titulo}` })); return numeroSecao; };

  // 1. Identificação
  secao("Identificação");
  secoes.push(tabelaImpressao(null, [
    ["Caso", tituloCaso],
    ["Natureza", demonstracao ? "Demonstração com caso fictício (análise preparada previamente)" : "Análise de documentos enviados"],
    ["Documentos", resumoTecnico(relatorio.resumo_do_caso)],
    ["Emissão", emissao],
  ], "di-meta"));

  // 2. Tese
  secao("Tese submetida à revisão");
  secoes.push(el("p", { texto: relatorio.tese_analisada || "—" }));

  // 3. Síntese
  const porGrupo = Object.fromEntries(GRUPOS.map((g) => [g.id, []]));
  achados.forEach((achado) => {
    const categoria = CATEGORIAS[achado.categoria];
    if (categoria) porGrupo[categoria.grupo].push(achado);
  });
  const eventos = relatorio.linha_do_tempo || [];
  const provas = Array.isArray(relatorio.plano_de_provas) ? relatorio.plano_de_provas : [];
  secao("Síntese");
  secoes.push(tabelaImpressao(["Item", "Quantidade"], [
    ...GRUPOS.filter((g) => porGrupo[g.id].length).map((g) => [SECAO_TECNICA[g.id], String(porGrupo[g.id].length)]),
    ["Fatos datados na cronologia", String(eventos.length)],
    ["Divergências de versão na cronologia", String(eventos.filter((e) => e.divergencia).length)],
    ["Diligências probatórias recomendadas", String(provas.length)],
  ]));

  // 4. Vulnerabilidades
  const numeroVulnerabilidades = secao("Vulnerabilidades identificadas");
  const codigos = new Map();
  let subsecao = 0;
  GRUPOS.forEach((grupo) => {
    const itens = porGrupo[grupo.id];
    if (!itens.length) return;
    subsecao += 1;
    secoes.push(el("h3", { texto: `${numeroVulnerabilidades}.${subsecao} ${SECAO_TECNICA[grupo.id]}` }));
    itens.forEach((achado, i) => {
      const codigo = `${numeroVulnerabilidades}.${subsecao}.${i + 1}`;
      codigos.set(achado.id, codigo);
      const fundamentos = (achado.origem || []).map((citacao) =>
        el("li", { texto: `${citacao.documento}: “${citacao.trecho || ""}”${citacao.conferido === true ? " (trecho conferido)" : citacao.conferido === false ? " (trecho não localizado literalmente)" : ""}` })
      );
      secoes.push(
        el("div", { classe: "di-item" }, [
          el("p", {}, [
            el("span", { classe: "di-item-codigo", texto: codigo }),
            document.createTextNode(`${achado.texto} `),
            el("span", { classe: "di-qualificacao", texto: `[${CATEGORIA_TECNICA[achado.categoria] || "Apontamento"}; ${ORIGEM_TECNICA[achado.provenance] || ORIGEM_TECNICA.UNVERIFIED}]` }),
          ]),
          fundamentos.length ? el("ul", { classe: "di-fundamentos" }, fundamentos) : null,
        ])
      );
    });
  });
  if (!achados.length) secoes.push(el("p", { texto: "Não foram identificadas vulnerabilidades com base nos documentos." }));

  // 5. Cronologia
  secao("Cronologia dos fatos");
  secoes.push(
    eventos.length
      ? tabelaImpressao(["Data", "Fato", "Fonte", "Divergência"], eventos.map((e) => [e.data, e.evento, [e.documento, e.quem_afirma].filter(Boolean).join(" — "), e.divergencia || "—"]))
      : el("p", { texto: "Os documentos não apresentam datas suficientes para a cronologia." })
  );

  // 6. Plano de provas
  secao("Plano de diligências probatórias");
  if (provas.length) {
    const ordenadas = PRIORIDADES.flatMap(([chave]) => provas.filter((p) => p.prioridade === chave));
    secoes.push(tabelaImpressao(["Prioridade", "Prova", "Finalidade", "Meio de obtenção", "Itens relacionados"], ordenadas.map((p) => [
      PRIORIDADE_TECNICA[p.prioridade] || "—",
      p.prova,
      p.finalidade || "—",
      p.como_obter || "—",
      (p.apontamentos || []).map((id) => codigos.get(id)).filter(Boolean).join(", ") || "—",
    ])));
  } else {
    secoes.push(el("p", { texto: Array.isArray(relatorio.plano_de_provas) ? "Nenhuma diligência adicional recomendada." : "Plano de provas indisponível nesta análise." }));
  }

  secoes.push(el("p", { classe: "di-nota", texto: "Trechos marcados como conferidos foram localizados literalmente no texto do documento indicado." }));

  destino.replaceChildren(
    el("header", { classe: "di-cabecalho" }, [
      el("p", { classe: "di-marca", texto: "AdversIA" }),
      el("h1", { classe: "di-titulo", texto: "Relatório de revisão adversarial" }),
      el("p", { classe: "di-subtitulo", texto: tituloCaso }),
    ]),
    ...secoes
  );
}

function prepararImpressao() {
  montarDocumentoImpressao();
  // O navegador pode disparar beforeprint mais de uma vez; guarda só o título original.
  if (tituloDaPagina === null) tituloDaPagina = document.title;
  if (relatorioAtual) {
    const nome = !contextoReal && casoDemo ? casoDemo.titulo : "Caso analisado";
    document.title = `AdversIA - Relatório - ${nome}`;
  }
}

function concluirImpressao() {
  if (tituloDaPagina === null) return;
  document.title = tituloDaPagina;
  tituloDaPagina = null;
}

function rolarAte(elemento, bloco = "start") {
  elemento.scrollIntoView({ behavior: movimentoReduzido() ? "auto" : "smooth", block: bloco });
}

function irParaGrupo(idGrupo) {
  const secao = $(`grupo-${idGrupo}-secao`);
  if (!secao) return;
  abrirSecao(secao, true);
  rolarAte(secao);
  secao.querySelector(".secao-alternar").focus({ preventScroll: true });
}

// Resultado da conferência feita pelo servidor: o trecho existe (ou não) no documento enviado.
function seloConferencia(conferido) {
  if (conferido === true) return el("span", { classe: "selo-conferido", texto: "✓ Trecho conferido no documento" });
  if (conferido === false) return el("span", { classe: "selo-confira", texto: "Não localizamos este trecho exato — confira" });
  return null;
}

function listaDeOrigens(citacoes, titulo = "Onde está nos documentos") {
  return el("div", { classe: "origens" }, [
    el("p", { classe: "origens-titulo", texto: titulo }),
    el("ul", {}, citacoes.map((citacao) =>
      el("li", { classe: "origem" }, [
        el("span", { classe: "origem-linha" }, [el("span", { classe: "origem-documento", texto: citacao.documento }), seloConferencia(citacao.conferido)]),
        citacao.trecho ? el("span", { classe: "origem-trecho", texto: `“${citacao.trecho}”` }) : null,
      ])
    )),
  ]);
}

function renderizarAchado(achado) {
  const categoria = CATEGORIAS[achado.categoria] || { rotulo: "Apontamento" };
  const origem = ORIGENS[achado.provenance] || ORIGENS.UNVERIFIED;
  const corpo = el("div", { classe: "achado-corpo" }, [achado.origem && achado.origem.length ? listaDeOrigens(achado.origem) : null]);

  // Recolhido, mostra a categoria, a etiqueta e o começo do texto; aberto, o texto inteiro e os trechos.
  const cartao = el("details", { classe: "achado recolhivel", id: idDoAchado(achado.id), tabindex: "-1" }, [
    el("summary", { classe: "achado-resumo" }, [
      el("span", { classe: "achado-topo" }, [
        el("span", { classe: "achado-categoria" }, [criarIcone(categoria.icone), el("span", { texto: nomesDosAchados.get(achado.id) || categoria.rotulo })]),
        el("span", { classe: `etiqueta ${origem.classe}`, texto: origem.rotulo }),
      ]),
      el("span", { classe: "achado-texto", texto: achado.texto }),
      iconeAbrir(),
    ]),
    corpo,
  ]);
  return el("li", {}, [cartao]);
}

function renderizarRelatorio(relatorio) {
  pararLeitura();
  relatorioAtual = relatorio;
  const achados = relatorio.findings || [];

  // "Falta de prova 2", "Contradição 1"...: o mesmo nome aparece no cartão e nos vínculos do plano.
  nomesDosAchados = new Map();
  const contagemPorCategoria = {};
  achados.forEach((achado) => {
    const categoria = CATEGORIAS[achado.categoria];
    if (!categoria) return;
    contagemPorCategoria[achado.categoria] = (contagemPorCategoria[achado.categoria] || 0) + 1;
    nomesDosAchados.set(achado.id, `${categoria.rotulo} ${contagemPorCategoria[achado.categoria]}`);
  });

  $("selo-demo").hidden = contextoReal !== null;
  $("titulo-relatorio").textContent = !contextoReal && casoDemo ? casoDemo.titulo : "Seu caso";
  $("resumo-caso").textContent = relatorio.resumo_do_caso;
  $("tese-analisada").textContent = relatorio.tese_analisada;
  document.querySelector(".tese-analisada").open = false;

  const porGrupo = Object.fromEntries(GRUPOS.map((g) => [g.id, []]));
  achados.forEach((achado) => {
    const categoria = CATEGORIAS[achado.categoria];
    if (categoria) porGrupo[categoria.grupo].push(achado);
  });

  $("placar").replaceChildren(
    ...GRUPOS.filter((g) => g.placar).map((grupo) => {
      const total = porGrupo[grupo.id].length;
      const numero = el("span", { classe: "placar-numero", texto: String(total) });
      const botao = el("button", { type: "button", classe: "placar-botao" }, [
        el("span", { classe: "placar-icone", "aria-hidden": "true" }, [criarIcone(grupo.icone)]),
        numero,
        el("span", { classe: "placar-rotulo", texto: plural(total, grupo.placar) }),
      ]);
      botao.disabled = total === 0;
      botao.addEventListener("click", () => irParaGrupo(grupo.id));
      contarAte(numero, total);
      return el("li", { classe: grupo.classe }, [botao]);
    })
  );

  const containerGrupos = $("grupos");
  containerGrupos.replaceChildren();
  let totalAchados = 0;
  GRUPOS.forEach((grupo) => {
    const itens = porGrupo[grupo.id];
    if (!itens.length) return;
    // Só o primeiro grupo com apontamentos começa aberto; os itens começam recolhidos.
    const aberta = totalAchados === 0;
    totalAchados += itens.length;
    containerGrupos.appendChild(
      criarSecaoRecolhivel({
        id: `grupo-${grupo.id}`,
        nivel: "h4",
        titulo: grupo.titulo,
        contagem: itens.length,
        descricao: grupo.descricao,
        classe: `grupo ${grupo.classe}`,
        icone: grupo.icone,
        aberta,
        conteudo: el("ol", { classe: "grupo-lista" }, itens.map(renderizarAchado)),
      })
    );
  });
  document.querySelector('.controles-recolher[data-alvo="grupos"]').hidden = totalAchados === 0;
  if (!totalAchados) {
    containerGrupos.appendChild(el("p", { classe: "sem-achados", texto: "Não encontramos pontos vulneráveis com base nos documentos enviados." }));
  }

  $("contador-pontos").textContent = String(totalAchados);
  renderizarLinhaDoTempo(relatorio.linha_do_tempo || []);
  renderizarPlano(relatorio.plano_de_provas);
  prepararAudiencia(
    contextoReal
      ? achados.filter((achado) => achado.categoria === "pergunta_dificil").map((achado) => achado.texto)
      : casoDemo && casoDemo.audiencia
        ? casoDemo.audiencia.map((bloco) => bloco.pergunta)
        : []
  );
  selecionarAba("pontos", false);
  trocarTela("relatorio", () => $("titulo-relatorio").focus({ preventScroll: true }));
  anunciar(`Relatório pronto, com ${totalAchados} ${plural(totalAchados, ["apontamento", "apontamentos"])}.`);
}

/* ---------- abas horizontais com sublinhado que desliza (ADR-021) ---------- */

function moverIndicadorDasAbas() {
  const ativa = document.querySelector('.abas [role="tab"][aria-selected="true"]');
  const indicador = document.querySelector(".abas-indicador");
  if (!ativa || !indicador || !ativa.offsetWidth) return;
  indicador.style.width = `${ativa.offsetWidth}px`;
  indicador.style.transform = `translateX(${ativa.offsetLeft}px)`;
  // No celular a barra rola para os lados: a aba escolhida fica sempre à vista.
  const barra = ativa.parentElement;
  if (ativa.offsetLeft < barra.scrollLeft || ativa.offsetLeft + ativa.offsetWidth > barra.scrollLeft + barra.clientWidth) {
    barra.scrollTo({ left: ativa.offsetLeft - 16, behavior: movimentoReduzido() ? "auto" : "smooth" });
  }
}

function selecionarAba(nome, focar = true) {
  ABAS.forEach((aba) => {
    const ativa = aba === nome;
    const botao = $(`aba-${aba}`);
    botao.setAttribute("aria-selected", String(ativa));
    botao.tabIndex = ativa ? 0 : -1;
    $(`painel-${aba}`).hidden = !ativa;
  });
  moverIndicadorDasAbas();
  if (!focar) return;
  $(`aba-${nome}`).focus({ preventScroll: true });
  // Se a pessoa estava lá embaixo, o conteúdo novo começa visível, logo abaixo do cabeçalho.
  const paineis = $("paineis");
  const limite = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--altura-topo")) || 64;
  if (paineis.getBoundingClientRect().top < limite) rolarAte(paineis);
}

function configurarAbas() {
  // A barra fica oculta até o relatório aparecer; quando ganha tamanho, o sublinhado se posiciona.
  if ("ResizeObserver" in window) new ResizeObserver(moverIndicadorDasAbas).observe(document.querySelector(".abas"));
  ABAS.forEach((aba, indice) => {
    const botao = $(`aba-${aba}`);
    botao.addEventListener("click", () => selecionarAba(aba));
    botao.addEventListener("keydown", (evento) => {
      const destino = { ArrowRight: indice + 1, ArrowDown: indice + 1, ArrowLeft: indice - 1, ArrowUp: indice - 1, Home: 0, End: ABAS.length - 1 }[evento.key];
      if (destino === undefined) return;
      evento.preventDefault();
      selecionarAba(ABAS[(destino + ABAS.length) % ABAS.length]);
    });
  });
}

function irParaAchado(id) {
  const alvo = $(idDoAchado(id));
  if (!alvo) return;
  selecionarAba("pontos", false);
  const secao = alvo.closest(".secao-recolhivel");
  const estavaFechada = secao && !secaoAberta(secao);
  if (secao) abrirSecao(secao, true);
  alvo.open = true;
  // Espera a seção terminar de abrir para rolar até a posição certa.
  setTimeout(() => {
    rolarAte(alvo, "center");
    alvo.focus({ preventScroll: true });
    alvo.classList.remove("destacado");
    void alvo.offsetWidth; // reinicia a animação de destaque
    alvo.classList.add("destacado");
  }, estavaFechada && !movimentoReduzido() ? 360 : 30);
}

/* ---------- linha do tempo ---------- */

function renderizarLinhaDoTempo(eventos) {
  const divergentes = eventos.filter((evento) => evento.divergencia).length;
  $("contador-linha").textContent = eventos.length ? String(eventos.length) : "";
  $("resumo-linha").textContent = eventos.length
    ? `${eventos.length} ${plural(eventos.length, ["fato", "fatos"])}` +
      (divergentes ? ` · ${divergentes} com versões diferentes` : "")
    : "Os documentos não trazem datas suficientes.";
  document.querySelector('.controles-recolher[data-alvo="linha-do-tempo"]').hidden = eventos.length === 0;
  $("linha-do-tempo").replaceChildren(
    ...eventos.map((evento) =>
      el("li", { classe: `evento${evento.divergencia ? " evento-divergente" : ""}` }, [
        el("span", { classe: "evento-marcador", "aria-hidden": "true" }),
        el("p", { classe: "evento-data", texto: evento.data }),
        el("details", { classe: "evento-corpo recolhivel" }, [
          el("summary", { classe: "evento-resumo" }, [
            el("span", { classe: "evento-resumo-texto" }, [
              evento.divergencia ? el("span", { classe: "evento-selo-divergencia", texto: "Versões diferentes" }) : null,
              el("span", { classe: "evento-texto", texto: evento.evento }),
            ]),
            iconeAbrir(),
          ]),
          el("div", { classe: "evento-detalhes" }, [
            el("p", { classe: "evento-fonte", texto: [`Segundo ${evento.documento}`, evento.quem_afirma].filter(Boolean).join(" · ") }),
            evento.trecho ? el("p", { classe: "evento-trecho", texto: `“${evento.trecho}”` }) : null,
            evento.trecho ? seloConferencia(evento.trecho_conferido) : null,
            evento.divergencia
              ? el("p", { classe: "evento-divergencia" }, [el("strong", { texto: "Versões diferentes: " }), document.createTextNode(evento.divergencia)])
              : null,
          ]),
        ]),
      ])
    )
  );
}

/* ---------- plano de provas ---------- */

const PRIORIDADES = [
  ["alta", "Prioridade alta"],
  ["media", "Prioridade média"],
  ["baixa", "Prioridade baixa"],
];

let contadorItensPlano = 0;

function atualizarProgressoPlano() {
  const caixas = Array.from(document.querySelectorAll(".plano-marcar"));
  const feitas = caixas.filter((caixa) => caixa.checked).length;
  $("progresso-plano").textContent = caixas.length ? `${feitas} de ${caixas.length} ${plural(caixas.length, ["providenciada", "providenciadas"])}` : "";
}

function renderizarItemPlano(item) {
  const idCaixa = `prova-${(contadorItensPlano += 1)}`;
  const caixa = el("input", { type: "checkbox", id: idCaixa, classe: "plano-marcar", "aria-label": `Providenciada: ${item.prova}` });
  caixa.addEventListener("change", atualizarProgressoPlano);
  const vinculos = (item.apontamentos || [])
    .filter((id) => nomesDosAchados.has(id))
    .map((id) => {
      const botao = el("button", { type: "button", classe: "vinculo-achado", texto: nomesDosAchados.get(id) });
      botao.addEventListener("click", () => irParaAchado(id));
      return botao;
    });
  return el("li", { classe: "item-plano" }, [
    caixa,
    el("details", { classe: "item-plano-corpo recolhivel" }, [
      el("summary", { classe: "item-plano-resumo" }, [el("span", { classe: "item-plano-prova", texto: item.prova }), iconeAbrir()]),
      el("div", { classe: "item-plano-detalhes" }, [
        item.finalidade ? el("p", { classe: "item-plano-finalidade", texto: item.finalidade }) : null,
        item.como_obter ? el("p", { classe: "item-plano-obter" }, [el("strong", { texto: "Como obter: " }), document.createTextNode(item.como_obter)]) : null,
        vinculos.length ? el("div", { classe: "item-plano-vinculos" }, [el("span", { texto: "Resolve:" }), ...vinculos]) : null,
      ]),
    ]),
  ]);
}

function renderizarPlano(itens) {
  const container = $("plano-de-provas");
  container.replaceChildren();
  document.querySelector('.controles-recolher[data-alvo="plano-de-provas"]').hidden = !Array.isArray(itens) || itens.length === 0;
  if (!Array.isArray(itens)) {
    $("contador-plano").textContent = "";
    $("progresso-plano").textContent = "";
    container.appendChild(el("p", { classe: "sem-achados", texto: "Não foi possível montar o plano de provas desta vez. O restante do relatório continua válido." }));
    return;
  }
  $("contador-plano").textContent = itens.length ? String(itens.length) : "";
  if (!itens.length) container.appendChild(el("p", { classe: "sem-achados", texto: "Nenhuma prova adicional foi sugerida." }));
  let primeira = true;
  PRIORIDADES.forEach(([chave, titulo]) => {
    const doGrupo = itens.filter((item) => item.prioridade === chave);
    if (!doGrupo.length) return;
    container.appendChild(
      criarSecaoRecolhivel({
        id: `plano-${chave}`,
        nivel: "h4",
        titulo,
        contagem: doGrupo.length,
        classe: `plano-grupo prioridade-${chave}`,
        aberta: primeira,
        conteudo: el("ul", { classe: "plano-lista" }, doGrupo.map(renderizarItemPlano)),
      })
    );
    primeira = false;
  });
  atualizarProgressoPlano();
}

/* ==========================================================================
   Simulação de audiência em formato de chat (ADR-018)
   ========================================================================== */

const AVALIACOES = {
  convincente: { rotulo: "Resposta convincente", classe: "etiqueta-fato" },
  parcial: { rotulo: "Convence em parte", classe: "etiqueta-sembase" },
  fragil: { rotulo: "Resposta frágil", classe: "etiqueta-fragil" },
};

const audiencia = { perguntas: [], indice: 0, perguntaAtual: "", ehReplica: false, resultados: [], enviando: false, sessao: 0 };

const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
let ditado = null;

function pararDitado() {
  if (ditado) {
    const atual = ditado;
    ditado = null;
    try { atual.stop(); } catch { /* já parado */ }
  }
  const botao = $("ditar-resposta");
  botao.setAttribute("aria-pressed", "false");
  botao.setAttribute("aria-label", "Falar a resposta");
}

function alternarDitado() {
  if (ditado) { pararDitado(); return; }
  const campo = $("resposta-audiencia");
  const base = campo.value ? `${campo.value.replace(/\s*$/, "")} ` : "";
  let definitivo = "";
  const reconhecimento = new Reconhecimento();
  reconhecimento.lang = "pt-BR";
  reconhecimento.continuous = true;
  reconhecimento.interimResults = true;
  reconhecimento.onresult = (evento) => {
    let provisorio = "";
    for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
      const trecho = evento.results[i][0].transcript;
      if (evento.results[i].isFinal) definitivo += trecho;
      else provisorio += trecho;
    }
    campo.value = base + definitivo + provisorio;
    campo.dispatchEvent(new Event("input"));
  };
  reconhecimento.onerror = (evento) => {
    pararDitado();
    if (evento.error === "not-allowed" || evento.error === "service-not-allowed") {
      mostrarErro("audiencia-erro", "Não foi possível usar o microfone. Permita o acesso no navegador ou digite a resposta.");
    }
  };
  reconhecimento.onend = () => { if (ditado === reconhecimento) pararDitado(); };
  ditado = reconhecimento;
  reconhecimento.start();
  const botao = $("ditar-resposta");
  botao.setAttribute("aria-pressed", "true");
  botao.setAttribute("aria-label", "Parar de falar");
}

const AUTORES_CHAT = {
  contrario: { nome: "Advogado(a) da parte contrária", sigla: "PC" },
  voce: { nome: "Você", sigla: "EU" },
  adversia: { nome: "AdversIA", sigla: "IA" },
};

const horaAgora = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const textoChat = (texto) => el("p", { classe: "chat-texto", texto });

function mensagemChat(quem, conteudo, classeExtra = "") {
  const autor = AUTORES_CHAT[quem];
  return el("li", { classe: `chat-msg chat-msg-${quem} ${classeExtra}`.trim() }, [
    quem === "voce" ? null : el("span", { classe: "chat-avatar", "aria-hidden": "true", texto: autor.sigla }),
    el("div", { classe: "chat-bolha" }, [
      el("p", { classe: "chat-autor" }, [el("span", { texto: autor.nome }), el("span", { classe: "chat-hora", texto: horaAgora() })]),
      ...conteudo,
    ]),
  ]);
}

function mensagemSistema(texto) {
  return el("li", { classe: "chat-msg chat-msg-sistema" }, [el("div", { classe: "chat-bolha" }, [textoChat(texto)])]);
}

function adicionarMensagem(item) {
  const lista = $("chat-mensagens");
  lista.appendChild(item);
  lista.scrollTo({ top: lista.scrollHeight, behavior: movimentoReduzido() ? "auto" : "smooth" });
  return item;
}

function indicadorDigitando(quem) {
  const aviso = quem === "adversia" ? "A AdversIA está avaliando a resposta." : `${AUTORES_CHAT[quem].nome} está digitando.`;
  return el("li", { classe: `chat-msg chat-msg-${quem} chat-digitando` }, [
    el("span", { classe: "chat-avatar", "aria-hidden": "true", texto: AUTORES_CHAT[quem].sigla }),
    el("div", { classe: "chat-bolha", "aria-hidden": "true" }, [el("i"), el("i"), el("i")]),
    el("span", { classe: "visualmente-oculto", texto: aviso }),
  ]);
}

// Mostra "digitando…" por um instante. Devolve false se a simulação foi recomeçada nesse meio-tempo.
async function simularDigitacao(quem, ms) {
  const sessao = audiencia.sessao;
  const indicador = adicionarMensagem(indicadorDigitando(quem));
  await esperar(movimentoReduzido() ? 150 : ms);
  indicador.remove();
  return sessao === audiencia.sessao;
}

async function mostrarPergunta(texto, ehReplica, focar = false) {
  audiencia.perguntaAtual = texto;
  audiencia.ehReplica = ehReplica;
  const posicao = `pergunta ${audiencia.indice + 1} de ${audiencia.perguntas.length}`;
  $("chat-status").textContent = ehReplica ? `Réplica · ${posicao}` : posicao.replace(/^p/, "P");
  $("audiencia-form").hidden = true;
  // A réplica já apareceu na conversa logo depois da avaliação.
  if (!ehReplica) {
    if (!(await simularDigitacao("contrario", 1100))) return;
    adicionarMensagem(mensagemChat("contrario", [textoChat(texto)]));
  }
  prepararCompositor(ehReplica, focar);
}

function prepararCompositor(ehReplica, focar) {
  const campo = $("resposta-audiencia");
  campo.value = "";
  campo.style.height = "";
  esconderErro("audiencia-erro");
  $("pular-pergunta").textContent = ehReplica ? "Pular réplica" : "Pular pergunta";

  // Na demonstração, a pessoa escolhe entre respostas preparadas; na análise real, escreve ou fala.
  const demonstracao = !contextoReal;
  const bloco = demonstracao && !ehReplica && casoDemo ? casoDemo.audiencia[audiencia.indice] : null;
  $("audiencia-opcoes").hidden = !demonstracao;
  $("audiencia-livre").hidden = demonstracao;
  $("ditar-resposta").hidden = demonstracao || !Reconhecimento;
  $("audiencia-opcoes-lista").replaceChildren(
    ...(bloco ? bloco.respostas : []).map((opcao) => {
      const botao = el("button", { type: "button", classe: "opcao-resposta" }, [
        el("span", { classe: "opcao-rotulo", texto: opcao.rotulo }),
        el("span", { classe: "opcao-texto", texto: opcao.texto }),
      ]);
      botao.addEventListener("click", () => escolherRespostaDemo(opcao));
      return botao;
    })
  );
  $("audiencia-form").hidden = false;
  if (focar) {
    const alvo = demonstracao ? document.querySelector(".opcao-resposta") : campo;
    if (alvo) alvo.focus({ preventScroll: true });
  }
}

async function escolherRespostaDemo(opcao) {
  if (audiencia.enviando) return;
  audiencia.enviando = true;
  $("audiencia-form").hidden = true;
  adicionarMensagem(mensagemChat("voce", [textoChat(opcao.texto)]));
  anunciar("Avaliando a resposta.");
  const continua = await simularDigitacao("adversia", 1500);
  audiencia.enviando = false;
  if (continua) registrarRodada(opcao.avaliacao);
}

function prepararAudiencia(perguntas) {
  pararDitado();
  audiencia.sessao += 1;
  audiencia.perguntas = perguntas;
  audiencia.indice = 0;
  audiencia.resultados = [];
  audiencia.enviando = false;
  $("chat-mensagens").replaceChildren();
  $("audiencia-form").hidden = true;
  $("contador-audiencia").textContent = perguntas.length ? String(perguntas.length) : "";
  if (!perguntas.length) {
    $("chat-status").textContent = "Sem perguntas";
    adicionarMensagem(mensagemSistema("Este relatório não trouxe perguntas difíceis para a simulação."));
    return;
  }
  adicionarMensagem(mensagemSistema(`Audiência simulada: ${perguntas.length} ${plural(perguntas.length, ["pergunta", "perguntas"])}. Responda como faria diante do juiz.`));
  mostrarPergunta(perguntas[0], false);
}

function avancarPergunta() {
  audiencia.indice += 1;
  if (audiencia.indice >= audiencia.perguntas.length) {
    encerrarAudiencia();
    return;
  }
  mostrarPergunta(audiencia.perguntas[audiencia.indice], false, true);
}

function encerrarAudiencia() {
  pararDitado();
  $("audiencia-form").hidden = true;
  const respondidas = audiencia.resultados.filter(Boolean);
  const contar = (tipo) => respondidas.filter((resultado) => resultado === tipo).length;
  const partes = [
    ["convincente", ["convincente", "convincentes"]],
    ["parcial", ["convence em parte", "convencem em parte"]],
    ["fragil", ["frágil", "frágeis"]],
  ]
    .map(([tipo, rotulos]) => [contar(tipo), rotulos])
    .filter(([total]) => total)
    .map(([total, rotulos]) => `${total} ${plural(total, rotulos)}`);
  const resumo = respondidas.length ? `Resultado: ${partes.join(", ")}.` : "Nenhuma pergunta foi respondida.";

  $("chat-status").textContent = "Simulação concluída";
  const recomecar = el("button", { type: "button", classe: "botao-secundario", texto: "Recomeçar simulação" });
  recomecar.addEventListener("click", () => prepararAudiencia(audiencia.perguntas.slice()));
  const fim = adicionarMensagem(
    el("li", { classe: "chat-msg chat-msg-sistema chat-fim" }, [
      el("div", { classe: "chat-bolha" }, [el("p", { classe: "chat-fim-titulo", texto: "Simulação concluída", tabindex: "-1" }), textoChat(resumo), recomecar]),
    ])
  );
  fim.querySelector(".chat-fim-titulo").focus({ preventScroll: true });
  anunciar(`Simulação concluída. ${resumo}`);
}

function mensagemAvaliacao(avaliacao, tipo) {
  const bloco = (titulo, itens, classe) =>
    itens && itens.length ? el("div", { classe: `avaliacao-bloco ${classe}` }, [el("h5", { texto: titulo }), el("ul", {}, itens.map((texto) => el("li", { texto })))]) : null;
  const colunas = [bloco("O que funcionou", avaliacao.pontos_fortes, "bloco-forte"), bloco("O que ficou frágil", avaliacao.pontos_frageis, "bloco-fragil")].filter(Boolean);
  const apoio = avaliacao.apoio_nos_documentos || [];
  const detalhes = colunas.length || apoio.length
    ? el("details", { classe: "chat-detalhes" }, [
        el("summary", { texto: "Ver avaliação completa" }),
        el("div", { classe: "chat-detalhes-corpo" }, [colunas.length ? el("div", { classe: "avaliacao-colunas" }, colunas) : null, apoio.length ? listaDeOrigens(apoio) : null]),
      ])
    : null;
  return mensagemChat("adversia", [
    el("span", { classe: `etiqueta ${tipo.classe}`, texto: tipo.rotulo }),
    avaliacao.resumo ? textoChat(avaliacao.resumo) : null,
    avaliacao.sugestao ? el("div", { classe: "avaliacao-sugestao" }, [el("h5", { texto: "Como fortalecer" }), el("p", { texto: avaliacao.sugestao })]) : null,
    detalhes,
  ], "chat-msg-avaliacao");
}

async function registrarRodada(avaliacao) {
  audiencia.resultados[audiencia.indice] = avaliacao.avaliacao;
  const tipo = AVALIACOES[avaliacao.avaliacao] || AVALIACOES.parcial;
  adicionarMensagem(mensagemAvaliacao(avaliacao, tipo));
  anunciar(`${tipo.rotulo}. ${avaliacao.resumo || ""}`);
  if (avaliacao.replica) {
    if (!(await simularDigitacao("contrario", 1200))) return;
    adicionarMensagem(mensagemChat("contrario", [el("span", { classe: "chat-rotulo-replica", texto: "Réplica" }), textoChat(avaliacao.replica)], "chat-msg-replica"));
  }
  adicionarAcoesDaRodada(avaliacao);
}

function adicionarAcoesDaRodada(avaliacao) {
  const ultima = audiencia.indice >= audiencia.perguntas.length - 1;
  const podeResponderReplica = Boolean(avaliacao.replica && contextoReal);
  const acoes = el("li", { classe: "chat-acoes" });
  const botao = (texto, classe, aoClicar) => {
    const b = el("button", { type: "button", classe, texto });
    b.addEventListener("click", () => { acoes.remove(); aoClicar(); });
    return b;
  };
  if (podeResponderReplica) acoes.appendChild(botao("Responder à réplica", "botao-secundario", () => mostrarPergunta(avaliacao.replica, true, true)));
  acoes.appendChild(botao(ultima ? "Encerrar simulação" : "Próxima pergunta", podeResponderReplica ? "botao-texto" : "botao-principal", avancarPergunta));
  adicionarMensagem(acoes);
  acoes.querySelector("button").focus({ preventScroll: true });
}

async function enviarRespostaAudiencia(evento) {
  evento.preventDefault();
  if (audiencia.enviando) return;
  pararDitado();
  const campo = $("resposta-audiencia");
  const resposta = campo.value.trim();
  if (!resposta) {
    mostrarErro("audiencia-erro", "Escreva ou fale a sua resposta antes de enviar.", campo);
    return;
  }
  if (!contextoReal) {
    mostrarErro("audiencia-erro", "Para responder com as suas palavras, use a análise com documentos.");
    return;
  }

  audiencia.enviando = true;
  const sessao = audiencia.sessao;
  esconderErro("audiencia-erro");
  $("audiencia-form").hidden = true;
  const minhaMensagem = adicionarMensagem(mensagemChat("voce", [textoChat(resposta)]));
  const indicador = adicionarMensagem(indicadorDigitando("adversia"));
  anunciar("Avaliando a sua resposta.");
  try {
    let respostaHttp;
    try {
      respostaHttp = await fetch("api/audiencia", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Anthropic-Key": contextoReal.chave, "X-Codigo-Gestao": contextoReal.codigo },
        body: JSON.stringify({ documentos: contextoReal.documentos, tese: contextoReal.tese, pergunta: audiencia.perguntaAtual, resposta }),
      });
    } catch {
      throw new Error(MENSAGEM_SEM_CONEXAO);
    }
    const dados = await lerJson(respostaHttp);
    if (!respostaHttp.ok) throw new Error(dados.erro || MENSAGEM_FALHA_PADRAO);
    indicador.remove();
    if (sessao === audiencia.sessao) registrarRodada(dados);
  } catch (falha) {
    indicador.remove();
    if (sessao !== audiencia.sessao) return;
    // A resposta volta para a caixa de texto, para a pessoa tentar de novo sem digitar tudo.
    minhaMensagem.remove();
    $("audiencia-form").hidden = false;
    campo.value = resposta;
    mostrarErro("audiencia-erro", falha.message || MENSAGEM_FALHA_PADRAO, campo);
  } finally {
    audiencia.enviando = false;
  }
}

function configurarAudiencia() {
  const campo = $("resposta-audiencia");
  $("audiencia-form").addEventListener("submit", enviarRespostaAudiencia);
  campo.addEventListener("input", () => {
    campo.style.height = "auto";
    campo.style.height = `${Math.min(campo.scrollHeight, 160)}px`;
  });
  campo.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" && !evento.shiftKey && !evento.isComposing) {
      evento.preventDefault();
      $("audiencia-form").requestSubmit();
    }
  });
  $("pular-pergunta").addEventListener("click", () => {
    if (audiencia.enviando) return;
    pararDitado();
    $("audiencia-form").hidden = true;
    adicionarMensagem(mensagemSistema(audiencia.ehReplica ? "Você pulou a réplica." : "Você pulou esta pergunta."));
    avancarPergunta();
  });
  if (Reconhecimento) $("ditar-resposta").addEventListener("click", alternarDitado);
  if ("speechSynthesis" in window) {
    $("ouvir-pergunta").addEventListener("click", () => {
      const sintese = window.speechSynthesis;
      sintese.cancel();
      const fala = new SpeechSynthesisUtterance(audiencia.perguntaAtual);
      fala.lang = "pt-BR";
      const voz = sintese.getVoices().find((v) => v.lang === "pt-BR");
      if (voz) fala.voice = voz;
      sintese.speak(fala);
    });
  } else {
    $("ouvir-pergunta").hidden = true;
  }
}

/* ---------- ouvir relatório (leitura em voz alta do próprio navegador) ---------- */

let lendo = false;

function textoParaLeitura() {
  const partes = [$("titulo-relatorio").textContent, $("resumo-caso").textContent, `Tese analisada: ${$("tese-analisada").textContent}`];
  document.querySelectorAll("#grupos .secao-recolhivel").forEach((grupo) => {
    partes.push(grupo.querySelector(".secao-titulo").textContent);
    grupo.querySelectorAll(".achado").forEach((achado, i) => {
      partes.push(`${i + 1}. ${achado.querySelector(".achado-texto").textContent} (${achado.querySelector(".etiqueta").textContent}).`);
    });
  });
  return partes;
}

function pararLeitura() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  lendo = false;
  const botao = $("ouvir-relatorio");
  botao.setAttribute("aria-pressed", "false");
  botao.setAttribute("aria-label", "Ouvir relatório");
  botao.dataset.dica = "Ouvir";
}

function alternarLeitura() {
  if (lendo) { pararLeitura(); return; }
  const sintese = window.speechSynthesis;
  const vozes = sintese.getVoices();
  const voz = vozes.find((v) => v.lang === "pt-BR") || vozes.find((v) => v.lang && v.lang.startsWith("pt"));
  const partes = textoParaLeitura();
  lendo = true;
  const botao = $("ouvir-relatorio");
  botao.setAttribute("aria-pressed", "true");
  botao.setAttribute("aria-label", "Parar leitura");
  botao.dataset.dica = "Parar";
  partes.forEach((texto, i) => {
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    if (voz) fala.voice = voz;
    if (i === partes.length - 1) fala.onend = pararLeitura;
    sintese.speak(fala);
  });
}

/* ==========================================================================
   Inicialização
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  preencherIcones();
  configurarPainelAcessibilidade();
  configurarDialogos();
  configurarEnvioDeArquivos();
  configurarAbas();
  configurarAudiencia();
  configurarControlesRecolher();
  acompanharAlturaDoTopo();
  carregarExemplos();
  animarTitulo();

  $("link-inicio").addEventListener("click", (evento) => {
    evento.preventDefault();
    pararLeitura();
    trocarTela("inicio");
  });
  $("comecar-demo").addEventListener("click", irParaCasos);
  document.querySelectorAll("[data-ir]").forEach((botao) => botao.addEventListener("click", () => trocarTela(botao.dataset.ir)));
  $("botao-gestao").addEventListener("click", abrirAreaGestao);
  $("form-gestao").addEventListener("submit", entrarGestao);
  $("analisar-caso").addEventListener("click", analisarCasoDemo);
  $("ver-documentos").addEventListener("click", mostrarDocumentosDoCaso);
  $("form-analise").addEventListener("submit", analisarDocumentos);
  $("abrir-legenda").addEventListener("click", () => abrirDialogo($("dialogo-legenda"), $("dialogo-legenda").querySelector("[data-fechar]")));
  $("botao-tentar-de-novo").addEventListener("click", () => (modo === "chave" ? irParaDocumentos() : irParaCasos()));
  $("nova-analise").addEventListener("click", () => {
    pararLeitura();
    if (modo === "chave") irParaDocumentos();
    else irParaCasos();
  });
  $("imprimir-relatorio").addEventListener("click", () => window.print());
  window.addEventListener("beforeprint", prepararImpressao);
  window.addEventListener("afterprint", concluirImpressao);

  if ("speechSynthesis" in window) {
    $("ouvir-relatorio").addEventListener("click", alternarLeitura);
    window.speechSynthesis.getVoices();
  } else {
    $("ouvir-relatorio").hidden = true;
  }
});
