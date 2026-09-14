"use strict";

/* ==========================================================================
   Textos que o advogado vê. Nenhum termo interno do sistema aparece na tela:
   as chaves à esquerda são o que o servidor devolve, os rótulos à direita são
   o que a pessoa lê.
   ========================================================================== */

const CATEGORIAS = {
  vulnerabilidade_critica: { grupo: "criticos", rotulo: "Ponto crítico" },
  vulnerabilidade_media: { grupo: "criticos", rotulo: "Ponto de atenção" },
  contradicao: { grupo: "contradicoes", rotulo: "Contradição" },
  lacuna_probatoria: { grupo: "lacunas", rotulo: "Falta de prova" },
  contra_argumento: { grupo: "argumentos", rotulo: "Argumento contrário" },
  pergunta_dificil: { grupo: "perguntas", rotulo: "Pergunta difícil" },
};

const GRUPOS = [
  {
    id: "criticos",
    titulo: "Pontos críticos",
    descricao: "O que mais ameaça a sua estratégia.",
    classe: "grupo-critico",
    placar: null,
  },
  {
    id: "contradicoes",
    titulo: "Contradições",
    descricao: "Informações que não batem entre si nos documentos.",
    classe: "grupo-contradicao",
    placar: ["contradição", "contradições"],
  },
  {
    id: "lacunas",
    titulo: "Alegações sem prova",
    descricao: "O que foi afirmado, mas não tem documento que sustente.",
    classe: "grupo-lacuna",
    placar: ["alegação sem prova", "alegações sem prova"],
  },
  {
    id: "argumentos",
    titulo: "Argumentos que a outra parte pode usar",
    descricao: "Como o advogado do outro lado pode atacar a sua tese.",
    classe: "grupo-argumento",
    placar: ["argumento contrário", "argumentos contrários"],
  },
  {
    id: "perguntas",
    titulo: "Perguntas que podem ser feitas",
    descricao: "O que um juiz ou o advogado da outra parte pode perguntar.",
    classe: "grupo-pergunta",
    placar: ["pergunta difícil", "perguntas difíceis"],
  },
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

/* ==========================================================================
   Movimento — digitação, troca suave e revelação ao rolar.
   ========================================================================== */

function movimentoReduzido() {
  return (
    document.documentElement.getAttribute("data-movimento") === "reduzido" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

async function fontesProntas() {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch { /* segue sem esperar */ }
}

// Mesmo ritmo do template: espera as fontes, depois 50 ms por letra, com cursor piscando.
async function animarTitulo() {
  const alvo = $("titulo-digitado");
  const texto = alvo.dataset.texto;
  if (movimentoReduzido()) {
    alvo.classList.add("concluido");
    return;
  }
  alvo.textContent = "";
  await fontesProntas();
  await esperar(750); // deixa o título terminar de surgir antes de começar a digitar
  let letras = 0;
  const relogio = setInterval(() => {
    letras += 1;
    alvo.textContent = texto.slice(0, letras);
    if (letras >= texto.length) {
      clearInterval(relogio);
      alvo.parentElement.classList.add("brilhando");
      setTimeout(() => alvo.classList.add("concluido"), 2600);
    }
  }, 50);
}

// O exemplo do campo "Sua tese" é digitado quando o campo aparece na tela.
function digitarExemploDaTese() {
  const campo = $("tese");
  const texto = campo.getAttribute("placeholder") || "";
  if (!texto || movimentoReduzido() || !("IntersectionObserver" in window)) return;
  campo.setAttribute("placeholder", "");
  const observador = new IntersectionObserver((entradas) => {
    if (!entradas.some((entrada) => entrada.isIntersecting)) return;
    observador.disconnect();
    let letras = 0;
    const relogio = setInterval(() => {
      letras += 1;
      const fim = letras >= texto.length;
      campo.setAttribute("placeholder", texto.slice(0, letras) + (fim ? "" : "\u258D"));
      if (fim) clearInterval(relogio);
    }, 35);
  }, { threshold: 0.6 });
  observador.observe(campo);
}

let digitacaoAtual = null;

function pararDigitacao() {
  if (!digitacaoAtual) return;
  const digitacao = digitacaoAtual;
  digitacaoAtual = null;
  digitacao.terminar();
}

// Preenche um campo "digitando". Textos longos aceleram para durar no máximo ~2,5 s.
function digitarNoCampo(campo, texto) {
  pararDigitacao();
  if (movimentoReduzido() || !texto) {
    campo.value = texto;
    return;
  }
  const msPorLetra = Math.max(6, Math.min(50, 1600 / texto.length));
  const inicio = performance.now();
  let quadro = 0;
  campo.value = "";
  campo.classList.add("digitando");
  digitacaoAtual = {
    terminar() {
      cancelAnimationFrame(quadro);
      campo.value = texto;
      campo.classList.remove("digitando");
    },
  };
  const passo = (agora) => {
    const letras = Math.min(texto.length, Math.floor((agora - inicio) / msPorLetra) + 1);
    campo.value = texto.slice(0, letras);
    campo.scrollTop = campo.scrollHeight;
    if (letras < texto.length) quadro = requestAnimationFrame(passo);
    else pararDigitacao();
  };
  quadro = requestAnimationFrame(passo);
}

// Troca de conteúdo como no template: some subindo 4 px em 150 ms e volta com o novo texto.
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

// Cada bloco surge de baixo quando entra na tela; os que entram juntos vêm em sequência.
function revelarAoRolar(elementos) {
  if (movimentoReduzido() || !("IntersectionObserver" in window)) return;
  const observador = new IntersectionObserver((entradas) => {
    let ordem = 0;
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      entrada.target.style.setProperty("--atraso", `${Math.min(ordem, 5) * 70}ms`);
      entrada.target.classList.add("revelado");
      observador.unobserve(entrada.target);
      ordem += 1;
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
  elementos.forEach((elemento) => {
    elemento.classList.add("revelar");
    observador.observe(elemento);
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
   Formulário: documentos, casos de exemplo e tese.
   ========================================================================== */

const arquivos = new Map();

function formatarTamanho(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function renderizarArquivos() {
  const lista = $("lista-arquivos");
  lista.replaceChildren();
  for (const arquivo of arquivos.values()) {
    const remover = el("button", {
      type: "button",
      classe: "arquivo-remover",
      "aria-label": `Remover ${arquivo.name}`,
      texto: "Remover",
    });
    remover.addEventListener("click", () => {
      arquivos.delete(arquivo.name);
      renderizarArquivos();
      anunciar(`${arquivo.name} removido.`);
      $("documentos").focus();
    });
    lista.appendChild(
      el("li", {}, [
        el("span", {}, [
          el("span", { classe: "arquivo-nome", texto: arquivo.name }),
          el("span", { classe: "arquivo-tamanho", texto: formatarTamanho(arquivo.size) }),
        ]),
        remover,
      ])
    );
  }
}

function adicionarArquivos(lista) {
  const novos = Array.from(lista || []);
  novos.forEach((arquivo) => arquivos.set(arquivo.name, arquivo));
  renderizarArquivos();
  if (novos.length) {
    esconderErroFormulario();
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
  ["dragleave", "drop"].forEach((tipo) =>
    zona.addEventListener(tipo, () => zona.classList.remove("arrastando"))
  );
  zona.addEventListener("drop", (evento) => {
    evento.preventDefault();
    adicionarArquivos(evento.dataTransfer.files);
  });
}

/* ---------- lista de opções no visual do sistema ----------
   Substitui o <select> nativo (cuja lista aberta não aceita estilo) seguindo o padrão
   "select-only combobox" do W3C: setas, Home/End, Enter/Espaço, Esc, Tab e busca pela
   primeira letra funcionam como num campo de seleção comum. */

function criarSelecao(raiz, aoMudar) {
  const botao = raiz.querySelector(".selecao-botao");
  const valorTexto = raiz.querySelector(".selecao-valor");
  const lista = raiz.querySelector(".selecao-lista");
  let opcoes = [];
  let valor = null;
  let ativo = -1;

  function marcarAtivo(indice, rolar = true) {
    if (indice < 0 || indice >= opcoes.length) return;
    if (opcoes[ativo]) opcoes[ativo].no.classList.remove("ativa");
    ativo = indice;
    const no = opcoes[indice].no;
    no.classList.add("ativa");
    lista.setAttribute("aria-activedescendant", no.id);
    if (rolar) no.scrollIntoView({ block: "nearest" });
  }

  function escolher(indice, notificar = true) {
    const opcao = opcoes[indice];
    if (!opcao) {
      valor = null;
      valorTexto.textContent = "";
      return;
    }
    const mudou = opcao.valor !== valor;
    opcoes.forEach((o, i) => o.no.setAttribute("aria-selected", String(i === indice)));
    valor = opcao.valor;
    valorTexto.textContent = opcao.rotulo;
    if (mudou && notificar) aoMudar(valor);
  }

  function abrir() {
    lista.hidden = false;
    raiz.classList.add("aberta");
    botao.setAttribute("aria-expanded", "true");
    marcarAtivo(Math.max(0, opcoes.findIndex((o) => o.valor === valor)));
    lista.focus();
  }

  function fechar(focarBotao) {
    if (lista.hidden) return;
    lista.hidden = true;
    raiz.classList.remove("aberta");
    botao.setAttribute("aria-expanded", "false");
    lista.removeAttribute("aria-activedescendant");
    if (focarBotao) botao.focus();
  }

  // grupos: [{ nome: "Partilha de bens" | null, itens: [{ valor, rotulo }] }]
  function definirOpcoes(grupos, valorInicial) {
    lista.replaceChildren();
    opcoes = [];
    ativo = -1;
    grupos.forEach((grupo, g) => {
      let destino = lista;
      if (grupo.nome) {
        const idNome = `${raiz.id}-grupo-${g}`;
        destino = el("div", { classe: "selecao-grupo", role: "group", "aria-labelledby": idNome }, [
          el("div", { classe: "selecao-grupo-nome", id: idNome, role: "presentation", texto: grupo.nome }),
        ]);
        lista.appendChild(destino);
      }
      grupo.itens.forEach((item) => {
        const indice = opcoes.length;
        const no = el("div", {
          classe: "selecao-opcao",
          id: `${raiz.id}-opcao-${indice}`,
          role: "option",
          "aria-selected": "false",
          texto: item.rotulo,
        });
        no.addEventListener("pointermove", () => { if (ativo !== indice) marcarAtivo(indice, false); });
        no.addEventListener("click", () => { escolher(indice); fechar(true); });
        destino.appendChild(no);
        opcoes.push({ ...item, no });
      });
    });
    const inicial = opcoes.findIndex((o) => o.valor === valorInicial);
    valor = null;
    escolher(inicial >= 0 ? inicial : 0, false);
  }

  botao.addEventListener("mousedown", (evento) => { if (!lista.hidden) evento.preventDefault(); });
  botao.addEventListener("click", () => (lista.hidden ? abrir() : fechar(true)));
  botao.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      abrir();
    }
  });

  lista.addEventListener("keydown", (evento) => {
    switch (evento.key) {
      case "ArrowDown": evento.preventDefault(); marcarAtivo(Math.min(opcoes.length - 1, ativo + 1)); break;
      case "ArrowUp": evento.preventDefault(); marcarAtivo(Math.max(0, ativo - 1)); break;
      case "Home": evento.preventDefault(); marcarAtivo(0); break;
      case "End": evento.preventDefault(); marcarAtivo(opcoes.length - 1); break;
      case "Enter":
      case " ": evento.preventDefault(); escolher(ativo); fechar(true); break;
      case "Escape": evento.preventDefault(); evento.stopPropagation(); fechar(true); break;
      case "Tab": escolher(ativo); fechar(true); break; // o foco volta ao botão e o Tab segue dali
      default:
        if (evento.key.length === 1 && opcoes.length) {
          const letra = evento.key.toLocaleLowerCase("pt-BR");
          for (let passo = 1; passo <= opcoes.length; passo += 1) {
            const i = (ativo + passo) % opcoes.length;
            if (opcoes[i].rotulo.toLocaleLowerCase("pt-BR").startsWith(letra)) { marcarAtivo(i); break; }
          }
        }
    }
  });

  raiz.addEventListener("focusout", (evento) => {
    if (!raiz.contains(evento.relatedTarget)) fechar(false);
  });

  return {
    definirOpcoes,
    get valor() { return valor; },
  };
}

/* ---------- filtro de casos de exemplo ---------- */

let exemplos = [];
let selecaoTipo;
let selecaoSituacao;

function exemploSelecionado() {
  return exemplos.find((exemplo) => exemplo.id === selecaoSituacao.valor);
}

function mostrarDescricaoExemplo() {
  const exemplo = exemploSelecionado();
  trocarTextoSuave($("exemplo-descricao"), exemplo ? exemplo.descricao : "");
  $("usar-exemplo").disabled = !exemplo;
}

function preencherSituacoes() {
  const tipo = selecaoTipo.valor;
  const grupos = new Map();
  exemplos
    .filter((exemplo) => !tipo || exemplo.tipo === tipo)
    .forEach((exemplo) => {
      if (!grupos.has(exemplo.tipo)) grupos.set(exemplo.tipo, []);
      grupos.get(exemplo.tipo).push({ valor: exemplo.id, rotulo: exemplo.titulo });
    });
  // Com "Todos os tipos", as situações ficam agrupadas por tipo para continuar fácil de achar.
  selecaoSituacao.definirOpcoes(
    tipo
      ? [{ nome: null, itens: grupos.get(tipo) || [] }]
      : Array.from(grupos, ([nome, itens]) => ({ nome, itens }))
  );
  mostrarDescricaoExemplo();
}

async function carregarExemplos() {
  try {
    const resposta = await fetch("/api/exemplos");
    if (!resposta.ok) return;
    exemplos = await resposta.json();
    if (!exemplos.length) return;

    selecaoSituacao = criarSelecao($("selecao-situacao"), mostrarDescricaoExemplo);
    selecaoTipo = criarSelecao($("selecao-tipo"), () => {
      preencherSituacoes();
      const total = exemplos.filter((e) => !selecaoTipo.valor || e.tipo === selecaoTipo.valor).length;
      anunciar(`${total} ${plural(total, ["situação disponível", "situações disponíveis"])}.`);
    });

    const contagem = new Map();
    exemplos.forEach((exemplo) => contagem.set(exemplo.tipo, (contagem.get(exemplo.tipo) || 0) + 1));
    selecaoTipo.definirOpcoes(
      [
        {
          nome: null,
          itens: [
            { valor: "", rotulo: `Todos os tipos (${exemplos.length} casos)` },
            ...Array.from(contagem, ([tipo, total]) => ({
              valor: tipo,
              rotulo: `${tipo} (${total} ${plural(total, ["caso", "casos"])})`,
            })),
          ],
        },
      ],
      ""
    );

    $("usar-exemplo").addEventListener("click", () => {
      const exemplo = exemploSelecionado();
      if (exemplo) usarExemplo(exemplo);
    });

    preencherSituacoes();
    $("exemplos").hidden = false;
  } catch {
    /* sem exemplos: o formulário continua funcionando normalmente */
  }
}

async function usarExemplo(exemplo) {
  try {
    const resposta = await fetch(`/api/exemplos/${encodeURIComponent(exemplo.id)}`);
    if (!resposta.ok) throw new Error();
    const dados = await resposta.json();
    arquivos.clear();
    dados.documentos.forEach((doc) => {
      arquivos.set(doc.nome, new File([doc.conteudo], doc.nome, { type: "text/plain" }));
    });
    renderizarArquivos();
    digitarNoCampo($("tese"), dados.tese);
    $("confirmacao-dados").checked = true;
    esconderErroFormulario();
    anunciar(`Caso de exemplo carregado: ${exemplo.titulo}. ${dados.documentos.length} documentos e a tese foram preenchidos.`);
  } catch {
    mostrarErroFormulario("Não conseguimos carregar o caso de exemplo. Tente de novo.");
  }
}

function mostrarErroFormulario(mensagem, focarEm) {
  const erro = $("erro-formulario");
  erro.textContent = mensagem;
  erro.hidden = false;
  if (focarEm) focarEm.focus();
}

function esconderErroFormulario() {
  $("erro-formulario").hidden = true;
}

function validarFormulario() {
  const tese = $("tese").value.trim();
  if (arquivos.size === 0) {
    mostrarErroFormulario("Envie pelo menos um documento do caso.", $("documentos"));
    return null;
  }
  if (!tese) {
    mostrarErroFormulario("Descreva a tese que você quer testar.", $("tese"));
    return null;
  }
  if (!$("confirmacao-dados").checked) {
    mostrarErroFormulario("Confirme que os documentos são fictícios ou anonimizados para continuar.", $("confirmacao-dados"));
    return null;
  }
  return tese;
}

/* ==========================================================================
   Navegação entre as telas.
   ========================================================================== */

function mostrarTela(tela) {
  const telas = {
    formulario: ["abertura", "secao-formulario"],
    progresso: ["secao-progresso"],
    erro: ["secao-erro"],
    relatorio: ["secao-relatorio"],
  };
  const visiveis = new Set(telas[tela]);
  ["abertura", "secao-formulario", "secao-progresso", "secao-erro", "secao-relatorio"].forEach((id) => {
    $(id).hidden = !visiveis.has(id);
  });
  window.scrollTo({ top: 0 });
}

/* ==========================================================================
   Análise: envio, acompanhamento das etapas e resultado.
   ========================================================================== */

function renderizarEtapas(etapas, etapaAtual, estado) {
  const lista = $("etapas");
  if (lista.children.length !== etapas.length) {
    lista.replaceChildren(
      ...etapas.map((texto, i) =>
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
    if (estado === "concluida" || numero < etapaAtual) situacao = "concluida";
    else if (numero === etapaAtual) situacao = "andamento";
    if (item.dataset.estado === situacao) return;
    item.dataset.estado = situacao;
    item.querySelector(".etapa-marcador").textContent = situacao === "concluida" ? "✓" : "";
    item.querySelector(".etapa-situacao").textContent =
      situacao === "concluida" ? ", concluída" : situacao === "andamento" ? ", em andamento" : ", aguardando";
    if (situacao === "andamento") anunciar(`Etapa ${numero} de ${etapas.length}: ${etapas[i]}.`);
  });
}

async function acompanharAnalise(id, etapas) {
  let falhasSeguidas = 0;
  for (;;) {
    await esperar(1500);
    let resposta;
    try {
      resposta = await fetch(`/api/analises/${encodeURIComponent(id)}`, { cache: "no-store" });
    } catch {
      falhasSeguidas += 1;
      if (falhasSeguidas >= 4) throw new Error(MENSAGEM_SEM_CONEXAO);
      continue;
    }
    falhasSeguidas = 0;
    const dados = await lerJson(resposta);
    if (!resposta.ok) throw new Error(dados.erro || MENSAGEM_FALHA_PADRAO);
    renderizarEtapas(etapas, dados.etapa_atual || 0, dados.estado);
    if (dados.estado === "concluida") return dados.relatorio;
    if (dados.estado === "erro") throw new Error(dados.erro || MENSAGEM_FALHA_PADRAO);
  }
}

async function analisar(evento) {
  evento.preventDefault();
  pararDigitacao();
  esconderErroFormulario();
  const tese = validarFormulario();
  if (tese === null) return;

  const dadosFormulario = new FormData();
  for (const arquivo of arquivos.values()) dadosFormulario.append("documentos", arquivo, arquivo.name);
  dadosFormulario.append("tese", tese);

  const botao = $("botao-analisar");
  botao.disabled = true;

  try {
    let resposta;
    try {
      resposta = await fetch("/api/analises", { method: "POST", body: dadosFormulario });
    } catch {
      throw new Error(MENSAGEM_SEM_CONEXAO);
    }
    const dados = await lerJson(resposta);
    if (!resposta.ok) {
      mostrarErroFormulario(dados.erro || MENSAGEM_FALHA_PADRAO, $("botao-analisar"));
      return;
    }

    analiseAtualId = dados.id;
    $("etapas").replaceChildren();
    renderizarEtapas(dados.etapas, 1, "processando");
    mostrarTela("progresso");
    $("titulo-progresso").focus();

    const relatorio = await acompanharAnalise(dados.id, dados.etapas);
    renderizarRelatorio(relatorio);
  } catch (erro) {
    $("erro-texto").textContent = erro.message || MENSAGEM_FALHA_PADRAO;
    mostrarTela("erro");
    $("titulo-erro").focus();
  } finally {
    botao.disabled = false;
  }
}

/* ---------- relatório ---------- */

function renderizarAchado(achado) {
  const categoria = CATEGORIAS[achado.categoria] || { rotulo: "Apontamento" };
  const origem = ORIGENS[achado.provenance] || ORIGENS.UNVERIFIED;

  const cartao = el("article", { classe: "achado", id: idDoAchado(achado.id), tabindex: "-1" }, [
    el("div", { classe: "achado-topo" }, [
      el("span", { classe: "achado-categoria", texto: nomesDosAchados.get(achado.id) || categoria.rotulo }),
      el("span", { classe: `etiqueta ${origem.classe}`, texto: origem.rotulo }),
    ]),
    el("p", { classe: "achado-texto", texto: achado.texto }),
  ]);

  if (achado.origem && achado.origem.length) {
    const lista = el("ul");
    achado.origem.forEach((citacao) => {
      lista.appendChild(
        el("li", { classe: "origem" }, [
          el("span", { classe: "origem-linha" }, [
            el("span", { classe: "origem-documento", texto: citacao.documento }),
            seloConferencia(citacao.conferido),
          ]),
          citacao.trecho ? el("span", { classe: "origem-trecho", texto: `“${citacao.trecho}”` }) : null,
        ])
      );
    });
    cartao.appendChild(
      el("div", { classe: "origens" }, [el("p", { classe: "origens-titulo", texto: "Onde está nos documentos" }), lista])
    );
  }
  return el("li", {}, [cartao]);
}

function renderizarRelatorio(relatorio) {
  pararLeitura();

  // "Falta de prova 2", "Contradição 1"...: o mesmo nome aparece no cartão e nos vínculos do plano.
  nomesDosAchados = new Map();
  const contagemPorCategoria = {};
  (relatorio.findings || []).forEach((achado) => {
    const categoria = CATEGORIAS[achado.categoria];
    if (!categoria) return;
    contagemPorCategoria[achado.categoria] = (contagemPorCategoria[achado.categoria] || 0) + 1;
    nomesDosAchados.set(achado.id, `${categoria.rotulo} ${contagemPorCategoria[achado.categoria]}`);
  });
  $("resumo-caso").textContent = relatorio.resumo_do_caso;
  $("tese-analisada").textContent = relatorio.tese_analisada;

  const porGrupo = Object.fromEntries(GRUPOS.map((g) => [g.id, []]));
  (relatorio.findings || []).forEach((achado) => {
    const categoria = CATEGORIAS[achado.categoria];
    if (categoria) porGrupo[categoria.grupo].push(achado);
  });

  const placar = $("placar");
  placar.replaceChildren(
    ...GRUPOS.filter((g) => g.placar).map((grupo) => {
      const total = porGrupo[grupo.id].length;
      return el("li", { classe: grupo.classe }, [
        el("span", { classe: "placar-numero", texto: String(total) }),
        el("span", { classe: "placar-rotulo", texto: plural(total, grupo.placar) }),
      ]);
    })
  );

  const containerGrupos = $("grupos");
  containerGrupos.replaceChildren();
  let totalAchados = 0;
  GRUPOS.forEach((grupo) => {
    const itens = porGrupo[grupo.id];
    if (!itens.length) return;
    totalAchados += itens.length;
    const idTitulo = `grupo-${grupo.id}`;
    containerGrupos.appendChild(
      el("section", { classe: `grupo ${grupo.classe}`, "aria-labelledby": idTitulo }, [
        el("div", { classe: "grupo-cabecalho" }, [
          el("h3", { id: idTitulo, texto: grupo.titulo }),
          el("p", { texto: grupo.descricao }),
        ]),
        el("ol", { classe: "grupo-lista" }, itens.map(renderizarAchado)),
      ])
    );
  });
  if (!totalAchados) {
    containerGrupos.appendChild(
      el("p", { classe: "sem-achados", texto: "Não encontramos pontos vulneráveis com base nos documentos enviados." })
    );
  }

  revelarAoRolar(document.querySelectorAll("#placar li, #grupos .grupo-cabecalho, #grupos .achado"));

  $("avisos").replaceChildren(...(relatorio.avisos || []).map((aviso) => el("p", { texto: aviso })));

  $("contador-pontos").textContent = String(totalAchados);
  renderizarLinhaDoTempo(relatorio.linha_do_tempo || []);
  renderizarPlano(relatorio.plano_de_provas, relatorio.findings || []);
  prepararAudiencia(
    (relatorio.findings || []).filter((achado) => achado.categoria === "pergunta_dificil").map((achado) => achado.texto)
  );
  selecionarAba("pontos", false);

  mostrarTela("relatorio");
  $("titulo-relatorio").focus();
  anunciar(`Relatório pronto, com ${totalAchados} ${plural(totalAchados, ["apontamento", "apontamentos"])}.`);
}

/* ==========================================================================
   Relatório em abas: pontos vulneráveis, linha do tempo, plano de provas e
   simulação de audiência.
   ========================================================================== */

let nomesDosAchados = new Map();
let analiseAtualId = null;

const ABAS = ["pontos", "linha", "plano", "audiencia"];

function idDoAchado(id) {
  return `achado-${String(id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function selecionarAba(nome, focar = true) {
  ABAS.forEach((aba) => {
    const ativa = aba === nome;
    const botao = $(`aba-${aba}`);
    botao.setAttribute("aria-selected", String(ativa));
    botao.tabIndex = ativa ? 0 : -1;
    $(`painel-${aba}`).hidden = !ativa;
  });
  if (focar) $(`aba-${nome}`).focus();
}

function configurarAbas() {
  ABAS.forEach((aba, indice) => {
    const botao = $(`aba-${aba}`);
    botao.addEventListener("click", () => selecionarAba(aba));
    botao.addEventListener("keydown", (evento) => {
      const destino = { ArrowRight: indice + 1, ArrowLeft: indice - 1, Home: 0, End: ABAS.length - 1 }[evento.key];
      if (destino === undefined) return;
      evento.preventDefault();
      selecionarAba(ABAS[(destino + ABAS.length) % ABAS.length]);
    });
  });
}

// Resultado da conferência feita pelo servidor: o trecho existe (ou não) no documento enviado.
function seloConferencia(conferido) {
  if (conferido === true) return el("span", { classe: "selo-conferido", texto: "✓ Trecho conferido no documento" });
  if (conferido === false) return el("span", { classe: "selo-confira", texto: "Não localizamos este trecho exato — confira" });
  return null;
}

function irParaAchado(id) {
  const alvo = $(idDoAchado(id));
  if (!alvo) return;
  selecionarAba("pontos", false);
  alvo.classList.add("revelado");
  alvo.scrollIntoView({ behavior: movimentoReduzido() ? "auto" : "smooth", block: "center" });
  alvo.focus({ preventScroll: true });
  alvo.classList.remove("destacado");
  void alvo.offsetWidth; // reinicia a animação de destaque
  alvo.classList.add("destacado");
}

/* ---------- linha do tempo ---------- */

function renderizarLinhaDoTempo(eventos) {
  const lista = $("linha-do-tempo");
  const divergentes = eventos.filter((evento) => evento.divergencia).length;
  $("contador-linha").textContent = eventos.length ? String(eventos.length) : "";
  $("resumo-linha").textContent = eventos.length
    ? `${eventos.length} ${plural(eventos.length, ["fato com data", "fatos com data"])}` +
      (divergentes ? ` · ${divergentes} ${plural(divergentes, ["ponto com versões diferentes", "pontos com versões diferentes"])}` : "")
    : "Os documentos não trazem datas suficientes para montar a linha do tempo.";

  lista.replaceChildren(
    ...eventos.map((evento) =>
      el("li", { classe: `evento${evento.divergencia ? " evento-divergente" : ""}` }, [
        el("span", { classe: "evento-marcador", "aria-hidden": "true" }),
        el("p", { classe: "evento-data", texto: evento.data }),
        el("div", { classe: "evento-corpo" }, [
          el("p", { classe: "evento-texto", texto: evento.evento }),
          el("p", { classe: "evento-fonte", texto: [`Segundo ${evento.documento}`, evento.quem_afirma].filter(Boolean).join(" · ") }),
          evento.trecho ? el("p", { classe: "evento-trecho", texto: `“${evento.trecho}”` }) : null,
          evento.trecho ? seloConferencia(evento.trecho_conferido) : null,
          evento.divergencia
            ? el("p", { classe: "evento-divergencia" }, [
                el("strong", { texto: "Versões diferentes: " }),
                document.createTextNode(evento.divergencia),
              ])
            : null,
        ]),
      ])
    )
  );
  revelarAoRolar(lista.querySelectorAll(".evento"));
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
  $("progresso-plano").textContent = caixas.length
    ? `${feitas} de ${caixas.length} ${plural(caixas.length, ["prova providenciada", "provas providenciadas"])}`
    : "";
}

function renderizarItemPlano(item) {
  const idCaixa = `prova-${(contadorItensPlano += 1)}`;
  const caixa = el("input", { type: "checkbox", id: idCaixa, classe: "plano-marcar" });
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
    el("div", { classe: "item-plano-corpo" }, [
      el("label", { for: idCaixa, classe: "item-plano-prova", texto: item.prova }),
      item.finalidade ? el("p", { classe: "item-plano-finalidade", texto: item.finalidade }) : null,
      item.como_obter
        ? el("p", { classe: "item-plano-obter" }, [el("strong", { texto: "Como obter: " }), document.createTextNode(item.como_obter)])
        : null,
      vinculos.length ? el("div", { classe: "item-plano-vinculos" }, [el("span", { texto: "Resolve:" }), ...vinculos]) : null,
    ]),
  ]);
}

function renderizarPlano(itens) {
  const container = $("plano-de-provas");
  container.replaceChildren();

  if (!Array.isArray(itens)) {
    $("contador-plano").textContent = "";
    $("progresso-plano").textContent = "";
    container.appendChild(
      el("p", { classe: "sem-achados", texto: "Não foi possível montar o plano de provas desta vez. Os demais resultados do relatório continuam válidos." })
    );
    return;
  }

  $("contador-plano").textContent = itens.length ? String(itens.length) : "";
  if (!itens.length) {
    container.appendChild(el("p", { classe: "sem-achados", texto: "Nenhuma prova adicional foi sugerida para este caso." }));
  }
  PRIORIDADES.forEach(([chave, titulo]) => {
    const doGrupo = itens.filter((item) => item.prioridade === chave);
    if (!doGrupo.length) return;
    const idTitulo = `plano-${chave}`;
    container.appendChild(
      el("section", { classe: `plano-grupo prioridade-${chave}`, "aria-labelledby": idTitulo }, [
        el("h4", { id: idTitulo, classe: "plano-grupo-titulo", texto: `${titulo} (${doGrupo.length})` }),
        el("ul", { classe: "plano-lista" }, doGrupo.map(renderizarItemPlano)),
      ])
    );
  });
  atualizarProgressoPlano();
}

/* ---------- simulação de audiência ---------- */

const AVALIACOES = {
  convincente: { rotulo: "Resposta convincente", classe: "etiqueta-fato" },
  parcial: { rotulo: "Convence em parte", classe: "etiqueta-sembase" },
  fragil: { rotulo: "Resposta frágil", classe: "etiqueta-fragil" },
};

const audiencia = { perguntas: [], indice: 0, perguntaAtual: "", ehReplica: false, resultados: [], enviando: false };

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
  botao.textContent = "Falar a resposta";
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
  };
  reconhecimento.onerror = (evento) => {
    pararDitado();
    if (evento.error === "not-allowed" || evento.error === "service-not-allowed") {
      const erro = $("audiencia-erro");
      erro.textContent = "Não foi possível usar o microfone. Permita o acesso ao microfone no navegador ou digite a resposta.";
      erro.hidden = false;
    }
  };
  reconhecimento.onend = () => { if (ditado === reconhecimento) pararDitado(); };
  ditado = reconhecimento;
  reconhecimento.start();
  const botao = $("ditar-resposta");
  botao.setAttribute("aria-pressed", "true");
  botao.textContent = "Parar de falar";
}

function balao(autor, texto, classe) {
  return el("div", { classe: `balao ${classe}` }, [el("span", { classe: "balao-autor", texto: autor }), el("p", { texto })]);
}

function mostrarPergunta(texto, ehReplica) {
  audiencia.perguntaAtual = texto;
  audiencia.ehReplica = ehReplica;
  const posicao = `pergunta ${audiencia.indice + 1} de ${audiencia.perguntas.length}`;
  $("audiencia-contador").textContent = ehReplica ? `Réplica · ${posicao}` : posicao.replace(/^p/, "P");
  $("audiencia-pergunta").textContent = texto;
  $("resposta-audiencia").value = "";
  $("audiencia-erro").hidden = true;
  $("audiencia-form").hidden = false;
  $("pular-pergunta").textContent = ehReplica ? "Pular réplica" : "Pular pergunta";
}

function prepararAudiencia(perguntas) {
  pararDitado();
  audiencia.perguntas = perguntas;
  audiencia.indice = 0;
  audiencia.resultados = [];
  $("audiencia-transcricao").replaceChildren();
  $("contador-audiencia").textContent = perguntas.length ? String(perguntas.length) : "";
  $("audiencia-fim").hidden = true;
  if (!perguntas.length) {
    $("audiencia-form").hidden = true;
    $("audiencia-fim-titulo").textContent = "Sem perguntas para simular";
    $("audiencia-fim-resumo").textContent = "Este relatório não trouxe perguntas difíceis para a simulação.";
    $("recomecar-audiencia").hidden = true;
    $("audiencia-fim").hidden = false;
    return;
  }
  $("recomecar-audiencia").hidden = false;
  mostrarPergunta(perguntas[0], false);
}

function avancarPergunta() {
  audiencia.indice += 1;
  if (audiencia.indice >= audiencia.perguntas.length) {
    encerrarAudiencia();
    return;
  }
  mostrarPergunta(audiencia.perguntas[audiencia.indice], false);
  $("audiencia-form").scrollIntoView({ block: "nearest", behavior: movimentoReduzido() ? "auto" : "smooth" });
  $("resposta-audiencia").focus({ preventScroll: true });
}

function encerrarAudiencia() {
  pararDitado();
  $("audiencia-form").hidden = true;
  const respondidas = audiencia.resultados.filter(Boolean);
  const contar = (tipo) => respondidas.filter((resultado) => resultado === tipo).length;
  const partes = [
    ["convincente", ["resposta convincente", "respostas convincentes"]],
    ["parcial", ["resposta que convence em parte", "respostas que convencem em parte"]],
    ["fragil", ["resposta frágil", "respostas frágeis"]],
  ]
    .map(([tipo, rotulos]) => [contar(tipo), rotulos])
    .filter(([total]) => total)
    .map(([total, rotulos]) => `${total} ${plural(total, rotulos)}`);

  $("audiencia-fim-titulo").textContent = "Simulação concluída";
  $("audiencia-fim-resumo").textContent = respondidas.length
    ? `Resultado: ${partes.join(", ")}.${contar("fragil") ? " Vale revisar as respostas frágeis antes da audiência." : ""}`
    : "Nenhuma pergunta foi respondida.";
  $("audiencia-fim").hidden = false;
  $("audiencia-fim-titulo").focus();
}

function renderizarAvaliacao(avaliacao, tipo) {
  const bloco = (titulo, itens, classe) =>
    itens && itens.length
      ? el("div", { classe: `avaliacao-bloco ${classe}` }, [el("h5", { texto: titulo }), el("ul", {}, itens.map((texto) => el("li", { texto })))])
      : null;
  const apoio = avaliacao.apoio_nos_documentos || [];

  return el("div", { classe: "avaliacao", tabindex: "-1" }, [
    el("div", { classe: "avaliacao-topo" }, [el("span", { classe: `etiqueta ${tipo.classe}`, texto: tipo.rotulo })]),
    avaliacao.resumo ? el("p", { classe: "avaliacao-resumo", texto: avaliacao.resumo }) : null,
    el("div", { classe: "avaliacao-colunas" }, [
      bloco("O que funcionou", avaliacao.pontos_fortes, "bloco-forte"),
      bloco("O que ficou frágil", avaliacao.pontos_frageis, "bloco-fragil"),
    ]),
    avaliacao.sugestao
      ? el("div", { classe: "avaliacao-sugestao" }, [el("h5", { texto: "Como fortalecer a resposta" }), el("p", { texto: avaliacao.sugestao })])
      : null,
    apoio.length
      ? el("div", { classe: "origens" }, [
          el("p", { classe: "origens-titulo", texto: "Onde está nos documentos" }),
          el("ul", {}, apoio.map((citacao) =>
            el("li", { classe: "origem" }, [
              el("span", { classe: "origem-linha" }, [el("span", { classe: "origem-documento", texto: citacao.documento }), seloConferencia(citacao.conferido)]),
              citacao.trecho ? el("span", { classe: "origem-trecho", texto: `“${citacao.trecho}”` }) : null,
            ])
          )),
        ])
      : null,
    avaliacao.replica ? balao("Réplica da parte contrária", avaliacao.replica, "balao-contrario balao-replica") : null,
    el("div", { classe: "avaliacao-acoes" }),
  ]);
}

function registrarRodada(resposta, avaliacao) {
  audiencia.resultados[audiencia.indice] = avaliacao.avaliacao;
  const tipo = AVALIACOES[avaliacao.avaliacao] || AVALIACOES.parcial;
  const cartao = renderizarAvaliacao(avaliacao, tipo);
  const rodada = el("article", { classe: "rodada" }, [
    balao("Advogado(a) da parte contrária", audiencia.perguntaAtual, "balao-contrario"),
    balao("Você", resposta, "balao-voce"),
    cartao,
  ]);
  $("audiencia-transcricao").appendChild(rodada);
  $("audiencia-form").hidden = true;

  const acoes = cartao.querySelector(".avaliacao-acoes");
  const ultima = audiencia.indice >= audiencia.perguntas.length - 1;
  if (avaliacao.replica) {
    const responder = el("button", { type: "button", classe: "botao-secundario", texto: "Responder à réplica" });
    responder.addEventListener("click", () => {
      acoes.replaceChildren();
      mostrarPergunta(avaliacao.replica, true);
      $("resposta-audiencia").focus();
    });
    acoes.appendChild(responder);
  }
  const seguir = el("button", {
    type: "button",
    classe: avaliacao.replica ? "botao-texto" : "botao-secundario",
    texto: ultima ? "Encerrar simulação" : "Próxima pergunta",
  });
  seguir.addEventListener("click", () => {
    acoes.replaceChildren();
    avancarPergunta();
  });
  acoes.appendChild(seguir);

  cartao.scrollIntoView({ block: "start", behavior: movimentoReduzido() ? "auto" : "smooth" });
  cartao.focus({ preventScroll: true });
  anunciar(`${tipo.rotulo}. ${avaliacao.resumo || ""}`);
}

async function enviarRespostaAudiencia(evento) {
  evento.preventDefault();
  if (audiencia.enviando) return;
  pararDitado();
  const erro = $("audiencia-erro");
  const resposta = $("resposta-audiencia").value.trim();
  if (!resposta) {
    erro.textContent = "Escreva ou fale a sua resposta antes de enviar.";
    erro.hidden = false;
    $("resposta-audiencia").focus();
    return;
  }
  if (!analiseAtualId) {
    erro.textContent = "Faça uma nova análise para usar a simulação de audiência.";
    erro.hidden = false;
    return;
  }

  audiencia.enviando = true;
  erro.hidden = true;
  const botao = $("enviar-resposta");
  botao.disabled = true;
  botao.textContent = "Avaliando a sua resposta…";
  anunciar("Avaliando a sua resposta.");
  try {
    let respostaHttp;
    try {
      respostaHttp = await fetch(`/api/analises/${encodeURIComponent(analiseAtualId)}/audiencia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: audiencia.perguntaAtual, resposta }),
      });
    } catch {
      throw new Error(MENSAGEM_SEM_CONEXAO);
    }
    const dados = await lerJson(respostaHttp);
    if (!respostaHttp.ok) throw new Error(dados.erro || MENSAGEM_FALHA_PADRAO);
    registrarRodada(resposta, dados);
  } catch (falha) {
    erro.textContent = falha.message || MENSAGEM_FALHA_PADRAO;
    erro.hidden = false;
  } finally {
    audiencia.enviando = false;
    botao.disabled = false;
    botao.textContent = "Enviar resposta";
  }
}

function configurarAudiencia() {
  $("audiencia-form").addEventListener("submit", enviarRespostaAudiencia);
  $("pular-pergunta").addEventListener("click", () => { pararDitado(); avancarPergunta(); });
  $("recomecar-audiencia").addEventListener("click", () => {
    prepararAudiencia(audiencia.perguntas.slice());
    $("resposta-audiencia").focus();
  });

  if (Reconhecimento) {
    $("ditar-resposta").hidden = false;
    $("ditar-resposta").addEventListener("click", alternarDitado);
  }

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
  document.querySelectorAll("#grupos .grupo").forEach((grupo) => {
    partes.push(grupo.querySelector("h3").textContent);
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
  botao.textContent = "Ouvir relatório";
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
  botao.textContent = "Parar leitura";

  partes.forEach((texto, i) => {
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = "pt-BR";
    if (voz) fala.voice = voz;
    fala.rate = 1;
    if (i === partes.length - 1) fala.onend = pararLeitura;
    sintese.speak(fala);
  });
}

/* ==========================================================================
   Inicialização
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  configurarPainelAcessibilidade();
  configurarEnvioDeArquivos();
  carregarExemplos();
  animarTitulo();
  digitarExemploDaTese();
  $("tese").addEventListener("focus", pararDigitacao);
  configurarAbas();
  configurarAudiencia();

  $("form-analise").addEventListener("submit", analisar);
  $("botao-tentar-de-novo").addEventListener("click", () => { mostrarTela("formulario"); $("documentos").focus(); });
  $("nova-analise").addEventListener("click", () => { pararLeitura(); mostrarTela("formulario"); $("tese").focus(); });
  $("imprimir-relatorio").addEventListener("click", () => window.print());

  if ("speechSynthesis" in window) {
    $("ouvir-relatorio").addEventListener("click", alternarLeitura);
    window.speechSynthesis.getVoices();
  } else {
    $("ouvir-relatorio").hidden = true;
  }
});
