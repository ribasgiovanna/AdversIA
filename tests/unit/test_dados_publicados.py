"""Integridade dos dados que vão para o ar: casos de demonstração e golden dataset.

O modo demonstração serve arquivos estáticos (app/static/demo/). Estes testes garantem que
todo caso listado existe, que os relatórios têm a estrutura que a interface espera e que
nenhuma citação marcada como "conferida" deixa de existir no documento correspondente.
"""

import json
from pathlib import Path

import pytest

from app.pipeline import _trecho_consta

RAIZ = Path(__file__).resolve().parents[2]
DEMO = RAIZ / "app" / "static" / "demo"
GOLDEN = RAIZ / "golden_dataset"

INDICE = json.loads((DEMO / "indice.json").read_text(encoding="utf-8"))
CASOS = {
    caminho.stem: json.loads(caminho.read_text(encoding="utf-8"))
    for caminho in sorted((DEMO / "casos").glob("*.json"))
}
CHAVES_DO_RELATORIO = {
    "resumo_do_caso", "tese_analisada", "findings", "perguntas_dificeis",
    "linha_do_tempo", "plano_de_provas", "avisos",
}


def test_todo_caso_do_indice_tem_arquivo():
    ids = [item["id"] for item in INDICE]
    assert len(ids) == len(set(ids)), "id repetido em indice.json"
    assert set(ids) == set(CASOS), "indice.json e app/static/demo/casos/ estão diferentes"


@pytest.mark.parametrize("nome", sorted(CASOS))
def test_relatorio_tem_a_estrutura_esperada(nome):
    caso = CASOS[nome]
    assert caso["id"] == nome
    assert caso["documentos"] and caso["tese"].strip()
    assert CHAVES_DO_RELATORIO <= set(caso["relatorio"])


@pytest.mark.parametrize("nome", sorted(CASOS))
def test_citacoes_conferidas_existem_no_documento(nome):
    caso = CASOS[nome]
    documentos = {doc["nome"].strip().lower(): doc["conteudo"] for doc in caso["documentos"]}
    for finding in caso["relatorio"]["findings"]:
        for citacao in finding.get("origem", []):
            nome_doc = citacao["documento"].strip().lower()
            assert nome_doc in documentos, f"{finding['id']} cita um documento que não está no caso"
            if citacao.get("conferido") is True:
                assert _trecho_consta(citacao["trecho"], documentos[nome_doc]), (
                    f"{finding['id']}: trecho marcado como conferido não está em {nome_doc}"
                )


@pytest.mark.parametrize("caso", sorted(p.name for p in GOLDEN.iterdir() if p.is_dir()))
def test_golden_dataset_tem_tese_e_documentos(caso):
    diretorio = GOLDEN / caso
    assert (diretorio / "tese.txt").read_text(encoding="utf-8").strip()
    entradas = [p for p in diretorio.glob("*.txt") if p.name not in {"tese.txt", "gabarito.md"}]
    assert entradas, f"{caso} não tem documentos de entrada"
