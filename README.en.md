<p align="center">
  <a href="README.md">🇧🇷 Português</a> · 🇺🇸 English
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/imagens/logo-adversia-branca.png">
    <img src="app/static/logo-adversia.png" alt="AdversIA" width="420">
  </picture>
</p>

<h3 align="center">A divorciar? AdversIA</h3>
<p align="center"><sub>Our tagline, a Portuguese pun: "Getting divorced? AdversIA"</sub></p>

<p align="center">
  <strong>See your case theory through the eyes of opposing counsel.</strong><br>
  AI-powered adversarial review of litigation strategy in Brazilian Family Law.
</p>

<p align="center">
  <a href="https://adversia.vercel.app"><strong>Try it: adversia.vercel.app</strong></a><br>
  <sub>Free demo, no sign-up · the interface is in Portuguese</sub>
</p>

<p align="center">
  Citizenship Hackathon 2026, Brazilian Bar Association (OAB), Paraná Section · Open Innovation and Citizenship Track
</p>

<p align="center">
  <img src="docs/imagens/01_inicio.png" alt="AdversIA home screen" width="860">
</p>

---

## Contents

- [What it is](#what-it-is)
- [The problem](#the-problem)
- [The solution](#the-solution)
- [How it works](#how-it-works)
- [Screenshots](#screenshots)
- [Why you can trust it](#why-you-can-trust-it)
- [Accessibility](#accessibility)
- [Privacy and safeguards](#privacy-and-safeguards)
- [Project scope](#project-scope)
- [Sample cases](#sample-cases)
- [How it is built](#how-it-is-built)
- [Running it](#running-it)
- [Documentation](#documentation)
- [License](#license)
- [Team](#team)

---

## What it is

**AdversIA** is an assistant for lawyers practicing **Family Law** in Brazil: divorce,
division of marital property, stable unions (Brazil's recognized form of cohabitation),
child and spousal support, custody and visitation, parentage, guardianship and other
matters heard by Family Courts.

The lawyer uploads the case documents and describes, in a few lines, the position they
intend to argue. AdversIA reads everything **as if it were opposing counsel** and shows
where the strategy can be attacked, **before** that happens at the hearing.

It does not decide the case, does not replace the lawyer and is not a legal opinion. It is
a critical review that helps the lawyer arrive better prepared.

---

## The problem

Whoever builds a case theory tends to see its strengths and underestimate its weaknesses.
In Family Law this weighs even more: evidence is often informal, the parties' accounts
diverge and emotions run high. In practice, problems surface too late:

- **dates and accounts that do not match** between the initial petition and the answer;
- **key allegations with no supporting evidence**;
- **hard questions** from the judge or opposing counsel that nobody anticipated;
- no clear view of **which evidence still needs to be obtained**.

Reviewing all of this by hand, case by case, takes time lawyers often do not have,
especially those who represent low-income clients.

---

## The solution

A tool that plays devil's advocate in minutes and delivers a four-part report, which can
also be saved as a PDF:

| | What it delivers |
|---|---|
| **Vulnerabilities** | Contradictions, unsupported allegations, arguments the other side may raise and hard questions, each showing where it came from |
| **Case timeline** | Dated facts in chronological order, highlighting where the parties' accounts diverge |
| **Evidence plan** | What to obtain to close each weak point, by priority and with a lawful way to obtain it |
| **Hearing simulation** | Practice in a chat format: opposing counsel asks, the lawyer answers and receives an assessment, a suggestion to strengthen the answer and a rebuttal |
| **PDF report** | A formal document in technical language: identification, case theory, summary, numbered vulnerabilities with quotes from the documents, and tables for the timeline and the evidence plan |

And one commitment throughout: **every quoted passage is checked, word for word, against
the uploaded document.**

---

## How it works

AdversIA can be used **in two ways**:

| | Demo | Document analysis (management only) |
|---|---|---|
| Who it is for | Anyone who wants to try the system | The management team, with an access code |
| Cost | **Free**, no sign-up | Uses the person's own Anthropic API key (about US$ 0.25 per analysis, charged to their account) |
| What happens | You pick one of **32 fictional cases** and see the full analysis, prepared in advance | The AI reads your documents on the spot |
| Hearing simulation | **5 questions per case**, each with two well-built answers to choose from and compare assessments | You type or speak your answer |

In demo mode, the report shows the badge *"Demonstração · análise preparada previamente"*
(Demo · analysis prepared in advance).

Demo walkthrough:

1. Click **Experimentar com um caso** (Try a case).
2. **Pick a case** (you can filter by type and view the documents first).
3. Click **Analisar caso** (Analyze case) and browse the report tabs.
4. In the **Simular audiência** (Simulate hearing) tab, practice answering opposing
   counsel's questions.
5. Use the printer button to **save the report as a PDF**.

Document analysis walkthrough, available only after clicking **Área da gestão**
(Management area) and entering the access code:

1. **Upload the case documents**: initial petition, answer, agreements, statements (PDF,
   Word or plain text).
2. **Write your case theory**: what you want to argue and on behalf of which party.
3. **Enter your Anthropic API key.** It is used only for that analysis and is not stored.
4. **Confirm** that the documents are fictional or anonymized.
5. **Follow the analysis** (six stages, 2 to 3 minutes), read the report, practice in the
   hearing simulation and save it as a PDF.

---

## Screenshots

The screenshots show the interface in Portuguese.

### Ready-made sample cases
Filter by case type and cards summarizing each situation, so you can test without your own
documents and at no cost.

<p align="center"><img src="docs/imagens/02_casos_de_exemplo.png" alt="Choosing a sample case" width="760"></p>

### Step-by-step analysis
Progress is shown on screen while the case is analyzed.

<p align="center"><img src="docs/imagens/03_progresso.png" alt="Analysis progress screen" width="760"></p>

### Vulnerabilities
A scoreboard of what opposing counsel could exploit, and each finding with its source and
the passage verified in the document. Sections expand and collapse, so there is no need to
scroll through the whole page.

<p align="center"><img src="docs/imagens/04_pontos_vulneraveis.png" alt="Vulnerabilities report" width="860"></p>

### Case timeline
Dated facts in order, with discrepancies between the accounts highlighted.

<p align="center"><img src="docs/imagens/05_linha_do_tempo.png" alt="Case timeline" width="860"></p>

### Evidence plan
What to obtain, by priority, with a checkbox to mark what has been gathered and a direct
link to the weak point each piece of evidence addresses.

<p align="center"><img src="docs/imagens/06_plano_de_provas.png" alt="Evidence plan" width="860"></p>

### Hearing simulation
In a chat format: opposing counsel asks, AdversIA assesses the answer against the
documents, suggests how to strengthen it, and opposing counsel replies with a rebuttal.

<p align="center"><img src="docs/imagens/07_simulacao_de_audiencia.png" alt="Hearing simulation" width="860"></p>

### PDF report
A formal A4 document without the page's visual elements, with numbered sections, tables
and page numbers.

<p align="center"><img src="docs/imagens/11_relatorio_pdf.png" alt="First page of the PDF report" width="600"></p>

### Accessibility, dark theme and mobile

<p align="center"><img src="docs/imagens/08_acessibilidade.png" alt="Accessibility panel" width="860"></p>

<p align="center">
  <img src="docs/imagens/09_tema_escuro.png" alt="Dark theme" width="600">
  &nbsp;
  <img src="docs/imagens/10_celular.png" alt="Mobile version" width="220">
</p>

---

## Why you can trust it

- **Everything shows its source.** Each finding carries a label: *In the documents*,
  *Legal source cited*, *Conclusion drawn from the documents*, *Possible argument from the
  other side* or *Not enough basis — please check*.
- **Every quoted passage is automatically verified** against the uploaded document:
  *"✓ Passage verified in the document"* or *"We could not find this exact passage — please
  check"*.
- **It does not invent statutes or court decisions.** No statute, article or case number
  is cited unless it appears in the documents.
- **When in doubt, it is cautious.** When the basis is insufficient, it says so instead of
  asserting.
- **The lawyer always decides.** The report supports the review; it is not a legal opinion.

---

## Accessibility

Designed to be usable by everyone. Under the **Acessibilidade** (Accessibility) button at
the top:

- **Brazilian Sign Language (Libras)** through **VLibras**, the Brazilian Federal
  Government's official free tool;
- **text size** from 90% to 175%;
- **light, dark or automatic theme**, and **high contrast**;
- **wider text spacing**, which helps people with dyslexia;
- **reduce animations** (the page also honors the operating system's preference);
- **listen to the report** and the questions read aloud, and **answer by voice** in the
  simulation;
- typefaces chosen for legibility: Atkinson Hyperlegible, designed for people with low
  vision, and Lexend for headings;
- full keyboard use, screen reader support and a mobile version;
- **plain language**, without jargon.

---

## Privacy and safeguards

- This is a demo version: **use only fictional or anonymized documents**. The screen asks
  for this confirmation before every document analysis.
- **Nothing is stored.** Documents are read, analyzed and discarded. For the hearing
  simulation, the document text stays only in the browser tab of the person who ran the
  analysis.
- **The Anthropic API key is not stored**: it travels with each analysis request and is
  discarded afterwards. It is saved neither in the browser nor on the server.
- **Document analysis is restricted to the management team**, protected by an access code.
  The public only uses the fictional cases.
- The demo cases are **made up**. Public sources were researched only to choose the
  themes; no data from real court cases was used (Brazilian family proceedings are
  confidential).
- Family cases involve sensitive data, including data about children. Using it with real
  clients would require login, automatic document deletion deadlines and a data processing
  agreement with the AI provider.
- The report supports the review; **it is not a legal opinion**.

---

## Project scope

**In scope (delivered):**
- Brazilian Family Law: divorce and property division, stable unions, child and spousal
  support, custody and visitation, parentage, guardianship and supported decision-making,
  emotional abandonment (and related inheritance and survivor's pension cases).
- Reading text-based PDFs, Word (.docx) and plain text files.
- Vulnerabilities report with the source of each finding and verification of quotes.
- Timeline, evidence plan and chat-style hearing simulation.
- PDF export of the report as a technical document.
- Free demo mode with 32 fictional cases, prepared analyses and 5 hearing questions per
  case.
- Real document analysis, restricted to management, using the person's own Anthropic API
  key.
- Website published online (Vercel).
- Full accessibility panel and a plain-language interface.

**Out of scope for this version:**
- Other areas of law.
- Lookup of external legislation and case law.
- Reading scanned (image-only) documents.
- Login, law firm accounts and case storage.

**Next steps:** login for law firms, automatic document deletion, reading scanned documents,
new areas of law and testing with lawyers, sign language users and screen reader users.

---

## Sample cases

All **32 cases** are **fictional** and bear no relation to real people. Where the themes
came from: [catalog of situations](docs/CATALOGO_DE_SITUACOES.md) (in Portuguese).

| Type | Situations |
|---|---|
| Divorce and property division | Business and real estate owned before the marriage · Retirement benefits in the division and a support claim · FGTS (Brazilian mandatory severance fund) accrued during the marriage · Open and closed private pension plans · Rent for sole use of the jointly owned home · Cryptocurrency and a loan in the division |
| Stable union | Stable union recognized after the partner's death · Pet custody after separation |
| Support | Job loss and relocation (**best case for the timeline**) · Adult daughter with her own income · Ex-wife returned to work · Spousal support paid for many years · Pregnancy support (*alimentos gravídicos*, paid by the alleged father during pregnancy) · Support claimed from grandparents · Unpaid support with a request for civil imprisonment (allowed in Brazil for support debts) · Compensatory support until property is divided |
| Custody and visitation | Parental alienation allegation · Sole or joint custody · Child's change of residence · Relocating abroad with the daughter · Custody with a domestic violence protective order · Grandparents' visitation with their granddaughter |
| Parentage | Paternity action without a DNA test · Paternity disavowal and socio-affective bond · Biological father and registered father (multiple parentage) |
| Guardianship and protection | Guardianship of a mother with Alzheimer's · Supported decision-making |
| Inheritance | Daughter who cared for her father · Surviving partner and the deceased's relatives |
| Survivor's pension | Relationship parallel to a marriage · Support agreed before a notary |
| Family liability | Damages for emotional abandonment |

---

## How it is built

| Part | Technology |
|---|---|
| Website | Plain HTML, CSS and JavaScript, no framework and no build step |
| Local server | Python 3.13, standard library only (`app/server.py`) |
| Hosting | Vercel: static site + Python functions in `api/` |
| AI | Claude, by Anthropic, using the key of whoever runs the analysis |
| Document reading | `pypdf` (PDF) and `python-docx` (Word) |

Repository layout:

```
app/            Python code (analysis pipeline, document reading, API) and the website in app/static
api/            Vercel functions: analisar (analyze), audiencia (hearing) and gestao (management)
demo/fontes/    analyses and questions written for the 32 demo cases
golden_dataset/ fictional documents for each case
scripts/        construir_demo.py: verifies every quoted passage and builds app/static/demo
tests/          pipeline tests (they call the real Anthropic API)
docs/           technical documentation, decisions, compliance and images (in Portuguese)
```

---

## Running it

**Online:** [adversia.vercel.app](https://adversia.vercel.app), deployed on Vercel from
this repository. Demo mode needs no configuration.

**Locally**, with Python 3.13:

```bash
pip install -r requirements.txt
python -m app.server
# open http://localhost:8000
```

Demo mode needs no configuration. Document analysis is for management only: set the
`ADVERSIA_CODIGO_GESTAO` variable (in `.env` or in the Vercel dashboard; see
`.env.example`) and enter that code and an Anthropic API key on screen. Each full analysis
costs about US$ 0.25, charged to the account whose key was used.

**After changing a demo case** (`demo/fontes`), rebuild the website files. The script
stops if any quoted passage is not found, word for word, in its document:

```bash
python scripts/construir_demo.py
```

**Tests:** `pytest` runs the pipeline tests against the real Anthropic API (this has a
cost) and requires `ANTHROPIC_API_KEY`; without the key, they are skipped.

---

## Documentation

All documentation is in Portuguese.

- [Technical documentation](docs/DOCUMENTACAO_TECNICA.md): architecture, modules, API,
  security, tests and limitations.
- [Project decisions](docs/DECISIONS.md): the reasoning behind each choice.
- [Compliance](docs/CONFORMIDADE.md): accessibility, LGPD (Brazil's data protection law)
  and security.
- [User experience requirements](docs/REQUISITOS_UX.md): the references behind the
  interface redesign.
- [Costs](docs/COSTS.md): how much each analysis costs and how it was measured.
- [Catalog of situations](docs/CATALOGO_DE_SITUACOES.md): the 32 fictional cases and the
  public sources that inspired the themes.
- [Internal tests](docs/testes-internos.md) and [external test script](docs/roteiro-teste-externo.md).

---

## License

Code released under the [MIT License](LICENSE). Copyright (c) 2026 Equipe Código de Defesa
(the Código de Defesa team).

This repository does not publish credentials (such as `.env` and the Anthropic API key),
user data, real client documents, logs containing personal information or files uploaded
during external tests. All cases are fictional. Details in the
[publication policy](docs/CONFORMIDADE.md#política-de-publicação-do-repositório) (in
Portuguese).

---

## Team

- **Giovanna Ribas dos Reis** — [portfolio](https://ribasgiovanna.github.io/)
- **Emelize Bonfim Mlot**
- **Ana Beatriz Patussi**
- **Julia Fernanda Zuchi**
- **Natan Bombini Roth**

---

<p align="center"><sub>AdversIA · Citizenship Hackathon 2026, OAB Paraná · Demo prototype</sub></p>
