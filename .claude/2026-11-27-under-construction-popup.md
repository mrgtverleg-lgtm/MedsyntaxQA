# 27 November 2026: "Under construction" pop-up and MeSH check

## ELI5

The Framework website is a house that is still being built. Now, every time someone walks in,
a little crab 🦀 holds up a sign: "Careful, we're still building! Things might change."
The sign also says: "If you see a bug (or a crab), tell us on GitHub." You press "I understand"
and the crab steps aside. Next time you come in, the crab is there again.

We also have robot testers (Playwright) that click through the site. They would get stuck
behind the crab's sign, so they carry a secret note that makes the crab let them straight in.
Only one robot test checks that the crab really shows up.

Someone also said the MeSH checker was broken. We tried it and it worked fine, so the
problem is probably *where* it's being used, not the checker itself.

## What we did

### 1. "Under construction" pop-up with a crab
Modelled on the "Work in progress" pop-up of the MedSyntaxMulti workspace
(tedoutlook.github.io/medsyntaxqa/workspace).

- `framework/index.html`: a `<dialog id="wip-notice">` with
  - title: 🦀 Under construction
  - text: "Medsyntax Framework is still under construction. Features may change or break,
    and links you share now may not open in later versions. Keep a copy of important searches."
  - line: "Spotted a bug or a crustacean? Let us know on GitHub." (links to
    https://github.com/mrgtverleg-lgtm/MedsyntaxQA/issues, opens in a new tab)
  - button: "I understand" (Escape also closes it)
- `framework/style.css`: reuses the existing `dialog.choose` style; adds the title layout,
  the smaller grey GitHub line, and a small crab wiggle (off when the browser asks for reduced motion).
- `framework/framework.js`: `showWipNotice()` opens the pop-up at start-up, also when the page
  opens from a shared `?s=` link.

### 2. Changes asked for along the way
- **Show it every visit.** First version remembered "I understand" in localStorage.
  Changed so it opens every time the site opens, like the workspace example.
- **GitHub line added** to the pop-up.
- **Comma removed**: "Spotted a bug, or a crustacean?" became "Spotted a bug or a crustacean?"

### 3. Tests
- `playwright.config.js`: sets `medsyntax.hideWipNotice = 1` in localStorage for
  http://localhost:8123 (`storageState`), so the pop-up doesn't block clicks in the other tests.
  The page never sets this itself; it is only a switch for the tests.
- `playwright/framework-wip-notice.spec.ts` (new) starts with empty storage and checks that:
  - the pop-up shows with the crab, and "I understand" has focus
  - it has the GitHub line and the link goes to the Issues page in a new tab
  - "I understand" closes it, the page works, and it opens again on the next visit
  - Escape closes it
  - it also shows when the page opens from a shared link

**Test results**
- `framework-smoke.spec.ts` was run once, with the first version of the pop-up:
  28 passed, 1 skipped (clipboard test, Chromium only), 1 failed in WebKit only:
  "the full query comes first, right under the search strategy heading". The pop-up was open and
  blocked the click, so WebKit seems to sometimes miss the preset storage flag. A rerun to see if
  it is flaky was stopped, so this is **still open**.
- `framework-wip-notice.spec.ts` has **not been run yet**.

### 4. "Why doesn't the MeSH checker work?"
Tested on http://localhost:8123/framework/ with PICO and
`"Diabetes Mellitus"[Mesh] OR "Diabetis"[Mesh]`: the check works. "Diabetes Mellitus" was
found (green underline), "Diabetis" not found (red wavy underline), summary
"MeSH check: 1 found, 1 not found". Likely causes when it seems broken:
- the database is not PubMed (Ovid, EBSCO and Cochrane terms are only linked, not checked)
- a hosted copy without the MeSH check (it's in commit 828377d on this branch, not merged yet)
- running inside a claude.ai Artifact, whose security policy blocks the NLM MeSH API
- no internet

Still waiting to hear where it failed and what it showed.

### 5. Other notes
- A second preview server on port 8090 was blocked by a permission check; the
  `.claude/launch.json` entry added for it was removed again, so that file is unchanged.
- Nothing has been committed yet.

## Still to do
- Run `npx playwright test playwright/framework-wip-notice.spec.ts`
- Check whether the WebKit smoke test failure is flaky, and fix it if needed
- Find out where the MeSH check fails for you
