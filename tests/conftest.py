import os
from pathlib import Path

import pytest

from app.env import carregar_dotenv
from app.llm_client import resumo_uso
from app.pipeline import analisar_caso

carregar_dotenv()

GOLDEN_DATASET_DIR = Path(__file__).parent.parent / "golden_dataset"

# Casos que não são documentos de entrada (metadados do golden dataset).
_ARQUIVOS_NAO_ENTRADA = {"tese.txt", "gabarito.md"}


def _carregar_caso(nome_caso: str) -> tuple[dict[str, str], str]:
    diretorio = GOLDEN_DATASET_DIR / nome_caso
    documentos = {}
    for arquivo in sorted(diretorio.glob("*.txt")):
        if arquivo.name in _ARQUIVOS_NAO_ENTRADA:
            continue
        documentos[arquivo.name] = arquivo.read_text(encoding="utf-8")
    tese = (diretorio / "tese.txt").read_text(encoding="utf-8").strip()
    return documentos, tese


def _exigir_api_key() -> None:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        pytest.skip(
            "ANTHROPIC_API_KEY não definida — testes de pipeline chamam a API real da "
            "Anthropic e são pulados sem credencial (ver quickstart.md)."
        )


@pytest.fixture
def caso_01():
    return _carregar_caso("case_01")


@pytest.fixture
def caso_familia_01():
    return _carregar_caso("case_familia_01")


@pytest.fixture
def caso_familia_02():
    return _carregar_caso("case_familia_02")


@pytest.fixture
def caso_familia_03():
    return _carregar_caso("case_familia_03")


@pytest.fixture(autouse=True)
def _skip_sem_api_key():
    _exigir_api_key()


# --- Relatórios cacheados por nome de caso ----------------------------------
#
# `_obter_relatorio()` chama `analisar_caso()` (5 chamadas reais ao modelo) UMA ÚNICA
# VEZ POR CASO POR EXECUÇÃO DO PROCESSO — cache simples por nome, não uma fixture de
# escopo — e é compartilhado tanto pelas fixtures de sessão abaixo quanto pelo teste
# genérico de ponta-a-ponta (tests/test_pipeline_todos_os_casos.py), para que o mesmo
# caso nunca seja analisado duas vezes na mesma rodada de testes. Isso corta o consumo
# de API em várias vezes (ver docs/COSTS.md — lição aprendida em 12/09).

_cache_relatorios: dict[str, object] = {}


def _obter_relatorio(nome_caso: str):
    if nome_caso not in _cache_relatorios:
        documentos, tese = _carregar_caso(nome_caso)
        _cache_relatorios[nome_caso] = analisar_caso(documentos, tese)
    return _cache_relatorios[nome_caso]


@pytest.fixture(scope="session")
def relatorio_case_01():
    _exigir_api_key()
    return _obter_relatorio("case_01")


@pytest.fixture(scope="session")
def relatorio_case_familia_01():
    _exigir_api_key()
    return _obter_relatorio("case_familia_01")


@pytest.fixture(scope="session")
def relatorio_case_familia_02():
    _exigir_api_key()
    return _obter_relatorio("case_familia_02")


@pytest.fixture(scope="session")
def relatorio_case_familia_03():
    _exigir_api_key()
    return _obter_relatorio("case_familia_03")


def pytest_terminal_summary(terminalreporter, exitstatus, config):
    """Mostra o custo total (medido) da suíte no resumo final, mesmo sem -s."""
    resumo = resumo_uso()
    if resumo["por_modelo"]:
        terminalreporter.write_sep("=", "Custo real (Anthropic API) desta execução")
        terminalreporter.write_line(
            f"Total: US$ {resumo['custo_total_usd_estimado']:.4f} — {resumo['por_modelo']}"
        )
