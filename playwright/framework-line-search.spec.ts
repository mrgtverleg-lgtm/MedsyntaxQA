// @ts-check
// Line-by-line search in Medsyntax Framework: the grouped section, and reading a pasted
// Embase search history with limit lines ("#3 AND [english]/lim").
import { test, expect } from '@playwright/test';

const URL = 'http://localhost:8123/framework/';

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', err => errors.push('pageerror: ' + err.message));
    page.on('console', msg => {
        if (msg.type() === 'error' && !/Failed to load resource/i.test(msg.text())) errors.push('console: ' + msg.text());
    });
});
test.afterEach(async () => {
    expect(errors, 'JavaScript errors on the page').toEqual([]);
});

// An Embase search history: number, query, results, date.
const EMBASE = [
    ['#1', "'diabetes mellitus'/exp OR diabet*:ti,ab,kw", '1,234,567', '27 Nov 2026'],
    ['#2', "'exercise'/exp OR (physical NEXT/2 activit*):ti,ab", '456,789', '27 Nov 2026'],
    ['#3', '#1 AND #2', '12,345', '27 Nov 2026'],
    ['#4', '#3 AND [english]/lim', '10,000', '27 Nov 2026'],
    ['#5', '#4 AND [2015-2025]/py', '8,000', '27 Nov 2026'],
];
const FULL = "('diabetes mellitus'/exp OR diabet*:ti,ab,kw) AND ('exercise'/exp OR (physical NEXT/2 activit*):ti,ab) AND (([english]/lim) AND ([2015-2025]/py))";

async function openPicoEmbase(page) {
    await page.goto(URL);
    await page.locator('.card[data-id="PICO"]').click();
    await page.locator('#f-db').selectOption('embase');
    await expect(page.locator('#f-v0')).toBeVisible();
}
async function pasteSearch(page, text) {
    await page.locator('.lines-view > summary').click();
    await page.locator('.lines-view').getByRole('button', { name: 'Paste a line-by-line search…' }).click();
    await page.locator('#f-paste').fill(text);
    await page.getByRole('button', { name: 'Read search' }).click();
}

test('Copy table and Paste sit in the Line-by-line search section', async ({ page }) => {
    await openPicoEmbase(page);
    await expect(page.locator('.strategy').getByRole('button', { name: 'Copy table' })).toHaveCount(0);
    await expect(page.locator('.strategy .paste-box')).toHaveCount(0);
    await page.locator('.lines-view > summary').click();
    await expect(page.locator('.lines-view').getByRole('button', { name: 'Copy table' })).toBeVisible();
    await expect(page.locator('.lines-view').getByRole('button', { name: 'Paste a line-by-line search…' })).toBeVisible();
});

test('Embase history with limit lines keeps the limits', async ({ page }) => {
    await openPicoEmbase(page);
    await pasteSearch(page, [['No.', 'Query', 'Results', 'Date']].concat(EMBASE).map(r => r.join('\t')).join('\n'));
    await expect(page.locator('.full-query')).toHaveText(FULL);
    // Limits are never put in a PICO letter: the search becomes concept blocks, with the limits in one block.
    await expect(page.locator('.concept-name')).toHaveCount(3);
    await expect(page.locator('.concept-name').nth(2)).toHaveValue('Limits');
    expect(await page.locator('.field[data-i="2"] .sub-name').evaluateAll(els => els.map(e => (e as HTMLInputElement).value))).toEqual(['Language', 'Publication year']);
});

test('Embase history newest first, without a header row', async ({ page }) => {
    await openPicoEmbase(page);
    await pasteSearch(page, EMBASE.slice().reverse().map(r => r.join('\t')).join('\n'));
    await expect(page.locator('.full-query')).toHaveText(FULL);
});

