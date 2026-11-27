// @ts-check
// MeSH check in Medsyntax Framework (framework/scripts/mesh-check.js).
// MeSH terms in the step 2 boxes are links: a click opens the NCBI MeSH record, Alt+click places the cursor.
// The NLM MeSH API (id.nlm.nih.gov) and NCBI are faked here, so these tests don't need the internet.
// Requirements: Documentatie/Requirements Open MeSH-termpagina vanuit zoekterm.docx.
import { test, expect } from '@playwright/test';

const PAGE = 'http://localhost:8123/framework/';

let errors: string[] = [];
let apiCalls: string[] = [];
let popups: string[] = [];
test.beforeEach(async ({ page, context }) => {
    errors = []; apiCalls = []; popups = [];
    page.on('pageerror', err => errors.push('pageerror: ' + err.message));
    page.on('console', msg => {
        if (msg.type() === 'error' && !/Failed to load resource/i.test(msg.text())) errors.push('console: ' + msg.text());
    });
    page.on('popup', p => popups.push(p.url()));
    // NCBI pages that open in a new tab: an empty page is enough.
    await context.route(/https:\/\/(www\.ncbi\.nlm\.nih\.gov|pubmed\.ncbi\.nlm\.nih\.gov)\/.*/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>NCBI</title>' }));
    await context.route('https://id.nlm.nih.gov/**', fakeNlm);
});
test.afterEach(async () => {
    expect(errors, 'JavaScript errors on the page').toEqual([]);
});

// ---- A small fake of the NLM MeSH API ----
const DESCRIPTORS: Record<string, [string, string]> = {
    'heart failure': ['D006333', 'Heart Failure'],
    'aged': ['D000368', 'Aged'],
    'hypertension': ['D006973', 'Hypertension'],
    'diabetes mellitus': ['D003920', 'Diabetes Mellitus'],
};
const TERMS: Record<string, string> = {
    'heart attack': 'T000866941',
    'health care facilities, manpower, and services': 'T015755',
};
const ENTRY: Record<string, [string, string]> = {
    'T000866941': ['D009203', 'Myocardial Infarction'],
    'T015755': ['D005159', 'Health Care Facilities Workforce and Services'],
};
const json = (body: unknown) => ({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
const bind = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { type: 'literal', value: v }]));
async function fakeNlm(route) {
    const u = new URL(route.request().url());
    apiCalls.push(u.toString());
    const label = (u.searchParams.get('label') || '').toLowerCase();
    if (label === 'slow term') return; // never answers: the 2 s time-out (FR-8)
    if (u.pathname.endsWith('/lookup/descriptor')) {
        const d = DESCRIPTORS[label];
        return route.fulfill(json(d ? [{ resource: 'http://id.nlm.nih.gov/mesh/' + d[0], label: d[1] }] : []));
    }
    if (u.pathname.endsWith('/lookup/term')) {
        const t = TERMS[label];
        return route.fulfill(json(t ? [{ resource: 'http://id.nlm.nih.gov/mesh/' + t, label }] : []));
    }
    if (u.pathname.endsWith('/sparql')) {
        const q = u.searchParams.get('query') || '';
        let rows: Record<string, string>[] = [];
        const term = /mesh\/(T\d+)>/.exec(q);
        if (term && ENTRY[term[1]]) rows = [{ d: 'http://id.nlm.nih.gov/mesh/' + ENTRY[term[1]][0], dl: ENTRY[term[1]][1] }];
        else if (q.includes('VALUES ?l')) {
            if (q.includes('Health Care Facilities, Manpower, and Services')) rows = [2022, 2023, 2024].map(y => ({ g: 'http://id.nlm.nih.gov/mesh/' + y, d: `http://id.nlm.nih.gov/mesh/${y}/D005159`, cl: 'Health Care Facilities Workforce and Services', ca: 'true' }));
            if (q.includes('Health Food')) rows = [{ g: 'http://id.nlm.nih.gov/mesh/2015', d: 'http://id.nlm.nih.gov/mesh/2015/D019123', cl: '[OBSOLETE] Health Food', ca: 'false' }];
        } else if (q.includes('REGEX')) {
            rows = [['D006333', 'Heart Failure'], ['D054143', 'Heart Failure, Systolic'], ['D006331', 'Heart Diseases']].map(([d, l]) => ({ d: 'http://id.nlm.nih.gov/mesh/' + d, l }));
        }
        return route.fulfill(json({ head: { vars: [] }, results: { bindings: rows.map(bind) } }));
    }
    return route.fulfill({ status: 404, body: '' });
}

