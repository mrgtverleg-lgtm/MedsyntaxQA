# Medsyntax Framework

Option B ("Start with cards") of the framework design, ready to put in the picomedsyntax repo. English interface.

1. **Choose a framework.** Pick a mnemonic card (PICO, SPIDER, PCC…), or *Start without a framework*: numbered concept blocks you name yourself, add or remove, and combine with AND, OR or NOT. In step 2, *Save as mnemonic* turns your blocks into your own mnemonic (saved under *My mnemonics*).
2. **Build your search.** Fill in the coloured boxes. Medsyntax shows each part as a coloured box, joins them with AND (or NOT), checks the syntax and gives you the full query.

## Files

| File | What it is |
|---|---|
| `index.html` | The page: header, menu, step indicator, footer. |
| `style.css` | Page styles, plus the medsyntax visualisation styles ported from MedsyntaxQA `style.css`. |
| `scripts/medsyntax-engine.js` | The MedsyntaxQA parser (regexes and `syntaxParser`, copied unchanged), its 8 warnings, the clean-up and the click-to-edit feature, scoped so it can run on several boxes at once. |
| `framework.js` | Mnemonic library, *Save as mnemonic* / *Edit* builder, the coloured boxes, the full query, links and the two-step page flow. |

Scripts load in this order: jQuery 3.6.0 → LZString → `scripts/medsyntax-engine.js` → `framework.js`.

## Before release

See [the release checklist](../Documentatie/framework-option-b-release-checklist.md): requirements, must-fix items, tests and the steps to get this page on GitHub Pages.

## Put it in the repo

1. Copy the four files into the root of the picomedsyntax repo (or into a subfolder, if it should live next to the current PICO page).
2. Optional: the repo already has `scripts/lzstring.js`. You can load that instead of the cdnjs copy in `index.html`.
3. Commit and push. GitHub Pages serves it as is: no build step.

## Try it locally

From this folder, run:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` straight from Finder also works, apart from saving custom mnemonics in some browsers.

## Good to know

- **Checks:** the 8 original MedsyntaxQA warnings (bracket check improved, see below), plus four extra: two operators in a row (`AND OR`, `NOT NOT`, `AND NOT`…), an operator without a term before or after it, empty brackets, and unknown PubMed field tags (`[tiabs]`, or proximity on the wrong field such as `[mh:~2]`). The tag list is PubMed only; there is no database selector yet.

- **Shared links** use `?s=…` (LZString-compressed). They carry the mnemonic, including custom ones, plus the title and all text, and open straight in step 2.
- **My mnemonics** are saved in the browser (`localStorage`). They don't move to other computers: use *Copy as JSON* and *Import JSON* to share them.
- **Bracket check (improved):** each box says how many ( and ) (or [ and ]) it found, how many have no partner, and shows the query with the first stray bracket highlighted. Brackets inside quotes are ignored, like the parser does. This replaces MedsyntaxQA's count check, which showed both warnings for `(a OR b`.
- **The engine is a copy.** Once MedsyntaxQA loads the same `scripts/medsyntax-engine.js`, parser fixes only need to happen once.
