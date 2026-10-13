"""Controle de acesso da análise real (ADR-015) e validação da chave da Anthropic."""

import pytest

from app import api_comum
from app.api_comum import (
    CABECALHO_CHAVE,
    CABECALHO_CODIGO_GESTAO,
    VARIAVEL_CODIGO_GESTAO,
    ErroParaUsuario,
    ler_chave,
    verificar_gestao,
)

CHAVE_VALIDA = "sk-ant-" + "a" * 40


@pytest.fixture(autouse=True)
def _sem_espera(monkeypatch):
    # O atraso proposital após um código errado não precisa deixar os testes lentos.
    monkeypatch.setattr(api_comum.time, "sleep", lambda _segundos: None)


class TestCodigoDaGestao:
    def test_sem_codigo_configurado_ninguem_entra(self, monkeypatch):
        monkeypatch.delenv(VARIAVEL_CODIGO_GESTAO, raising=False)
        with pytest.raises(ErroParaUsuario) as erro:
            verificar_gestao({CABECALHO_CODIGO_GESTAO: "qualquer-coisa"})
        assert erro.value.status == 403

    def test_codigo_ausente_na_requisicao(self, monkeypatch):
        monkeypatch.setenv(VARIAVEL_CODIGO_GESTAO, "segredo")
        with pytest.raises(ErroParaUsuario) as erro:
            verificar_gestao({})
        assert erro.value.status == 403

    def test_codigo_errado(self, monkeypatch):
        monkeypatch.setenv(VARIAVEL_CODIGO_GESTAO, "segredo")
        with pytest.raises(ErroParaUsuario, match="incorreto"):
            verificar_gestao({CABECALHO_CODIGO_GESTAO: "chute"})

    def test_codigo_errado_espera_antes_de_responder(self, monkeypatch):
        esperas = []
        monkeypatch.setattr(api_comum.time, "sleep", esperas.append)
        monkeypatch.setenv(VARIAVEL_CODIGO_GESTAO, "segredo")
        with pytest.raises(ErroParaUsuario):
            verificar_gestao({CABECALHO_CODIGO_GESTAO: "chute"})
        assert esperas == [api_comum.ESPERA_CODIGO_ERRADO_S]

    def test_codigo_certo_libera(self, monkeypatch):
        monkeypatch.setenv(VARIAVEL_CODIGO_GESTAO, "segredo")
        verificar_gestao({CABECALHO_CODIGO_GESTAO: "  segredo  "})


class TestChaveDaAnthropic:
    def test_chave_valida(self):
        assert ler_chave({CABECALHO_CHAVE: f"  {CHAVE_VALIDA}  "}) == CHAVE_VALIDA

    def test_chave_ausente(self):
        with pytest.raises(ErroParaUsuario) as erro:
            ler_chave({})
        assert erro.value.status == 401

    @pytest.mark.parametrize("chave", ["sk-proj-" + "a" * 40, "sk-ant-curta", "sk-ant-" + "a" * 40 + " ; drop"])
    def test_chave_em_formato_invalido(self, chave):
        with pytest.raises(ErroParaUsuario) as erro:
            ler_chave({CABECALHO_CHAVE: chave})
        assert erro.value.status == 400
