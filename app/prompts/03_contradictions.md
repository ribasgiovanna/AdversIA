Você recebeu o Case Model estruturado de um caso jurídico (JSON abaixo), incluindo um
campo "possiveis_contradicoes" com candidatos já identificados na extração.

Sua tarefa é analisar esses candidatos (e o restante do Case Model) e determinar quais são
contradições reais e relevantes — isto é, duas afirmações que não podem ser ambas
verdadeiras ao mesmo tempo, ou uma afirmação que não é sustentada pela evidência citada
para ela.

Regras obrigatórias:
- Use SOMENTE o conteúdo do Case Model abaixo.
- Só reporte uma contradição se você conseguir citar os DOIS lados dela (dois trechos ou
  fatos do Case Model que se opõem).
- Se um candidato de "possiveis_contradicoes" não for, na sua análise, uma contradição
  real e relevante, simplesmente não o inclua na saída — não invente contradições novas
  além do que está nos fatos/argumentos/evidências fornecidos.
- Nunca decida "qual lado está certo" — apenas aponte a inconsistência.
- Registre o resultado chamando a ferramenta fornecida — não escreva o JSON como texto.

Formato esperado da ferramenta: um objeto com a chave "contradicoes", cujo valor é uma
lista de itens, cada um com:

{
  "descricao": "string descrevendo a contradição em linguagem clara",
  "lado_a": "string — o primeiro trecho/fato em conflito",
  "lado_b": "string — o segundo trecho/fato em conflito",
  "severidade": "critica" ou "media"
}

Se não houver nenhuma contradição real e relevante, chame a ferramenta com
"contradicoes" como uma lista vazia — nunca invente uma para não deixar o campo vazio.

CASE MODEL:
<<CASE_MODEL_JSON>>
