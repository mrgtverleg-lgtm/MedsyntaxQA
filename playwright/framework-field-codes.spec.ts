// @ts-check
// Field codes and proximity operators in the Medsyntax Framework checker (scripts/medsyntax-engine.js).
// A typo in a field code (ti,ab,k) or a proximity operator without a number (NEAR/) must give a warning,
// and correct syntax must not. The checker runs on the page itself, through its global runMedsyntax().
// The local web server is started by playwright.config.js (webServer).
import { test, expect } from '@playwright/test';

const URL = 'http://localhost:8123/framework/';

// Fail any test that throws a JavaScript error or logs a console error on the page.
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

type Result = { warnings: string[], texts: Record<string, string> };

// Runs the checker on one query for one database: the warning keys, and the detail text per key.
async function check(page, query: string, db: string): Promise<Result> {
    return page.evaluate(([q, d]) => {
        const r = window['runMedsyntax'](q, document.createElement('div'), { db: d, full: true });
        const texts = {};
        for (const k of r.warnings) texts[k] = r.details[k] ? r.details[k].text : '';
        return { warnings: r.warnings, texts };
    }, [query, db]);
}

// [database, query, warning key, text the detail must contain]
const SHOULD_WARN: [string, string, string, string][] = [
    ['embase', "'hand washing'/exp OR (hand NEAR/ hygiene):ti,ab,kw", 'prox-number', 'hand NEAR/3 hygiene'],
    ['pubmed', 'hand NEAR/ hygiene', 'prox-number', 'PubMed does not use NEAR/n'],
    ['scopus', 'TITLE-ABS-KEY(hand W/ hygiene)', 'prox-number', 'hand W/3 hygiene'],
    ['embase', 'diabet*:ti,ab,k', 'field-tag', '“k” in “:ti,ab,k”'],
    ['cochrane', 'diabet*:ti,ab,k', 'field-tag', '“k” in “:ti,ab,k”'],
    ['embase', 'diabet*:ti,abs,keywords', 'field-tag', '“abs” and “keywords”'],
    ['embase', 'diabet*:so', 'field-tag', '“:so”'],
    ['embase', "'aspirin'/xx", 'field-tag', '“/xx”'],
    ['ovid', 'diabet*.ti,ab,k.', 'field-tag', '“k” in “.ti,ab,k.”'],
    ['ovid', 'diabet*.t.', 'field-tag', '“.t.”'],
    ['ovid', 'diabet*.tiab.', 'field-tag', '“.tiab.”'],
    ['wos', 'T=(diabet*)', 'field-tag', '“T=”'],
    ['pubmed', 'diabet*[tia]', 'field-tag', '[tia]'],
    ['scopus', 'TITLE-ABS-KY(diabet*)', 'field-tag', 'TITLE-ABS-KY'],
    // PsycINFO via Ovid: APA PsycInfo field codes, so a typo in .ti,ab,id. is still caught.
    ['psycovid', 'anxiet*.ti,ab,i.', 'field-tag', '“i” in “.ti,ab,i.”'],
    ['psycovid', 'anxiet*:ti,ab', 'wrong-db', 'anxiet*.ti,ab,id.'],
    // PsycINFO via EBSCO: subject headings are DE, not MH as in CINAHL.
    ['psycebsco', '(MH "Anxiety") OR TI anxiet*', 'field-tag', 'DE "Anxiety"'],
    ['psycebsco', "'anxiety'/exp", 'wrong-db', 'DE "Anxiety"'],
    // Europe PMC: FIELD:term in capitals, proximity as "phrase"~N.
    ['europepmc', 'TITEL_ABS:diabet*', 'field-tag', '“TITEL_ABS:”'],
    ['europepmc', 'diabet*[tiab]', 'wrong-db', 'TITLE_ABS:diabet*'],
    ['europepmc', '"Diabetes Mellitus"[Mesh]', 'wrong-db', 'MESH_HEADING:"diabetes mellitus"'],
    ['europepmc', 'hand NEAR/3 hygiene', 'wrong-db', 'TITLE_ABS:"hand hygiene"~3'],
    ['europepmc', 'diabet*:ti,ab,kw', 'wrong-db', 'TITLE_ABS:diabet*'],
    ['europepmc', 'diabet$', 'wildcard', 'Europe PMC uses *'],
    ['pubmed', 'TITLE_ABS:diabet*', 'wrong-db', 'Europe PMC syntax'],
    ['pubmed', 'MESH_HEADING:"Diabetes Mellitus"', 'wrong-db', '"Diabetes Mellitus"[Mesh]'],
    ['embase', 'PUB_YEAR:[2020 TO 2026]', 'wrong-db', '[english]/lim'],
];

// [database, query]: correct syntax, no warnings at all.
const NO_WARNING: [string, string][] = [
    ['embase', "('hand washing'/exp OR (hand NEAR/3 hygiene):ti,ab,kw) AND 'intensive care unit'/exp"],
    ['embase', "'heart'/mj OR 'aspirin'/tn OR 'aspirin'/dd OR diabet*:ti,ab,kw,de"],
    ['embase', 'COVID-19:outcomes AND diabet*:ti'],
    ['embase', '[english]/lim'],
    ['cochrane', '([mh "Hand Hygiene"] OR (hand NEAR/3 hygiene):ti,ab,kw) AND english:la'],
    ['ovid', '(exp Hand Hygiene/ OR (hand adj3 hygiene).ti,ab. OR handwash*.ti,ab,kf.) AND diabet*.mp.'],
    ['ovid', 'exp Vision, Near/ OR Pain/'],
    ['pubmed', '("Hand Hygiene"[Mesh] OR handwash*[tiab]) AND review[pt:noexp] AND 2020[epdat]'],
    ['wos', 'TS=("hand hygiene" OR handwash*) AND TI=(compliance)'],
    ['scopus', 'TITLE-ABS-KEY("hand hygiene" OR handwash*) AND REFPAGE(12)'],
    ['psycovid', '(exp Anxiety/ OR (social adj3 anxiet*).ti,ab,id.) AND (cognitive behavio?ral therap*.mp. OR test anxiety.tm.)'],
    ['psycovid', 'animal.po. AND (english OR dutch).lg. AND adolescence.ag. AND 2020.yr.'],
    ['psycebsco', '(DE "Anxiety") OR (MJ "Social Anxiety") OR TI (social N3 anxiet*) OR AB anxiet* OR KW anxiet*'],
    ['europepmc', '(MESH_HEADING:"Hand Hygiene" OR TITLE_ABS:"hand hygiene"~3 OR TITLE_ABS:(handwash* OR "hand washing")) AND PUB_YEAR:[2020 TO 2026]'],
    ['europepmc', 'TITLE:diabet?s AND (AUTH:"Smith J" OR KW:insulin) AND LANG:eng NOT SRC:PPR AND OPEN_ACCESS:y'],
    // Uppercase Embase and Cochrane codes are not read as Europe PMC fields.
    ['cochrane', 'DIABETES:TI,AB'],
];

for (const [db, query, key, text] of SHOULD_WARN) {
    test(`${db}: ${query} gives "${key}"`, async ({ page }) => {
        const r = await check(page, query, db);
        expect(r.warnings).toContain(key);
        expect(r.texts[key]).toContain(text);
    });
}

for (const [db, query] of NO_WARNING) {
    test(`${db}: ${query} gives no warning`, async ({ page }) => {
        const r = await check(page, query, db);
        expect(r.warnings).toEqual([]);
    });
}
