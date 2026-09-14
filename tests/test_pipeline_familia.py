"""Valida que o pipeline generaliza para o domínio de Direito de Família (pivô do
produto — ver docs/ANALISE_CASOS_FAMILIA.md), não só para o caso trabalhista original.

Usa a fixture de sessão `relatorio_case_familia_01` (conftest.py) — o pipeline roda uma
única vez para todo o arquivo/sessão, não uma vez por função de teste.

Caso Fictício de Família #1 (`golden_dataset/case_familia_01`) é uma disputa de partilha
de bens sem contradição factual "gotcha" — o valor esperado aqui é mapeamento de lacunas
probatórias e perguntas difíceis específicas ao domínio (ver gabarito.md).
"""

from app.schemas import Categoria


def test_lacunas_probatorias_de_partilha_sao_sinalizadas(relatorio_case_familia_01):
    lacunas = [
        f
        for f in relatorio_case_familia_01.findings
        if f.categoria == Categoria.LACUNA_PROBATORIA
    ]
    assert lacunas, "Nenhuma lacuna probatória foi reportada para o Caso de Família #1"

    texto_combinado = " ".join(f.texto for f in lacunas).lower()
    menciona_administracao_ou_socia = any(
        termo in texto_combinado for termo in ("administra", "sócia", "socia")
    )
    assert menciona_administracao_ou_socia, (
        "Esperava-se que a falta de prova formal da administração/sociedade da Autora "
        f"fosse sinalizada como lacuna probatória. Lacunas encontradas: "
        f"{[f.texto for f in lacunas]}"
    )


def test_nenhuma_conclusao_de_merito_apresentada_como_fato(relatorio_case_familia_01):
    for finding in relatorio_case_familia_01.findings:
        assert finding.provenance.value != "FACT" or finding.categoria not in (
            Categoria.CONTRA_ARGUMENTO,
            Categoria.PERGUNTA_DIFICIL,
        ), (
            f"Finding '{finding.texto}' foi apresentado como FACT, mas é uma questão de "
            "mérito jurídico em aberto (quem tem direito à partilha) — deveria ser "
            "INFERENCE ou ADVERSARIAL_HYPOTHESIS, nunca FACT."
        )


def test_perguntas_dificeis_referenciam_partilha_de_bens(relatorio_case_familia_01):
    perguntas = relatorio_case_familia_01.perguntas_dificeis
    assert len(perguntas) >= 2, (
        f"Esperado ao menos 2 perguntas difíceis, encontrado {len(perguntas)}"
    )

    texto_combinado = " ".join(perguntas).lower()
    termos_especificos = ("empresa", "imóvel", "sócia", "administr", "patrimôni", "recursos")
    assert any(termo in texto_combinado for termo in termos_especificos), (
        "Nenhuma pergunta difícil referencia os fatos específicos do Caso de Família #1 "
        f"(empresa, imóvel, sociedade, patrimônio): {perguntas}"
    )
