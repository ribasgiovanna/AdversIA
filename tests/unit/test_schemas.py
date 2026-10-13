"""Regras do modelo de dados que valem independentemente do que o modelo de IA devolver."""

from app.schemas import (
    AVISOS_FIXOS,
    Categoria,
    Citation,
    Finding,
    Provenance,
    VulnerabilityReport,
)


def test_fato_sem_origem_e_rebaixado_para_nao_verificado():
    finding = Finding(id="1", categoria=Categoria.CONTRADICAO, texto="t", provenance=Provenance.FACT)
    assert finding.provenance == Provenance.UNVERIFIED


def test_fonte_sem_origem_e_rebaixada_para_nao_verificada():
    finding = Finding(id="1", categoria=Categoria.CONTRADICAO, texto="t", provenance=Provenance.SOURCE)
    assert finding.provenance == Provenance.UNVERIFIED


def test_fato_com_origem_mantem_proveniencia():
    finding = Finding(
        id="1", categoria=Categoria.CONTRADICAO, texto="t", provenance=Provenance.FACT,
        origem=[Citation(documento="peticao.txt", trecho="trecho")],
    )
    assert finding.provenance == Provenance.FACT


def test_inferencia_nao_exige_origem():
    finding = Finding(id="1", categoria=Categoria.CONTRA_ARGUMENTO, texto="t", provenance=Provenance.INFERENCE)
    assert finding.provenance == Provenance.INFERENCE


def test_relatorio_sempre_traz_os_avisos_fixos():
    relatorio = VulnerabilityReport(resumo_do_caso="r", tese_analisada="t")
    assert relatorio.to_dict()["avisos"] == AVISOS_FIXOS
    # Cada relatório tem a própria lista: alterar uma não altera as outras.
    relatorio.avisos.append("extra")
    assert VulnerabilityReport(resumo_do_caso="r", tese_analisada="t").avisos == AVISOS_FIXOS


def test_perguntas_dificeis_sao_derivadas_dos_achados():
    relatorio = VulnerabilityReport(
        resumo_do_caso="r", tese_analisada="t",
        findings=[
            Finding(id="1", categoria=Categoria.PERGUNTA_DIFICIL, texto="Pergunta?", provenance=Provenance.INFERENCE),
            Finding(id="2", categoria=Categoria.CONTRADICAO, texto="Outra coisa", provenance=Provenance.INFERENCE),
        ],
    )
    assert relatorio.to_dict()["perguntas_dificeis"] == ["Pergunta?"]


def test_to_dict_serializa_enums_como_texto():
    finding = Finding(id="1", categoria=Categoria.LACUNA_PROBATORIA, texto="t", provenance=Provenance.INFERENCE)
    assert finding.to_dict()["categoria"] == "lacuna_probatoria"
    assert finding.to_dict()["provenance"] == "INFERENCE"
