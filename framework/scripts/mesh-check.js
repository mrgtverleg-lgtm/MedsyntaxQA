// MeSH check (Medsyntax Framework)
// MeSH terms in the step 2 boxes become links. A click opens the descriptor record on NCBI MeSH;
// Alt+click (Option+click on a Mac) places the cursor so you can type in the term.
// Every PubMed MeSH term is checked against the NLM MeSH API (id.nlm.nih.gov): found, entry term,
// replaced, deleted or not found with "Did you mean" suggestions. Ovid, EBSCO and Cochrane notations
// stay plain text: they are not links and are not checked.
// Requirements: Documentatie/Requirements Open MeSH-termpagina vanuit zoekterm.docx.
// The parser block (marked PARSER START/END below, with dashes) is copied unchanged from Documentatie/mesh-prototype.html.
// License: GNU GPL v3.0
(function () {
'use strict';

// PARSER-START
// ---------------------------------------------------------------------------
// Parser (FR-3). Pure functions, no DOM, so they can be tested on their own.
// ---------------------------------------------------------------------------
const OVID_SUBHEADINGS = {
  ab: 'abnormalities', ad: 'administration & dosage', ae: 'adverse effects', ag: 'agonists',
  an: 'analysis', ai: 'antagonists & inhibitors', bl: 'blood', bs: 'blood supply',
  ch: 'chemistry', ci: 'chemically induced', cl: 'classification', co: 'complications',
  cn: 'congenital', dg: 'diagnostic imaging', di: 'diagnosis', de: 'drug effects',
  dt: 'drug therapy', ec: 'economics', ed: 'education', eh: 'ethnology', ep: 'epidemiology',
  es: 'ethics', et: 'etiology', ge: 'genetics', hi: 'history', im: 'immunology',
  is: 'isolation & purification', lj: 'legislation & jurisprudence', me: 'metabolism',
  mi: 'microbiology', mo: 'mortality', mt: 'methods', nu: 'nursing',
  og: 'organization & administration', pa: 'pathology', pc: 'prevention & control',
  ph: 'physiology', pp: 'physiopathology', ps: 'parasitology', px: 'psychology',
  rh: 'rehabilitation', rt: 'radiotherapy', sn: 'statistics & numerical data', su: 'surgery',
  th: 'therapy', tu: 'therapeutic use', ul: 'ultrastructure', ur: 'urine', ut: 'utilization',
  vi: 'virology'
};

// Start of the term that ends at the end of `seg`: everything after the last
// delimiter (bracket, quote, Boolean operator or Ovid line number).
function boundaryStart(seg) {
  let b = 0;
  const re = /[()\[\]"]|\b(?:and|or|not)\b|^\s*\d+\.(?=\s)/gi;
  let m;
  while ((m = re.exec(seg))) b = m.index + m[0].length;
  return b;
}

function overlaps(taken, a, b) {
  return taken.some(([x, y]) => a < y && b > x);
}

// Build a term from raw content at absolute offset `contentStart`.
// Content may hold "Label/subheading". Returns null when the label is empty.
function makeTerm(content, contentStart, extra) {
  let label = content, sub = extra.subheading || null;
  const slash = content.indexOf('/');
  if (slash >= 0) {
    label = content.slice(0, slash);
    const s = content.slice(slash + 1).trim();
    if (s) sub = s;
  }
  const lead = label.length - label.trimStart().length;
  label = label.trim();
  if (!label || !/[a-z]/i.test(label)) return null;
  const start = contentStart + lead;
  return {
    start, end: start + label.length, label, subheading: sub,
    explode: !!extra.explode, major: !!extra.major, candidate: !!extra.candidate, dialect: extra.dialect
  };
}

// Parse one line. `offset` is the absolute position of the line in the whole text.
function parseLine(line, offset = 0) {
  const terms = [], taken = [];
  const add = (t, a, b) => { if (t && !overlaps(taken, a, b)) { terms.push(t); taken.push([a, b]); } };
  let m;

  // Cochrane: [mh "Term"], [mh ^"Term"], [mh Term]
  const reCoch = /\[mh\s+(\^)?\s*(?:"([^"]*)"|([^\]"]+))\s*\]/gi;
  while ((m = reCoch.exec(line))) {
    const content = m[2] !== undefined ? m[2] : m[3];
    const cStart = m.index + m[0].indexOf(content, 3);
    add(makeTerm(content, offset + cStart, { explode: true, major: !!m[1], dialect: 'Cochrane' }),
      m.index, m.index + m[0].length);
  }

  // Cochrane: MeSH descriptor: [Term] explode all trees [and with qualifier(s): [drug therapy - DT]]
  const reCochDesc = /MeSH descriptor:\s*\[([^\]]+)\](\s*explode all trees|\s*this term only)?(?:\s*and with qualifiers?\(s\)?:\s*\[([^\]]+)\])?/gi;
  while ((m = reCochDesc.exec(line))) {
    const cStart = m.index + m[0].indexOf('[') + 1;
    const sub = m[3] ? m[3].replace(/\s*-\s*[A-Z]{2}\s*$/i, '').trim() : null;
    add(makeTerm(m[1], offset + cStart, {
      explode: !!(m[2] && /explode/i.test(m[2])), subheading: sub, dialect: 'Cochrane'
    }), m.index, m.index + m[0].length);
  }

  // PubMed: Term[Mesh], "Term"[mh:noexp], "Term/sub"[Majr], ...
  const rePub = /\[(mesh terms|mesh major topic|mesh|mh|majr)(:noexp)?\]/gi;
  while ((m = rePub.exec(line))) {
    const tagStart = m.index;
    let i = tagStart;
    while (i > 0 && line[i - 1] === ' ') i--;
    let cStart, cEnd;
    if (line[i - 1] === '"') {
      const open = line.lastIndexOf('"', i - 2);
      if (open < 0) continue;
      cStart = open + 1; cEnd = i - 1;
    } else {
      cStart = boundaryStart(line.slice(0, i)); cEnd = i;
    }
    const content = line.slice(cStart, cEnd);
    const tag = m[1].toLowerCase();
    const major = tag === 'majr' || tag === 'mesh major topic';
    add(makeTerm(content, offset + cStart, { explode: !m[2], major, dialect: 'PubMed' }),
      Math.min(cStart, tagStart), tagStart + m[0].length);
  }

  // EBSCO: MH "Term", MH "Term+", MM "Term"  (candidate: also CINAHL Headings)
  const reEbscoQ = /(^|[\s(])(MH|MM)\s+"([^"]*?)(\+)?"/gi;
  const reEbscoU = /(^|[\s(])(MH|MM)\s+([^\s"()][^"()]*?)(\+)?(?=\s+(?:AND|OR|NOT)\b|\s*\)|\s*$)/g; // unquoted: uppercase tag only
  for (const re of [reEbscoQ, reEbscoU]) {
    while ((m = re.exec(line))) {
      const s = m.index + m[1].length;
      const cStart = s + m[0].slice(m[1].length).indexOf(m[3], m[2].length);
      add(makeTerm(m[3], offset + cStart, {
        explode: !!m[4], major: m[2].toUpperCase() === 'MM', candidate: true, dialect: 'EBSCO'
      }), s, m.index + m[0].length);
    }
  }

  // Ovid: Term/, exp Term/, *Term/, exp *Term/, Term/dt, Term/dt,th  (candidate: also Emtree in Ovid Embase)
  const ovid = (endIdx, matchEnd, subCodes) => {
    const seg = line.slice(0, endIdx);
    let s = boundaryStart(seg);
    let raw = seg.slice(s);
    if (/['"]\s*$/.test(raw) || /^\s*'/.test(raw)) return; // Embase.com 'term'/exp
    let explode = false, major = false;
    const pre = raw.match(/^\s*(exp\s+)?(\*)?\s*/i);
    if (pre) { explode = !!pre[1]; major = !!pre[2]; s += pre[0].length; raw = raw.slice(pre[0].length); }
    let sub = null;
    if (subCodes) {
      sub = subCodes.split(/\s*,\s*/).map(c => OVID_SUBHEADINGS[c.toLowerCase()] || c).join(', ');
    }
    add(makeTerm(raw, offset + s, { explode, major, subheading: sub, candidate: true, dialect: 'Ovid' }),
      s, matchEnd);
  };
  const reOvid = /\/([a-z]{2}(?:\s*,\s*[a-z]{2})*)?(?=$|[\s)]|\.(?:\s|$))/gi;
  while ((m = reOvid.exec(line))) {
    if (overlaps(taken, m.index, m.index + 1)) continue;
    ovid(m.index, m.index + m[0].length, m[1]);
  }
  const reSh = /\.sh\./gi;
  while ((m = reSh.exec(line))) {
    if (overlaps(taken, m.index, m.index + 1)) continue;
    ovid(m.index, m.index + m[0].length, null);
  }

  return terms.sort((a, b) => a.start - b.start);
}

