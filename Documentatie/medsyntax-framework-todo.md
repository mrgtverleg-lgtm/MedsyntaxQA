# Medsyntax Framework: feature suggestions and to-dos

Status as of 22 November 2026. The design options are in [medsyntax-framework-options.html](medsyntax-framework-options.html), also published as the Artifact "Medsyntax Framework". Nothing has been ported to the picomedsyntax repo yet.

---

## To-dos

### Decide
- [x] **Step 1 simplified** (22 November 2026): pick a card, or *Start without a framework*. The separate "Create your own" button is gone; users make their own mnemonic afterwards with *Save as mnemonic* in step 2.
- [x] **"No framework" option** (added 22 November 2026): users can skip the mnemonic and work with their own concept blocks (add, name, remove, combine with AND / OR / NOT). Text and names carry over from a mnemonic.
- [x] **No "Help me choose" helper** (decided 22 November 2026). Users pick a mnemonic card themselves; the helper was removed from the code.
- [x] Choose a layout: **B, Start with cards** (decided 22 November 2026). Users first pick a mnemonic card or create their own. Then they fill in the coloured boxes. Options A and C are dropped.
- [ ] Decide whether it replaces Medsyntax PICO (tedgrm.github.io/picomedsyntax) or becomes a new page next to it.
- [x] Interface language: **English** (decided 22 November 2026). The Dutch "zoekstrategie" heading on the current PICO page becomes "search strategy".
- [ ] Check the mnemonic library, labels and hints with a librarian colleague. Which ones stay, and which are missing?

### Port to the repo
- [x] Strip the prototype down to option B only: remove the A/C tabs, the option intro texts and the code for the dropdown toolbar and the chip sidebar. Done in [medsyntax-framework/](medsyntax-framework/) (22 November 2026).
- [x] Keep from option A/C what B still needs: the table builder ("Create your own") and Save / Copy as JSON / Import. Added "Edit {mnemonic}" and "Back to your search".
- [x] Split into `index.html` + `style.css` + `framework.js` + `scripts/medsyntax-engine.js`.
- [ ] Copy the folder into the picomedsyntax repo and push (see [medsyntax-framework/README.md](medsyntax-framework/README.md)).
- [ ] Let MedsyntaxQA load the same `scripts/medsyntax-engine.js`, so parser fixes happen in one place instead of in a copy.
- [ ] Add a way to remove a mnemonic from "My mnemonics" (now only possible by clearing browser data).
- [ ] Keep the `?query=` / `querytitle=` URL format working, so existing links to MedsyntaxQA still open.
- [ ] Add links between the pages in the menu (Medsyntax Editor, Medsyntax QA, Medsyntax Framework, Workspace).
- [ ] Update the "How to use" help text and the example image for the new layout.

### Fix or check
- [x] **Bracket warning quirk:** fixed in Medsyntax Framework (22 November 2026), with counts and the location of the stray bracket. Still to do in MedsyntaxQA. `(a OR b` shows both "Too many (" and "Too many )". The cause is the `indexOf("(") > indexOf(")")` check in `afterParseFunction`, which also fires when there is no `)` at all. Fix this in MedsyntaxQA too.
- [ ] **Typo in MedsyntaxQA:** "Or not enough **[]** in query" should be "Or not enough **[** in query".
- [ ] **Infinite recursion** in `addHoverThisAndNextElement` / `addHoverThisAndPrevElement`: when there is no next element the recursion never stops and is only caught by `try/catch`. The new page uses a loop instead. Fix the same in MedsyntaxQA.
- [ ] **Raw HTML in the parser:** user text goes into `innerHTML` without escaping, so a `<` in a query can break the display. The new page escapes `& < >` first. Do the same in MedsyntaxQA.
- [ ] Replace the `alert()` pop-ups in MedsyntaxQA with messages on the page, as in the new page.
- [ ] Check the cleaning-while-typing behaviour: line breaks become spaces immediately. Is that wanted in the element boxes?
- [ ] Test with long real-world strategies (for example the COVID-19 PubMed filter in the MedsyntaxQA source) for speed.
- [ ] Test in Safari, Firefox and Edge, and on a phone.
- [ ] Accessibility check: keyboard-only use of the click-to-edit feature (currently mouse only), screen reader labels, colour contrast of the element colours.

---

## Feature suggestions

### Syntax esperanto: one neutral syntax for all databases
A shared "esperanto" search syntax: write the strategy once, in one neutral notation, and Medsyntax translates it into the syntax of each database. The esperanto is also what Medsyntax stores, shares in links and checks with its warnings. The database versions are generated from it.

**Example**

