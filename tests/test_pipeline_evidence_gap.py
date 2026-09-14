"""User Story 2: alegação sem evidência documental de suporte deve ser sinalizada como
`lacuna_probatoria` (spec.md, Acceptance Scenario da US2).

Usa a fixture de sessão `relatorio_case_01` (conftest.py) — compartilhada com os demais
testes deste caso, em vez de rodar o pipeline de novo.

Caso Fictício #1 pede "diferenças de comissões não pagas", mas a própria petição admite
não ter nenhum documento de suporte para esse pedido (golden_dataset/case_01/gabarito.md).
"""

from app.schemas import Categoria


def test_alegacao_sem_evidencia_e_sinalizada_como_lacuna(relatorio_case_01):
    lacunas = [
        f for f in relatorio_case_01.findings if f.categoria == Categoria.LACUNA_PROBATORIA
    ]
    assert lacunas, "Nenhuma lacuna probatória foi reportada para o Caso Fictício #1"

    texto_combinado = " ".join(f.texto for f in lacunas).lower()
    assert "comiss" in texto_combinado, (
        "O pedido de diferenças de comissões (sem nenhum documento de suporte, conforme "
        "gabarito.md) deveria ter sido sinalizado como lacuna probatória. "
        f"Lacunas encontradas: {[f.texto for f in lacunas]}"
    )