async function openPico(page) {
    await page.goto(PAGE);
    await page.evaluate(() => { try { sessionStorage.clear(); localStorage.removeItem('medsyntax.database'); } catch (e) { /* ignore */ } });
    await page.locator('.card[data-id="PICO"]').click();
    await expect(page.locator('#f-v0')).toBeVisible();
    await page.locator('#f-db').selectOption('pubmed');
}
const term = (page, text: string) => page.locator('.mterm', { hasText: text }).first();

test('a MeSH term is a link: click opens the NCBI MeSH record, the box text stays the same', async ({ page }) => {
    await openPico(page);
    const text = 'Heart Failure[Mesh] OR hf[tiab]';
    await page.locator('#f-v0').fill(text);
    await expect(term(page, 'Heart Failure')).toHaveClass(/s-found/);
    await term(page, 'Heart Failure').hover();
    await expect(page.locator('.mesh-tip')).toContainText('MeSH term found');
    const popup = page.waitForEvent('popup');
    await term(page, 'Heart Failure').click();
    await expect.poll(async () => (await popup).url()).toBe('https://www.ncbi.nlm.nih.gov/mesh/68006333');
    await expect(page.locator('#f-v0')).toHaveValue(text);
    await expect(page.locator('.mesh-summary')).toHaveText('MeSH check: 1 found');
    // Only the label is sent to NLM, never the search (NFR-4).
    expect(apiCalls.some(u => /tiab|%20OR%20/i.test(u))).toBe(false);
});

test('a typo shows a message with a suggestion and opens nothing', async ({ page }) => {
    await openPico(page);
    await page.locator('#f-v0').fill('Heart Faliure[Mesh]');
    await expect(term(page, 'Heart Faliure')).toHaveClass(/s-notfound/);
    await term(page, 'Heart Faliure').click();
    const note = page.locator('.mesh-note');
    await expect(note).toContainText('No exact MeSH term found. Did you mean: Heart Failure?');
    await expect(note.locator('img')).toHaveCount(0);
    await page.waitForTimeout(300);
    expect(popups).toEqual([]);
    await expect(page.locator('#f-v0')).toHaveValue('Heart Faliure[Mesh]');
    // The suggestion opens its record.
    const popup = page.waitForEvent('popup');
    await note.getByRole('button', { name: 'Heart Failure' }).click();
    await expect.poll(async () => (await popup).url()).toBe('https://www.ncbi.nlm.nih.gov/mesh/68006333');
});

test('entry term, replaced and deleted descriptors', async ({ page }) => {
    await openPico(page);
    await page.locator('details.viz > summary').click();
    await page.locator('#f-v0').fill('"Heart Attack"[mh] OR "Health Care Facilities, Manpower, and Services"[Mesh] OR "Health Food"[Mesh]');
    await expect(term(page, 'Heart Attack')).toHaveClass(/s-entry/);
    await term(page, 'Heart Attack').hover();
    await expect(page.locator('.mesh-tip')).toContainText('Entry term of: Myocardial Infarction');
    await expect(term(page, 'Health Care Facilities')).toHaveClass(/s-replaced/);
    await term(page, 'Health Care Facilities').hover();
    await expect(page.locator('.mesh-tip')).toContainText('Replaced by: Health Care Facilities Workforce and Services (since MeSH 2025)');
    await expect(term(page, 'Health Food')).toHaveClass(/s-removed/);
    // The visualisation shows no MeSH marks or warnings; its text stays the same.
    await expect(page.locator('.medsyntax-target .mesh-mark')).toHaveCount(0);
    await expect(page.locator('.medsyntax-target')).toHaveText('"Heart Attack"[mh] OR "Health Care Facilities, Manpower, and Services"[Mesh] OR "Health Food"[Mesh]');
    // Entry term opens the record of its descriptor.
    const popup = page.waitForEvent('popup');
    await term(page, 'Heart Attack').click();
    await expect.poll(async () => (await popup).url()).toBe('https://www.ncbi.nlm.nih.gov/mesh/68009203');
    // A deleted descriptor has no record: a message, no tab.
    await term(page, 'Health Food').click();
    await expect(page.locator('.mesh-note').first()).toContainText('Descriptor deleted in MeSH 2016');
    await expect(page.locator('.mesh-summary')).toHaveText('MeSH check: 1 entry term, 1 replaced, 1 deleted');
});

test('Ovid, EBSCO and Cochrane MeSH notations stay plain text and are not sent to NLM', async ({ page }) => {
    await openPico(page);
    await page.locator('#f-v0').fill('exp Diabetes Mellitus/ OR MH "Hypertension+" OR MeSH descriptor: [Asthma] explode all trees');
    await page.waitForTimeout(1000);
    await expect(page.locator('.mterm')).toHaveCount(0);
    await expect(page.locator('.mesh-summary')).toBeHidden();
    expect(apiCalls).toEqual([]);
});

