# Medsyntax Framework: user test cases

Use these tests to check that every feature of the Medsyntax Framework works the way you want. Each test describes what a user does and what they should see. Tick **OK** when the result matches. If it doesn't match, write what happened under **Notes**.

- **Where to test:** the live page https://mrgtverleg-lgtm.github.io/MedsyntaxQA/framework/ or locally at http://localhost:8080/framework/
- **Before you start:** use a normal browser window, so saved mnemonics are kept after a reload. Test in Chrome first, then repeat the tests marked ⭐ in Safari, Firefox and Edge, and on a phone.
- **Tip:** after each group, click **Clear all** or reload the page, so the next test starts clean.

Status: 23 November 2026, version on branch `Medsyntax-Framework`.

---

## A. Choosing a framework (step 1)

| # | As a user I… | Steps | Expected result | OK | Notes |
|---|---|---|---|---|---|
| A1 ⭐ | open the page | Open the page | Step 1 "Which framework fits your question?" with 14 cards: PICO, PICOS, PICOT, PEO, PECO, SPIDER, SPICE, ECLIPSE, PCC, PIRD, PFO, CoCoPop, CIMO, BeHEMoTh. No error messages | ☐ | |
| A2 | read a card | Look at the PICO card | Coloured letter badges P I C O, the element names, and what it's used for ("Effects of a treatment…") | ☐ | |
| A3 ⭐ | pick a framework | Click **PICO** | Step 2 opens with 4 coloured boxes: Population/Problem, Intervention, Comparison/Control, Outcome. The step indicator shows step 2 | ☐ | |
| A4 | start without a framework | Reload the page, then click **Start without a framework** | Step 2 with numbered blocks "Concept 1" and "Concept 2" | ☐ | |
| A5 | see the example mnemonic | Look under **My mnemonics** | The card **LSI** with the label *example*, without Rename/Delete buttons | ☐ | |

## B. Building a search (step 2)

| # | As a user I… | Steps | Expected result | OK | Notes |
|---|---|---|---|---|---|
| B1 ⭐ | fill in a box | PICO → type `"Diabetes Mellitus"[Mesh] OR diabet*[tiab]` in P → open **Medsyntax visualisation** (closed by default) | The visualisation shows a red P frame with the terms; `OR` is bold; `[Mesh]` and `[tiab]` are grey | ☐ | |
| B2 ⭐ | combine boxes | Also type `exercis*[tiab]` in I | Full query: `("Diabetes Mellitus"[Mesh] OR diabet*[tiab]) AND (exercis*[tiab])` | ☐ | |
| B3 | leave a box empty | Leave C empty | C doesn't appear in the full query; no warning | ☐ | |
| B4 | give my search a title | Type `Exercise in diabetes` in **Query title** | The heading above the visualisation changes to "Exercise in diabetes" | ☐ | |
| B5 | clear one box | Click **Clear** next to P | P is empty and disappears from the full query; I stays | ☐ | |
| B6 | clear everything | Click **Clear all** | All boxes and the full query are empty | ☐ | |
| B7 | load an example | PICO → **Load example** | All 4 boxes are filled with a diabetes/exercise example | ☐ | |
| B8 | try an example where none exists | PEO → **Load example** | A message: no example for PEO yet; nothing changes | ☐ | |
| B10 | see the example in my database | PICO → choose **Embase** → **Load example**; then switch to **Ovid** | The example is written in Embase syntax (`'aged'/exp`, `:ti,ab,kw`) without warnings; after switching it's in Ovid syntax (`exp Aged/`, `.ti,ab.`). Change one box first and switch again: your text stays as it is | ☐ | |
| B9 | hide or show the visualisation | Close **Medsyntax visualisation** and reload; then open it and reload | It's closed by default and stays as you left it. The full query, the syntax summary and Load example, Copy query, Copy link, Download and Clear all are always visible | ☐ | |

## C. Split concept: several concepts under one letter

