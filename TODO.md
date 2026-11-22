# TODO

## Bugs / code questions
- [ ] Verify the `savedLatestInputTime !== latestInputTime` check in `afterParseFunction` actually works (`index.html` TODO)
- [ ] `scripts/key-commands.js` is a stub (only `console.log`s); implement keyboard commands or remove it

## Testing
- [ ] Rename `playwright/example.spec.ts` to something descriptive
- [ ] Add tests for each syntax warning (brackets, quotes, duplicate/ambiguous operators)
- [ ] Add tests for URL sharing (query/title restored from link)
- [ ] Add tests for copy buttons, clear button and greyscale mode
- [ ] Add tests for cancelling an edit (click outside the dynamic input)
- [ ] Run Playwright tests in GitHub Actions

## Code quality
- [ ] Move inline `<script>` blocks from `index.html` into separate JS files
- [ ] Give generic functions clearer names (e.g. `myFunction`, `myForm`, `myRadios`)
- [ ] Host jQuery locally or add an SRI hash to the CDN `<script>`
- [ ] Remove or reduce commented-out `console.log` calls

## Docs / housekeeping
- [ ] Update `README.md` (still says "medsyntaxexperimental"; add usage and dev instructions)
- [ ] Document how `workspace/` (MedsyntaxQA) relates to the main app

## Ideas
- [ ] Support more search engine syntaxes (PubMed, Ovid, etc.)
- [ ] Undo/redo for scope edits
- [ ] Accessibility: keyboard navigation for the scope editor
