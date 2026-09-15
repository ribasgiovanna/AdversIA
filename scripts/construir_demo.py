"""Constrói os arquivos do modo demonstração a partir de demo/fontes/*.json.

Cada fonte traz os resultados preparados de um caso fictício do golden_dataset. O script:

- junta os documentos e a tese do caso (golden_dataset/<pasta>);
- confere cada trecho citado no texto do documento com a MESMA função da análise real
  (`pipeline._trecho_consta`), e grava o resultado;
- ordena os apontamentos e a linha do tempo como a análise real faz e aplica a regra de
  proveniência (`Finding`);
- valida os vínculos do plano de provas e as avaliações da simulação;
- gera app/static/demo/casos/<id>.json e app/static/demo/indice.json.

Uso:  python scripts/construir_demo.py [--permitir-nao-conferidos]
Falha com código 1 se algum trecho não existir no documento ou se houver erro de estrutura.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from app.pipeline import _trecho_consta, montar_linha_do_tempo  # noqa: E402
from app.schemas import AVISOS_FIXOS, CaseModel, Categoria, Citation, Finding, Provenance  # noqa: E402

FONTES = RAIZ / "demo" / "fontes"
GOLDEN = RAIZ / "golden_dataset"
SAIDA = RAIZ / "app" / "static" / "demo"

# Ordem dos tipos no filtro da tela.
TIPOS = [
    "Divórcio e partilha de bens",
    "União estável",
    "Pensão alimentícia",
    "Guarda e convivência",
    "Filiação",
    "Curatela e proteção",
    "Herança",
    "Pensão por morte",
    "Responsabilidade na família",
]

ORDEM_CATEGORIA = {
    Categoria.VULNERABILIDADE_CRITICA: 0,
    Categoria.CONTRADICAO: 1,
    Categoria.VULNERABILIDADE_MEDIA: 2,
    Categoria.LACUNA_PROBATORIA: 3,
    Categoria.CONTRA_ARGUMENTO: 4,
    Categoria.PERGUNTA_DIFICIL: 5,
}
PRIORIDADES = {"alta": 0, "media": 1, "baixa": 2}
AVALIACOES = {"convincente", "parcial", "fragil"}


def carregar_caso(pasta: str) -> tuple[dict[str, str], str]:
    diretorio = GOLDEN / pasta
    documentos = {
        a.name: a.read_text(encoding="utf-8")
        for a in sorted(diretorio.glob("*.txt"))
        if a.name != "tese.txt"
    }
    tese = (diretorio / "tese.txt").read_text(encoding="utf-8").strip()
    return documentos, tese


def construir(fonte: dict, erros: list[str]) -> dict:
    ident = fonte["id"]
    documentos, tese = carregar_caso(fonte["pasta"])
    textos = {nome.lower(): texto for nome, texto in documentos.items()}

    def conferir(onde: str, documento: str, trecho: str) -> bool:
        if documento.lower() not in textos:
            erros.append(f"{ident} · {onde}: documento inexistente '{documento}'")
            return False
        ok = _trecho_consta(trecho, textos[documento.lower()])
        if not ok:
            erros.append(f"{ident} · {onde}: trecho não encontrado em {documento}: “{trecho[:90]}”")
        return ok

    relatorio_fonte = fonte["relatorio"]

    findings = []
    ids = set()
    for item in relatorio_fonte["findings"]:
        if item["id"] in ids:
            erros.append(f"{ident}: id repetido '{item['id']}'")
        ids.add(item["id"])
        origem = [
            Citation(
                documento=c["documento"],
                trecho=c["trecho"],
                conferido=conferir(f"apontamento {item['id']}", c["documento"], c["trecho"]),
            )
            for c in item.get("origem", [])
        ]
        findings.append(
            Finding(
                id=item["id"],
                categoria=Categoria(item["categoria"]),
                texto=item["texto"],
                provenance=Provenance(item["provenance"]),
                origem=origem,
            )
        )
    findings.sort(key=lambda f: ORDEM_CATEGORIA[f.categoria])

    eventos_fonte = relatorio_fonte.get("linha_do_tempo", [])
    for i, ev in enumerate(eventos_fonte):
        conferir(f"linha do tempo #{i + 1}", ev["documento"], ev["trecho"])
    linha_do_tempo = montar_linha_do_tempo(CaseModel(case_id=ident, linha_do_tempo=eventos_fonte), documentos)
    if len(linha_do_tempo) != len(eventos_fonte):
        erros.append(f"{ident}: {len(eventos_fonte) - len(linha_do_tempo)} evento(s) da linha do tempo descartado(s)")

    plano = []
    for item in relatorio_fonte.get("plano_de_provas", []):
        faltando = [i for i in item["apontamentos"] if i not in ids]
        if faltando:
            erros.append(f"{ident}: plano cita apontamentos inexistentes {faltando}")
        if item["prioridade"] not in PRIORIDADES:
            erros.append(f"{ident}: prioridade inválida '{item['prioridade']}'")
        plano.append({k: item[k] for k in ("prova", "finalidade", "como_obter", "prioridade", "apontamentos")})
    plano.sort(key=lambda i: PRIORIDADES.get(i["prioridade"], 1))

    audiencia = []
    for q, bloco in enumerate(fonte.get("audiencia", []), start=1):
        respostas = []
        for r, resposta in enumerate(bloco["respostas"], start=1):
            av = dict(resposta["avaliacao"])
            if av["avaliacao"] not in AVALIACOES:
                erros.append(f"{ident}: avaliação inválida na pergunta {q}, resposta {r}")
            av["apoio_nos_documentos"] = [
                {**c, "conferido": conferir(f"audiência {q}.{r}", c["documento"], c["trecho"])}
                for c in av.get("apoio_nos_documentos", [])
            ]
            for campo in ("pontos_fortes", "pontos_frageis"):
                av.setdefault(campo, [])
            av.setdefault("replica", "")
            respostas.append({"texto": resposta["texto"], "avaliacao": av})
        # A ordem das respostas é sorteada de forma fixa (mesmo resultado a cada geração), para
        # que a melhor resposta não fique sempre na mesma posição; os rótulos vêm depois.
        respostas.sort(key=lambda r: hashlib.sha256(f"{ident}|{bloco['pergunta']}|{r['texto']}".encode("utf-8")).hexdigest())
        for posicao, resposta in enumerate(respostas):
            resposta["rotulo"] = f"Resposta {'ABCDEFGH'[posicao]}"
        audiencia.append({"pergunta": bloco["pergunta"], "respostas": [{"rotulo": r["rotulo"], "texto": r["texto"], "avaliacao": r["avaliacao"]} for r in respostas]})

    if fonte["tipo"] not in TIPOS:
        erros.append(f"{ident}: tipo desconhecido '{fonte['tipo']}'")

    return {
        "id": ident,
        "tipo": fonte["tipo"],
        "titulo": fonte["titulo"],
        "descricao": fonte["descricao"],
        "documentos": [{"nome": n, "conteudo": t} for n, t in documentos.items()],
        "tese": tese,
        "relatorio": {
            "resumo_do_caso": relatorio_fonte["resumo_do_caso"],
            "tese_analisada": tese,
            "findings": [f.to_dict() for f in findings],
            "perguntas_dificeis": [f.texto for f in findings if f.categoria == Categoria.PERGUNTA_DIFICIL],
            "linha_do_tempo": linha_do_tempo,
            "plano_de_provas": plano,
            "avisos": list(AVISOS_FIXOS),
        },
        "audiencia": audiencia,
        "_ordem": fonte.get("ordem", 99),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--permitir-nao-conferidos", action="store_true")
    args = parser.parse_args()

    erros: list[str] = []
    casos = [construir(json.loads(f.read_text(encoding="utf-8")), erros) for f in sorted(FONTES.glob("*.json"))]

    estruturais = [e for e in erros if "trecho não encontrado" not in e]
    nao_conferidos = [e for e in erros if "trecho não encontrado" in e]
    for e in erros:
        print("ERRO:", e, file=sys.stderr)
    if estruturais or (nao_conferidos and not args.permitir_nao_conferidos):
        print(f"\n{len(erros)} problema(s); nada foi gravado.", file=sys.stderr)
        return 1

    (SAIDA / "casos").mkdir(parents=True, exist_ok=True)
    for antigo in (SAIDA / "casos").glob("*.json"):
        antigo.unlink()
    casos.sort(key=lambda c: (TIPOS.index(c["tipo"]), c["_ordem"], c["titulo"]))
    for caso in casos:
        caso.pop("_ordem")
        (SAIDA / "casos" / f"{caso['id']}.json").write_text(
            json.dumps(caso, ensure_ascii=False, indent=1), encoding="utf-8"
        )
    indice = [{k: c[k] for k in ("id", "tipo", "titulo", "descricao")} for c in casos]
    (SAIDA / "indice.json").write_text(json.dumps(indice, ensure_ascii=False, indent=1), encoding="utf-8")
    total_citacoes = sum(len(f["origem"]) for c in casos for f in c["relatorio"]["findings"])
    print(f"{len(casos)} casos gravados em app/static/demo · {total_citacoes} citações conferidas")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
