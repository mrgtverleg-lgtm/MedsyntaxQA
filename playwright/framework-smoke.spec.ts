// @ts-check
// Smoke tests for Medsyntax Framework (framework/).
// Does the page load, and do the main flows still work?
// The local web server is started by playwright.config.js (webServer).
import { test, expect } from '@playwright/test';

const URL = 'http://localhost:8123/framework/';

// Fail any test that throws a JavaScript error or logs a console error on the page.
// Failed resource loads (for example Google Fonts when offline) are not counted.
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

async function openPico(page) {
    await page.goto(URL);
    await page.locator('.card[data-id="PICO"]').click();
    await expect(page.locator('#f-v0')).toBeVisible();
}

test('page loads with the framework cards', async ({ page }) => {
    await page.goto(URL);
    await expect(page).toHaveTitle(/Medsyntax Framework/);
    await expect(page.getByRole('heading', { level: 1, name: 'Medsyntax Framework' })).toBeVisible();
    await expect(page.locator('#steps')).toBeVisible();
    await expect(page.locator('.card[data-id="PICO"]')).toBeVisible();
    expect(await page.locator('.cards .card').count()).toBeGreaterThan(1);
    await expect(page.getByRole('button', { name: 'Start without a framework' })).toBeVisible();
    // The scripts from the CDN and the engine have loaded.
    expect(await page.evaluate(() => typeof window['jQuery'] === 'function' && typeof window['LZString'] === 'object' && typeof window['runMedsyntax'] === 'function')).toBe(true);
});

test('picking PICO opens the search editor', async ({ page }) => {
    await openPico(page);
    await expect(page.locator('#f-db')).toBeVisible();
    await expect(page.locator('#f-title')).toBeVisible();
    for (let i = 0; i < 4; i++) await expect(page.locator(`#f-v${i}`)).toBeVisible();
    await expect(page.locator('.fw-bar').getByRole('button', { name: 'Change framework' })).toBeVisible();
    await expect(page.locator('.full-query')).toHaveClass(/empty/);
});

test('Load example fills the query and the visualisation without warnings', async ({ page }) => {
    await openPico(page);
    await page.getByRole('button', { name: 'Load example' }).click();
    await expect(page.locator('#f-v0')).not.toHaveValue('');
    await expect(page.locator('.full-query')).not.toHaveClass(/empty/);
    await expect(page.locator('.full-query')).toContainText('AND');
    const targets = page.locator('.blocks .medsyntax-target');
    expect(await targets.count()).toBeGreaterThan(0);
    for (const t of await targets.all()) expect(await t.locator('*').count()).toBeGreaterThan(0);
    await expect(page.locator('.cbox > .warns:visible')).toHaveCount(0);
    await expect(page.locator('.global-ok')).toBeVisible();
});

test('typing in a box updates the full query', async ({ page }) => {
    await openPico(page);
    const terms = 'diabet*[tiab] OR "Diabetes Mellitus"[Mesh]';
    await page.locator('#f-v0').fill(terms);
    await expect(page.locator('.full-query')).toContainText(terms);
});

test('a missing bracket shows a warning that goes away when fixed', async ({ page }) => {
    await openPico(page);
    const warns = page.locator('.field[data-i="0"] .cbox[data-s="0"] > .warns');
    await page.locator('#f-v0').fill('(diabet*[tiab] OR insulin[tiab]');
    await expect(warns).toBeVisible();
    expect(await warns.locator('li').count()).toBeGreaterThan(0);
    await page.locator('#f-v0').fill('(diabet*[tiab] OR insulin[tiab])');
    await expect(warns).toBeHidden();
});

test('switching the database updates the editor', async ({ page }) => {
    await openPico(page);
    await page.locator('#f-db').selectOption('embase');
    await expect(page.locator('#f-dbsub')).toHaveText('Embase.com');
    await expect(page.locator('#f-db')).toHaveValue('embase');
});

test('Start without a framework: add and remove a concept', async ({ page }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: 'Start without a framework' }).click();
    const boxes = page.locator('.fields .field');
    await expect(boxes.first()).toBeVisible();
    const before = await boxes.count();
    await page.getByRole('button', { name: '+ Add concept' }).click();
    await expect(boxes).toHaveCount(before + 1);
    await page.getByRole('button', { name: `Remove concept ${before + 1}` }).click();
    await expect(boxes).toHaveCount(before);
});

test('a shared link opens the same search', async ({ page, context }) => {
    await openPico(page);
    await page.locator('#f-title').fill('Smoke test search');
    await page.locator('#f-v0').fill('diabet*[tiab]');
    await expect(page.locator('.full-query')).toContainText('diabet*[tiab]');
    // The same function the Copy link button uses.
    const link = await page.evaluate(() => window.eval('buildLink(OID, S)'));
    expect(link).toContain('?s=');

    const other = await context.newPage();
    await other.goto(link);
    await expect(other.locator('#f-title')).toHaveValue('Smoke test search');
    await expect(other.locator('#f-v0')).toHaveValue('diabet*[tiab]');
    await expect(other.locator('.fw-bar .fwname')).toHaveText('PICO');
});

test('Copy query puts the full query on the clipboard', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Clipboard permissions are only supported in Chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openPico(page);
    await page.locator('#f-v0').fill('diabet*[tiab]');
    await page.locator('#f-v1').fill('exercis*[tiab]');
    const full = page.locator('.full-query');
    await expect(full).toContainText('exercis*[tiab]');
    await page.getByRole('button', { name: 'Copy query' }).click();
    await expect(page.locator('#toast')).toHaveText('Query copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await full.textContent());
});

test('the full query comes first, right under the search strategy heading', async ({ page }) => {
    await openPico(page);
    await page.locator('#f-v0').fill('diabet*[tiab]');
    const order = await page.locator('section.strategy').evaluate(s =>
        [...s.children].map(c => c.classList[0] || c.tagName.toLowerCase()));
    expect(order.slice(0, 4)).toEqual(['strategy-head', 'h4', 'full-query', 'global']);
    await expect(page.locator('section.strategy h4').first()).toHaveText(/Full query/i);
});
