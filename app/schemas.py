"""Modelos de dados do AdversIA MVP.

Sem ORM/banco de dados (ADR-001, docs/DECISIONS.md) — nada aqui é persistido entre
requisições. Estrutura conforme
specs/001-adversarial-vulnerability-report/data-model.md.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum


class Provenance(str, Enum):
    """Constituição, Princípio I: toda afirmação carrega proveniência obrigatória."""

    FACT = "FACT"
    SOURCE = "SOURCE"
    INFERENCE = "INFERENCE"
    ADVERSARIAL_HYPOTHESIS = "ADVERSARIAL_HYPOTHESIS"
    UNVERIFIED = "UNVERIFIED"


class Categoria(str, Enum):
    VULNERABILIDADE_CRITICA = "vulnerabilidade_critica"
    VULNERABILIDADE_MEDIA = "vulnerabilidade_media"
    CONTRADICAO = "contradicao"
    LACUNA_PROBATORIA = "lacuna_probatoria"
    CONTRA_ARGUMENTO = "contra_argumento"
    PERGUNTA_DIFICIL = "pergunta_dificil"


@dataclass
class Citation:
    documento: str
    trecho: str
    pagina: int | None = None
    # True/False: o trecho foi (ou não) encontrado literalmente no texto do documento
    # enviado — conferência feita pelo código, não pelo modelo. None: não conferido.
    conferido: bool | None = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Finding:
    id: str
    categoria: Categoria
    texto: str
    provenance: Provenance
    origem: list[Citation] = field(default_factory=list)

    def __post_init__(self) -> None:
        # Regra de validação (data-model.md): FACT/SOURCE exigem origem rastreável.
        # Um Finding sem origem nessas categorias é rebaixado, nunca descartado
        # silenciosamente — o pipeline de verificação (Passo 5) é responsável por
        # rebaixar ANTES de instanciar; aqui só garantimos que a regra nunca é violada
        # por engano em qualquer ponto do código.
        if self.provenance in (Provenance.FACT, Provenance.SOURCE) and not self.origem:
            self.provenance = Provenance.UNVERIFIED

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "categoria": self.categoria.value,
            "texto": self.texto,
            "provenance": self.provenance.value,
            "origem": [c.to_dict() for c in self.origem],
        }


@dataclass
class CaseModel:
    case_id: str
    partes: list[str] = field(default_factory=list)
    tipo_de_acao: str | None = None
    jurisdicao: str | None = None
    fatos: list[str] = field(default_factory=list)
    datas: list[str] = field(default_factory=list)
    pedidos: list[str] = field(default_factory=list)
    argumentos: list[str] = field(default_factory=list)
    evidencias: list[str] = field(default_factory=list)
    documentos: list[str] = field(default_factory=list)
    questoes_juridicas: list[str] = field(default_factory=list)
    informacoes_ausentes: list[str] = field(default_factory=list)
    possiveis_contradicoes: list[str] = field(default_factory=list)
    linha_do_tempo: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


AVISOS_FIXOS = [
    "Este relatório não é parecer jurídico: revise cada apontamento antes de usá-lo.",
    "Versão de demonstração: use apenas documentos fictícios ou anonimizados.",
]


@dataclass
class VulnerabilityReport:
    resumo_do_caso: str
    tese_analisada: str
    findings: list[Finding] = field(default_factory=list)
    avisos: list[str] = field(default_factory=lambda: list(AVISOS_FIXOS))
    # Eventos datados extraídos dos documentos, já ordenados e com o trecho conferido.
    linha_do_tempo: list[dict] = field(default_factory=list)
    # None quando o plano não pôde ser gerado (o restante do relatório continua válido).
    plano_de_provas: list[dict] | None = field(default_factory=list)

    @property
    def perguntas_dificeis(self) -> list[str]:
        return [
            f.texto
            for f in self.findings
            if f.categoria == Categoria.PERGUNTA_DIFICIL
        ]

    def to_dict(self) -> dict:
        return {
            "resumo_do_caso": self.resumo_do_caso,
            "tese_analisada": self.tese_analisada,
            "findings": [f.to_dict() for f in self.findings],
            "perguntas_dificeis": self.perguntas_dificeis,
            "linha_do_tempo": self.linha_do_tempo,
            "plano_de_provas": self.plano_de_provas,
            "avisos": self.avisos,
        }
