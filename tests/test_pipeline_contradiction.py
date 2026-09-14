"""Valida SC-002 do spec: a contradição plantada no Caso Fictício #1 é encontrada
e nenhuma contradição inventada aparece.

Usa a fixture de sessão `relatorio_case_01` (conftest.py) — o pipeline roda uma única
vez para todo o arquivo/sessão, não uma vez por função de teste.

Testes heurísticos por natureza: a saída do LLM não é determinística palavra por palavra,
então checamos presença de conceitos-chave descritos em golden_dataset/case_01/gabarito.md
em vez de igualdade textual exata.
"""

from app.schemas import Categoria

PALAVRAS_PROIBIDAS = ["salário", "nascimento", "cláusula contratual"]


def test_contradicao_plantada_e_encontrada(relatorio_case_01):
    contradicoes = [
        f for f in relatorio_case_01.findings if f.categoria == Categoria.CONTRADICAO
    ]
    assert contradicoes, "Nenhuma contradição foi reportada para o Caso Fictício #1"

    texto_combinado = " ".join(
        f.texto + " " + " ".join(o.trecho for o in f.origem) for f in contradicoes
    ).lower()

    menciona_testemunha = any(
        termo in texto_combinado for termo in ("testemunha", "marcos")
    )
    menciona_horario = any(
        termo in texto_combinado for termo in ("19h", "18h", "07h30", "08h00", "sexta")
    )
    assert menciona_testemunha and menciona_horario, (
        "A contradição encontrada não parece referenciar a divergência entre a jornada "
        "alegada na petição e a jornada descrita pela testemunha do próprio autor "
        f"(gabarito.md). Findings de contradição: {[f.texto for f in contradicoes]}"
    )


def test_nenhuma_contradicao_inventada(relatorio_case_01):
    for finding in relatorio_case_01.findings:
        if finding.categoria != Categoria.CONTRADICAO:
            continue
        texto_lower = finding.texto.lower()
        for proibida in PALAVRAS_PROIBIDAS:
            assert proibida not in texto_lower, (
                f"Contradição parece inventada — menciona '{proibida}', que não está "
                f"em nenhum documento do Caso Fictício #1: {finding.texto}"
            )
