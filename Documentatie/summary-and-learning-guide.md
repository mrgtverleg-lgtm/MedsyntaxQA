# What we built, and how it works

This is a summary of the work on the **Medsyntax Framework** (23 November 2026, plus a look at what changed after). Each part explains what we did, and then **how it works under the hood**, using real code from this project. You don't need to read the code to understand the summary, but if you want to learn, the code examples are a good place to start.

- **Live page:** https://mrgtverleg-lgtm.github.io/MedsyntaxQA/framework/
- **Code:** the folder `framework/` in this repository
- **Branch:** `Medsyntax-Framework`

---

## Part 1: What we did, in plain words

### 1. Moved option B to its own page
Option B ("Start with cards") of the Framework design was in the `Documentatie/` folder as a prototype. We moved it to its own folder, `framework/`, next to the Medsyntax app, so it could become a real page on the website.

### 2. Wrote a release checklist
[framework-option-b-release-checklist.md](framework-option-b-release-checklist.md) lists what the page must do, what had to be fixed first, the tests, and the steps to get it on GitHub.

### 3. Fixed the "must fix" items
- **Colour contrast:** four letter colours were too light for white text. They're now darker, so they're readable for everyone (the WCAG accessibility standard asks for a contrast of at least 4.5:1). Light custom colours now get black text automatically.
- **Rename and Delete** for your own saved mnemonics, with a "Are you sure?" step on the page.
- **Menu links** now point to your own repository instead of Ted's.
- **The Medsyntax app** has a menu link to the Framework.

### 4. Split concept
A letter can now hold more than one concept. For example, P = *Women* **AND** *Diabetes*, or O = *mortality* **OR** *BMI* **OR** *HbA1c*. Each part has its own name and box. Later we added this to *Start without a framework* too, after your comment on the page.

### 5. Proximity operators for other databases
Medsyntax already recognised `NEAR/3`. Now it also recognises Ovid `adj3`, EBSCO `N3` / `W3`, Cochrane `NEXT` / `NEAR` and Web of Science `SAME`, without mistaking words like *adjuvant* or *nearby* for operators.

### 6. Switching mnemonic starts an empty search
Before, switching from PICO to SPIDER moved your text to other boxes by position, so it could end up under the wrong concept. Now a new mnemonic starts empty. *Back to your search* still takes you back.

### 7. The visualisation is optional
The coloured box view is now closed by default. The full query and the buttons are always visible.

### 8. Testing and sharing
- **User test cases:** 73 tests in [framework-user-tests.md](framework-user-tests.md), also as an editable Claude Doc.
- **A page in Claude:** a private copy of the Framework at https://claude.ai/artifact/H7M6rNrE1C5siC9Ma5LMXc, where you left comments that we acted on.
- **Published on GitHub Pages:** the page is live on your own site.

### 9. New projects started
Two separate sessions are planning the next features: a **MeSH check** (is this a real MeSH term?) and **hit counts** (how many PubMed records does each concept find?).

### After that session (24–27 November)
More work was done on the branch after this session: greyscale for the whole page, a line-by-line search table, pasting a line-by-line search, a shorter mnemonic library (commit `b7db30f`), and work in progress on syntax checks per database. That work isn't described in detail here.

---

## Part 2: How it works, a small coding course

### The three languages of a web page

Every web page is built from three kinds of files. The Framework has all three:

| File | Language | What it does | Comparison |
|---|---|---|---|
| `framework/index.html` | **HTML** | The structure: headings, buttons, boxes | The walls and rooms of a house |
| `framework/style.css` | **CSS** | The look: colours, fonts, spacing | The paint and furniture |
| `framework/framework.js` and `scripts/medsyntax-engine.js` | **JavaScript** | The behaviour: what happens when you click or type | The electricity and plumbing |

**HTML** describes *what* is on the page:

```html
<button type="button" class="btn" data-act="copy">Copy query</button>
```

`class="btn"` gives the button a name that CSS uses for its style. `data-act="copy"` is a label that JavaScript uses to know which button was clicked.

**CSS** describes *how it looks*. This rule from `style.css` styles the letter badges:

```css
.letters span { background: var(--el); color: var(--el-ink, #fff); border-radius: 4px; }
```

`var(--el)` is a **variable**: each letter fills in its own colour, so one rule works for all letters.

**JavaScript** describes *what happens*. This is the shape of almost every click in the Framework:

```js
button.addEventListener('click', () => {
  // do something when the button is clicked
});
```

### "State": the page's memory

The page keeps everything you typed in one object called **state**, named `S` in `framework.js`. Roughly:

```js
S = {
  mn: { name: 'PICO', elements: [ /* P, I, C, O */ ] },  // the chosen mnemonic
  values: ['women[tiab]', 'exercis*[tiab]', '', ''],      // the text in each box
  subs: [ /* the extra boxes of a split concept */ ],
  title: 'Exercise in diabetes'
};
```

