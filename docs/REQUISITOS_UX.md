# Requisitos de experiência de uso

Critérios usados no redesenho da interface (ADR-020). O público principal é um advogado
cansado, depois de horas estudando o caso: a tela precisa dizer, sem esforço, **onde olhar
e o que fazer em seguida**.

## Critérios e como foram aplicados

| Critério | O que diz | Como aparece na AdversIA |
|---|---|---|
| **Uma ação principal por tela** (Lei de Hick) | O tempo de decisão cresce com o número de opções. | Início com um único botão ("Experimentar com um caso"); cada tela tem um botão principal em bordô. |
| **Revelação progressiva** | Mostrar só o necessário em cada passo e deixar o secundário para depois. | Apontamentos, fatos e provas começam recolhidos; documentos e legenda abrem em janelas; a tese aparece em uma linha. |
| **Menor carga cognitiva** | A memória de trabalho é limitada; excesso de informação atrasa e confunde. | Textos de ajuda cortados para uma frase; menus substituídos por cartões com o nome do caso; placar resume o relatório antes dos detalhes. |
| **Visibilidade do estado do sistema** (Nielsen, heurística 1) | A pessoa sempre sabe onde está e o que está acontecendo. | Indicador de etapas (Caso → Análise → Relatório), barra de progresso com a etapa atual, abas com contadores. |
| **Reconhecer em vez de lembrar** (Nielsen, heurística 6) | Opções visíveis, sem depender de memória. | Filtro por tipo em botões, caso escolhido fixo na barra inferior, ícone e nome em cada tipo de apontamento. |
| **Estética e design minimalista** (Nielsen, heurística 8) | Informação irrelevante compete com a relevante. | Uma cor de marca e três cores com significado (ADR-019); espaçamento em múltiplos de 4 px; cantos e sombras padronizados. |
| **Efeito estética-usabilidade** | Interfaces agradáveis são percebidas como mais fáceis de usar. | Prévia visual do relatório no início, vidro fosco discreto, transições entre telas. |
| **Movimento com propósito** | Animação curta orienta a atenção; excesso distrai. | Transições de 0,2 a 0,4 s: troca de tela, abertura de seções, entrada das mensagens do chat. Tudo desligável ("Reduzir animações" ou preferência do sistema). |
| **Acessibilidade** | WCAG e acessibilidade como requisito, não enfeite. | Mantidos: VLibras, tamanho de texto, temas, alto contraste (sem vidro), teclado completo, leitor de tela, janelas nativas com foco preso. |

## Decisão técnica

A melhoria não depende de framework: está na arquitetura das telas, no texto e no
movimento. O front-end continua em HTML, CSS e JavaScript sem etapa de build, usando recursos
nativos do navegador: `<dialog>` para janelas, View Transitions para troca de telas e
transições CSS para abrir e fechar seções. Isso preserva o que já foi validado (modo
demonstração, área da gestão, acessibilidade) e mantém a publicação na Vercel sem mudanças.

## Fontes

- Nielsen Norman Group — [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/)
- Nielsen Norman Group — [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- Nielsen Norman Group — [Minimize Cognitive Load to Maximize Usability](https://www.nngroup.com/articles/minimize-cognitive-load/)
- Nielsen Norman Group — [Accordions on Desktop: When and How to Use](https://www.nngroup.com/articles/accordions-on-desktop/)
- Laws of UX — [Hick's Law](https://lawsofux.com/hicks-law/), [Cognitive Load](https://lawsofux.com/cognitive-load/), [Aesthetic-Usability Effect](https://lawsofux.com/aesthetic-usability-effect/)
- MDN — [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- Chrome for Developers — [Animate to height: auto](https://developer.chrome.com/docs/css-ui/animate-to-height-auto)