test('free text and Emtree terms are not links', async ({ page }) => {
    await openPico(page);
    await page.locator('#f-v0').fill("heart failure[tiab] OR 'heart failure'/exp");
    await page.waitForTimeout(800);
    await expect(page.locator('.mterm')).toHaveCount(0);
});

test('Alt+click in a MeSH term places the cursor and opens nothing', async ({ page }) => {
    await openPico(page);
    await page.locator('#f-v0').fill('Heart Failure[Mesh]');
    await expect(term(page, 'Heart Failure')).toHaveClass(/s-found/);
    await page.locator('#f-title').focus();
    const box = await term(page, 'Heart Failure').boundingBox();
    await page.keyboard.down('Alt');
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.keyboard.up('Alt');
    await expect(page.locator('#f-v0')).toBeFocused();
    const pos = await page.locator('#f-v0').evaluate((ta: HTMLTextAreaElement) => ta.selectionStart);
    expect(pos).toBeGreaterThan(0);
    expect(pos).toBeLessThan('Heart Failure'.length);
    await expect(page.locator('.mesh-status:visible')).toContainText('Heart Failure: MeSH term found.');
    await page.waitForTimeout(300);
    expect(popups).toEqual([]);
});

test('keyboard: Ctrl/Cmd+Enter opens the record, Shift+F10 opens the menu', async ({ page }) => {
    await openPico(page);
    await page.locator('#f-v0').fill('Heart Failure[Mesh]');
    await expect(term(page, 'Heart Failure')).toHaveClass(/s-found/);
    await page.locator('#f-v0').evaluate((ta: HTMLTextAreaElement) => { ta.focus(); ta.setSelectionRange(3, 3); });
    await page.locator('#f-v0').press('ArrowRight');
    const popup = page.waitForEvent('popup');
    await page.locator('#f-v0').press('ControlOrMeta+Enter');
    await expect.poll(async () => (await popup).url()).toBe('https://www.ncbi.nlm.nih.gov/mesh/68006333');
    await page.locator('#f-v0').press('Shift+F10');
    const menu = page.getByRole('menu', { name: 'MeSH actions' });
    await expect(menu).toBeVisible();
    for (const item of ['Open MeSH record', 'Copy MeSH term', 'Copy as PubMed syntax', 'Search in PubMed']) await expect(menu.getByRole('menuitem', { name: item })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(page.locator('#f-v0')).toBeFocused();
});

test('when NLM does not answer within 2 s, a click opens the NCBI MeSH search page', async ({ page }) => {
    await openPico(page);
    await page.locator('#f-v0').fill('Slow Term[Mesh]');
    await expect(term(page, 'Slow Term')).toHaveClass(/s-unavailable/, { timeout: 6000 });
    await term(page, 'Slow Term').hover();
    await expect(page.locator('.mesh-tip')).toContainText('Check not available');
    const popup = page.waitForEvent('popup');
    await term(page, 'Slow Term').click();
    await expect.poll(async () => (await popup).url()).toBe('https://www.ncbi.nlm.nih.gov/mesh/?term=Slow%20Term');
    await expect(page.locator('.mesh-note')).toHaveCount(0);
});

test('Split concept: MeSH terms in every box are links', async ({ page }) => {
    await openPico(page);
    await page.locator('[data-split="0"]').click();
    await page.locator('#f-v0').fill('Aged[Mesh]');
    await page.locator('#f-v0-1').fill('Heart Failure[Mesh]');
    await expect(page.locator('.cbox[data-s="0"] .mterm')).toHaveClass(/s-found/);
    await expect(page.locator('.cbox[data-s="1"] .mterm')).toHaveClass(/s-found/);
    await expect(page.locator('.mesh-summary')).toHaveText('MeSH check: 2 found');
});

test('click-to-edit in the visualisation still works, without MeSH marks', async ({ page }) => {
    await openPico(page);
    await page.locator('details.viz > summary').click();
    await page.locator('#f-v0').fill('Heart Failure[Mesh] OR hf[tiab]');
    await expect(term(page, 'Heart Failure')).toHaveClass(/s-found/);
    // No MeSH marks in the visualisation.
    await expect(page.locator('.medsyntax-target .mesh-mark')).toHaveCount(0);
    const t = page.locator('.medsyntax-target .term', { hasText: 'Heart Failure' }).first();
    await t.hover();
    await t.click();
    const edit = page.locator('.dynamic-input');
    await expect(edit).toHaveValue('Heart Failure[Mesh] OR hf[tiab]');
    await edit.press('End');
    await edit.pressSequentially(' OR Aged[Mesh]');
    await edit.press('Enter');
    await expect(page.locator('#f-v0')).toHaveValue('Heart Failure[Mesh] OR hf[tiab] OR Aged[Mesh]');
    await expect(term(page, 'Aged')).toHaveClass(/s-found/);
});