The rule is: **change the state first, then redraw the page from it.** When you type in a box, the code updates `S.values`, then calls `refresh()` to redraw the visualisation and the full query. That's why everything stays in sync.

**Split concept** is a good example of adding to the state without breaking old things. `values[i]` stays the text of the *first* box, and we added `subs[i]` for the extra boxes. Old code and old links that only know `values` keep working.

### Functions: small machines with input and output

A **function** takes input and gives output. This one builds the full query (simplified):

```js
function compile(st) {
  // for each letter: take its boxes that have text
  // one box  -> (text)
  // several  -> ((box1) AND (box2) OR (box3))
  // then join the letters with AND
}
```

Because it's one function, Copy query, Download and the full-query box all use the same result.

### Regular expressions: patterns in text

A **regular expression** (regex) is a pattern for finding text. Medsyntax is full of them. This one finds proximity operators written as words (from `medsyntax-engine.js`):

```js
/( (?:[Aa][Dd][Jj][0-9]*|N[0-9]+|W[0-9]+|NEXT|NEAR|SAME))(?= )/g
```

Read it as: "a space, then `adj` (any case) with optional digits, or `N` + digits, or `W` + digits, or the words NEXT, NEAR or SAME in capitals, followed by a space". The surrounding spaces are why *adjuvant* doesn't match: it's not followed by a space after `adj`. The capitals rule is why *nearby* and *next generation* don't match.

Another one replaces curly quotes from Word with straight ones:

```js
str.replace(/[“”″‶]/g, '"')
```

`[…]` means "any one of these characters", and `g` means "everywhere, not just the first one".

### Saving things: localStorage and links

- **localStorage** is a small notebook inside your browser. *My mnemonics* and the open/closed state of the visualisation are stored there. It's per browser: your laptop and your phone each have their own.
- **Share links** (`?s=…`) put the whole search *inside the link*. The state is turned into text (JSON), squeezed smaller with a library called **LZString**, and added to the address. Opening the link reverses it. No server or database is needed.

### Accessibility: contrast you can calculate

Contrast between text and background is a formula: from 1:1 (invisible) to 21:1 (black on white). We calculated it for every letter colour, and wrote a small function, `inkFor()`, that picks black or white text for any colour, whichever is more readable.

---

## Part 3: Git and GitHub, step by step

| Word | What it means | Where you do it |
|---|---|---|
| **Repository (repo)** | The project folder plus its full history | Your Mac and GitHub |
| **Branch** | A separate line of work, so `main` stays safe | `Medsyntax-Framework` is ours |
| **Commit** | A saved snapshot with a short description | On your Mac |
| **Push** | Send your commits to GitHub | GitHub Desktop: *Push origin* |
| **Pull** | Fetch changes from GitHub to your Mac | GitHub Desktop: *Pull origin* |
| **Pull request** | A proposal to add a branch to `main`, which others can review | On github.com |
| **Merge** | Accept the pull request into `main` | On github.com |
| **Fork** | Your own copy of someone else's repository | Your repo is a fork of Ted's |

Things we ran into:
- **The first pull request went to Ted's repository.** Your repo is a *fork* of Ted's, and GitHub suggests the original by default. Always check "base repository" at the top of a pull request.
- **GitHub Pages** turns the files in your repository into a website automatically, via the workflow in `.github/workflows/static.yml`.
- **Some files are only for your computer.** `.claude/launch.json` and `.claude/settings.local.json` hold settings for your Mac. Don't commit them.
- **The browser can keep an old copy of a file (cache).** If a change doesn't show up, do a hard reload (Cmd+Shift+R).

---

## Part 4: How we tested

1. **The preview pane:** a small web server on your Mac (`python3 -m http.server 8080`) shows the page at `http://localhost:8080/framework/`.
2. **Scripted checks:** small pieces of JavaScript run in the page to check results, for example "is the full query exactly `((a) AND (b)) AND (c)`?"
3. **Edge cases:** checking that things which *shouldn't* happen don't, such as *adjuvant* being highlighted as an operator, or an old link no longer opening.
4. **User tests:** the 73 tests are for a real person, because some things (like click-to-edit) can't be checked well by a script.

---

## Want to learn more?

- **Read one small function:** `inkFor()` in `framework/framework.js` is short and uses everything above: input, a formula, output.
- **Change one thing yourself:** change a hint text in the `LIBRARY` list at the top of `framework.js`, reload the preview, and see it appear.
- **Try regex:** paste a pattern and some text into https://regex101.com and see what matches.
- **Free courses:** MDN Learn web development (https://developer.mozilla.org/en-US/docs/Learn) covers HTML, CSS and JavaScript from the start.
