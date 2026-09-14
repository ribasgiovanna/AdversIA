<!--
Sync Impact Report
Version change: (none) → 1.0.0
Modified principles: n/a (initial ratification)
Added sections:
  - Core Principles: I. Proveniência Obrigatória, II. Sem Preço Inventado,
    III. Citação Verificável, IV. MVP Leve e Agnóstico de Provedor,
    V. Dados Fictícios/Anonimizados
  - Disciplina de Escopo (Section 2)
  - Fonte Única da Verdade (Section 3)
  - Governance
Removed sections: none
Templates requiring follow-up: none — plan/spec/tasks templates consumed as-is
Deferred TODOs: none
-->

# AdversIA Constitution

## Core Principles

### I. Proveniência Obrigatória (NON-NEGOTIABLE)
Toda afirmação produzida pelo sistema DEVE carregar um rótulo de proveniência: `FACT`
(presente explicitamente nos documentos), `SOURCE` (fonte jurídica externa fornecida),
`INFERENCE` (conclusão derivada pelo modelo), `ADVERSARIAL_HYPOTHESIS` (argumento possível
da contraparte) ou `UNVERIFIED` (sem suporte suficiente). Uma hipótese NUNCA pode ser
apresentada como fato. Rationale: é o núcleo conceitual do produto — uma "camada de revisão
adversarial" só tem valor se o advogado souber distinguir o que é achado sólido do que é
especulação; é também exatamente o que a dimensão "Confiabilidade" da auditoria do
hackathon avalia.

### II. Sem Preço Inventado
Nenhum valor de custo de API, infraestrutura ou serviço externo pode ser inventado ou
estimado sem fonte. Onde o preço vigente não for consultado diretamente no provedor, o
sistema e a documentação DEVEM marcar explicitamente "preço atual deve ser consultado".
Rationale: preços de LLM mudam com frequência; uma estimativa inventada vira uma mentira
factual assim que fica desatualizada, e o produto lida com decisões profissionais que
podem depender desse número.

### III. Citação Verificável
Jurisprudência, legislação ou qualquer fonte jurídica externa só pode ser citada com
número de processo, ementa, artigo ou trecho específico se o texto correspondente tiver
sido fornecido no contexto da análise. Toda citação sem esse lastro DEVE ser marcada como
"não verificado, checar fonte original" e nunca apresentada como achado confiável.
Rationale: citar jurisprudência inexistente é o risco mais crítico do produto — destrói
a confiança do usuário mais rápido do que qualquer outro tipo de erro.

### IV. MVP Leve e Agnóstico de Provedor
O MVP do hackathon é construído como uma cadeia de prompts sobre um único provedor de LLM
(Anthropic/Claude, por decisão registrada em ADR-004), acessado por uma função isolada de
chamada de modelo. Backend pesado (framework web completo, banco relacional gerenciado,
banco vetorial, orquestração multiagente) só é adicionado quando resolver um problema real
e verificável no MVP, nunca por antecipação de uma fase futura (piloto/produção).
Lógica de negócio NUNCA pode ser acoplada diretamente a um provedor de IA específico.
Rationale: o tempo de hackathon é o recurso mais escasso do projeto: complexidade de
infraestrutura não pontua na auditoria e aumenta o risco de demo quebrada (ver
docs/RISKS.md); trocar de provedor no futuro não deve exigir reescrever o produto.

### V. Dados Fictícios/Anonimizados
Durante o hackathon, o sistema só pode ser alimentado com casos fictícios, de domínio
público ou anonimizados. Nenhum dado real e identificável de cliente pode ser enviado a
um provedor de IA externo neste projeto. Rationale: documentos jurídicos são
potencialmente sensíveis (sigilo profissional, LGPD); o hackathon não é o momento de
resolver retenção/anonimização de produção, então a mitigação é não usar dado real.

## Disciplina de Escopo

Nenhuma tarefa fora do MVP definido em `docs/BACKLOG.md` (bloco P0) pode ser implementada
antes de todo o bloco P0 estar completo e testado (Testes Internos/Externos do dia 1 do
hackathon). Tarefas P1/P2 só entram em execução depois que essa condição for satisfeita e
alguém validar explicitamente a mudança de prioridade. "O código roda" não é critério de
conclusão — toda tarefa concluída precisa de comportamento esperado, teste, evidência
(print/log) e documentação mínima, conforme já exigido pelo briefing do projeto.

## Fonte Única da Verdade

`docs/PRODUCT_SCOPE.md` é a fonte de verdade sobre o produto. Qualquer decisão de
implementação, spec ou plano que contradiga esse documento DEVE ser sinalizada
explicitamente antes de ser implementada — nunca implementada em silêncio. Decisões novas
ou revisadas são registradas em `docs/DECISIONS.md` no formato ADR (decisão, motivo,
alternativas, vantagens, desvantagens, risco, status).

## Governance

Esta constituição tem precedência sobre qualquer prática, template ou preferência
individual dentro deste repositório. Emendas exigem: (1) registro do motivo da mudança,
(2) atualização de versão conforme semver (MAJOR = remoção/redefinição incompatível de
princípio; MINOR = novo princípio ou seção; PATCH = clarificação sem mudança de regra),
(3) atualização da data de última emenda. Toda spec, plano ou tarefa gerada pelo spec-kit
neste projeto DEVE ser conferida contra os cinco princípios acima antes de avançar para
implementação; complexidade adicional (nova dependência, novo serviço externo, nova
camada de infraestrutura) deve ser justificada por escrito à luz do Princípio IV antes de
ser aceita.

**Version**: 1.0.0 | **Ratified**: 2026-09-12 | **Last Amended**: 2026-09-12
