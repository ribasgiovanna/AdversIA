"""JSON Schemas usados nas chamadas de tool use (chamar_llm_estruturado).

Um schema por passo do pipeline — ver
specs/001-adversarial-vulnerability-report/data-model.md.
"""

_CITACAO = {
    "type": "object",
    "properties": {
        "documento": {"type": "string"},
        "trecho": {"type": "string"},
    },
    "required": ["documento", "trecho"],
}

CASE_MODEL_SCHEMA = {
    "type": "object",
    "properties": {
        "case_id": {"type": "string"},
        "partes": {"type": "array", "items": {"type": "string"}},
        "tipo_de_acao": {"type": "string", "description": "vazio se não identificável"},
        "jurisdicao": {"type": "string", "description": "vazio se não identificável"},
        "fatos": {"type": "array", "items": {"type": "string"}},
        "datas": {"type": "array", "items": {"type": "string"}},
        "pedidos": {"type": "array", "items": {"type": "string"}},
        "argumentos": {"type": "array", "items": {"type": "string"}},
        "evidencias": {"type": "array", "items": {"type": "string"}},
        "documentos": {"type": "array", "items": {"type": "string"}},
        "questoes_juridicas": {"type": "array", "items": {"type": "string"}},
        "informacoes_ausentes": {"type": "array", "items": {"type": "string"}},
        "possiveis_contradicoes": {"type": "array", "items": {"type": "string"}},
        "linha_do_tempo": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "data": {"type": "string"},
                    "data_ordenacao": {
                        "type": "string",
                        "description": "AAAA-MM-DD, AAAA-MM ou AAAA; vazio se não der para ordenar",
                    },
                    "evento": {"type": "string"},
                    "quem_afirma": {"type": "string"},
                    "documento": {"type": "string"},
                    "trecho": {"type": "string"},
                    "divergencia": {"type": "string"},
                },
                "required": ["data", "evento", "documento", "trecho"],
            },
        },
    },
    "required": [
        "case_id",
        "partes",
        "fatos",
        "pedidos",
        "argumentos",
        "evidencias",
        "documentos",
        "informacoes_ausentes",
        "linha_do_tempo",
    ],
}

EVIDENCE_MAPPING_SCHEMA = {
    "type": "object",
    "properties": {
        "mapeamentos": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "alegacao": {"type": "string"},
                    "evidencia_encontrada": {"type": "string"},
                    "categoria": {
                        "type": "string",
                        "enum": ["evidencia_mapeada", "lacuna_probatoria"],
                    },
                },
                "required": ["alegacao", "categoria"],
            },
        }
    },
    "required": ["mapeamentos"],
}

CONTRADICTIONS_SCHEMA = {
    "type": "object",
    "properties": {
        "contradicoes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "descricao": {"type": "string"},
                    "lado_a": {"type": "string"},
                    "lado_b": {"type": "string"},
                    "severidade": {"type": "string", "enum": ["critica", "media"]},
                },
                "required": ["descricao", "lado_a", "lado_b", "severidade"],
            },
        }
    },
    "required": ["contradicoes"],
}

ADVERSARIAL_ENGINE_SCHEMA = {
    "type": "object",
    "properties": {
        "contra_argumentos": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "texto": {"type": "string"},
                    "baseado_em": {"type": "string"},
                },
                "required": ["texto", "baseado_em"],
            },
        },
        "perguntas_dificeis": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "texto": {"type": "string"},
                    "baseado_em": {"type": "string"},
                },
                "required": ["texto", "baseado_em"],
            },
        },
    },
    "required": ["contra_argumentos", "perguntas_dificeis"],
}

VERIFICATION_SCHEMA = {
    "type": "object",
    "properties": {
        "findings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "categoria": {
                        "type": "string",
                        "enum": [
                            "contradicao",
                            "lacuna_probatoria",
                            "contra_argumento",
                            "pergunta_dificil",
                        ],
                    },
                    "texto": {"type": "string"},
                    "provenance": {
                        "type": "string",
                        "enum": [
                            "FACT",
                            "SOURCE",
                            "INFERENCE",
                            "ADVERSARIAL_HYPOTHESIS",
                            "UNVERIFIED",
                        ],
                    },
                    "origem": {"type": "array", "items": _CITACAO},
                },
                "required": ["id", "categoria", "texto", "provenance", "origem"],
            },
        }
    },
    "required": ["findings"],
}

PLANO_DE_PROVAS_SCHEMA = {
    "type": "object",
    "properties": {
        "itens": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "prova": {"type": "string"},
                    "finalidade": {"type": "string"},
                    "como_obter": {"type": "string"},
                    "prioridade": {"type": "string", "enum": ["alta", "media", "baixa"]},
                    "apontamentos": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["prova", "finalidade", "como_obter", "prioridade", "apontamentos"],
            },
        }
    },
    "required": ["itens"],
}

SIMULACAO_AUDIENCIA_SCHEMA = {
    "type": "object",
    "properties": {
        "avaliacao": {"type": "string", "enum": ["convincente", "parcial", "fragil"]},
        "resumo": {"type": "string"},
        "pontos_fortes": {"type": "array", "items": {"type": "string"}},
        "pontos_frageis": {"type": "array", "items": {"type": "string"}},
        "sugestao": {"type": "string"},
        "apoio_nos_documentos": {"type": "array", "items": _CITACAO},
        "replica": {"type": "string"},
    },
    "required": [
        "avaliacao",
        "resumo",
        "pontos_fortes",
        "pontos_frageis",
        "sugestao",
        "apoio_nos_documentos",
        "replica",
    ],
}