| # | As a user I… | Steps | Expected result | OK | Notes |
|---|---|---|---|---|---|
| C1 ⭐ | split my population | PICO → type `women[tiab] OR female[tiab]` in P → click **Split concept** | A second box appears under P, with name fields and an AND/OR/NOT choice set to AND | ☐ | |
| C2 ⭐ | fill in the second part | Name box 1 `Women`, box 2 `Diabetes`, type `"Diabetes Mellitus"[Mesh]` in box 2 | Full query: `((women[tiab] OR female[tiab]) AND ("Diabetes Mellitus"[Mesh])) AND …`. The P frame shows "Women" and "Diabetes" in dashed frames | ☐ | |
| C3 | use OR within a letter | Split O into 3 boxes: `mortality[tiab]`, `BMI[tiab]`, `HbA1c[tiab]`; set boxes 2 and 3 to **OR** | Full query ends with `((mortality[tiab]) OR (BMI[tiab]) OR (HbA1c[tiab]))` | ☐ | |
| C4 | use NOT within a letter | Set box 3 of O to **NOT** | The full query shows `NOT (HbA1c[tiab])` inside the O brackets | ☐ | |
| C5 | add a third part | Click **+ Add concept to P** | A third box appears under P | ☐ | |
| C6 | remove a part | Click **✕** next to a box | That box disappears. After removing the last extra box, P is a single box again and the name field is hidden | ☐ | |
| C7 | split without a framework | **Start without a framework** → name block 1 `Population` → **Split concept** | It works the same: two boxes under "Population" | ☐ | |

## D. Syntax checks

Type each query in an empty box. Each one should show **one** clear warning under that box, and a count in the visualisation frame.

| # | Type | Expected warning | OK | Notes |
|---|---|---|---|---|
| D1 ⭐ | `(a OR b` | Too many `(`: "1 opening ( but 0 closing )", with **Show where** marking the stray bracket. Only this one bracket warning | ☐ | |
| D2 | `a OR b)` | Too many `)` | ☐ | |
| D3 | `x[mh` | Too many `[` | ☐ | |
| D4 | `x]` | Too many `]` | ☐ | |
| D5 | `"abc` | Incorrect number of quote signs | ☐ | |
| D6 | `a OR OR b` | Duplicate OR-operators | ☐ | |
| D7 | `a AND AND b` | Duplicate AND-operators | ☐ | |
| D8 | `a OR b AND c` | "Semantically potentially unclear boolean operator(s)…" (AND and OR mixed without brackets) | ☐ | |
| D9 | `a AND OR b` | Two operators in a row | ☐ | |
| D10 | `a OR` | Operator without a search term | ☐ | |
| D11 | `()` | Empty brackets | ☐ | |
| D12 | `heart[tiabs]` | Unknown PubMed field tag | ☐ | |
| D13 | `("heart failure" OR cardiac)` | No warnings; under the full query: "No syntax problems found" | ☐ | |
| D14 | Fill P with `(a OR b` and I with `c` | Above the full query: "1 problem in the full query", with the letter **P** next to it | ☐ | |

## E. Copying from Word (curly quotes)

| # | As a user I… | Steps | Expected result | OK | Notes |
|---|---|---|---|---|---|
| E1 ⭐ | paste a phrase from Word | Paste `“publication bias”[tiab]` (curly quotes) | The box now shows straight quotes `"publication bias"[tiab]`, with a notice that the quote signs were replaced | ☐ | |
| E2 | paste single curly quotes | Paste `‘heart failure’` | Replaced by `'heart failure'`, with a notice | ☐ | |

## F. Other databases (proximity operators)

Each operator should appear **bold and grey** in the visualisation, like `NEAR/3`, without warnings.

