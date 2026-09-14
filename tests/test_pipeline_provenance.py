"""Valida SC-004 do spec e a Constituição, Princípio I: todo Finding tem proveniência, e
FACT/SOURCE sempre carregam origem rastreável.

Usa a fixture de sessão `relatorio_case_01` (conftest.py) — compartilhada com os demais
testes deste caso, em vez de rodar o pipeline de novo.
"""

from app.schemas import Provenance


def test_todos_os_findings_tem_provenance(relatorio_case_01):
    assert relatorio_case_01.findings, (
        "Pipeline não retornou nenhum finding para o Caso Fictício #1"
    )

    for finding in relatorio_case_01.findings:
        assert finding.provenance is not None
        assert isinstance(finding.provenance, Provenance)


def test_fact_e_source_sempre_tem_origem(relatorio_case_01):
    for finding in relatorio_case_01.findings:
        if finding.provenance in (Provenance.FACT, Provenance.SOURCE):
            assert finding.origem, (
                f"Finding '{finding.texto}' tem provenance={finding.provenance} mas "
                "nenhuma citação de origem — viola a regra de validação de "
                "data-model.md (deveria ter sido rebaixado para UNVERIFIED)."
            )


def test_avisos_fixos_sempre_presentes(relatorio_case_01):
    texto_avisos = " ".join(relatorio_case_01.avisos).lower()
    assert "parecer jurídico" in texto_avisos
    assert "fictíci" in texto_avisos or "anonimizad" in texto_avisos