| Concept | Esperanto | PubMed | Ovid (MEDLINE/Embase) | Embase.com | EBSCO (CINAHL) |
|---|---|---|---|---|---|
| Subject heading, exploded | `{Diabetes Mellitus}` | `"Diabetes Mellitus"[Mesh]` | `exp Diabetes Mellitus/` | `'diabetes mellitus'/exp` | `(MH "Diabetes Mellitus+")` |
| Subject heading, not exploded | `{Diabetes Mellitus}!` | `"Diabetes Mellitus"[Mesh:NoExp]` | `Diabetes Mellitus/` | `'diabetes mellitus'/de` | `(MH "Diabetes Mellitus")` |
| Title/abstract | `diabet*:ti,ab` | `diabet*[tiab]` | `diabet*.ti,ab.` | `diabet*:ti,ab` | `TI diabet* OR AB diabet*` |
| Phrase | `"physical activity":ti,ab` | `"physical activity"[tiab]` | `"physical activity".ti,ab.` | `'physical activity':ti,ab` | `TI "physical activity" OR AB "physical activity"` |
| Proximity | `exercis* NEAR/3 program*` | not supported → warning | `exercis* adj3 program*` | `exercis* NEAR/3 program*` | `exercis* N3 program*` |

**To-dos**
- [ ] Define the esperanto grammar: field codes, subject headings (exploded or not), phrases, truncation, wildcards, proximity, Boolean operators, brackets. Write it down as a one-page cheat sheet.
- [ ] Keep it close to what librarians already type, so it's easy to learn (borrow from Ovid/Embase.com notation where possible).
- [ ] Write a translation table per database: PubMed, Ovid MEDLINE, Ovid Embase, Embase.com, EBSCO (CINAHL, APA PsycINFO), Cochrane Library, Web of Science, Scopus.
- [ ] Look at existing work before building: the Polyglot Search Translator (SR-Accelerator, Bond University), MEDLINE Transpose and Litsonar, to reuse ideas and avoid known pitfalls.
- [ ] Mark what can't be translated 1:1 and show a warning instead of guessing. Examples: proximity in PubMed, subject headings that differ between MeSH and Emtree, field codes that only exist in one database.
- [ ] Map subject headings between thesauri (MeSH ↔ Emtree ↔ CINAHL Headings) as suggestions to check, never automatically.
- [ ] Teach the medsyntax parser the esperanto tokens, so headings, field codes and proximity get their own colour in the visualisation.
- [ ] Add esperanto-specific warnings: unknown field code, heading without a thesaurus match, proximity that the target database doesn't support.
- [ ] Interface: write in esperanto, then switch tabs to see each database version, with Copy per database.
- [ ] Reverse direction: paste an existing PubMed or Ovid strategy and convert it to esperanto, so old strategies can be reused.
- [ ] Build a test set of real strategies with known correct translations, and check every translation rule against it.
- [ ] Decide on the name: "Medsyntax Esperanto", "Medsyntax Universal", or another name.

### Search building
- **One term per line → OR:** let users type each synonym on its own line and join them with OR automatically. Easier than typing `OR` every time.
- **Multiple concept rows per element:** like the Cochrane screenshot, allow two blocks for one element (e.g. two Population concepts), combined with AND or OR.
- **Per-element operator choice:** AND / OR / NOT between blocks, not only AND and NOT.
- **Field-tag helper:** buttons to add `[tiab]`, `[Mesh]`, `[mh:noexp]`, `.ti,ab.`, `/exp` to the selected term.
- **Truncation and phrase helper:** warn when a truncated word is inside quotes in databases that don't support it, e.g. `"information scientist*"` in PubMed.
- **Proximity explanation:** show what `adj3`, `NEAR/3` or `N3` means in plain words.

### Databases
- **Database selector** (PubMed, Embase.com, Ovid, EBSCO/CINAHL, Cochrane Library, Web of Science): warnings and tag helpers follow the chosen syntax.
- **Translate the query** between databases: see *Syntax esperanto* above.
- **Open in database** button that sends the full query to PubMed.
- **MeSH/Emtree lookup** per element. This connects to the requirement documents in this folder ("Open MeSH-termpagina vanuit zoekterm", Embase, Ovid, EBSCO, Cochrane).

### Mnemonics
- **Shared team library:** store team mnemonics online instead of only in the browser, so a library team uses the same set.
- **Mnemonic from a research question:** the user types the question, and the tool suggests which part belongs in which element.
- **Templates with example terms** for every library mnemonic, not only PICO, SPIDER and LSI.
- **Mark elements as optional in the search** (Comparison, Study design) with a short explanation of why they are often left out.

### Quality checks (extra warnings)
- Empty element that is included in the search.
- The same term appearing in two elements.
- Very short truncation such as `pa*` that will find too many words.
- A Boolean operator in lower case (`and`, `or`), which some databases read as a search word.
- Unbalanced quotes inside one term, shown at the right place instead of only as a count.

### Sharing and output
- **Download as Word or PDF** with the strategy per element, for a protocol appendix or a PRISMA-S report.
- **Search history log:** date, database, query and number of hits, for reporting.
- **Workspace integration:** open a framework strategy in the Medsyntax Workspace to compare versions side by side.
- **Short links** instead of long `?s=` URLs.

### Usability
- **Dark mode** for the medsyntax visualisation itself (now always a light "paper" panel).
- **Undo / redo** for click-to-edit changes.
- **Drag to reorder** elements instead of the ↑↓ buttons.
- **Onboarding tour** for first-time users: three steps that explain the boxes, the visualisation and the warnings.
