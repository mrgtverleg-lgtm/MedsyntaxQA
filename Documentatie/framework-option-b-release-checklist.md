# Medsyntax Framework option B: release checklist

What to do before option B ("Start with cards") goes to GitHub and live on GitHub Pages.

- **Code:** [framework/](../framework/) (`index.html`, `style.css`, `framework.js`, `scripts/medsyntax-engine.js`)
- **Branch:** `Medsyntax-Framework`, created from `claude`. The move to `framework/` is committed (886a30d) and pushed to GitHub (`origin/Medsyntax-Framework`).
- **Deploy:** [.github/workflows/static.yml](../.github/workflows/static.yml) uploads the **whole repository** to GitHub Pages on every push to `main`. As soon as this branch is merged into `main`, the page is live at `<pages-url>/framework/`. So everything in "Must fix" below has to be done **before** the merge.
- **Related:** [medsyntax-framework-b-improvements.md](medsyntax-framework-b-improvements.md) (review and ideas), [medsyntax-framework-todo.md](medsyntax-framework-todo.md) (roadmap)

Status as of 23 November 2026.

---

## 1. Requirements

What the page must do. Tick each item off once you have checked it (see the tests in section 3).

### Step 1: choose a framework
- [ ] The library shows a card for each mnemonic: PICO, PICOS, PICOT, PEO, PECO, SPIDER, SPICE, ECLIPSE, PCC, PIRD, PFO, CoCoPop, CIMO, BeHEMoTh.
- [ ] Each card shows the letters as coloured badges, the element labels and what it is used for.
- [ ] *Start without a framework* opens step 2 with numbered concept blocks you can name, add, remove and combine with AND, OR or NOT.
- [ ] *My mnemonics* shows the mnemonics saved in this browser (`localStorage` key `medsyntax.myMnemonics.v1`).
- [ ] *Import JSON…* adds a mnemonic that someone shared with *Copy as JSON*.

### Step 2: build the search
- [ ] There is one coloured box per element, with its label, a hint and a *Clear* button.
- [ ] Each element can be included or excluded, and joined with AND (or NOT).
- [ ] Medsyntax shows each box as nested coloured boxes (or in greyscale), and click-to-edit works in them.
- [ ] The full query combines all included boxes correctly.
- [ ] *Query title*, *Copy query*, *Copy link* and *Download* (.txt) work.
- [ ] *Load example* works where an example exists (PICO, SPIDER, LSI).
- [ ] *Edit {mnemonic}* and *Save as mnemonic* open the builder. *Cancel* returns to your search without losing text.
- [ ] *Change framework* goes back to step 1 and carries your text over to matching elements of the new mnemonic.

### Syntax checks (per box)
- [ ] The 8 original MedsyntaxQA warnings: too many `(` or `)`, too many `[` or `]`, an odd number of quotes, duplicate OR, duplicate AND, ambiguous AND/OR.
- [ ] 4 extra warnings: two operators in a row, an operator without a term, empty brackets, an unknown PubMed field tag.
- [ ] The bracket report gives counts, says how many brackets have no partner, and highlights the first stray bracket. Brackets inside quotes are ignored.
- [ ] Smart quotes (“ ”) are replaced, with a short notice.

### Sharing
- [ ] A `?s=…` link restores the mnemonic (including custom ones), the title and all text, and opens straight in step 2.
- [ ] The URL updates while you type, so the address bar is always a working link.

### Display and access
- [ ] The colour/greyscale toggle works.
- [ ] The page works at phone width (375 px), with no horizontal scrolling.
- [ ] Contrast meets WCAG 2.1 AA (4.5:1 for small text). **Not met yet**, see section 2.
- [ ] Buttons, cards and boxes can be reached and used with the keyboard (Tab, Enter, Space).

---

## 2. Must fix before release

These items block the merge to `main`.

