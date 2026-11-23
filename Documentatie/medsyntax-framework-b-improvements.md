# Medsyntax Framework B: suggestions and improvements

Review of the current version (option B, "Start with cards", English, without "Help me choose", with a "No framework" option), as of 22 November 2026.

- Code: [medsyntax-framework/](../framework/)
- Private link: [Medsyntax Framework B](https://claude.ai/artifact/Tb9Xyu9ySWZgzmcgcffhW7)
- Broader roadmap (syntax esperanto, databases, exports): [medsyntax-framework-todo.md](medsyntax-framework-todo.md)

Priority: **High** = fix before going live · **Medium** = soon after · **Low** = nice to have.

---

## 1. Problems found in this version

| Priority | Issue | Where | Suggested fix |
|---|---|---|---|
| High | **Low contrast in some element colours.** White letters on orange (`#e88a00`, about 2.6:1) and green (`#5f9e2f`, about 3.3:1) are below the WCAG 4.5:1 minimum for small text. This affects the letter badges, box labels and cards. | `PALETTE` in `framework.js` | Use darker shades (e.g. `#b36200`, `#3f7a1c`), or black text on light colours. Check custom colours too: pick black or white text automatically based on the colour. |
| ~~High~~ Done | ~~**Cancel while editing a mnemonic goes to step 1.**~~ Fixed: editing now happens in step 2, and Cancel keeps you in your search. | `renderApp()` | — |
| High | **No way to remove a mnemonic from "My mnemonics".** Only clearing browser data helps. | Cards in step 1 | Add a "Manage my mnemonics" list with Rename / Delete, with a confirm step on the page. |
| ~~Medium~~ Done | ~~**Bracket quirk copied from MedsyntaxQA.**~~ Fixed: one warning per real problem, with counts and the stray bracket highlighted. | `bracketReport()` in `scripts/medsyntax-engine.js` | Do the same in MedsyntaxQA. |
| Medium | **The "LSI" example sits under "My mnemonics"**, as if the user had saved it. | `allMine()` | Move examples to the Library, or to their own "Examples" row. |
| ~~Medium~~ Done | ~~**"Create your own" appears twice.**~~ Fixed: replaced by *Start without a framework* + *Save as mnemonic*. | `renderApp()` | — |
| Medium | **Duplicate letters** (PCC has two C's, CoCoPop two Co's) look identical in the badges and the warning summary. | Library | Show the label on hover (already a tooltip in the summary), or use keys like C₁ / C₂ in the badges. |
| Medium | **Click-to-edit works with a mouse only.** Keyboard and touch users can't use it. | Scope editor in `medsyntax-engine.js` | Make the scopes focusable (Tab), open the editor with Enter, and support tap on phones. |
| Medium | **Line breaks turn into spaces while typing.** Pressing Enter in a box feels broken. | `cleanQuery()` | Allow line breaks in the boxes and only clean them in the full query, or use "one term per line = OR" (see section 3). |
| Low | **Smart-quote message stays about 6 seconds,** also after the text is fixed. | `refresh()` | Hide it on the next edit, or add a close button. |
| Low | **Shared links get long** (`?s=` with all the text). | `packState()` | Fine for now; consider short links later. |
| Low | **Old MedsyntaxQA links** (`?query=`) don't open in this page. | `boot()` | Accept `?query=`: put the query in one box, or split it on top-level AND into boxes. |

## 2. Code quality and maintenance

- **The engine is a copy** of the MedsyntaxQA parser. Load the same `scripts/medsyntax-engine.js` from MedsyntaxQA too, so a fix is made once.
- **Fixes already in this version, not yet in MedsyntaxQA:**
  - user text is escaped before it goes into the page, so a `<` can't break the display;
  - the hover code uses a loop instead of recursion that never stops;
  - messages appear on the page instead of `alert()` pop-ups;
  - the typo "not enough `[]`" is corrected to "not enough `[`".
- **Leftover code:** the Download code is still in `framework.js` and the private-link copy, even though that copy has no Download button. Harmless, but it can be removed there.
- **Load LZString from the repo** (`scripts/lzstring.js`) instead of cdnjs, so the page works without that external site.
- **No automated tests yet.** Add a small test page that runs the 8 warning examples (`(a OR b`, `a OR b)`, `x[mh`, `x]`, `"abc`, `a OR OR b`, `a AND AND b`, `a OR b AND c`) and shows pass/fail.
- **Carry-over when switching framework** matches on letter plus the first word of the label, then position. Works for PICO ↔ PICOS ↔ PEO, but can guess wrong for very different mnemonics. Consider a short "Your text moved to…" message after switching.

## 3. Feature suggestions for this version

### Step 1: choose a framework
- **Search or filter the cards** (e.g. type "qualitative" or "diagnostic").
- **"Recently used"** row at the top.
- **Short explanation per mnemonic** on the card (one line, with a source such as JBI or Cochrane) and a "Learn more" link.
- **Examples for every library mnemonic** (now only PICO, SPIDER and LSI have "Load example").

### Step 2: build the search
- **One term per line = OR:** type each synonym on its own line; Medsyntax joins them with OR.
- **Field-tag buttons** per box: `[tiab]`, `[Mesh]`, `[mh:noexp]` (later per database, see the syntax esperanto in the to-do file).
- **Collapse empty or excluded boxes** to keep long mnemonics (ECLIPSE, 6 parts) manageable.
- **Undo / redo** for typing and click-to-edit.
- **A warning for an included box that is empty,** and for the same term in two boxes.
- **Copy per element**, not only the full query.
- **Show the full query in the medsyntax visualisation too** (now only per element), for a final check.

### No framework mode
- **Drag to reorder concepts** (now only add and remove).
- **Nested groups:** combine two concepts in brackets before joining the rest, e.g. `(A OR B) AND C`. Now the operators simply run left to right.

### Sharing and saving
- **Download as .txt** already works on GitHub Pages. Add Word/PDF with the strategy per element for protocol appendices.
- **Share a mnemonic as a link** (not only as JSON).
- **Team library** stored online, so colleagues use the same mnemonics.

### Look and feel
- **Dark mode for the medsyntax boxes** (they now stay white in dark mode, on purpose, like paper).
- **Print-friendly view** of the strategy.
- **Short first-visit tour** (3 steps) explaining cards, boxes and warnings.

## 4. Before going live (checklist)

- [ ] Fix the colour contrast.
- [x] Fix Cancel in "Edit mnemonic".
- [ ] Add Delete for "My mnemonics".
- [ ] Check the mnemonic labels and hints with a librarian colleague.
- [ ] Test in Chrome, Safari, Firefox and Edge, and on a phone.
- [ ] Test with a long real-world strategy for speed.
- [ ] Decide: replace Medsyntax PICO, or put this page next to it.
- [ ] Copy the folder into the picomedsyntax repo and push.
