// @ts-check
// Visualisation: a frame around each part between AND and NOT, also without brackets around it
// (markAndParts() in scripts/medsyntax-engine.js). Hover and click-to-edit then take that one part.
// The local web server is started by playwright.config.js (webServer).
import { test, expect } from '@playwright/test';

const URL = 'http://localhost:8123/framework/';

let errors: string[] = [];
test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', err => errors.push('pageerror: ' + err.message));
    page.on('console', msg => {
        if (msg.type() === 'error' && !/Failed to load resource/i.test(msg.text())) errors.push('console: ' + msg.text());
    });
    await page.goto(URL);
    await page.waitForFunction(() => typeof window['runMedsyntax'] === 'function');
});
test.afterEach(async () => {
    expect(errors, 'JavaScript errors on the page').toEqual([]);
});

// The text of each AND part, and the visualised text as a whole.
async function parts(page, query: string, db: string) {
    return page.evaluate(([q, d]) => {
        const t = document.createElement('div');
        window['runMedsyntax'](q, t, { db: d });
        const norm = (s: string) => s.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();
        return { parts: [...t.querySelectorAll('.and-part')].map(p => norm(p.textContent || '')), text: norm(t.textContent || '') };
    }, [query, db]);
}

// [database, query, the parts that get a frame]
const CASES: [string, string, string[]][] = [
    ['wos', 'TI=(a OR b) AND LA=(English) AND diabet*', ['TI=(a OR b)', 'LA=(English)']],
    ['pubmed', '"hand hygiene"[tiab] AND english[la]', ['"hand hygiene"[tiab]', 'english[la]']],
    ['embase', "'diabetes'/exp AND (hand NEAR/3 hygiene AND diabet*:ti,ab) OR nurse*", ['hand NEAR/3 hygiene', 'diabet*:ti,ab']],
    // NOT starts a new part too.
    ['pubmed', 'a[tiab] NOT b[tiab] AND c', ['a[tiab]', 'b[tiab]']],
    ['ovid', 'diabet*.ti,ab. NOT animal*.ti.', ['diabet*.ti,ab.', 'animal*.ti.']],
    // AND and OR on one level without brackets: the order depends on the database, so no frames.
    ['pubmed', 'a[tiab] OR b[tiab] AND c[tiab]', []],
    // Only one element between the operators: no extra frame.
    ['pubmed', 'a AND b NOT c', []],
];

for (const [db, query, want] of CASES) {
    test(`${db}: ${query} frames ${JSON.stringify(want)}`, async ({ page }) => {
        const r = await parts(page, query, db);
        expect(r.parts).toEqual(want);
    });
}

test('the frames do not change the text of the query', async ({ page }) => {
    const q = 'TI=(a OR b) AND LA=(English) AND diabet*';
    const r = await parts(page, q, 'wos');
    expect(r.text).toBe(q);
});

test('hover and click-to-edit take one AND part', async ({ page }) => {
    await page.locator('.card[data-id="PICO"]').click();
    await page.locator('#f-v0').fill('"hand hygiene"[tiab] AND english[la]');
    const viz = page.locator('details.viz');
    if (!(await viz.getAttribute('open') !== null)) await viz.locator('> summary').click();
    const target = page.locator('.blocks .medsyntax-target').first();
    const first = target.locator('.and-part').first();
    await expect(target.locator('.and-part')).toHaveCount(2);
    await first.locator('.quote-term').hover();
    await expect(target.locator('.and-part').nth(1).locator('.hover')).toHaveCount(0);
    await first.locator('.quote-term').click();
    await expect(page.locator('.dynamic-input')).toHaveValue('"hand hygiene"[tiab]');
});
