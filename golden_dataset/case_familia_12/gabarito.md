# Gabarito — Caso Fictício de Família #12 (Pensão por Morte — Escritura x Decisão Judicial)

Baseado no "Caso 8" da segunda rodada de `docs/casos hackathon.md`. Único documento
disponível é o da própria requerente — testa se o sistema identifica a vulnerabilidade
central sem inventar a posição contrária (que não foi apresentada nos autos).

**Achado central esperado**: a tese enfrenta uma divergência literal entre a redação da
lei ("fixada judicialmente") e o fato do caso (fixada por escritura pública) — isso deve
aparecer como `contra_argumento`/`pergunta_dificil` (`INFERENCE`/`ADVERSARIAL_HYPOTHESIS`),
nunca como `FACT` de que ela tem ou não direito à pensão.

**Não deve aparecer**: citação de número de lei específico como se fosse texto
verificado (o documento não contém o texto da norma).