| # | Database | Type | OK | Notes |
|---|---|---|---|---|
| F1 | Embase / WoS / Cochrane | `(heart NEAR/3 failure):ti,ab` | ☐ | |
| F2 | Ovid | `(heart adj3 failure).ti,ab.` | ☐ | |
| F3 | EBSCO | `TI (heart N3 failure)` | ☐ | |
| F4 | Cochrane | `heart NEXT failure` | ☐ | |
| F5 | Scopus | `heart W/3 failure OR cardiac PRE/2 arrest` | ☐ | |
| F6 | Web of Science | `AD=(Amsterdam SAME hospital)` | ☐ | |
| F7 | **No false hits** | `adjuvant therapy OR nearby hospital OR next generation` | Nothing is highlighted as an operator, except OR | ☐ | |

## G. Editing in the visualisation (click-to-edit)

| # | As a user I… | Steps | Expected result | OK | Notes |
|---|---|---|---|---|---|
| G1 ⭐ | pick a part to edit | Fill P with `(a OR b) AND c`. Hover over the visualisation | The part under the mouse is highlighted | ☐ | |
| G2 ⭐ | edit that part | Click the highlighted part, change the text, press **Enter** | The box above and the full query show the change | ☐ | |
| G3 | cancel an edit | Click a part, change the text, click outside it | The change is undone | ☐ | |
| G4 | edit inside a split letter | Split P, fill both boxes, click a term in the second dashed frame and edit it | Only the second box changes | ☐ | |

## H. Copying, sharing and downloading

