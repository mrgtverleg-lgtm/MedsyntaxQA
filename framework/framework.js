// Medsyntax Framework: choose or create a search mnemonic, then build the query.
// Needs jQuery, LZString and scripts/medsyntax-engine.js loaded first.
// License: GNU GPL v3.0

// =====================================================================
// Mnemonic library
// =====================================================================
// Each colour has at least 4.5:1 contrast with white text (WCAG 2.1 AA).
const PALETTE = ['#d7263d', '#9a5800', '#3f7a1c', '#7b3fa0', '#1f6fd1', '#00796b', '#c2185b', '#6d4c41', '#455a64', '#b03a12'];
const col = i => PALETTE[i % PALETTE.length];
const E = (key, label, hint, i, extra) => Object.assign({ key, label, hint, color: col(i), op: 'AND', include: true }, extra || {});

// The library shows 8 mnemonics, chosen to keep step 1 simple for nurses who are new to literature searching.
// Users can add as many of their own as they like under My mnemonics.
const LIBRARY = [
  { id: 'PICO', name: 'PICO', useFor: 'Effects of a treatment, therapy or intervention', elements: [
    E('P', 'Population/Problem', 'Who are the patients, or what is the problem?', 0),
    E('I', 'Intervention', 'Which treatment, test or exposure are you studying?', 1),
    E('C', 'Comparison/Control', 'What is the alternative? Often left out of the search.', 2),
    E('O', 'Outcome', 'What do you want to measure or improve?', 3)] },
  { id: 'PICOS', name: 'PICOS', useFor: 'Intervention questions limited to a study design', elements: [
    E('P', 'Population/Problem', 'Who are the patients, or what is the problem?', 0),
    E('I', 'Intervention', 'Which treatment or exposure?', 1),
    E('C', 'Comparison/Control', 'What is the alternative?', 2),
    E('O', 'Outcome', 'What do you want to measure?', 3),
    E('S', 'Study design', 'For example randomised controlled trials', 4)] },
  { id: 'PICOT', name: 'PICOT', useFor: 'Intervention questions with a time frame', elements: [
    E('P', 'Population/Problem', 'Who are the patients?', 0),
    E('I', 'Intervention', 'Which treatment or exposure?', 1),
    E('C', 'Comparison/Control', 'What is the alternative?', 2),
    E('O', 'Outcome', 'What do you want to measure?', 3),
    E('T', 'Time', 'Over which period is the outcome measured?', 4)] },
  { id: 'PECO', name: 'PECO', useFor: 'Environmental and occupational exposures', elements: [
    E('P', 'Population', 'Who is exposed?', 0),
    E('E', 'Exposure', 'Which exposure or risk factor?', 1),
    E('C', 'Comparator', 'Unexposed or differently exposed group', 2),
    E('O', 'Outcome', 'Which health effect?', 3)] },
  { id: 'SPIDER', name: 'SPIDER', useFor: 'Qualitative and mixed-methods research', elements: [
    E('S', 'Sample', 'Which group of people?', 0),
    E('PI', 'Phenomenon of Interest', 'Which experience, behaviour or decision?', 1),
    E('D', 'Design', 'For example interviews, focus groups, surveys', 2),
    E('E', 'Evaluation', 'Views, experiences, attitudes, perceptions', 3),
    E('R', 'Research type', 'Qualitative, quantitative or mixed methods', 4)] },
  { id: 'SPICE', name: 'SPICE', useFor: 'Evaluating services, projects and policies', elements: [
    E('S', 'Setting', 'Where? For example primary care, hospital ward', 0),
    E('P', 'Perspective', 'For whom? Users, staff, managers', 1),
    E('I', 'Intervention/Interest', 'What is being done or studied?', 2),
    E('C', 'Comparison', 'Compared with what?', 3),
    E('E', 'Evaluation', 'How is success measured?', 4)] },
  { id: 'ECLIPSE', name: 'ECLIPSE', useFor: 'Health policy and management questions', elements: [
    E('E', 'Expectation', 'What should the information improve?', 0),
    E('C', 'Client group', 'Who is the service for?', 1),
    E('L', 'Location', 'Where is the service?', 2),
    E('I', 'Impact', 'What would change, and how is it measured?', 3),
    E('P', 'Professionals', 'Who is involved in delivering it?', 4),
    E('SE', 'SErvice', 'Which service is it?', 5)] },
  { id: 'PIRD', name: 'PIRD', useFor: 'Diagnostic test accuracy', elements: [
    E('P', 'Population', 'Which patients are tested?', 0),
    E('I', 'Index test', 'Which test are you evaluating?', 1),
    E('R', 'Reference test', 'What is the gold standard?', 2, { include: false }),
    E('D', 'Diagnosis', 'Which target condition?', 3)] },
];

const EXAMPLE_CUSTOM = { id: 'my:LSI', name: 'LSI', custom: true, useFor: 'Example custom mnemonic: library instruction', elements: [
  E('L', 'Librarians', 'Who delivers the instruction?', 5),
  E('S', 'Setting', 'Which kind of library?', 4),
  E('I', 'Instruction', 'What kind of teaching or training?', 6)] };

// "No framework": numbered concept blocks that the user adds, names, combines and removes.
function concept(i, label) { return E(String(i + 1), label || 'Concept ' + (i + 1), '', i); }
function freeMnemonic(n) {
  return { id: 'none', name: 'No framework', free: true, useFor: 'Your own concept blocks, without a mnemonic',
    elements: Array.from({ length: Math.max(1, n) }, (_, i) => concept(i)) };
}
// Keep the user's text (and the names of the parts they filled in) when leaving a mnemonic.
// A split letter becomes one concept block per box, so nothing is lost.
function startFree(st) {
  ensureSubs(st);
  const filled = [];
  st.mn.elements.forEach((e, i) => conceptsOf(st, i).forEach(c => {
    if (!c.v.trim()) return;
    const label = c.name.trim() || (isSplit(st, i) ? e.label + ' ' + (c.s + 1) : e.label);
    filled.push({ label, op: c.s ? c.op : e.op, v: c.v });
  }));
  const mn = freeMnemonic(Math.max(2, filled.length));
  filled.forEach((x, i) => { mn.elements[i].label = x.label; mn.elements[i].op = i ? x.op : 'AND'; });
  st.mn = mn;
  st.values = mn.elements.map((_, i) => (filled[i] ? filled[i].v : ''));
  st.subs = mn.elements.map(emptySub);
}
function renumberConcepts(mn) {
  mn.elements.forEach((e, i) => {
    if (/^Concept \d+$/.test(e.label)) e.label = 'Concept ' + (i + 1);
    e.key = String(i + 1);
    e.color = col(i);
  });
}

const DEMOS = {
  'No framework': ['"Diabetes Mellitus"[Mesh] OR diabet*[tiab] OR T2DM[tiab]',
                   '"Exercise"[Mesh] OR exercis*[tiab] OR "physical activity"[tiab]'],
  // P and O are split, so the example also shows nested concepts (AND within P, OR within O).
  PICO: [{ name: 'Type 2 diabetes', v: '"Diabetes Mellitus, Type 2"[Mesh] OR "type 2 diabetes"[tiab] OR T2DM[tiab]',
           more: [{ name: 'Older adults', op: 'AND', v: '"Aged"[Mesh] OR elderly[tiab] OR "older adult*"[tiab]' }] },
         '"Exercise"[Mesh] OR exercis*[tiab] OR "physical activity"[tiab] OR "resistance training"[tiab]',
         '"usual care"[tiab] OR "standard care"[tiab] OR "no intervention"[tiab]',
         { name: 'Glycaemic control', v: '"Glycated Hemoglobin"[Mesh] OR HbA1c[tiab] OR "glycemic control"[tiab]',
           more: [{ name: 'Blood glucose', op: 'OR', v: '"Blood Glucose"[Mesh] OR "blood glucose"[tiab] OR "fasting glucose"[tiab]' }] }],
  SPIDER: ['"Nurses"[Mesh] OR nurse*[tiab] OR "nursing staff"[tiab]',
           '"Patient Handoff"[Mesh] OR handover*[tiab] OR handoff*[tiab] OR SBAR[tiab]',
           'interview*[tiab] OR "focus group*"[tiab] OR ethnograph*[tiab]',
           'experienc*[tiab] OR view*[tiab] OR perception*[tiab] OR attitude*[tiab]',
           '"Qualitative Research"[Mesh] OR qualitative[tiab] OR "mixed method*"[tiab]'],
  LSI: ['librarian* OR "information specialist" OR informationist* OR "information professional" OR "knowledge worker" OR "information scientist*" OR "information services"',
        'librar* AND (medical OR academic OR research OR special OR college OR junior )',
        'DE "library orientation" OR DE "learning" OR DE "information services" OR "User education" OR instruct* OR educat* OR orient* OR teach* OR curricul* OR train* OR pedagog* OR tutor* OR lesson* OR lectur* OR learn * OR webinar*']
};

