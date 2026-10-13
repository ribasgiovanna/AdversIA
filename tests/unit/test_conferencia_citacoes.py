"""Conferência de citações feita pelo código (Constituição, Princípio I).

O modelo de IA nunca tem a palavra final sobre uma citação: `_trecho_consta` confere, no
próprio código, se o trecho citado existe no documento enviado, e `verificar_candidatos`
descarta citações de documentos que o usuário não enviou. Estes testes rodam sem chave de
API — a chamada ao modelo é substituída por uma resposta fixa.
"""

from app import pipeline
from app.pipeline import _trecho_consta, verificar_candidatos
from app.schemas import CaseModel, Categoria, Provenance

DOCUMENTO = (
    "Os pais de Carolina se separaram em 2008, quando ela tinha 5 anos.\n"
    "Desde então, o pai mas nunca procurou a filha, nem em datas comemorativas."
)


class TestTrechoConsta:
    def test_trecho_literal_e_conferido(self):
        assert _trecho_consta("se separaram em 2008", DOCUMENTO)

    def test_ignora_caixa_aspas_e_quebras_de_linha(self):
        assert _trecho_consta("“OS PAIS DE CAROLINA   se separaram”", DOCUMENTO)
        assert _trecho_consta("tinha 5 anos. Desde então", DOCUMENTO)

    def test_aceita_reticencias_quando_cada_pedaco_existe(self):
        assert _trecho_consta("Os pais de Carolina... nem em datas comemorativas", DOCUMENTO)

    def test_trecho_inventado_nao_e_conferido(self):
        assert not _trecho_consta("o pai visitava a filha todo fim de semana", DOCUMENTO)

    def test_parafrase_nao_e_conferida(self):
        assert not _trecho_consta("os pais se divorciaram em 2008", DOCUMENTO)

    def test_um_pedaco_inventado_derruba_a_citacao_inteira(self):
        assert not _trecho_consta("Os pais de Carolina... e reataram em 2010", DOCUMENTO)

    def test_trecho_curto_demais_nao_comprova_nada(self):
        assert not _trecho_consta("em", DOCUMENTO)
        assert not _trecho_consta("2008", DOCUMENTO)

    def test_entradas_vazias(self):
        assert not _trecho_consta("", DOCUMENTO)
        assert not _trecho_consta("se separaram em 2008", "")


def _verificar_com_resposta(monkeypatch, findings: list, documentos: dict | None):
    """Roda o passo 5 com a resposta do modelo fixada, sem chamar a API."""
    monkeypatch.setattr(pipeline, "chamar_llm_estruturado", lambda *a, **k: {"findings": findings})
    case_model = CaseModel(case_id="teste", documentos=list((documentos or {}).keys()))
    return verificar_candidatos(case_model, candidatos=[], documentos=documentos)


class TestVerificarCandidatos:
    def test_citacao_real_e_marcada_como_conferida(self, monkeypatch):
        findings = _verificar_com_resposta(
            monkeypatch,
            [{
                "id": "c1", "categoria": "contradicao", "texto": "Data da separação",
                "provenance": "FACT",
                "origem": [{"documento": "peticao.txt", "trecho": "se separaram em 2008"}],
            }],
            {"peticao.txt": DOCUMENTO},
        )
        assert findings[0].origem[0].conferido is True
        assert findings[0].provenance == Provenance.FACT

    def test_citacao_inventada_fica_marcada_para_conferir(self, monkeypatch):
        findings = _verificar_com_resposta(
            monkeypatch,
            [{
                "id": "c1", "categoria": "contradicao", "texto": "Visitas",
                "provenance": "SOURCE",
                "origem": [{"documento": "peticao.txt", "trecho": "visitava a filha todo fim de semana"}],
            }],
            {"peticao.txt": DOCUMENTO},
        )
        assert findings[0].origem[0].conferido is False

    def test_descarta_citacao_de_documento_nao_enviado(self, monkeypatch):
        findings = _verificar_com_resposta(
            monkeypatch,
            [{
                "id": "c1", "categoria": "lacuna_probatoria", "texto": "Sem prova",
                "provenance": "FACT",
                "origem": [{"documento": "case_model", "trecho": '"evidencias": []'}],
            }],
            {"peticao.txt": DOCUMENTO},
        )
        assert findings[0].origem == []
        # Sem origem rastreável, um FACT é rebaixado (regra do schema).
        assert findings[0].provenance == Provenance.UNVERIFIED

    def test_categoria_desconhecida_e_ignorada(self, monkeypatch):
        findings = _verificar_com_resposta(
            monkeypatch,
            [
                {"id": "x", "categoria": "palpite", "texto": "?", "provenance": "INFERENCE"},
                {"id": "y", "categoria": "pergunta_dificil", "texto": "Por quê?", "provenance": "INFERENCE"},
            ],
            {"peticao.txt": DOCUMENTO},
        )
        assert [f.categoria for f in findings] == [Categoria.PERGUNTA_DIFICIL]

    def test_proveniencia_invalida_vira_nao_verificada(self, monkeypatch):
        findings = _verificar_com_resposta(
            monkeypatch,
            [{"id": "y", "categoria": "pergunta_dificil", "texto": "?", "provenance": "CERTEZA"}],
            {"peticao.txt": DOCUMENTO},
        )
        assert findings[0].provenance == Provenance.UNVERIFIED

    def test_ids_repetidos_sao_desambiguados(self, monkeypatch):
        item = {"id": "a", "categoria": "pergunta_dificil", "texto": "?", "provenance": "INFERENCE"}
        findings = _verificar_com_resposta(monkeypatch, [item, dict(item), dict(item)], {"p.txt": DOCUMENTO})
        assert [f.id for f in findings] == ["a", "a-2", "a-3"]

    def test_itens_malformados_nao_quebram_o_pipeline(self, monkeypatch):
        findings = _verificar_com_resposta(
            monkeypatch,
            ["texto solto", None, {"id": "ok", "categoria": "contradicao", "texto": "t", "provenance": "INFERENCE"}],
            {"p.txt": DOCUMENTO},
        )
        assert [f.id for f in findings] == ["ok"]