| # | As a user I… | Steps | Expected result | OK | Notes |
|---|---|---|---|---|---|
| H1 ⭐ | copy my query | Fill PICO → **Copy query** → paste it in a text editor | The full query, exactly as shown | ☐ | |
| H2 ⭐ | share my search | **Copy link** → open the link in a new tab or private window | It opens straight in step 2 with the same mnemonic, title and text | ☐ | |
| H3 | share a split search | Split P (names, AND/OR) → **Copy link** → open it | The split, names, AND/OR choices and text are all back | ☐ | |
| H4 | share my own mnemonic | Use a saved mnemonic → **Copy link** → open it in a private window | The mnemonic appears even though it isn't saved in that window | ☐ | |
| H5 | download my search | **Download** | A .txt file with the title and the full query (on the GitHub page; it doesn't work in the page in Claude) | ☐ | |

## I. Switching framework

| # | As a user I… | Steps | Expected result | OK | Notes |
|---|---|---|---|---|---|
| I1 ⭐ | pick another framework | Fill PICO and a title → **Change framework** → **SPIDER** | All SPIDER boxes are empty; the title stays | ☐ | |
| I2 ⭐ | go back by mistake | Fill PICO → **Change framework** → **Back to your PICO search** | My PICO search is still there, unchanged | ☐ | |
| I3 | see the warning text | Fill PICO → **Change framework** | Step 1 says: "Picking a framework starts a new, empty search…" | ☐ | |
| I4 | leave the framework | Fill PICO → **Change framework** → **Start without a framework** | My text moves into blocks named after the PICO elements | ☐ | |

## J. My own mnemonics

| # | As a user I… | Steps | Expected result | OK | Notes |
|---|---|---|---|---|---|
| J1 | turn my blocks into a mnemonic | Reload the page → **Start without a framework** → name blocks `Population`, `Exposure` → **Save as mnemonic** | The builder opens with letters P and E and the name "PE" | ☐ | |
| J2 ⭐ | save it | Name it `PEX` → **Save to My mnemonics** → reload the page | PEX is under **My mnemonics** | ☐ | |
| J3 | build one from letters | **Edit PICO** → type `PEST` in Letters → **Make elements**, fill in what each letter stands for → **Use this mnemonic** | Step 2 shows 4 boxes P, E, S, T | ☐ | |
| J4 | change an existing mnemonic | PICO → **Edit PICO** → change a hint → **Use this mnemonic** | The hint has changed; my text is still in the boxes | ☐ | |
| J5 | rename my mnemonic | Step 1 → **Rename** under PEX → type `PEXO` → Enter | The card is called PEXO, also after a reload | ☐ | |
| J6 | try a name that's taken | **Rename** → type `pico` → Enter | Message: "There is already a mnemonic called pico." Nothing changes | ☐ | |
| J7 | cancel a delete | **Delete** under PEXO → **Cancel** | PEXO stays | ☐ | |
| J8 | delete my mnemonic | **Delete** → **Delete** | PEXO is gone, also after a reload | ☐ | |
| J9 | share a mnemonic as JSON | Edit a mnemonic → **Copy as JSON** → **Import JSON…** in another browser → paste | The mnemonic appears there | ☐ | |
| J10 | pick a light colour | Builder → set a letter's colour to light yellow → **Use this mnemonic** | The letter badge shows black text, so it stays readable | ☐ | |

## K. Look, access and devices

| # | As a user I… | Steps | Expected result | OK | Notes |
|---|---|---|---|---|---|
| K1 | use greyscale | Click **greyscale** at the top | The visualisation turns grey; **colour** switches back | ☐ | |
| K2 ⭐ | use a phone | Open the page on a phone, do A3, B1, C1 and H1 | Everything is readable and usable; no sideways scrolling | ☐ | |
| K3 | use the keyboard | Use only Tab, Enter and Space to pick a card and fill a box | You can reach every button, card and box, and see where you are | ☐ | |
| K4 | use dark mode | Turn on dark mode on your computer and reload | The page is dark and readable; the visualisation frames stay white | ☐ | |
| K5 | read the badges | Look at the letter badges of all cards | All letters are easy to read (dark enough colours) | ☐ | |
| K6 | use the menu | Click **Medsyntax Editor** and **Report an issue** at the top | Medsyntax Editor opens https://www.medsyntax.org/; Report an issue opens the GitHub issues page of MedsyntaxQA | ☐ | |
| K7 | go from the app to the framework | In the Medsyntax app: **menu** → **Medsyntax Framework** | The framework page opens | ☐ | |

---

## L. MeSH check (links to NCBI MeSH)

Start each test with PICO and database **PubMed**. Wait about a second after typing: the terms are checked against the NLM MeSH API. Check the box text after each test: it must never change.

| # | As a user I… | Steps | Expected result | OK | Notes |
|---|---|---|---|---|---|
| L1 ⭐ | open a MeSH record | Type `Heart Failure[Mesh]` in P. Hover over "Heart Failure", then click it | "Heart Failure" is underlined (green) with a small ↗. The hover card says "MeSH term found". The click opens https://www.ncbi.nlm.nih.gov/mesh/68006333 in a new tab | ☐ | |
| L2 ⭐ | make a typo | Type `Heart Faliure[Mesh]` and click the term | Red wavy line. No new tab. A message: "No exact MeSH term found. Did you mean: Heart Failure?" Clicking **Heart Failure** in the message opens its record | ☐ | |
| L3 | have several terms in one box | Type `Diabetes Mellitus[Mesh] OR Hypertension[Mesh]` and click Hypertension | Only the Hypertension record opens | ☐ | |
| L4 | use Ovid syntax | Type `1. exp Diabetes Mellitus/` and click the term | Red wavy line. No new tab. A message: "Not PubMed syntax (Ovid notation). No page is opened." | ☐ | |
| L5 | use a subheading | Type `"Heart Failure/drug therapy"[Majr]` and hover | Only "Heart Failure" is underlined; the card shows subheading drug therapy and major. A click opens Heart Failure | ☐ | |
| L6 | use an entry term | Type `"Heart Attack"[mh]`, hover, click | Blue line. "Entry term of: Myocardial Infarction". The click opens the Myocardial Infarction record | ☐ | |
| L7 | use free text | Type `heart failure[tiab]` | Not underlined; clicking places the cursor | ☐ | |
| L8 | use Emtree | Type `'heart failure'/exp` | Not underlined; clicking places the cursor | ☐ | |
| L9 | work without internet | Turn off wifi, reload, type `Asthma[Mesh]`, click | Grey dotted line, "Check not available". The NCBI MeSH search page for Asthma opens (it can't load while offline). No "not found" message | ☐ | |
| L10 ⭐ | check nothing changes | Fill several MeSH terms, open a few records, then press Ctrl+Z / Cmd+Z in the box and click **Copy link** | The box text, full query and share link are the same as before; undo still works | ☐ | |
| L11 | use an old MeSH term | Type `"Health Care Facilities, Manpower, and Services"[Mesh]` and hover | Orange double line. "Replaced by: Health Care Facilities Workforce and Services (since MeSH 2025)". A click opens that record | ☐ | |
| L12 | use a deleted MeSH term | Type `"Health Food"[Mesh]` and click | Orange line. "Descriptor deleted in MeSH 2016". No new tab | ☐ | |
| L13 | use EBSCO syntax | Type `MH "Hypertension+" OR MM "Asthma"` and click each term | Both: "Not PubMed syntax (EBSCO notation)". No new tab | ☐ | |
| L14 | use Cochrane syntax | Type `MeSH descriptor: [Hypertension] explode all trees` and click | "Not PubMed syntax (Cochrane notation)" | ☐ | |
| L15 | use the menu | Right-click "Heart Failure" (L1) → **Copy MeSH term**, then **Copy as PubMed syntax**, then **Search in PubMed** | The clipboard holds `Heart Failure`, then `"Heart Failure"[Mesh]`; PubMed opens with that search. Right-clicking next to a term gives the normal browser menu | ☐ | |
| L16 ⭐ | edit a MeSH term | Hold **Alt** (Option on a Mac) and click in the middle of "Heart Failure", then type `s` | The cursor is in the word, no tab opens, and the `s` appears where you clicked | ☐ | |
| L17 | use only the keyboard | Move the cursor into "Heart Failure" with the arrow keys. Press Ctrl+Enter (Cmd+Enter on a Mac), then Shift+F10 | A line under the box says "Heart Failure: MeSH term found". Ctrl/Cmd+Enter opens the record; Shift+F10 opens the menu, which works with the arrow keys and Esc | ☐ | |
| L18 ⭐ | split a concept | Split P: box 1 `Aged[Mesh]`, box 2 `Heart Failure[Mesh]` | The terms in both boxes are links | ☐ | |
| L19 | edit in the visualisation | Open **Visualisation**, hover and click "Heart Failure", add ` OR Aged[Mesh]`, press Enter | Click-to-edit works as before; the visualisation shows no MeSH marks or warnings; "Aged" in the box becomes a link | ☐ | |
| L20 | read the summary | Type `Heart Failure[Mesh] OR Heart Faliure[Mesh]` | Under the full query: "MeSH check: 1 found, 1 not found". No extra syntax warning | ☐ | |
| L21 | type a long search | Type 6+ lines with several MeSH terms in one box | The underlines stay exactly under the right words, also after resizing the window | ☐ | |
| L22 ⭐ | use a phone | Tap "Heart Failure" (L1) | The cursor goes into the word (no tab). The line under the box shows the result with an **Open MeSH record** button that opens the record | ☐ | |
| L23 | use the Artifact version | Open the claude.ai Artifact, type `Heart Failure[Mesh]`, hover and click | Grey line, "MeSH check not available in this version"; the click opens the NCBI MeSH search page | ☐ | |
| L24 | use dark mode | Repeat L1, L2 and L15 in dark mode | Lines, hover card, messages and menu are readable | ☐ | |

---

## Results

| Group | Passed | Failed | Tested by / date |
|---|---|---|---|
| A Choosing a framework | /5 | | |
| B Building a search | /9 | | |
| C Split concept | /7 | | |
| D Syntax checks | /14 | | |
| E Curly quotes | /2 | | |
| F Other databases | /7 | | |
| G Click-to-edit | /4 | | |
| H Copy, share, download | /5 | | |
| I Switching framework | /4 | | |
| J My own mnemonics | /10 | | |
| K Look, access, devices | /7 | | |
| L MeSH check | /24 | | |

Found a problem? Note the test number, what you did and what you saw, and report it via **Report an issue** in the page menu.