function parseText(text) {
  const out = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    out.push(...parseLine(line, offset));
    offset += line.length + 1;
  }
  return out;
}

function normLabel(label) {
  return label.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Optimal string alignment distance (Levenshtein + adjacent transpositions).
function osaDistance(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => { const r = new Array(n + 1).fill(0); r[0] = i; return r; });
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

function pubmedSyntax(label, t) {
  const tag = t && t.major ? 'Majr' : 'Mesh';
  const sub = t && t.subheading && !/,/.test(t.subheading) ? '/' + t.subheading : '';
  const noexp = t && !t.explode ? ':noexp' : '';
  return `"${label}${sub}"[${tag}${noexp}]`;
}

if (typeof module !== 'undefined') module.exports = { parseLine, parseText, osaDistance, normLabel, pubmedSyntax };
// PARSER-END

// ---------------------------------------------------------------------------
// Checking against the NLM MeSH API (FR-4 to FR-9, NFR-4)
// ---------------------------------------------------------------------------
// ?meshapi=<base> points the check at another address (only for testing).
const API = (function () {
  try { return new URLSearchParams(location.search).get('meshapi') || 'https://id.nlm.nih.gov/mesh'; } catch (e) { return 'https://id.nlm.nih.gov/mesh'; }
})();
const TIMEOUT_MS = 2000;      // FR-8: after 2 s the check counts as "not available"
const MAX_CONCURRENT = 4;     // NFR-4: never more than 4 requests at a time
const DEBOUNCE_MS = 600;      // check after typing has stopped
const CACHE_KEY = 'medsyntax.meshCache.v1';

const cache = new Map();       // normalised label -> result (only results that were really established)
const inflight = new Map();    // normalised label -> Promise<result>
const lastFailure = new Map(); // normalised label -> last "unavailable" result (not cached: tried again later)
let active = 0;
const waiting = [];
let blocked = false;           // fetch is not allowed here (claude.ai Artifact), so don't keep trying


// The cache survives a reload in the same tab, so a reload doesn't check everything again.
try {
  const saved = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '[]');
  if (Array.isArray(saved)) saved.forEach(([k, v]) => { if (k && v && v.status) cache.set(k, v); });
} catch (e) { /* storage blocked */ }
let saveTimer;
function saveCache() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { sessionStorage.setItem(CACHE_KEY, JSON.stringify([...cache].slice(-500))); } catch (e) { /* storage blocked or full */ } }, 500);
}

