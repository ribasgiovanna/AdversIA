Você recebeu o Case Model estruturado de um caso jurídico (JSON abaixo). Sua tarefa é
mapear cada alegação/pedido do campo "argumentos"/"pedidos" à evidência correspondente no
campo "evidencias", ou sinalizar explicitamente que não há evidência de suporte.

Regras obrigatórias:
- Use SOMENTE o conteúdo do Case Model abaixo — não volte a inventar fatos que não estão
  nele.
- Para cada alegação SEM evidência de suporte, gere um item com "categoria":
  "lacuna_probatoria".
- Não afirme que uma alegação está "provada" — apenas indique se há ou não evidência
  citada no Case Model para ela.
- Registre o resultado chamando a ferramenta fornecida — não escreva o JSON como texto.

Formato esperado da ferramenta: um objeto com a chave "mapeamentos", cujo valor é uma
lista de itens, cada um com:

{
  "alegacao": "string, copiada ou parafraseada de 'argumentos'/'pedidos'",
  "evidencia_encontrada": "string, citando o item de 'evidencias' correspondente, ou string vazia se não houver",
  "categoria": "evidencia_mapeada" ou "lacuna_probatoria"
}

CASE MODEL:
<<CASE_MODEL_JSON>>