| # | What | Where | How |
|---|---|---|---|
| 1 | **Colour contrast too low.** White text on orange `#e88a00` (about 2.6:1) and green `#5f9e2f` (about 3.3:1) fails WCAG AA. | `PALETTE`, line 8 of `framework/framework.js` | Use darker shades (e.g. `#b36200`, `#3f7a1c`). For custom colours, choose black or white text automatically. Check all 10 palette colours. |
| 2 | **No way to delete or rename a saved mnemonic.** Only clearing browser data removes it. | Step 1, *My mnemonics* (`allMine()`, `saveMine()`) | Add Rename and Delete, with a confirm step on the page (no `confirm()` pop-up). |
| 3 | **Menu links point to someone else's sites.** *Medsyntax Editor* goes to `tedoutlook.github.io/medsyntaxqa`. *Report an issue* goes to `github.com/tedgrm/medsyntaxexperimental/issues`. | `<nav class="menu">` in `framework/index.html` | Use this repo: `../` for the editor and `https://github.com/mrgtverleg-lgtm/MedsyntaxQA/issues` for issues. |
| 4 | **The Medsyntax app doesn't link to the framework yet.** | Menu (`dropdown-content`) in `index.html` | Add a link *Medsyntax Framework* → `framework/`. |
| 5 | **Footer contact address.** It shows `m.verleg@mzh.nl`. | Footer in `framework/index.html` | Confirm this is the right public contact, or change it. |
| 6 | **README is outdated.** It says the page is "ready to put in the picomedsyntax repo". | `framework/README.md` | Describe where it lives now (`framework/` in this repo) and remove the "Put it in the repo" steps that no longer apply. |

Recommended, not blocking:
- Load LZString from the repo (`../scripts/lzstring.js`) instead of cdnjs, so the page doesn't depend on another site.
- Move the *LSI* example out of *My mnemonics* into the library or an "Examples" row.

---

## 3. Tests

### 3.1 Manual test script

Start the local server (in Claude Code: the preview server "static"), or from the repo root:

```bash
python3 -m http.server 8080
```

Open http://localhost:8080/framework/ and work through the table.