// ---- My mnemonics (browser storage, optional) ----
const STORE_KEY = 'medsyntax.myMnemonics.v1';
function loadMine() {
  try { const v = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
function saveMine(list) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
}
function allMine() {
  const mine = loadMine();
  if (!mine.some(m => m.name === EXAMPLE_CUSTOM.name)) mine.unshift(EXAMPLE_CUSTOM);
  return mine;
}
function findMn(id) {
  return LIBRARY.find(m => m.id === id) || allMine().find(m => m.id === id) || null;
}
const clone = o => JSON.parse(JSON.stringify(o));

// =====================================================================
// State
// =====================================================================
function newState(id, demo) {
  const mn = clone(findMn(id));
  return ensureSubs({ mn, values: mn.elements.map((_, i) => (demo && demo[i]) || ''), title: '' });
}
// Split concepts: a letter can hold more than one concept (step 2, "Split concept").
// st.values[i] is the text of the first box; st.subs[i].more holds the extra boxes.
const emptySub = () => ({ name: '', more: [] });
function ensureSubs(st) {
  const old = Array.isArray(st.subs) ? st.subs : [];
  st.subs = st.mn.elements.map((_, i) => {
    const x = old[i];
    if (!x || !Array.isArray(x.more)) return emptySub();
    return { name: String(x.name || ''), more: x.more.map(m => ({ name: String(m.name || ''), op: ['AND', 'OR', 'NOT'].includes(m.op) ? m.op : 'AND', v: String(m.v || '') })) };
  });
  return st;
}
const isSplit = (st, i) => !!(st.subs && st.subs[i] && st.subs[i].more.length);
// Boxes of letter i with their text and op: [{ v, op, name, s }], s = 0 for the first box.
function conceptsOf(st, i) {
  const sub = (st.subs && st.subs[i]) || emptySub();
  return [{ v: st.values[i] || '', op: 'AND', name: sub.name, s: 0 }]
    .concat(sub.more.map((m, k) => ({ v: m.v, op: m.op, name: m.name, s: k + 1 })));
}
// Carry text over: same element (letter + meaning) first, then by position.
const sameKind = e => (e.key + ':' + String(e.label || '').toLowerCase().split(/[\s\/]/)[0]);
function setMnemonic(st, mn) {
  mn = clone(mn);
  ensureSubs(st);
  // A letter "has text" when any of its boxes has text; its split moves along with it.
  const old = st.mn.elements.map((e, i) => ({ kind: sameKind(e), v: st.values[i] || '', sub: st.subs[i], used: false,
    filled: conceptsOf(st, i).some(c => c.v.trim()) }));
  const picks = mn.elements.map(e => {
    const hit = old.find(o => !o.used && o.kind === sameKind(e) && o.filled);
    if (hit) { hit.used = true; return hit; }
    return null;
  });
  const rest = old.filter(o => !o.used && o.filled);
  for (let i = 0; i < picks.length; i++) if (picks[i] === null) { const r = rest.shift(); if (r) r.used = true; picks[i] = r || null; }
  st.mn = mn;
  st.values = picks.map(o => (o ? o.v : ''));
  st.subs = picks.map(o => (o ? o.sub : emptySub()));
}
// Picking a mnemonic card in step 1 starts a new, empty search: text never moves to another concept.
// The query title stays, because it describes the question, not the mnemonic.
function startMnemonic(st, mn) {
  st.mn = clone(mn);
  st.values = st.mn.elements.map(() => '');
  st.subs = st.mn.elements.map(emptySub);
}
function compile(st) {
  const parts = [];
  st.mn.elements.forEach((e, i) => {
    if (!e.include) return;
    // Within a letter: ((first) AND (second) OR (third)), skipping empty boxes.
    const filled = conceptsOf(st, i).filter(c => c.v.trim());
    if (!filled.length) return;
    const inner = filled.map((c, k) => (k ? c.op + ' ' : '') + '(' + c.v.trim() + ')').join(' ');
    parts.push((parts.length ? e.op + ' ' : '') + (filled.length > 1 ? '(' + inner + ')' : inner));
  });
  return parts.join(' ');
}
// Line-by-line search (multi-string): one line per filled box, a line that combines the parts of a
// split letter, and a last line that combines the letters. Lines refer to each other as #1, #2...
function searchLines(st) {
  const lines = [], tops = [];
  const add = (label, q) => { lines.push({ n: lines.length + 1, label, q }); return lines.length; };
  st.mn.elements.forEach((e, i) => {
    if (!e.include) return;
    const filled = conceptsOf(st, i).filter(c => c.v.trim());
    if (!filled.length) return;
    const head = st.mn.free ? e.label : e.key + ' · ' + e.label;
    const split = filled.length > 1;
    const refs = filled.map(c => ({ op: c.op, n: add(split ? (st.mn.free ? e.label + ' · ' : e.key + ' · ') + (c.name.trim() || 'Concept ' + (c.s + 1)) : head, c.v.trim()) }));
    const n = split ? add(head, refs.map((r, k) => (k ? r.op + ' ' : '') + '#' + r.n).join(' ')) : refs[0].n;
    tops.push({ op: e.op, n });
  });
  if (tops.length > 1) add('Combined', tops.map((t, k) => (k ? t.op + ' ' : '') + '#' + t.n).join(' '));
  return lines;
}
const linesTSV = lines => ['#\tConcept\tSearch'].concat(lines.map(l => `#${l.n}\t${l.label}\t${l.q}`)).join('\n');
const linesTableHTML = lines => '<table class="lines-table"><thead><tr><th>#</th><th>Concept</th><th>Search</th></tr></thead><tbody>' +
  lines.map(l => `<tr><td>#${l.n}</td><td>${escapeHtml(l.label)}</td><td>${escapeHtml(l.q)}</td></tr>`).join('') + '</tbody></table>';
// Copy as a real table (for Word and Excel), with tab-separated text as the plain version.
function copyTable(lines, fallbackInput) {
  const tsv = linesTSV(lines);
  try {
    const item = new ClipboardItem({ 'text/html': new Blob([linesTableHTML(lines)], { type: 'text/html' }), 'text/plain': new Blob([tsv], { type: 'text/plain' }) });
    navigator.clipboard.write([item]).then(() => toast('Table copied. Paste it into Word or Excel.'), () => copyText(tsv, 'Table copied', fallbackInput));
  } catch (e) { copyText(tsv, 'Table copied', fallbackInput); }
}
// ---- Read a pasted line-by-line search ----
// Accepts one line per row, with or without numbers (#1, 1., S1), and tab-separated columns from Word,
// Excel or the PubMed history (number, concept name, search, result count...). Lines made only of
// line numbers and AND/OR/NOT, like "#1 AND (#2 OR #3)", say how the other lines are combined.
// Returns { concepts: [{ name, v, more: [{ name, op, v }] }], ops } or an error message.
const REF_RE = /(?:#|\bS)?(\d+)/gi;
const isRefLine = q => /\d/.test(q) && q.replace(/(?:#|\bS)?\d+|\b(?:AND|OR|NOT)\b|[()\s]/gi, '') === '';
function parseLineSearch(text) {
  let rows = String(text || '').split(/\r?\n/).map(r => r.split('\t').map(c => c.trim())).filter(r => r.some(Boolean));
  if (!rows.length) return 'Paste a search first.';
  // A header row (from our own table, Excel or PubMed) names the columns.
  let qCol = -1, nCol = -1;
  const head = rows[0].map(c => c.toLowerCase());
  if (rows[0].length > 1 && head.some(c => /^(query|search terms?|zoekterm(en)?|zoekopdracht|search)$/.test(c)) && !rows[0].some(c => isRefLine(c))) {
    qCol = head.indexOf('query') >= 0 ? head.indexOf('query') : head.findIndex(c => /^(search terms?|zoekterm(en)?|zoekopdracht|search)$/.test(c));
    nCol = head.findIndex(c => /^(concept|name|naam|element|description)$/.test(c));
    rows = rows.slice(1);
  }
  const allNumbered = rows.every(r => /^(?:#|S)?\d+(?:[.):]|\s|$)/i.test(r[0]));
  const lines = rows.map((r, idx) => {
    let num = null, cells = r.slice();
    const m = cells[0].match(/^(?:#|S)?(\d+)[.):]?(?:\s+(.*))?$/i);
    if (allNumbered && m) { num = +m[1]; if (m[2]) cells[0] = m[2]; else cells.shift(); }
    let q, name = '';
    if (qCol >= 0) { q = r[qCol] || ''; name = nCol >= 0 ? r[nCol] || '' : ''; }
    else {
      // Drop result counts, times and empty cells; the last cell left is the search, the one before it its name.
      cells = cells.filter(c => c && !/^[\d.,\s]+$/.test(c) && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(c));
      q = cells.length ? cells[cells.length - 1] : '';
      if (cells.length > 1 && cells[cells.length - 2].length <= 60) name = cells[cells.length - 2];
    }
    q = q.replace(/^search:\s*/i, '').trim();
    name = name.replace(/^[^·]{1,12}·\s*/, '').trim(); // "P · Population" from our own table
    return { num: num === null ? idx + 1 : num, name, q, ref: isRefLine(q) };
  }).filter(l => l.q);
  if (!lines.length) return 'No search lines found in the pasted text.';
  const byNum = new Map(lines.map(l => [l.num, l]));

  // "#1 AND (#2 OR #3)" -> [{ op, ref } | { op, group: [...] }]
  const parseRefs = q => {
    const toks = q.match(/\(|\)|\b(?:AND|OR|NOT)\b|(?:#|\bS)?\d+/gi) || [];
    let p = 0;
    const list = () => {
      const out = []; let op = 'AND';
      while (p < toks.length && toks[p] !== ')') {
        const t = toks[p++];
        if (/^(AND|OR|NOT)$/i.test(t)) { op = t.toUpperCase(); continue; }
        if (t === '(') { out.push({ op, group: list() }); p++; }
        else out.push({ op, ref: +t.replace(/\D/g, '') });
        op = 'AND';
      }
      return out;
    };
    return list();
  };
  let missing = null;
  const lineOf = n => { const l = byNum.get(n); if (!l && missing === null) missing = n; return l; };
  // The parts inside a node: a combining line or a bracket group. A plain search line has none.
  const partsOf = (node, depth) => {
    if (depth > 20) return null;
    if (node.group) return node.group;
    const l = lineOf(node.ref);
    return l && l.ref ? parseRefs(l.q) : null;
  };
  const textOf = (node, depth = 0) => {
    const parts = partsOf(node, depth);
    if (!parts) { const l = lineOf(node.ref); return l ? l.q : ''; }
    return parts.map((x, k) => (k ? x.op + ' ' : '') + (parts.length > 1 ? '(' + textOf(x, depth + 1) + ')' : textOf(x, depth + 1))).join(' ');
  };
  const nameOf = node => { const l = node.ref ? byNum.get(node.ref) : null; return l ? l.name : ''; };

  const refLines = lines.filter(l => l.ref);
  const top = refLines.length ? parseRefs(refLines[refLines.length - 1].q) : lines.map(l => ({ op: 'AND', ref: l.num }));
  const concepts = top.map(t => {
    const parts = partsOf(t, 0);
    if (!parts) return { name: nameOf(t), v: textOf(t), more: [] };
    return { name: nameOf(t), first: nameOf(parts[0]), v: textOf(parts[0], 1),
      more: parts.slice(1).map(x => ({ name: nameOf(x), op: x.op, v: textOf(x, 1) })) };
  });
  if (missing !== null) return 'A line refers to #' + missing + ', but there is no line ' + missing + ' in the pasted text.';
  if (!concepts.some(c => c.v.trim())) return 'No search lines found in the pasted text.';
  return { concepts, ops: top.map(t => t.op) };
}
// Put a parsed search in the boxes. It keeps the framework when the concepts fit its letters;
// otherwise it continues without a framework, with one named block per concept.
function applyLineSearch(st, parsed) {
  const cs = parsed.concepts, els = st.mn.elements;
  const fits = !st.mn.free && cs.length === els.length && els.every((e, i) => e.include && (!i || e.op === parsed.ops[i]));
  if (!fits) {
    st.mn = freeMnemonic(cs.length);
    cs.forEach((c, i) => { if (c.name) st.mn.elements[i].label = c.name; st.mn.elements[i].op = i ? parsed.ops[i] : 'AND'; });
  }
  st.values = cs.map(c => c.v);
  st.subs = cs.map(c => ({ name: c.more.length ? (c.first || '') : '', more: c.more }));
  return fits;
}
function packState(oid, st) {
  const data = { o: oid, t: st.title, n: st.mn.name, u: st.mn.useFor || '', f: st.mn.free ? 1 : 0, e: st.mn.elements.map(e => [e.key, e.label, e.hint || '', e.color, e.op, e.include ? 1 : 0]), v: st.values };
  if (st.subs && st.subs.some(x => x.more.length || x.name)) data.x = st.subs;
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}
function unpackState(s) {
  try {
    const d = JSON.parse(LZString.decompressFromEncodedURIComponent(s));
    if (!d || !Array.isArray(d.e)) return null;
    const mn = { id: 'shared:' + d.n, name: d.n || 'Shared', useFor: d.u || '', custom: true,
      elements: d.e.map(a => ({ key: a[0], label: a[1], hint: a[2], color: a[3], op: ['AND', 'OR', 'NOT'].includes(a[4]) ? a[4] : 'AND', include: !!a[5] })) };
    if (d.f) { mn.free = true; mn.id = 'none'; }
    return { oid: d.o, st: ensureSubs({ mn, values: mn.elements.map((_, i) => (d.v && d.v[i]) || ''), title: d.t || '', subs: d.x }) };
  } catch (e) { return null; }
}
function buildLink(oid, st) { return location.href.split(/[?#]/)[0] + '?s=' + packState(oid, st); }

const S = Object.assign(newState('PICO'), { step: 'pick', panel: null, draft: null });

// =====================================================================
// UI helpers
// =====================================================================
const qs = (r, s) => r.querySelector(s);
const qsa = (r, s) => Array.from(r.querySelectorAll(s));
let toastTimer;
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600); }
function copyText(text, okMsg, fallbackInput) {
  const fail = () => { if (fallbackInput) { fallbackInput.closest('[hidden]') && (fallbackInput.closest('[hidden]').hidden = false); fallbackInput.value = text; fallbackInput.select(); } toast('Copy was blocked. The text is selected: press Ctrl+C or Cmd+C.'); };
  try { navigator.clipboard.writeText(text).then(() => toast(okMsg), fail); } catch (e) { fail(); }
}
// Text colour on an element colour: black or white, whichever has more contrast.
// Library colours always get white; light custom colours (or colours from old links) get black.
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}
function inkFor(hex) {
  const l = luminance(hex);
  if (l === null) return '#fff';
  return (1.05 / (l + 0.05)) >= ((l + 0.05) / 0.05) ? '#fff' : '#000';
}
const elStyle = color => `--el:${escapeHtml(color)};--el-ink:${inkFor(color)}`;
const lettersHTML = mn => '<span class="letters" aria-hidden="true">' + mn.elements.map(e => `<span style="${elStyle(e.color)}">${escapeHtml(e.key)}</span>`).join('') + '</span>';
const fullName = mn => mn.elements.map(e => e.label).join(' · ');

// ---------------- Editor: coloured boxes + medsyntax strategy ----------------
function fieldHeadHTML(oid, st, e, i) {
  if (!st.mn.free) {
    return `<label for="${oid}-v${i}"><span class="key">${escapeHtml(e.key)}</span>${escapeHtml(e.label)}</label>
          ${e.op === 'NOT' ? '<span class="tag not">combined with NOT</span>' : ''}
          ${e.include ? '' : '<span class="tag">not in search</span>'}`;
  }
  const n = st.mn.elements.length;
  return `<span class="key">${escapeHtml(e.key)}</span>
          <input type="text" class="concept-name" data-name="${i}" value="${escapeHtml(e.label)}" aria-label="Name of concept ${i + 1}">
          ${i > 0 ? `<label class="concept-op">Combine with
            <select data-op="${i}">${['AND', 'OR', 'NOT'].map(o => `<option ${e.op === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>` : ''}
          ${n > 1 ? `<button type="button" class="btn icon small" data-remove="${i}" aria-label="Remove concept ${i + 1}">✕</button>` : ''}`;
}

// The boxes of one letter (or one No framework block): the first box, plus the extra boxes once it is split.
function conceptBoxesHTML(oid, st, e, i) {
  const free = !!st.mn.free, split = isSplit(st, i), sub = st.subs[i];
  const who = free ? (e.label || 'concept ' + e.key) : e.key; // what the buttons and labels call this letter or block
  const placeholder = `placeholder='term OR "phrase"[Mesh] OR trunc*[tiab]'`;
  const first = `
        <div class="cbox" data-s="0">
          ${split ? `<input type="text" class="sub-name" data-s="0" value="${escapeHtml(sub.name)}" placeholder="Concept 1" aria-label="Name of concept 1 of ${escapeHtml(e.key)}">` : ''}
          <textarea id="${oid}-v${i}" data-s="0" spellcheck="false" ${free ? `aria-label="Search terms for ${escapeHtml(e.label)}"` : ''} ${placeholder}>${escText(st.values[i] || '')}</textarea>
          <p class="notice" hidden></p>
          <ul class="warns" hidden></ul>
        </div>`;
  const more = sub.more.map((m, k) => {
    const s = k + 1, n = s + 1;
    return `
        <div class="cbox subconcept" data-s="${s}">
          <div class="sub-head">
            <select class="sub-op" data-s="${s}" aria-label="Combine concept ${n} of ${escapeHtml(e.key)} with">${['AND', 'OR', 'NOT'].map(o => `<option ${m.op === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
            <input type="text" class="sub-name" data-s="${s}" value="${escapeHtml(m.name)}" placeholder="Concept ${n}" aria-label="Name of concept ${n} of ${escapeHtml(e.key)}">
            <button type="button" class="btn small ghost clear-field" data-clear="${i}" data-s="${s}" ${m.v.trim() ? '' : 'hidden'} aria-label="Clear concept ${n} of ${escapeHtml(e.key)}">Clear</button>
            <button type="button" class="btn icon small" data-unsplit="${i}" data-s="${s}" aria-label="Remove concept ${n} of ${escapeHtml(e.key)}">✕</button>
          </div>
          <textarea id="${oid}-v${i}-${s}" data-s="${s}" spellcheck="false" aria-label="Search terms for concept ${n} of ${escapeHtml(e.key)}" ${placeholder}>${escText(m.v)}</textarea>
          <p class="notice" hidden></p>
          <ul class="warns" hidden></ul>
        </div>`;
  }).join('');
  const btn = `<div class="split-row"><button type="button" class="btn small ghost" data-split="${i}">${split ? '+ Add concept to ' + escapeHtml(who) : 'Split concept'}</button>
          ${split ? '' : '<span class="split-hint">Need two concepts here, like a patient group and a condition?</span>'}</div>`;
  return first + more + btn;
}
// Read and write the text of box s of letter i.
const getBox = (st, i, s) => (s ? st.subs[i].more[s - 1].v : st.values[i]) || '';
function setBox(st, i, s, v) { if (s) st.subs[i].more[s - 1].v = v; else st.values[i] = v; }

const VIZ_KEY = 'medsyntax.showVisualisation';
function showViz() { try { return localStorage.getItem(VIZ_KEY) === '1'; } catch (e) { return false; } }
const LINES_KEY = 'medsyntax.showLines';
function showLines() { try { return localStorage.getItem(LINES_KEY) === '1'; } catch (e) { return false; } }

// The strategy heading shows the query title; without a title it falls back to a generic name.
function strategyTitle(st) {
  const t = (st.title || '').trim();
  if (t) return t;
  return st.mn.free ? 'Medsyntax search strategy' : 'Medsyntax ' + st.mn.name + ' search strategy';
}

function renderEditor(root, oid, st) {
  const free = !!st.mn.free;
  root.innerHTML = `
  <div class="editor">
    <div class="fields">
      <label class="title-field">Query title<input type="text" id="${oid}-title" value="${escapeHtml(st.title)}" placeholder="Please input a title for your query here..."></label>
      ${st.mn.elements.map((e, i) => `
      <div class="field ${e.include ? '' : 'is-off'}" data-i="${i}" style="${elStyle(e.color)}">
        <div class="field-head${free ? ' free' : ''}">
          ${fieldHeadHTML(oid, st, e, i)}
          <button type="button" class="btn small ghost clear-field" data-clear="${i}" data-s="0" ${(st.values[i] || '').trim() ? '' : 'hidden'} aria-label="Clear ${escapeHtml(e.label)}">Clear</button>
        </div>
        ${e.hint ? `<p class="hint">${escapeHtml(e.hint)}</p>` : ''}
        ${conceptBoxesHTML(oid, st, e, i)}
      </div>`).join('')}
      ${free ? '<div class="btn-row"><button type="button" class="btn small" data-act="add-concept">+ Add concept</button></div>' : ''}
    </div>
    <section class="strategy">
      <div class="strategy-head"><h3 class="strategy-title">${escapeHtml(strategyTitle(st))}</h3></div>
      <div class="global" aria-live="polite"></div>
      <h4>Full query</h4>
      <div class="full-query"></div>
      <div class="btn-row">
        <button type="button" class="btn" data-act="demo">Load example</button>
        <button type="button" class="btn primary" data-act="copy">Copy query</button>
        <button type="button" class="btn" data-act="copy-table">Copy table</button>
        <button type="button" class="btn" data-act="paste-table">Paste a line-by-line search…</button>
        <button type="button" class="btn" data-act="link">Copy link</button>
        <button type="button" class="btn" data-act="download">Download</button>
        <button type="button" class="btn ghost" data-act="clear">Clear all</button>
      </div>
      <div class="link-box" hidden><input type="text" readonly id="${oid}-linkbox" aria-label="Link or query to copy"></div>
      <div class="paste-box" hidden>
        <label for="${oid}-paste">Paste a line-by-line search, for example from a table in Word or Excel, or the search history in PubMed. Lines like <code>#1 AND #2</code> tell the tool how the lines are combined.</label>
        <textarea id="${oid}-paste" spellcheck="false" placeholder="#1&#9;&quot;Diabetes Mellitus&quot;[Mesh] OR diabet*[tiab]&#10;#2&#9;exercis*[tiab]&#10;#3&#9;#1 AND #2"></textarea>
        <p class="err" hidden></p>
        <div class="btn-row"><button type="button" class="btn small primary" data-act="do-paste">Read search</button><button type="button" class="btn small ghost" data-act="cancel-paste">Cancel</button></div>
      </div>
    </section>
    <details class="extra-box viz" ${showViz() ? 'open' : ''}>
      <summary>Medsyntax visualisation <span class="help">Hover a part, click it, edit, press Enter</span></summary>
      <div class="blocks"></div>
    </details>
    <details class="extra-box lines-view" ${showLines() ? 'open' : ''}>
      <summary>Line-by-line search <span class="help">One line per concept, then lines that combine them</span></summary>
      <div class="lines-wrap"></div>
    </details>
  </div>`;

  // The visualisation is optional: closed by default, and the choice is remembered in this browser.
  qs(root, '.viz').addEventListener('toggle', e => {
    try { localStorage.setItem(VIZ_KEY, e.target.open ? '1' : '0'); } catch (err) { /* storage blocked */ }
  });
  // The line-by-line search is optional too: closed by default, remembered in this browser.
  qs(root, '.lines-view').addEventListener('toggle', e => {
    try { localStorage.setItem(LINES_KEY, e.target.open ? '1' : '0'); } catch (err) { /* storage blocked */ }
  });
  let timer;
  const grow = ta => { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 6) + 'px'; };
  qsa(root, '.field textarea').forEach(ta => {
    requestAnimationFrame(() => grow(ta));
    ta.addEventListener('input', () => {
      grow(ta);
      const i = +ta.closest('.field').dataset.i;
      setBox(st, i, +ta.dataset.s, ta.value);
      clearTimeout(timer);
      timer = setTimeout(() => refresh(root, oid, st), 120);
    });
  });
  qs(root, `#${oid}-title`).addEventListener('input', e => {
    st.title = e.target.value;
    qs(root, '.strategy-title').textContent = strategyTitle(st);
    syncUrl(oid, st);
  });
  // Clear one box.
  const boxId = (i, s) => `#${oid}-v${i}` + (s ? '-' + s : '');
  qs(root, '.fields').addEventListener('click', e => {
    const b = e.target.closest('[data-clear]'); if (!b) return;
    const i = +b.dataset.clear, s = +b.dataset.s || 0;
    const ta = qs(root, boxId(i, s));
    setBox(st, i, s, ''); ta.value = ''; grow(ta);
    refresh(root, oid, st);
    ta.focus();
  });
  // Split a letter or block into concepts, add one more, or remove one.
  qs(root, '.fields').addEventListener('click', e => {
    const split = e.target.closest('[data-split]'), un = e.target.closest('[data-unsplit]');
    if (split) {
      const i = +split.dataset.split;
      st.subs[i].more.push({ name: '', op: 'AND', v: '' });
      renderEditor(root, oid, st);
      const ta = qs(root, boxId(i, st.subs[i].more.length)); ta && ta.focus();
    }
    if (un) {
      const i = +un.dataset.unsplit, s = +un.dataset.s;
      st.subs[i].more.splice(s - 1, 1);
      if (!st.subs[i].more.length) st.subs[i].name = '';
      renderEditor(root, oid, st);
    }
  });
  // Concept names and AND/OR/NOT within a split letter.
  qs(root, '.fields').addEventListener('input', e => {
    const t = e.target; if (!t.classList.contains('sub-name')) return;
    const i = +t.closest('.field').dataset.i, s = +t.dataset.s;
    if (s) st.subs[i].more[s - 1].name = t.value; else st.subs[i].name = t.value;
    clearTimeout(timer);
    timer = setTimeout(() => refresh(root, oid, st), 200);
  });
  qs(root, '.fields').addEventListener('change', e => {
    const t = e.target; if (!t.classList.contains('sub-op')) return;
    st.subs[+t.closest('.field').dataset.i].more[+t.dataset.s - 1].op = t.value;
    refresh(root, oid, st);
  });
  if (free) {
    const fields = qs(root, '.fields');
    fields.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.name === undefined) return;
      st.mn.elements[+t.dataset.name].label = t.value;
      clearTimeout(timer);
      timer = setTimeout(() => refresh(root, oid, st), 200);
    });
    fields.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.op === undefined) return;
      st.mn.elements[+t.dataset.op].op = t.value;
      refresh(root, oid, st);
    });
    fields.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.remove !== undefined) {
        const i = +b.dataset.remove;
        st.mn.elements.splice(i, 1); st.values.splice(i, 1); st.subs.splice(i, 1);
        if (st.mn.elements[0]) st.mn.elements[0].op = 'AND';
        renumberConcepts(st.mn);
        renderEditor(root, oid, st);
        updateFwBar(st);
      }
      if (b.dataset.act === 'add-concept') {
        st.mn.elements.push(concept(st.mn.elements.length)); st.values.push(''); st.subs.push(emptySub());
        renderEditor(root, oid, st);
        updateFwBar(st);
        const last = qsa(root, '.field textarea').pop(); last && last.focus();
      }
    });
  }
  qs(root, '.strategy .btn-row').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const act = b.dataset.act;
    const lb = qs(root, `#${oid}-linkbox`);
    if (act === 'copy') { const q = compile(st); if (!q) return toast('Fill in at least one box first.'); copyText(q, 'Query copied', lb); }
    if (act === 'copy-table') { const l = searchLines(st); if (!l.length) return toast('Fill in at least one box first.'); copyTable(l, lb); }
    if (act === 'paste-table') { const pb = qs(root, '.paste-box'); pb.hidden = false; qs(pb, 'textarea').focus(); }
    if (act === 'link') copyText(buildLink(oid, st), 'Link copied', lb);
    if (act === 'download') {
      const q = compile(st); if (!q) return toast('Fill in at least one box first.');
      const name = (st.title || st.mn.name + ' search').replace(/[^\w\- ]+/g, '').trim() || 'medsyntax';
      const a = document.createElement('a');
      const txt = (st.title ? st.title + '\n\n' : '') + 'Full query\n' + q + '\n\nLine by line\n' + linesTSV(searchLines(st)) + '\n';
      a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
      a.download = name + '.txt'; document.body.appendChild(a); a.click(); a.remove();
      toast('Download started. If nothing happens, use Copy query.');
    }
    if (act === 'demo') {
      const d = DEMOS[st.mn.name];
      if (!d) return toast('No example for ' + st.mn.name + ' yet. Try PICO, SPIDER or LSI.');
      // A demo entry is the text of one letter, or { name, v, more } for a split letter.
      st.values = st.mn.elements.map((_, i) => (typeof d[i] === 'object' ? d[i].v : d[i]) || '');
      st.subs = st.mn.elements.map((_, i) => (d[i] && typeof d[i] === 'object' ? { name: d[i].name || '', more: clone(d[i].more || []) } : emptySub()));
      renderEditor(root, oid, st);
    }
    // Clear all: the text, the query title and the names of the concepts.
    if (act === 'clear') {
      st.title = '';
      st.values = st.mn.elements.map(() => '');
      st.subs = st.mn.elements.map(emptySub);
      if (free) st.mn.elements.forEach((e, i) => { e.label = 'Concept ' + (i + 1); });
      renderEditor(root, oid, st);
    }
  });
  // Paste a line-by-line search: in the paste box, or straight into an empty editor.
  const pasteBox = qs(root, '.paste-box'), pasteErr = qs(pasteBox, '.err');
  const readSearch = text => {
    const parsed = parseLineSearch(text);
    if (typeof parsed === 'string') return parsed;
    const fits = applyLineSearch(st, parsed);
    renderApp();
    toast(`Read ${parsed.concepts.length} ${parsed.concepts.length === 1 ? 'concept' : 'concepts'}` + (fits ? ' into ' + st.mn.name : ' as concept blocks without a framework'));
    return '';
  };
  pasteBox.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'cancel-paste') { pasteBox.hidden = true; pasteErr.hidden = true; }
    if (b.dataset.act === 'do-paste') { const m = readSearch(qs(pasteBox, 'textarea').value); pasteErr.textContent = m; pasteErr.hidden = !m; }
  });
  qsa(root, '.field textarea').forEach(ta => ta.addEventListener('paste', e => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const rows = text.split(/\r?\n/).filter(r => r.trim());
    if (rows.length < 2 || !rows.some(r => isRefLine(r.split('\t').filter(c => c.trim()).pop().replace(/^(?:#|S)?\d+[.):]?\s+/i, '')))) return;
    e.preventDefault();
    const empty = st.mn.elements.every((_, i) => conceptsOf(st, i).every(c => !c.v.trim()));
    if (empty && !readSearch(text)) return;
    // Boxes already have text (or the text could not be read): show it in the paste box first.
    pasteBox.hidden = false; qs(pasteBox, 'textarea').value = text;
    pasteErr.textContent = empty ? parseLineSearch(text) : 'This looks like a line-by-line search. Click Read search to put it in the boxes; this replaces what is in them now.';
    pasteErr.hidden = false;
    pasteBox.scrollIntoView({ block: 'nearest' });
  }));
  refresh(root, oid, st);
}

function refresh(root, oid, st) {
  latestInputTime = Date.now();
  const blocks = qs(root, '.blocks');
  blocks.innerHTML = '';
  const perEl = [];
  let shown = 0;
  const frameFor = (e, cls, badge) => {
    const f = document.createElement('div');
    f.className = cls;
    f.style.setProperty('--el', e.color);
    f.style.setProperty('--el-ink', inkFor(e.color));
    f.innerHTML = `<div class="el-head"><span class="el-badge">${badge}</span><span class="warn-count" hidden></span></div>`;
    return f;
  };
  const divider = (op, small) => {
    const d = document.createElement('div');
    d.className = 'op-divider' + (small ? ' small' : '') + (op === 'NOT' ? ' not' : op === 'OR' ? ' or' : '');
    d.textContent = op;
    return d;
  };
  const showCount = (frame, n) => {
    if (!frame || !n) return;
    const wc = qs(frame, ':scope > .el-head .warn-count');
    wc.textContent = n === 1 ? '1 warning' : n + ' warnings'; wc.hidden = false;
  };
  st.mn.elements.forEach((e, i) => {
    const field = qs(root, `.field[data-i="${i}"]`);
    const split = isSplit(st, i);
    const concepts = conceptsOf(st, i);
    const filled = concepts.filter(c => c.v.trim());
    let letterFrame = null, inner = 0;
    if (e.include && filled.length) {
      if (shown > 0) blocks.appendChild(divider(e.op));
      letterFrame = frameFor(e, 'el-frame', `${escapeHtml(e.key)} · ${escapeHtml(e.label)}`);
      blocks.appendChild(letterFrame);
      shown++;
    }
    const warns = new Set();
    concepts.forEach(c => {
      const box = qs(field, `.cbox[data-s="${c.s}"]`);
      const ta = qs(box, 'textarea'), warnsEl = qs(box, ':scope > .warns'), noticeEl = qs(box, ':scope > .notice');
      const clearBtn = c.s ? qs(box, '.clear-field') : qs(field, '.field-head .clear-field');
      clearBtn.hidden = !c.v.trim();
      const raw = c.v;
      if (!raw.trim()) { warnsEl.hidden = true; noticeEl.hidden = true; return; }

      // Where the visualisation goes: straight in the letter frame, or in a sub-frame per concept.
      let target = document.createElement('div'), frame = null;
      if (letterFrame) {
        const ms = document.createElement('div');
        ms.className = 'medsyntax';
        target = document.createElement('div');
        target.className = 'medsyntax-target';
        target.id = `${oid}-ms${i}` + (c.s ? '-' + c.s : '');
        ms.appendChild(target);
        if (split) {
          if (inner > 0) letterFrame.appendChild(divider(c.op, true));
          frame = frameFor(e, 'sub-frame', escapeHtml(c.name.trim() || 'Concept ' + (c.s + 1)));
          frame.appendChild(ms);
          letterFrame.appendChild(frame);
        } else {
          frame = letterFrame;
          letterFrame.appendChild(ms);
        }
        inner++;
      }
      const res = runMedsyntax(raw, target, letterFrame ? {
        onCommit: v => { setBox(st, i, c.s, v); ta.value = v; refresh(root, oid, st); },
        onCancel: () => refresh(root, oid, st)
      } : {});
      res.warnings.forEach(w => warns.add(w));

      if (res.str !== raw) {
        const pos = ta.selectionStart, active = document.activeElement === ta;
        ta.value = res.str; setBox(st, i, c.s, res.str);
        if (active) { const p = Math.min(pos + (res.str.length - raw.length), res.str.length); ta.setSelectionRange(p, p); }
      }
      if (res.notices.length) { noticeEl.textContent = res.notices.join(' '); noticeEl.hidden = false; } else if (noticeEl.dataset.keep !== '1') { noticeEl.hidden = true; }
      if (res.notices.length) { noticeEl.dataset.keep = '1'; setTimeout(() => { noticeEl.dataset.keep = ''; }, 6000); }
      warnsEl.innerHTML = res.warnings.map(w => `<li><span class="warn-head">${escText(WARN_TEXT[w])}</span>${detailHTML(res.details[w])}</li>`).join('');
      warnsEl.hidden = !res.warnings.length;
      showCount(frame, res.warnings.length);
    });
    perEl.push(filled.length ? { warnings: [...warns] } : null);
  });
  if (!shown) blocks.innerHTML = '<p class="empty">Fill in a box above to see the medsyntax visualisation.</p>';

  // Whole query: same parser, all warnings in one summary.
  const q = compile(st);
  const full = qs(root, '.full-query');
  full.textContent = q || 'The full query will be output here.';
  full.classList.toggle('empty', !q);
  const lines = searchLines(st);
  qs(root, '.lines-wrap').innerHTML = lines.length ? linesTableHTML(lines) : '<p class="empty">Fill in a box above to see the search line by line.</p>';
  const g = qs(root, '.global');
  if (!q) { g.innerHTML = ''; }
  else {
    const gr = runMedsyntax(q, document.createElement('div'));
    if (!gr.warnings.length) g.innerHTML = '<p class="global-ok">No syntax problems found in the full query</p>';
    else {
      g.innerHTML = `<p class="global-bad">${gr.warnings.length} ${gr.warnings.length === 1 ? 'problem' : 'problems'} in the full query</p>
        <ul class="global-list">${gr.warnings.map(w => {
          const where = st.mn.elements.filter((e, i) => perEl[i] && perEl[i].warnings.includes(w));
          return `<li>${escText(WARN_TEXT[w])}${where.length ? '<span class="letters">' + where.map(e => `<span style="${elStyle(e.color)}" title="${escapeHtml(e.label)}">${escapeHtml(e.key)}</span>`).join('') + '</span>' : ''}</li>`;
        }).join('')}</ul>`;
    }
  }
  syncUrl(oid, st);
}

// Extra line under a bracket warning: counts, plus the query text with the bracket highlighted.
function detailHTML(d) {
  if (!d) return '';
  const more = d.count > 1 ? ` (${d.count} places; the first one is shown)` : '';
  // Show lone bracket symbols in the sentence as small code chips, so "3 opening [ but 2 closing ]" reads clearly.
  const sym = t => escText(t).replace(/(^|\s)([\[\]()])(?=[\s,.:]|$)/g, '$1<code class="sym">$2</code>');
  const where = `${sym(d.text)}${more} <code class="warn-at">${escText(d.at.pre)}<mark>${escText(d.at.ch)}</mark>${escText(d.at.post)}</code>${d.fix ? ` <span class="warn-fix">${sym(d.fix)}</span>` : ''}`;
  // Bracket warnings: the counts are the main message; where and how to fix sit behind "Show where".
  if (d.lead) return `<span class="warn-lead">${sym(d.lead)}</span><details class="warn-more"><summary>Show where</summary><span class="warn-detail">${where}</span></details>`;
  return `<span class="warn-detail">${where}</span>`;
}

let urlTimer;
function syncUrl(oid, st) {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => { try { history.replaceState(null, '', buildLink(oid, st)); } catch (e) { /* not allowed here */ } }, 400);
}

// ---------------- Builder: create or edit a mnemonic ----------------
function lettersToElements(txt) {
  txt = txt.trim();
  const keys = /[\s,;·]/.test(txt) ? txt.split(/[\s,;·]+/).filter(Boolean) : Array.from(txt);
  return keys.map((k, i) => E(k.toUpperCase() === k ? k : k, '', '', i));
}
function libraryOptions(selected) {
  const mine = allMine();
  return `<optgroup label="Library">${LIBRARY.map(m => `<option value="${m.id}" ${m.id === selected ? 'selected' : ''}>${m.name}: ${escapeHtml(m.useFor)}</option>`).join('')}</optgroup>
    <optgroup label="My mnemonics">${mine.map(m => `<option value="${escapeHtml(m.id)}" ${m.id === selected ? 'selected' : ''}>${escapeHtml(m.name)}${m.useFor ? ': ' + escapeHtml(m.useFor) : ''}</option>`).join('')}</optgroup>`;
}

function renderBuilder(root, draft, handlers) {
  const els = draft.elements;
  root.innerHTML = `
  <div class="panel builder">
    <div class="panel-head"><h3>${escapeHtml(handlers.title || 'Create your own mnemonic')}</h3>
    <button type="button" class="btn icon small" data-act="cancel" aria-label="Close">✕</button></div>
    <div><p class="sub">${handlers.sub || 'Type the letters of your mnemonic, then say what each letter stands for. Use spaces for parts longer than one letter, for example <code>S PI D E R</code>.'}</p></div>
    <div class="b-top">
      <label class="grow">Letters<input type="text" data-b="letters" placeholder="e.g. PEST or S PI D E R" value=""></label>
      <button type="button" class="btn" data-act="letters">Make elements</button>
      <label class="grow">Or start from<select data-b="from"><option value="">Choose a mnemonic…</option>${libraryOptions('')}</select></label>
    </div>
    <div class="b-top">
      <label class="grow">Name<input type="text" data-b="name" value="${escapeHtml(draft.name)}" placeholder="e.g. PEST"></label>
      <label class="grow">Use for (optional)<input type="text" data-b="useFor" value="${escapeHtml(draft.useFor || '')}" placeholder="e.g. Questions about patient education"></label>
    </div>
    <div class="brows">
      ${els.length ? `<div class="brow head"><span>Letter</span><span>Stands for</span><span>Hint (optional)</span><span>Colour</span><span>Combine</span><span>In search</span><span></span></div>` : '<p class="sub">No elements yet. Type letters above, start from a mnemonic, or add an element.</p>'}
      ${els.map((e, i) => `
      <div class="brow" data-i="${i}" style="${elStyle(e.color)}">
        <input class="k" type="text" data-f="key" value="${escapeHtml(e.key)}" aria-label="Letter ${i + 1}">
        <input type="text" data-f="label" value="${escapeHtml(e.label)}" placeholder="What does ${escapeHtml(e.key || 'this')} stand for?" aria-label="Stands for">
        <input class="h" type="text" data-f="hint" value="${escapeHtml(e.hint || '')}" placeholder="Question that helps users fill it in" aria-label="Hint">
        <input type="color" data-f="color" value="${escapeHtml(e.color)}" aria-label="Colour">
        <select class="op" data-f="op" aria-label="Combine with"><option value="AND" ${e.op === 'AND' ? 'selected' : ''}>AND</option><option value="NOT" ${e.op === 'NOT' ? 'selected' : ''}>NOT</option></select>
        <label class="inc"><input type="checkbox" data-f="include" ${e.include ? 'checked' : ''} aria-label="Include in search"></label>
        <span class="mv"><button type="button" class="btn icon small" data-act="up" aria-label="Move up">↑</button><button type="button" class="btn icon small" data-act="down" aria-label="Move down">↓</button><button type="button" class="btn icon small" data-act="del" aria-label="Remove">✕</button></span>
      </div>`).join('')}
    </div>
    <div class="btn-row"><button type="button" class="btn small" data-act="add">+ Add element</button></div>
    <p class="err" hidden></p>
    <div class="btn-row">
      ${handlers.saveFirst
        ? '<button type="button" class="btn primary" data-act="save">Save to My mnemonics</button><button type="button" class="btn" data-act="use">Use without saving</button>'
        : '<button type="button" class="btn primary" data-act="use">Use this mnemonic</button><button type="button" class="btn" data-act="save">Save to My mnemonics</button>'}
      <button type="button" class="btn" data-act="json">Copy as JSON</button>
      <button type="button" class="btn" data-act="import">Import JSON…</button>
      <button type="button" class="btn ghost" data-act="cancel">Cancel</button>
    </div>
    <div class="import" hidden>
      <label for="imp-${handlers.oid}" class="sub">Paste a mnemonic that a colleague copied as JSON:</label>
      <textarea id="imp-${handlers.oid}"></textarea>
      <div class="btn-row"><button type="button" class="btn small" data-act="doimport">Import</button></div>
    </div>
  </div>`;

  root.onkeydown = e => { if (e.key === 'Escape') { e.preventDefault(); handlers.onCancel(); } };
  const err = qs(root, '.err');
  const showErr = m => { err.textContent = m; err.hidden = !m; };
  const rerender = () => renderBuilder(root, draft, handlers);

  root.oninput = e => {
    const t = e.target;
    if (t.dataset.b === 'name') draft.name = t.value;
    if (t.dataset.b === 'useFor') draft.useFor = t.value;
    const row = t.closest('.brow');
    if (row && t.dataset.f) {
      const el = draft.elements[+row.dataset.i];
      if (t.dataset.f === 'include') el.include = t.checked;
      else el[t.dataset.f] = t.value;
      if (t.dataset.f === 'color') row.style.setProperty('--el', t.value);
    }
  };
  root.onchange = e => {
    const t = e.target;
    if (t.dataset.b === 'from' && t.value) {
      const m = clone(findMn(t.value));
      draft.elements = m.elements; draft.name = m.custom ? m.name : m.name + ' (custom)'; draft.useFor = m.useFor; rerender();
    }
  };
  root.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const act = b.dataset.act;
    const row = b.closest('.brow'); const i = row ? +row.dataset.i : -1;
    const els = draft.elements;
    if (act === 'letters') {
      const txt = qs(root, '[data-b="letters"]').value;
      if (!txt.trim()) return showErr('Type the letters of your mnemonic first, for example PEST.');
      draft.elements = lettersToElements(txt);
      if (!draft.name) draft.name = txt.replace(/[\s,;·]+/g, '');
      rerender();
    }
    if (act === 'add') { els.push(E('', '', '', els.length)); rerender(); }
    if (act === 'up' && i > 0) { [els[i - 1], els[i]] = [els[i], els[i - 1]]; rerender(); }
    if (act === 'down' && i < els.length - 1) { [els[i + 1], els[i]] = [els[i], els[i + 1]]; rerender(); }
    if (act === 'del') { els.splice(i, 1); rerender(); }
    if (act === 'use' || act === 'save') {
      const m = finalizeDraft(draft);
      if (typeof m === 'string') return showErr(m);
      if (act === 'save') {
        const list = loadMine().filter(x => x.name !== m.name); list.push(m);
        toast(saveMine(list) ? m.name + ' saved to My mnemonics in this browser' : 'Could not save in this browser. Use Copy as JSON to keep it.');
      }
      handlers.onUse(m);
    }
    if (act === 'json') {
      const m = finalizeDraft(draft);
      if (typeof m === 'string') return showErr(m);
      copyText(JSON.stringify(m, null, 2), 'Mnemonic copied as JSON', qs(root, '.import textarea'));
    }
    if (act === 'import') { qs(root, '.import').hidden = false; qs(root, '.import textarea').focus(); }
    if (act === 'doimport') {
      const m = parseMnemonicJSON(qs(root, '.import textarea').value);
      if (typeof m === 'string') return showErr(m);
      Object.assign(draft, m); rerender(); toast('Imported ' + m.name);
    }
    if (act === 'cancel') handlers.onCancel();
  };
}
function finalizeDraft(d) {
  const els = d.elements.map((e, i) => ({ key: (e.key || '').trim(), label: (e.label || '').trim(), hint: (e.hint || '').trim(), color: e.color || col(i), op: e.op === 'NOT' ? 'NOT' : 'AND', include: e.include !== false }));
  if (!els.length) return 'Add at least one element.';
  const missing = els.findIndex(e => !e.key);
  if (missing >= 0) return 'Element ' + (missing + 1) + ' needs a letter.';
  els.forEach(e => { if (!e.label) e.label = e.key; });
  const name = (d.name || els.map(e => e.key).join('')).trim();
  return { id: 'my:' + name, name, useFor: (d.useFor || '').trim(), custom: true, elements: els };
}
function parseMnemonicJSON(txt) {
  try {
    const o = JSON.parse(txt);
    if (!o || !Array.isArray(o.elements) || !o.elements.length) return 'This JSON has no "elements" list.';
    const m = finalizeDraft({ name: o.name, useFor: o.useFor, elements: o.elements.map((e, i) => Object.assign(E('', '', '', i), e)) });
    return m;
  } catch (e) { return 'This is not valid JSON. Copy the whole text, including the first { and last }.'; }
}

// =====================================================================
// Page flow: step 1 choose a framework (cards), step 2 build the search
// =====================================================================
const OID = 'f';

function cardHTML(m) {
  return `<button type="button" class="card" data-id="${escapeHtml(m.id)}">
    <span class="cname">${escapeHtml(m.name)}${m.id === EXAMPLE_CUSTOM.id ? ' <span class="tag">example</span>' : ''}</span>${lettersHTML(m)}
    <span class="cfull">${escText(fullName(m))}</span>
    <span class="cuse">${escText(m.useFor || '')}</span></button>`;
}

function renderSteps() {
  const ol = document.getElementById('steps');
  const edit = S.step === 'edit';
  ol.innerHTML = `
    <li aria-current="${edit ? 'false' : 'step'}">${edit
      ? '<button type="button" class="step-link" data-act="change"><span class="num">1</span>Choose a framework</button>'
      : '<span class="num">1</span>Choose a framework'}</li>
    <li aria-current="${edit ? 'step' : 'false'}"><span class="num">2</span>Build your search</li>`;
  ol.onclick = e => { if (e.target.closest('[data-act="change"]')) { S.step = 'pick'; renderApp(); } };
}

// Refresh the letter badges in the framework bar after adding or removing a concept.
function updateFwBar(st) {
  const old = document.querySelector('.fw-bar .letters');
  if (old) old.outerHTML = lettersHTML(st.mn);
}

// Turn named concept blocks into a mnemonic draft: the first letter of each name becomes its letter.
function draftFromConcepts(mn) {
  const els = mn.elements.map((e, i) => {
    const named = !/^Concept \d+$/.test(e.label) && e.label.trim();
    return Object.assign(clone(e), {
      key: named ? e.label.trim()[0].toUpperCase() : String.fromCharCode(65 + i % 26),
      label: named ? e.label.trim() : '', hint: '' });
  });
  return { id: '', name: els.map(e => e.key).join(''), useFor: '', custom: true, elements: els };
}

// ---- Manage My mnemonics: rename and delete (step 1) ----
// A saved card gets an actions row. The LSI example is built in, so it has none.
function myCardHTML(m, manage) {
  if (m.id === EXAMPLE_CUSTOM.id) return cardHTML(m);
  const id = escapeHtml(m.id), name = escapeHtml(m.name);
  const mode = manage && manage.id === m.id ? manage.mode : null;
  let row;
  if (mode === 'delete') {
    row = `<span class="confirm-text">Delete ${name}? This can't be undone.</span>
      <button type="button" class="btn small danger" data-mng="confirm-delete" data-mid="${id}">Delete</button>
      <button type="button" class="btn small ghost" data-mng="cancel" data-mid="${id}">Cancel</button>`;
  } else if (mode === 'rename') {
    row = `<input type="text" class="rename-input" value="${name}" aria-label="New name for ${name}">
      <button type="button" class="btn small" data-mng="save-name" data-mid="${id}">Save</button>
      <button type="button" class="btn small ghost" data-mng="cancel" data-mid="${id}">Cancel</button>
      ${manage.error ? `<span class="manage-error" role="alert">${escText(manage.error)}</span>` : ''}`;
  } else {
    row = `<button type="button" class="btn small ghost" data-mng="rename" data-mid="${id}" aria-label="Rename ${name}">Rename</button>
      <button type="button" class="btn small ghost" data-mng="delete" data-mid="${id}" aria-label="Delete ${name}">Delete</button>`;
  }
  return `<div class="card-wrap">${cardHTML(m)}<div class="card-actions">${row}</div></div>`;
}

// Only the saved copy changes. A search that is open in step 2 keeps its own copy of the mnemonic.
function manageMine(st, act, id, body) {
  const list = loadMine();
  const m = list.find(x => x.id === id);
  if (act === 'cancel' || !m) { st.manage = null; return renderApp(); }
  if (act === 'rename' || act === 'delete') { st.manage = { id, mode: act }; return renderApp(); }
  if (act === 'confirm-delete') {
    st.manage = null;
    toast(saveMine(list.filter(x => x.id !== id)) ? m.name + ' deleted from My mnemonics' : 'Could not change My mnemonics in this browser.');
    return renderApp();
  }
  if (act === 'save-name') {
    const name = (qs(body, '.rename-input').value || '').trim();
    let error = '';
    if (!name) error = 'Type a name.';
    else if ([...allMine().filter(x => x.id !== id), ...LIBRARY].some(x => x.name.toLowerCase() === name.toLowerCase())) {
      error = 'There is already a mnemonic called ' + name + '.';
    }
    if (error) { st.manage = { id, mode: 'rename', error }; return renderApp(); }
    const old = m.name;
    m.name = name; m.id = 'my:' + name;
    st.manage = null;
    toast(saveMine(list) ? old + ' renamed to ' + name : 'Could not change My mnemonics in this browser.');
    return renderApp();
  }
}

function renderApp() {
  const body = document.getElementById('app'), st = S;
  renderSteps();
  if (st.step !== 'pick') st.manage = null;
  if (st.step === 'pick') {
    const hasText = st.mn.elements.some((_, i) => conceptsOf(st, i).some(c => c.v.trim()));
    const mine = allMine();
    body.innerHTML = `
      <div class="pick-intro">
        <h2>Which framework fits your question?</h2>
        <p>Pick a mnemonic card to split your question into parts, or start without one and make your own concept blocks. You can save your blocks as a mnemonic later.</p>
        <div class="btn-row">
          <button type="button" class="btn primary" data-act="free">Start without a framework</button>
          ${hasText ? `<button type="button" class="btn ghost" data-act="back">Back to your ${st.mn.free ? '' : escapeHtml(st.mn.name) + ' '}search</button>` : ''}
        </div>
        ${hasText ? `<p class="hint">Picking a framework starts a new, empty search. Use <em>Back to your ${st.mn.free ? '' : escapeHtml(st.mn.name) + ' '}search</em> to keep working on this one.</p>` : ''}
      </div>
      <p class="section-label">Library</p>
      <div class="cards">${LIBRARY.map(cardHTML).join('')}</div>
      ${mine.length ? `<p class="section-label">My mnemonics</p><div class="cards">${mine.map(m => myCardHTML(m, st.manage)).join('')}</div>` : ''}`;
    const nameInput = qs(body, '.rename-input');
    if (nameInput) {
      nameInput.focus(); nameInput.select();
      nameInput.onkeydown = e => {
        if (e.key === 'Enter') { e.preventDefault(); qs(body, '[data-mng="save-name"]').click(); }
        if (e.key === 'Escape') { e.preventDefault(); st.manage = null; renderApp(); }
      };
    }
    body.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.mng) { manageMine(st, b.dataset.mng, b.dataset.mid, body); return; }
      if (b.dataset.id) { startMnemonic(st, findMn(b.dataset.id)); st.step = 'edit'; st.panel = null; renderApp(); window.scrollTo({ top: 0 }); }
      if (b.dataset.act === 'back') { st.step = 'edit'; st.panel = null; renderApp(); }
      if (b.dataset.act === 'free') { if (!st.mn.free) startFree(st); st.step = 'edit'; st.panel = null; renderApp(); window.scrollTo({ top: 0 }); }
    };
  } else {
    const free = !!st.mn.free;
    body.innerHTML = `
      <div class="fw-bar">${lettersHTML(st.mn)}<span class="fwname">${escapeHtml(st.mn.name)}</span>
        <span class="usefor">${escText(free ? 'Your own concept blocks. Name them, combine them with AND, OR or NOT, and add as many as you need.' : (st.mn.useFor || fullName(st.mn)))}</span>
        <span class="btn-row">
          ${free
            ? `<button type="button" class="btn small" data-act="save-mn" aria-expanded="${st.panel === 'save-mn'}">${st.panel === 'save-mn' ? 'Close' : 'Save as mnemonic'}</button>`
            : `<button type="button" class="btn small" data-act="edit-mn" aria-expanded="${st.panel === 'edit-mn'}">${st.panel === 'edit-mn' ? 'Close' : 'Edit ' + escapeHtml(st.mn.name)}</button>`}
          <button type="button" class="btn small" data-act="change">${free ? 'Choose a framework' : 'Change framework'}</button>
        </span></div>
      <div class="edit-panel"></div>
      <div class="search-editor"></div>`;
    const panel = qs(body, '.edit-panel');
    const close = m => { if (m) setMnemonic(st, m); st.panel = null; renderApp(); };
    if (st.panel === 'edit-mn') renderBuilder(panel, st.draft, { oid: OID, title: 'Edit ' + st.mn.name, onUse: close, onCancel: () => close(null) });
    if (st.panel === 'save-mn') renderBuilder(panel, st.draft, { oid: OID, title: 'Save your concept blocks as a mnemonic', saveFirst: true,
      sub: 'Each concept gets a letter: the first letter of its name. Change the letters, the name of the mnemonic or the hints, then save it. It appears under <em>My mnemonics</em> in step 1.',
      onUse: close, onCancel: () => close(null) });
    body.onclick = e => {
      const b = e.target.closest('button'); if (!b || panel.contains(b)) return;
      if (b.dataset.act === 'change') { st.step = 'pick'; st.panel = null; renderApp(); }
      // The same button opens and closes the panel.
      if ((b.dataset.act === 'edit-mn' || b.dataset.act === 'save-mn') && st.panel === b.dataset.act) { close(null); return; }
      if (b.dataset.act === 'edit-mn') {
        const d = clone(st.mn);
        if (!d.custom) d.name = d.name + ' (custom)';
        st.draft = d; st.panel = 'edit-mn'; renderApp();
      }
      if (b.dataset.act === 'save-mn') { st.draft = draftFromConcepts(st.mn); st.panel = 'save-mn'; renderApp(); }
    };
    renderEditor(qs(body, '.search-editor'), OID, st);
  }
}

// =====================================================================
// Display toggle and start-up (shared links open straight in step 2)
// =====================================================================
qsa(document, 'input[name="disp"]').forEach(r => r.addEventListener('change', () => {
  document.documentElement.classList.toggle('greyscale', r.value === 'grey' && r.checked);
}));

(function boot() {
  const s = new URLSearchParams(location.search).get('s');
  if (s) {
    const u = unpackState(s);
    if (u) { Object.assign(S, u.st); S.step = 'edit'; }
  }
  renderApp();
})();