test('Embase history pasted straight into an empty box is read', async ({ page }) => {
    await openPicoEmbase(page);
    await page.locator('#f-v0').evaluate((ta, text) => {
        const dt = new DataTransfer(); dt.setData('text/plain', text);
        ta.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, EMBASE.map(r => r.join('\t')).join('\n'));
    await expect(page.locator('.full-query')).toHaveText(FULL);
});

// A real Embase strategy from a spreadsheet: a title row above the header, a Comment column,
// OR lines, NOT lines and limit lines (#22, #26, #28). Sheet 2 has the same search as one string.
import EXAMPLE from './fixtures/embase-multiline.json';

// Is the query built from the boxes the same search as the single string? Each search line and
// limit becomes a letter (A0, A1...); both are then evaluated for many true/false combinations,
// with Embase's order (NOT before AND before OR) and with plain left-to-right.
function sameSearch(a: string, b: string, atoms: string[]) {
    atoms = atoms.slice().sort((x, y) => y.length - x.length);
    const sub = s => { atoms.forEach((t, i) => { s = s.split(t).join(' A' + i + ' '); }); return s; };
    const ea = sub(a), eb = sub(b);
    const leftover = s => s.replace(/A\d+|AND|OR|NOT|[()\s]/g, '');
    if (leftover(ea) || leftover(eb)) return 'text left after the search lines: ' + leftover(ea) + ' / ' + leftover(eb);
    const ev = (str, env, ltr) => {
        const t = str.match(/\(|\)|AND|OR|NOT|A\d+/g); let p = 0;
        const prec = { OR: 1, AND: 2, NOT: 3 };
        const prim = () => { const x = t[p++]; if (x === '(') { const v = expr(0); p++; return v; } return env[+x.slice(1)]; };
        const expr = min => {
            let l = prim();
            while (p < t.length && t[p] !== ')') {
                const op = t[p], pr = ltr ? 1 : prec[op]; if (pr < min) break; p++;
                const r = ltr ? prim() : expr(pr + 1);
                l = op === 'AND' ? l && r : op === 'OR' ? l || r : l && !r;
            }
            return l;
        };
        return expr(0);
    };
    let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let k = 0; k < 5000; k++) {
        const env = atoms.map(() => rnd() < 0.5);
        const want = ev(eb, env, false);
        if (ev(ea, env, false) !== want || ev(ea, env, true) !== want) return 'different result for ' + JSON.stringify(env);
    }
    return '';
}

