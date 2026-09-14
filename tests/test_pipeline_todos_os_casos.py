"""Teste de ponta-a-ponta genérico: roda o pipeline contra TODOS os casos do
golden_dataset/ automaticamente (descobertos por diretório, não por nome fixo), para
garantir que nada quebra quando um caso novo é adicionado — sem precisar escrever um
teste dedicado para cada um.

Complementa (não substitui) os testes com asserções específicas de cada caso em
tests/test_pipeline_*.py — aqueles validam QUALIDADE do achado; este valida que o
pipeline RODA sem erro e respeita as garantias estruturais mínimas para qualquer caso.
"""

from pathlib import Path

import pytest

from app.schemas import Provenance
from conftest import _carregar_caso, _obter_relatorio

GOLDEN_DATASET_DIR = Path(__file__).parent.parent / "golden_dataset"


def _listar_casos() -> list[str]:
    return sorted(
        p.name
        for p in GOLDEN_DATASET_DIR.iterdir()
        if p.is_dir() and (p / "tese.txt").is_file()
    )


@pytest.mark.parametrize("nome_caso", _listar_casos())
def test_pipeline_roda_de_ponta_a_ponta_sem_erro(nome_caso):
    documentos, tese = _carregar_caso(nome_caso)
    assert documentos, f"{nome_caso}: nenhum documento de entrada encontrado"
    assert tese, f"{nome_caso}: tese.txt vazio"

    relatorio = _obter_relatorio(nome_caso)

    # Garantias estruturais mínimas — válidas para QUALQUER caso, não só os 5 com
    # gabarito detalhado.
    assert relatorio.resumo_do_caso, f"{nome_caso}: resumo do caso vazio"
    assert len(relatorio.avisos) == 2, f"{nome_caso}: avisos fixos ausentes/alterados"

    nomes_documentos_validos = set(documentos.keys())
    for finding in relatorio.findings:
        assert finding.provenance is not None, f"{nome_caso}: finding sem provenance"
        assert isinstance(finding.provenance, Provenance)
        if finding.provenance in (Provenance.FACT, Provenance.SOURCE):
            assert finding.origem, (
                f"{nome_caso}: finding '{finding.texto[:80]}' com provenance="
                f"{finding.provenance} mas sem origem (deveria ter sido rebaixado)"
            )
        for citacao in finding.origem:
            assert citacao.documento in nomes_documentos_validos, (
                f"{nome_caso}: citação aponta para documento inexistente "
                f"'{citacao.documento}' — deveria ter sido descartada"
            )
