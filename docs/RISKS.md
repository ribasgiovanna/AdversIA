# Risk Register — AdversIA

| Risco | Categoria | Probabilidade | Impacto | Mitigação | Status |
|---|---|---|---|---|---|
| Alucinação de jurisprudência/artigo de lei | Técnico | Média | Alto | Não citar fonte externa sem que o texto tenha sido fornecido no prompt (ADR-002) | Aberto |
| Demo quebrada no dia da auditoria | Hackathon | Média | Alto | Pipeline simples, sem dependências externas frágeis (ADR-001) | Aberto |
| Parsing incorreto de PDF real (assinatura, imagem escaneada) | Técnico | Média | Médio | Fallback: colar texto manualmente se extração falhar | Aberto |
| Falso positivo de contradição | Produto | Média | Alto | Etapa de verificação obrigatória (Prompt 5) + revisão humana no relatório | Aberto |
| Uso indevido como aconselhamento jurídico autônomo | Jurídico | Baixa-Média | Alto | Disclaimer explícito no relatório: "não é parecer jurídico, requer revisão humana" | Aberto |
| Dado sensível de cliente exposto a provedor de LLM | Jurídico/Privacidade | Média | Alto | Usar só casos fictícios/públicos/anonimizados no hackathon | Mitigado (regra de uso) |
| Escopo maior que o tempo disponível | Hackathon | Alta | Alto | MVP cortado nas seções 30/31 do Foundation v1 | Aberto |
| Falta de evidência de teste (checkpoint sem evidência = checkpoint não existe) | Hackathon | Média | Alto | Print/log de cada teste salvo no repositório imediatamente após rodar | Aberto |
| Chave de API exposta no front-end (ADR-005) | Técnico/Segurança | Média | Médio | Servidor mínimo como proxy; nunca colocar a chave no HTML/JS do cliente | Mitigado (código) |
| Dado de criança/adolescente em caso de guarda (LGPD art. 14) | Jurídico/Privacidade | Baixa | Alto | Checkbox obrigatório de confirmação de dado fictício/anonimizado (index.html); nenhuma validação técnica adicional — depende do usuário | Aberto (mitigação parcial) |
| Transferência internacional de dado a provedor de LLM (LGPD art. 33) | Jurídico/Privacidade | Alta (por design — toda análise usa a API da Anthropic) | Médio (só ocorre com dado fictício no hackathon) | Regra de uso: nunca enviar dado real de cliente neste MVP (docs/CONFORMIDADE.md, seção 2) | Aberto (mitigação por processo) |
| DoS por upload muito grande / Content-Length falso | Técnico/Segurança | Baixa (demo local) | Médio | Limite de 15MB no corpo da requisição, erro 413 (app/server.py) | Mitigado (código) |
| Path traversal ao servir arquivos estáticos | Técnico/Segurança | Baixa | Alto | Checagem de que o caminho resolvido continua dentro de app/static/ (app/server.py) | Mitigado (código) |

**Schema de referência (para novos riscos):**

```json
{
  "risco": "",
  "probabilidade": "baixa|media|alta",
  "impacto": "baixo|medio|alto",
  "mitigacao": "",
  "responsavel": ""
}
```