test('Embase example from a spreadsheet gives the same search as the single string', async ({ page }) => {
    await openPicoEmbase(page);
    await pasteSearch(page, EXAMPLE.lineByLine);
    await expect(page.locator('.paste-box .err')).toBeHidden();
    await expect(page.locator('.global-ok')).toBeVisible();
    // 3 concepts, one Limits block (language, year, NOT publication type) and one Exclude block (#20 OR #24).
    expect(await page.locator('.concept-name').evaluateAll(els => els.map(e => (e as HTMLInputElement).value))).toEqual(['aged', 'respiratory tract infection', 'vulnerability', 'Limits', 'Exclude']);
    expect(await page.locator('.field[data-i="3"] .sub-name').evaluateAll(els => els.map(e => (e as HTMLInputElement).value))).toEqual(['Language', 'Publication year', 'Publication type']);
    expect(await page.locator('.field[data-i="4"] .sub-name').evaluateAll(els => els.map(e => (e as HTMLInputElement).value))).toEqual(['Line 20', 'Line 24']);
    await expect(page.locator('.lines-table tbody tr').last()).toContainText('#5 AND #12 AND #15 AND #19 NOT #22');
    // Boxes without a name are named after their line in the pasted search.
    expect(await page.locator('.field[data-i="0"] .sub-name').evaluateAll(els => els.map(e => (e as HTMLInputElement).value))).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4']);
    // The table: #, Concept (once per group), Part, Search; "All of ..." lines and a bold Final search.
    await expect(page.locator('.lines-table thead th')).toHaveText(['#', 'Concept', 'Part', 'Search']);
    const first = page.locator('.lines-table tbody tr').first();
    await expect(first.locator('td')).toHaveText(['#1', 'aged', 'Line 1', "'aged'/de OR 'very elderly'/exp"]);
    await expect(first.locator('td.concept')).toHaveAttribute('rowspan', '5');
    await expect(page.locator('.lines-table tr.all').first().locator('td')).toHaveText(['#5', 'All of aged', '#1 OR #2 OR #3 OR #4']);
    await expect(page.locator('.lines-table tr.final td')).toHaveText(['#23', 'Final search', '#5 AND #12 AND #15 AND #19 NOT #22']);
    // Copying the table and pasting it back gives the same search and the same names.
    const fullBefore = await page.locator(".full-query").textContent();
    await page.locator('.lines-view').getByRole('button', { name: 'Paste a line-by-line search…' }).click();
    await page.locator('#f-paste').fill(await page.evaluate('linesTSV(searchLines(S))'));
    await page.getByRole('button', { name: 'Read search' }).click();
    await expect(page.locator('.full-query')).toHaveText(fullBefore || '');
    expect(await page.locator('.concept-name').evaluateAll(els => els.map(e => (e as HTMLInputElement).value))).toEqual(['aged', 'respiratory tract infection', 'vulnerability', 'Limits', 'Exclude']);
    expect(await page.locator('.field[data-i="3"] .sub-name').evaluateAll(els => els.map(e => (e as HTMLInputElement).value))).toEqual(['Language', 'Publication year', 'Publication type']);
    const full = await page.locator('.full-query').textContent() || '';
    const rows = EXAMPLE.lineByLine.split('\n').slice(2).map(r => r.split('\t')[1]);
    const atoms = rows.filter(q => !/#\d/.test(q)).concat(
        rows[21].replace(/^#21 AND \((.*)\)$/, '$1'),
        rows[25].replace(/^#25 NOT \((.*)\)$/, '$1'),
        '[dutch]/lim OR [english]/lim', '[2024-2026]/py');
    expect(sameSearch(full, EXAMPLE.singleString, atoms)).toBe('');
});

test('a search without limits still fits PICO when the lines match its letters', async ({ page }) => {
    await openPicoEmbase(page);
    await pasteSearch(page, ['#1\tdiabet*:ti', '#2\texercis*:ti', '#3\twalk*:ti', '#4\tglucose:ti', '#5\t#1 AND #2 AND #3 AND #4'].join('\n'));
    await expect(page.locator('.concept-name')).toHaveCount(0);
    await expect(page.locator('#f-v3')).toHaveValue('glucose:ti');
});

test('Load line-by-line example is written for the chosen database and follows a database switch', async ({ page }) => {
    await page.goto(URL);
    await page.locator('.card[data-id="PICO"]').click();
    await page.locator('#f-db').selectOption('pubmed');
    await page.locator('.lines-view > summary').click();
    await page.locator('.lines-view').getByRole('button', { name: 'Load line-by-line example' }).click();
    await expect(page.locator('#f-db')).toHaveValue('pubmed');
    await expect(page.locator('.lines-view')).toHaveAttribute('open', '');
    const names = () => page.locator('.concept-name').evaluateAll(els => els.map(e => (e as HTMLInputElement).value));
    // PubMed: names from the MeSH terms, limits and exclusions in blocks of their own, no warnings.
    expect(await names()).toEqual(['Aged', 'Respiratory Tract Infections', 'Frailty', 'Limits', 'Exclude']);
    await expect(page.locator('#f-v0')).toHaveValue('"Aged"[Mesh]');
    await expect(page.locator('.global-ok')).toBeVisible();
    await expect(page.locator('.cbox > .warns:visible')).toHaveCount(0);
    // Switching the database rewrites the unchanged example in the new syntax.
    for (const [db, first] of [['embase', "'aged'/exp"], ['ovid', 'exp Aged/'], ['ebsco', '(MH "Aged+")'], ['cochrane', '[mh Aged]'], ['wos', 'TS=(elderly OR "older adult*" OR "older people" OR geriatric*)'], ['scopus', 'TITLE-ABS-KEY(elderly OR "older adult*" OR "older people" OR geriatric*)']]) {
        await page.locator('#f-db').selectOption(db);
        await expect(page.locator('#f-v0'), db).toHaveValue(first);
        await expect(page.locator('.global-ok'), db).toBeVisible();
        await expect(page.locator('.cbox > .warns:visible'), db).toHaveCount(0);
        expect(await names(), db).toContain('Limits');
    }
    // Text you changed yourself stays when you switch.
    await page.locator('#f-v0').fill('senior*:ti');
    await page.locator('#f-db').selectOption('pubmed');
    await expect(page.locator('#f-v0')).toHaveValue('senior*:ti');
});