function schedule(fn) {
  return new Promise((resolve, reject) => {
    const run = () => {
      active++;
      fn().then(resolve, reject).finally(() => { active--; const next = waiting.shift(); if (next) next(); });
    };
    active < MAX_CONCURRENT ? run() : waiting.push(run);
  });
}

function getJSON(url, timeout) {
  return schedule(async () => {
    if (blocked) throw new Error('blocked');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout || TIMEOUT_MS);
    try {
      const r = await fetch(url, { signal: ctrl.signal, credentials: 'omit' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(timer); }
  });
}
// A Content Security Policy that blocks the API (claude.ai Artifact) also says so straight away.
document.addEventListener('securitypolicyviolation', e => {
  try { if (String(e.blockedURI || '').indexOf(new URL(API).host) >= 0) { blocked = true; redrawSoon(); } } catch (err) { /* ignore */ }
});

const uiFrom = uri => String(uri).split('/').pop();
const sparql = (q, timeout) => getJSON(`${API}/sparql?format=JSON&query=${encodeURIComponent(q)}`, timeout);
const PREFIXES = `PREFIX meshv: <http://id.nlm.nih.gov/mesh/vocab#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
`;
const sparqlString = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"@en';

// Spellings to try for an exact label in SPARQL, which is case-sensitive: as typed, Title Case
// (with and without small words in lower case), first letter only, lower case.
function labelVariants(label) {
  const small = /^(and|or|of|the|in|for|with|to|by|on|at|a|an)$/i;
  const words = label.split(' ');
  const title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const titleSmall = words.map((w, i) => (i && small.test(w.replace(/,$/, '')) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(' ');
  const first = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  return [...new Set([label, title, titleSmall, first, label.toLowerCase()])];
}

// FR-5: an entry term and the descriptor it belongs to.
async function entryTerm(label) {
  const terms = await getJSON(`${API}/lookup/term?label=${encodeURIComponent(label)}&match=exact`);
  if (!terms.length) return null;
  const r = await sparql(`${PREFIXES}SELECT ?d ?dl FROM <http://id.nlm.nih.gov/mesh> WHERE {
  ?d meshv:concept|meshv:preferredConcept ?c .
  ?c meshv:term|meshv:preferredTerm <${terms[0].resource}> .
  ?d a meshv:TopicalDescriptor ; rdfs:label ?dl .
} LIMIT 1`);
  const b = r.results.bindings[0];
  return b ? { ui: uiFrom(b.d.value), label: b.dl.value } : null;
}

// FR-9: was this label a descriptor in an earlier MeSH year (2015 and later are online)?
// Returns the last year it was, its D-number, and what that D-number is called now.
async function history(label) {
  const r = await sparql(`${PREFIXES}SELECT ?g ?d ?cl ?ca WHERE {
  VALUES ?l { ${labelVariants(label).map(sparqlString).join(' ')} }
  GRAPH ?g { ?d a meshv:TopicalDescriptor ; rdfs:label ?l }
  BIND(IRI(REPLACE(STR(?d), "/[0-9]{4}/", "/")) AS ?cur)
  OPTIONAL { GRAPH <http://id.nlm.nih.gov/mesh> { ?cur rdfs:label ?cl . OPTIONAL { ?cur meshv:active ?ca } } }
}`);
  let best = null;
  r.results.bindings.forEach(b => {
    const y = /\/(\d{4})$/.exec(b.g.value);
    if (!y) return;
    const year = +y[1];
    if (!best || year > best.last) {
      best = { last: year, ui: uiFrom(b.d.value), current: b.cl ? b.cl.value : null, active: b.ca ? b.ca.value !== 'false' : true };
    }
  });
  return best;
}

// FR-6: up to 3 descriptors that look like the label (edit distance).
async function findSuggestions(label) {
  const words = label.toLowerCase().match(/[a-z]{3,}/g) || [];
  const prefixes = [...new Set(words.map(w => w.slice(0, 3)))].slice(0, 4);
  if (!prefixes.length) return [];
  try {
    const data = await sparql(`${PREFIXES}SELECT DISTINCT ?d ?l FROM <http://id.nlm.nih.gov/mesh> WHERE {
  ?d a meshv:TopicalDescriptor ; rdfs:label ?l .
  FILTER(REGEX(?l, "\\\\b(${prefixes.join('|')})", "i"))
} LIMIT 2000`, 5000);
    const target = normLabel(label);
    const max = Math.max(2, Math.floor(target.length * 0.3));
    return data.results.bindings
      .filter(b => !/^\[OBSOLETE\]/.test(b.l.value))
      .map(b => ({ ui: uiFrom(b.d.value), label: b.l.value, dist: osaDistance(target, b.l.value.toLowerCase()) }))
      .filter(s => s.dist <= max)
      .sort((a, b) => a.dist - b.dist || a.label.length - b.label.length)
      .slice(0, 3);
  } catch (e) { return []; }
}

async function doValidate(label) {
  const L = label.trim().replace(/\s+/g, ' ');
  // 1. Exact descriptor.
  const desc = await getJSON(`${API}/lookup/descriptor?label=${encodeURIComponent(L)}&match=exact`);
  if (desc.length) return { status: 'found', ui: uiFrom(desc[0].resource), label: desc[0].label };
  // 2. Entry term and history at the same time. A failed history check doesn't stop the rest.
  const [entry, hist] = await Promise.all([entryTerm(L), history(L).catch(() => null)]);
  // 3. Renamed, merged or deleted wins over "entry term" (FR-9): the strategy is out of date.
  if (hist) {
    const since = hist.last + 1;
    if (hist.current && hist.active && !/^\[OBSOLETE\]/.test(hist.current)) return { status: 'replaced', ui: hist.ui, label: hist.current, year: since };
    if (entry) return { status: 'replaced', ui: entry.ui, label: entry.label, year: since };
    return { status: 'removed', year: since };
  }
  if (entry) return { status: 'entry', ui: entry.ui, label: entry.label };
  // 4. Not found: suggestions. Existence is established, so this result is cached.
  return { status: 'notfound', suggestions: await findSuggestions(L) };
}

function validate(label) {
  const key = normLabel(label);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (inflight.has(key)) return inflight.get(key);
  if (blocked || navigator.onLine === false) {
    const res = { status: 'unavailable', blocked, offline: navigator.onLine === false };
    lastFailure.set(key, res);
    return Promise.resolve(res);
  }
  const p = doValidate(label)
    .then(res => { cache.set(key, res); lastFailure.delete(key); saveCache(); return res; })
    .catch(err => { // not cached: tried again after the next edit
      const res = { status: 'unavailable', blocked, offline: navigator.onLine === false };
      lastFailure.set(key, res);
      return res;
    })
    .finally(() => { inflight.delete(key); redrawSoon(); });
  inflight.set(key, p);
  redrawSoon();
  return p;
}

// Only PubMed syntax may open a page. Other notations (Ovid, EBSCO, Cochrane) only get a message (FR-10).
const isPubMed = t => t.dialect === 'PubMed';
function stateOf(label) {
  const key = normLabel(label);
  if (cache.has(key)) return cache.get(key);
  if (inflight.has(key)) return { status: 'pending' };
  if (blocked) return { status: 'unavailable', blocked: true };
  return lastFailure.get(key) || { status: 'pending' };
}
const termState = t => stateOf(t.label);

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------
// The NCBI MeSH id is "68" + the digits of the D-number (FR-7).
const ncbiId = ui => (/^D\d{6,9}$/.test(ui || '') ? '68' + ui.slice(1) : null);
const ncbiUrl = ui => { const id = ncbiId(ui); return id ? `https://www.ncbi.nlm.nih.gov/mesh/${id}` : null; };
const searchUrl = label => `https://www.ncbi.nlm.nih.gov/mesh/?term=${encodeURIComponent(label.trim())}`;
const pubmedUrl = q => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}`;

// ---------------------------------------------------------------------------
// Texts and icons
// ---------------------------------------------------------------------------
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICONS = {
  found: '<svg class="mico c-found" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  entry: '<svg class="mico c-entry" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 11v6M12 7.2v.1" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
  replaced: '<svg class="mico c-replaced" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l10 18H2z" fill="currentColor" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"/><path d="M12 9v5.5M12 17.4v.1" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
  notfound: '<svg class="mico c-notfound" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z" fill="currentColor"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
  unavailable: '<svg class="mico c-unavailable" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M7.5 12h9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  pending: '<svg class="mico c-pending" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="4 3"/></svg>'
};
ICONS.removed = ICONS.replaced.replace('c-replaced', 'c-removed');


function statusText(st) {
  switch (st.status) {
    case 'found': return 'MeSH term found';
    case 'entry': return `Entry term of: ${st.label}`;
    case 'replaced': return `Replaced by: ${st.label} (since MeSH ${st.year})`;
    case 'removed': return `Descriptor deleted in MeSH ${st.year}`;
    case 'notfound': return 'No exact MeSH term found';
    case 'unavailable': return st.blocked ? 'MeSH check not available in this version' : (st.offline ? 'Check not available (offline)' : 'Check not available');
    default: return 'Checking…';
  }
}
// Can a click open a page for this result?
const opens = st => ['found', 'entry', 'replaced', 'unavailable', 'pending'].includes(st.status);

// ---------------------------------------------------------------------------
// The link layer on top of a box (FR-1)
// ---------------------------------------------------------------------------
// The textarea keeps showing its own text. A layer with see-through text lies exactly on top of it
// and only draws the underline, the icon and the click areas of the MeSH terms.
const editors = new Set();
let lastRoot = null;

const COPY_STYLES = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'wordSpacing', 'tabSize', 'textIndent', 'textTransform',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'];
function syncBox(ed) {
  const cs = getComputedStyle(ed.ta), ls = ed.layer.style;
  COPY_STYLES.forEach(p => { ls[p] = cs[p]; });
  ls.width = ed.ta.offsetWidth + 'px';
  ls.height = ed.ta.offsetHeight + 'px';
  ls.top = ed.ta.offsetTop + 'px';
  ls.left = ed.ta.offsetLeft + 'px';
  ed.layer.scrollTop = ed.ta.scrollTop;
}

function draw(ed) {
  const text = ed.ta.value;
  // Only PubMed syntax becomes a link. Ovid, EBSCO and Cochrane notations stay plain text.
  ed.terms = parseText(text).filter(isPubMed);
  let html = '', pos = 0;
  ed.terms.forEach((t, i) => {
    const st = termState(t);
    html += esc(text.slice(pos, t.start));
    html += `<span class="mterm s-${st.status}" data-i="${i}">${esc(text.slice(t.start, t.end))}</span>`;
    pos = t.end;
  });
  ed.layer.innerHTML = html + esc(text.slice(pos)) + '\n';
  syncBox(ed);
  updateStatus(ed);
}

function attach(ta) {
  if (!ta || ta._mesh) return;
  const wrap = document.createElement('div');
  wrap.className = 'mesh-editor';
  ta.parentNode.insertBefore(wrap, ta);
  wrap.appendChild(ta);
  const layer = document.createElement('div');
  layer.className = 'mesh-layer';
  layer.setAttribute('aria-hidden', 'true');
  wrap.appendChild(layer);
  const status = document.createElement('div');
  status.className = 'mesh-status';
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  wrap.after(status);
  const notes = document.createElement('div');
  notes.className = 'mesh-notes';
  notes.setAttribute('aria-live', 'polite');
  status.after(notes);
  const ed = { ta, wrap, layer, status, notes, terms: [] };
  ta._mesh = ed;
  editors.add(ed);

  ta.addEventListener('input', () => { draw(ed); hideMenu(); checkSoon(); });
  ta.addEventListener('scroll', () => { layer.scrollTop = ta.scrollTop; });
  ta.addEventListener('focus', () => updateStatus(ed));
  ta.addEventListener('blur', () => setTimeout(() => { if (!status.contains(document.activeElement)) updateStatus(ed); }, 150));
  ta.addEventListener('keyup', () => updateStatus(ed));
  ta.addEventListener('click', () => updateStatus(ed));
  ta.addEventListener('keydown', e => {
    const i = termAtCaret(ed);
    if (i < 0) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); openTerm(ed, i); }
    else if ((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu') {
      e.preventDefault();
      const s = spanFor(ed, i), r = (s || ta).getBoundingClientRect();
      showMenu(ed, i, r.left, r.bottom + 4);
    }
  });
  ta.addEventListener('contextmenu', e => {
    // The menu key fires contextmenu on the textarea; a mouse right-click next to a term keeps the browser menu.
    if (e.button === 0 && e.clientX === 0 && e.clientY === 0 && termAtCaret(ed) >= 0) e.preventDefault();
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => syncBox(ed)).observe(ta);

  // Plain click on a term: open. Alt/Option+click: place the cursor (scenario 11).
  layer.addEventListener('mousedown', e => {
    if (!e.target.closest('.mterm') || e.button !== 0) return;
    e.preventDefault(); // keep the cursor and focus where they are (NFR-3)
    if (e.altKey) placeCaret(ed, e.clientX, e.clientY);
  });
  layer.addEventListener('click', e => {
    const s = e.target.closest('.mterm'); if (!s || e.altKey) return;
    e.preventDefault();
    hideMenu(); hideTip();
    openTerm(ed, +s.dataset.i);
  });
  layer.addEventListener('contextmenu', e => {
    const s = e.target.closest('.mterm'); if (!s) return;
    e.preventDefault();
    showMenu(ed, +s.dataset.i, e.clientX, e.clientY);
  });
  layer.addEventListener('mouseover', e => {
    const s = e.target.closest('.mterm'); if (!s) return;
    clearTimeout(tipHideTimer);
    showTip(ed, +s.dataset.i, s.getBoundingClientRect());
  });
  layer.addEventListener('mouseout', e => {
    if (!e.target.closest('.mterm')) return;
    tipHideTimer = setTimeout(hideTip, 150);
  });
  // The status line and the messages: Open buttons and suggestions.
  const onButton = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.open !== undefined) { const i = +b.dataset.open; if (ed.terms[i]) openTerm(ed, i); }
    if (b.dataset.menu !== undefined) { const i = +b.dataset.menu, r = b.getBoundingClientRect(); if (ed.terms[i]) showMenu(ed, i, r.left, r.bottom + 4); }
    if (b.dataset.ui) window.open(ncbiUrl(b.dataset.ui) || searchUrl(b.textContent), '_blank', 'noopener');
    if (b.classList.contains('mesh-x')) b.closest('.mesh-note').remove();
  };
  // Buttons in the status line keep the focus in the box, so the line doesn't disappear under the finger.
  status.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
  status.addEventListener('click', onButton);
  notes.addEventListener('click', onButton);

  draw(ed);
  checkSoon();
}

// Text offset in the layer (which mirrors the textarea) at a point on the screen.
function offsetAtPoint(ed, x, y) {
  let node, off;
  if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { node = p.offsetNode; off = p.offset; } }
  else if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (r) { node = r.startContainer; off = r.startOffset; } }
  if (!node || !ed.layer.contains(node)) return null;
  const walker = document.createTreeWalker(ed.layer, NodeFilter.SHOW_TEXT);
  let total = 0, n;
  while ((n = walker.nextNode())) { if (n === node) return total + off; total += n.length; }
  return null;
}
function placeCaret(ed, x, y) {
  const off = offsetAtPoint(ed, x, y);
  ed.ta.focus();
  if (off != null) ed.ta.setSelectionRange(off, off);
  updateStatus(ed);
}

// Alt/Option held: the links let clicks through to the box, so the cursor can be placed anywhere.
const setAlt = on => document.documentElement.classList.toggle('mesh-alt', on);
window.addEventListener('keydown', e => { if (e.key === 'Alt') setAlt(true); });
window.addEventListener('keyup', e => { if (e.key === 'Alt') setAlt(false); });
window.addEventListener('blur', () => setAlt(false));
window.addEventListener('mousemove', e => { if (document.documentElement.classList.contains('mesh-alt') !== e.altKey) setAlt(e.altKey); });
// Phones and tablets have no Alt key: a tap places the cursor, and the status line opens the page.
try {
  const coarse = matchMedia('(pointer: coarse)');
  const setTouch = () => document.documentElement.classList.toggle('mesh-touch', coarse.matches);
  setTouch();
  if (coarse.addEventListener) coarse.addEventListener('change', setTouch);
} catch (e) { /* old browser */ }

const spanFor = (ed, i) => ed.layer.querySelector(`.mterm[data-i="${i}"]`);
function termAtCaret(ed) {
  const p = ed.ta.selectionStart;
  if (p !== ed.ta.selectionEnd) return -1;
  return ed.terms.findIndex(t => p >= t.start && p <= t.end);
}

// The line under the box while the cursor is in a MeSH term (keyboard, phones, screen readers).
function updateStatus(ed) {
  const i = document.activeElement === ed.ta ? termAtCaret(ed) : -1;
  if (i < 0) { if (!ed.status.hidden) { ed.status.hidden = true; ed.status.innerHTML = ''; } return; }
  const t = ed.terms[i], st = termState(t);
  const touch = document.documentElement.classList.contains('mesh-touch');
  const what = statusText(st);
  const html = `${ICONS[st.status] || ICONS.pending}<span><b>${esc(t.label)}</b>: ${esc(what)}.</span>
    <button type="button" class="btn small" data-open="${i}">${opens(st) ? 'Open MeSH record' : 'Show message'}</button>
    <button type="button" class="btn small ghost" data-menu="${i}" aria-label="More actions for ${esc(t.label)}">⋯</button>
    ${touch ? '' : '<span class="mesh-keys"><kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Enter</kbd> opens · <kbd>Shift</kbd>+<kbd>F10</kbd> menu</span>'}`;
  if (ed.status.dataset.html !== html) { ed.status.innerHTML = html; ed.status.dataset.html = html; }
  ed.status.hidden = false;
}

// ---------------------------------------------------------------------------
// Hover card
// ---------------------------------------------------------------------------
let tip = null, tipFor = null, tipHideTimer = null;
function tipEl() {
  if (!tip) { tip = document.createElement('div'); tip.className = 'mesh-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip); }
  return tip;
}
function tipHTML(t) {
  const st = termState(t);
  let h = `<div class="mesh-tip-row">${ICONS[st.status] || ICONS.pending}<div><div class="mesh-tip-main">${esc(statusText(st))}</div>`;
  const ids = st.ui ? `${esc(st.ui)}${ncbiId(st.ui) ? ' · NCBI ' + ncbiId(st.ui) : ''}` : '';
  if (st.status === 'found') h += `<div class="mesh-tip-meta">${esc(st.label)} · ${ids}</div>`;
  if (st.status === 'entry' || st.status === 'replaced') h += `<div class="mesh-tip-meta">${ids}</div>`;
  if (st.status === 'notfound' && st.suggestions && st.suggestions.length) h += `<div>Did you mean: ${st.suggestions.map(s => `<b>${esc(s.label)}</b>`).join(', ')}?</div>`;
  if (st.status === 'unavailable' && st.blocked) h += '<div class="mesh-tip-meta">Open the GitHub Pages version to check terms. A click opens the NCBI MeSH search page.</div>';
  else if (st.status === 'unavailable') h += '<div class="mesh-tip-meta">A click opens the NCBI MeSH search page.</div>';
  h += '</div>';
  h += '</div>';
  {
    const bits = [];
    if (t.subheading) bits.push('subheading: ' + esc(t.subheading));
    bits.push(t.explode ? 'explode' : 'no explode');
    if (t.major) bits.push('major');
    h += `<div class="mesh-tip-meta">${bits.join(' · ')}</div>`;
  }
  h += `<div class="mesh-tip-hint">Click to open · <kbd>Alt</kbd>/<kbd>⌥</kbd>+click to edit · right-click for menu</div>`;
  return h;
}
function showTip(ed, i, rect) {
  const t = ed.terms[i]; if (!t || !rect) return;
  const el = tipEl();
  tipFor = { ed, i };
  el.innerHTML = tipHTML(t);
  el.hidden = false;
  const w = el.offsetWidth, h = el.offsetHeight;
  let top = rect.bottom + 6;
  if (top + h > window.innerHeight - 8) top = rect.top - h - 6;
  el.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8)) + 'px';
  el.style.top = Math.max(8, top) + 'px';
}
function hideTip() { tipFor = null; if (tip) tip.hidden = true; }

// ---------------------------------------------------------------------------
// Opening a record (FR-1, FR-7, FR-8, FR-10) and messages
// ---------------------------------------------------------------------------
function note(ed, html, cls) {
  const n = document.createElement('div');
  n.className = 'mesh-note ' + (cls || '');
  n.innerHTML = html + '<button type="button" class="mesh-x" aria-label="Close message">×</button>';
  ed.notes.prepend(n);
  while (ed.notes.children.length > 3) ed.notes.lastChild.remove();
}

function actOnResult(ed, t, st, win) {
  const go = url => { if (win) { try { win.location.href = url; return; } catch (e) { /* closed */ } } window.open(url, '_blank', 'noopener'); };
  switch (st.status) {
    case 'found': case 'entry': case 'replaced': return go(ncbiUrl(st.ui) || searchUrl(st.label || t.label));
    case 'unavailable': case 'pending': return go(searchUrl(t.label));
    case 'removed':
      if (win) win.close();
      return note(ed, `${ICONS.removed}<span><b>${esc(t.label)}</b>: ${esc(statusText(st))}. There is no record to open.</span>`, 'n-warn');
    case 'notfound': {
      if (win) win.close();
      const sugg = st.suggestions && st.suggestions.length
        ? ` Did you mean: ${st.suggestions.map(s => `<button type="button" class="mesh-link" data-ui="${esc(s.ui)}">${esc(s.label)}</button>`).join(', ')}?`
        : '';
      return note(ed, `${ICONS.notfound}<span><b>${esc(t.label)}</b>: No exact MeSH term found.${sugg}</span>`, 'n-bad');
    }
  }
}

function openTerm(ed, i) {
  const t = ed.terms[i]; if (!t) return;
  const key = normLabel(t.label);
  if (cache.has(key)) return actOnResult(ed, t, cache.get(key), null);
  if (blocked || navigator.onLine === false) return actOnResult(ed, t, { status: 'unavailable' }, null);
  // Not checked yet: open a tab straight away (keeps the click, so no pop-up block), then send it to
  // the right page once the answer is in (max 2 s, then the NCBI search page: FR-8).
  let win = null;
  try { win = window.open('about:blank', '_blank'); } catch (e) { win = null; }
  if (win) { try { win.opener = null; win.document.title = 'Loading MeSH record…'; } catch (e) { /* ignore */ } }
  validate(t.label).then(st => actOnResult(ed, t, st, win));
}

// ---------------------------------------------------------------------------
// Menu (FR-2)
// ---------------------------------------------------------------------------
let menu = null, menuFor = null;
function menuEl() {
  if (menu) return menu;
  menu = document.createElement('div');
  menu.className = 'mesh-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'MeSH actions');
  menu.hidden = true;
  document.body.appendChild(menu);
  menu.addEventListener('click', e => {
    const b = e.target.closest('[role="menuitem"]'); if (!b || !menuFor) return;
    const { ed, i, descLabel } = menuFor, t = ed.terms[i];
    hideMenu(true);
    if (!t) return;
    switch (b.dataset.a) {
      case 'open': openTerm(ed, i); break;
      case 'copy': copy(descLabel); break;
      case 'copypm': copy(pubmedSyntax(descLabel)); break;
      case 'pubmed': window.open(pubmedUrl(pubmedSyntax(descLabel, t)), '_blank', 'noopener'); break;
    }
  });
  menu.addEventListener('keydown', e => {
    const items = [...menu.querySelectorAll('[role="menuitem"]')];
    const idx = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); hideMenu(true); }
  });
  return menu;
}
function showMenu(ed, i, x, y) {
  const t = ed.terms[i]; if (!t) return;
  const st = termState(t);
  const descLabel = ['found', 'entry', 'replaced'].includes(st.status) ? st.label : t.label;
  const m = menuEl();
  menuFor = { ed, i, descLabel };
  m.innerHTML = `<div class="mesh-menu-head">${esc(descLabel)}</div>
    <button type="button" role="menuitem" data-a="open">Open MeSH record</button>
    <button type="button" role="menuitem" data-a="copy">Copy MeSH term</button>
    <button type="button" role="menuitem" data-a="copypm">Copy as PubMed syntax</button>
    <button type="button" role="menuitem" data-a="pubmed">Search in PubMed</button>`;
  m.hidden = false;
  const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(x, window.innerWidth - w - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(y, window.innerHeight - h - 8)) + 'px';
  hideTip();
  m.querySelector('[role="menuitem"]').focus();
}
function hideMenu(restoreFocus) {
  if (!menu || menu.hidden) return;
  const ed = menuFor && menuFor.ed;
  menu.hidden = true; menuFor = null;
  if (restoreFocus && ed && ed.ta.isConnected) ed.ta.focus();
}
document.addEventListener('mousedown', e => { if (menu && !menu.contains(e.target)) hideMenu(); });
window.addEventListener('scroll', () => { hideMenu(); hideTip(); }, true);
window.addEventListener('resize', () => { hideMenu(); hideTip(); editors.forEach(ed => { if (ed.ta.isConnected) syncBox(ed); }); });

function copy(txt) {
  // The Framework's own copy function shows a toast and a fallback when copying is blocked.
  if (typeof window.copyText === 'function') return window.copyText(txt, 'Copied: ' + txt);
  try { navigator.clipboard.writeText(txt); } catch (e) { /* blocked */ }
}

// ---------------------------------------------------------------------------
// Checking in the background, redrawing and the summary
// ---------------------------------------------------------------------------
function prune() { editors.forEach(ed => { if (!ed.ta.isConnected) editors.delete(ed); }); }

let checkTimer = null;
function checkSoon() {
  clearTimeout(checkTimer);
  checkTimer = setTimeout(() => {
    prune();
    // Only the label goes to NLM, never the search (NFR-4). Other notations are never sent.
    editors.forEach(ed => ed.terms.forEach(t => validate(t.label)));
  }, DEBOUNCE_MS);
}

let redrawQueued = false;
function redrawSoon() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    prune();
    editors.forEach(draw);
    if (lastRoot && lastRoot.isConnected) afterRefresh(lastRoot);
    if (tipFor && tipFor.ed.ta.isConnected) { const s = spanFor(tipFor.ed, tipFor.i); if (s) showTip(tipFor.ed, tipFor.i, s.getBoundingClientRect()); }
  });
}

// One line under the full query: how many MeSH terms were found, not found, and so on.
function summary(root) {
  const g = root.querySelector('.global'); if (!g) return;
  let el = root.querySelector('.mesh-summary');
  if (!el) { el = document.createElement('p'); el.className = 'mesh-summary'; el.setAttribute('aria-live', 'polite'); g.after(el); }
  const n = {};
  const seen = new Set();
  editors.forEach(ed => {
    if (!root.contains(ed.ta)) return;
    ed.terms.forEach(t => {
      const key = normLabel(t.label);
      if (seen.has(key)) return;
      seen.add(key);
      const s = termState(t).status;
      n[s] = (n[s] || 0) + 1;
    });
  });
  const parts = [['found', 'found'], ['entry', 'entry term', 'entry terms'], ['replaced', 'replaced'], ['removed', 'deleted'],
    ['notfound', 'not found'], ['pending', 'checking'], ['unavailable', 'not checked']]
    .filter(([k]) => n[k]).map(([k, one, more]) => `${n[k]} ${n[k] > 1 && more ? more : one}`);
  el.hidden = !parts.length;
  el.textContent = parts.length ? 'MeSH check: ' + parts.join(', ') : '';
  el.classList.toggle('bad', !!(n.notfound || n.removed || n.replaced));
}

function afterRefresh(root) {
  lastRoot = root;
  summary(root);
}

// Called by the Framework after it changed the text of a box (for example the curly-quote fix).
function update(ta) {
  if (!ta || !ta._mesh) return;
  draw(ta._mesh);
  checkSoon();
}

// Back online: check again what couldn't be checked.
window.addEventListener('online', () => { lastFailure.clear(); redrawSoon(); checkSoon(); });
window.addEventListener('offline', () => redrawSoon());

window.MeshCheck = {
  attach, update, afterRefresh,
  // For tests and the console.
  parseText, parseLine, validate, stateOf, ncbiUrl, searchUrl,
  clearCache() { cache.clear(); lastFailure.clear(); inflight.clear(); blocked = false; try { sessionStorage.removeItem(CACHE_KEY); } catch (e) { /* ignore */ } redrawSoon(); }
};
})();