| # | Steps | Expected result | OK |
|---|---|---|---|
| T1 | Open the page | Step 1 with all library cards; no errors in the browser console | ☐ |
| T2 | Click *PICO* | Step 2 with 4 coloured boxes P, I, C, O | ☐ |
| T3 | Type `(a OR b` in P | Warning: 1 opening ( but 0 closing ), with the stray bracket highlighted. **Only one** bracket warning | ☐ |
| T4 | Type `a OR b)` | Warning: too many `)` | ☐ |
| T5 | Type `x[mh` | Warning: too many `[` | ☐ |
| T6 | Type `x]` | Warning: too many `]` | ☐ |
| T7 | Type `"abc` | Warning: incorrect number of quote signs | ☐ |
| T8 | Type `a OR OR b` | Warning: duplicate OR-operators | ☐ |
| T9 | Type `a AND AND b` | Warning: duplicate AND-operators | ☐ |
| T10 | Type `a OR b AND c` | Warning: ambiguous boolean operators | ☐ |
| T11 | Type `a AND OR b`, `a OR`, `()`, `x[tiabs]` | Warnings: two operators in a row, operator without a term, empty brackets, unknown PubMed field tag | ☐ |
| T12 | Fill P and I, exclude C | Full query = `(P) AND (I)`, C left out | ☐ |
| T13 | Click *Copy link*, open the link in a new tab | Same mnemonic, title and text, opens in step 2 | ☐ |
| T14 | *Change framework* → PICOS | Your P/I/C/O text is in the matching PICOS boxes | ☐ |
| T15 | *Start without a framework*, add 3 concepts, set one to NOT | Full query uses AND/NOT in the right order | ☐ |
| T16 | *Save as mnemonic*, reload the page | The mnemonic is under *My mnemonics* | ☐ |
| T17 | *Copy as JSON*, delete it from *My mnemonics*, *Import JSON…* | The mnemonic is back (delete needs must-fix #2) | ☐ |
| T18 | Toggle *greyscale* | Medsyntax boxes switch to grey | ☐ |
| T19 | Click a part of the medsyntax visualisation, edit, press Enter | The box text updates; clicking outside cancels | ☐ |
| T20 | *Download* | A .txt file with the strategy | ☐ |
| T21 | Phone width (375 px) | Everything readable, no horizontal scroll | ☐ |
| T22 | Keyboard only: Tab through step 1 and 2 | Every button and card can be reached and used | ☐ |
| T23 | Check contrast (e.g. WebAIM contrast checker or browser DevTools) | All text ≥ 4.5:1 | ☐ |
| T24 | Menu links | *Medsyntax Editor* and *Report an issue* go to this repo | ☐ |

Repeat T1–T13 in **Chrome, Safari, Firefox and Edge**, and T1–T3, T13 and T21 on a real phone.

### 3.2 Automated tests (Playwright)

The repo already has Playwright (`npm run pw-test`). Before you can test the framework:

1. **Fix the config.** `playwright.config.js` has no `baseURL` and no `webServer`, so the tests can't find the page. Add:

   ```js
   use: { baseURL: 'http://localhost:8080', trace: 'on-first-retry' },
   webServer: { command: 'python3 -m http.server 8080', port: 8080, reuseExistingServer: true },
   ```

2. **Add `playwright/framework.spec.ts`** with at least:
   - the page loads and shows the 14 library cards (T1);
   - PICO opens 4 boxes (T2);
   - one test per warning example (T3–T11), checking the warning text from `WARN_TEXT` in `framework/scripts/medsyntax-engine.js`;
   - the full query for a filled PICO (T12);
   - a share link round trip: read the `?s=` URL, open it in a new page and compare the boxes (T13);
   - saving a mnemonic survives a reload (T16).

3. **Run them:**

   ```bash
   npm install
   ```

   ```bash
   npx playwright install
   ```

   ```bash
   npm run pw-test
   ```

Note: `.gitignore` ignores `example.spec.ts`. New spec files are committed normally.

---

## 4. Steps to get it on GitHub

1. Fix the items in section 2 on the branch `Medsyntax-Framework`, and commit each fix.
2. Decide about `.claude/launch.json`. It holds a local path fix for the preview server (uncommitted). It is only useful on your own computer, so leave it out of the commits or commit it separately.
3. Run the manual tests (3.1) and `npm run pw-test` (3.2). Everything should pass.
4. Push the branch (it already tracks `origin/Medsyntax-Framework`):

   ```bash
   git push
   ```

5. Open a pull request to `main` on GitHub, describe what changed, and ask someone to review it.
6. Merge the pull request. The *Deploy static content to Pages* workflow starts automatically. Check the **Actions** tab until it is green.
7. Open `<pages-url>/framework/` and repeat T1, T2, T13 and T24 on the live page.
8. Afterwards: add the framework to [FEATURES.md](../FEATURES.md), and tick off the port items in [medsyntax-framework-todo.md](medsyntax-framework-todo.md).

---

## 5. Suggestions after release

Not needed for the first release. The full list with reasons is in [medsyntax-framework-b-improvements.md](medsyntax-framework-b-improvements.md).

- **Share the engine.** Let MedsyntaxQA (`index.html`) load `framework/scripts/medsyntax-engine.js` too, so parser fixes happen once. Also bring the bracket-check fix and the HTML escaping to MedsyntaxQA.
- **Old links.** Accept `?query=` / `querytitle=` links from MedsyntaxQA and put the query in a box.
- **Keyboard and touch for click-to-edit** (now mouse only).
- **Line breaks in boxes**, or "one term per line = OR".
- **Field-tag buttons** per box (`[tiab]`, `[Mesh]`, `[mh:noexp]`).
- **Duplicate letters** (PCC, CoCoPop): use C₁ / C₂ in the badges.
- **Search or filter the cards**, a "Recently used" row, and an example for every mnemonic.
- **Check the mnemonic library** (labels and hints) with a librarian colleague.
- **Print view**, and export to Word/PDF for protocol appendices.
