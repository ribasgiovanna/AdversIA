"""User Story 3: o relatório deve conter ao menos 3 perguntas difíceis específicas ao
caso, não frases genéricas aplicáveis a qualquer processo (spec.md, Acceptance Scenario
da US3).

Usa a fixture de sessão `relatorio_case_01` (conftest.py) — compartilhada com os demais
testes deste caso, em vez de rodar o pipeline de novo.
"""

FRASES_GENERICAS_PROIBIDAS = [
    "há provas suficientes",
    "a parte cumpriu suas obrigações",
    "quais são os riscos deste processo",
]


def test_ao_menos_tres_perguntas_dificeis(relatorio_case_01):
    perguntas = relatorio_case_01.perguntas_dificeis
    assert len(perguntas) >= 3, (
        f"Esperado ao menos 3 perguntas difíceis, encontrado {len(perguntas)}: {perguntas}"
    )


def test_perguntas_nao_sao_genericas(relatorio_case_01):
    for pergunta in relatorio_case_01.perguntas_dificeis:
        pergunta_lower = pergunta.lower()
        for generica in FRASES_GENERICAS_PROIBIDAS:
            assert generica not in pergunta_lower, (
                f"Pergunta difícil parece genérica (não amarrada a fato específico do "
                f"caso): '{pergunta}'"
            )


def test_perguntas_referenciam_fatos_especificos_do_caso(relatorio_case_01):
    texto_combinado = " ".join(relatorio_case_01.perguntas_dificeis).lower()
    termos_especificos_do_caso = (
        "testemunha",
        "marcos",
        "whatsapp",
        "sexta",
        "jornada",
        "comiss",
    )
    assert any(termo in texto_combinado for termo in termos_especificos_do_caso), (
        "Nenhuma pergunta difícil referencia fatos específicos do Caso Fictício #1 "
        f"(testemunha, jornada, comissões, etc.): {relatorio_case_01.perguntas_dificeis}"
    )
