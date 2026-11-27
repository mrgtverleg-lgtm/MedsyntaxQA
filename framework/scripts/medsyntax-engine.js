// Medsyntax engine (from MedsyntaxQA, tedoutlook.github.io/medsyntaxqa)
// License: GNU GPL v3.0
// =====================================================================
// Medsyntax engine. The block between PARSER START and PARSER END is the
// MedsyntaxQA parser copied verbatim (regexes + syntaxParser); only the
// warning hooks write to a collector instead of fixed DOM ids, and
// wordNearOpRe adds proximity operators written as words (adj3, N3, NEXT…).
// =====================================================================
let time = Date.now();
let latestInputTime = 0;
let __W = new Set();

// ---- PARSER START ----
    const quotedTermRe = new RegExp('([\"\'])(?:(?=(\\\\?))\\2.)*?\\1', 'gi');
    const termRe = new RegExp('(\\\/div>([A-Z].{1,}?)<div)|(\\\/div>( +[A-Z].{1,}?)<div)', 'gi');
    const termStrayRe = new RegExp('(\\/div>([0-9]{1,}?)\\w+<div)', 'gi');
    const termStrayExtraRe = new RegExp('(\\/div>([0-9]{1,}?)(.{1,}?)<div)', 'gi');
    const termStrayNumberRe = new RegExp('(\\/div>([0-9]{1,}?)<div)', 'gi');
    const termStraySpaceNumberRe = new RegExp('(\\/div>[ ]([0-9]{1,}?)<div)', 'gi');
    const termStraySpaceNumberSpaceRe = new RegExp('(\\/div>[ ]([0-9]{1,}?)[ ]<div)', 'gi');
    const termStrayNumberSpaceRe = new RegExp('(\\/div>([0-9]{1,}?)[ ]<div)', 'gi');
    const andRe = new RegExp('( AND | and )', 'gi');
    const doubleAndRe = new RegExp('( AND AND | AND and | and AND | and and )', 'gi');
    const orRe = new RegExp('( OR | or )', 'gi');
    const doubleOrRe = new RegExp('( OR OR | OR or | or OR | or or )', 'gi');
    const notRe = new RegExp('( NOT | not )', 'gi');
    const nearOpRe = new RegExp('(( \\w+[A-Za-z][\/][0-9]+)|( [A-Za-z][\/][0-9]+))', 'gi');
    // Added in Medsyntax Framework: proximity operators without a slash, as words between terms.
    // Ovid adj / adjN (any case), EBSCO Nn / Wn, Cochrane NEXT, Cochrane/WoS NEAR without a number, WoS SAME.
    // NEAR/n, W/n, PRE/n and NEXT/n are already caught by nearOpRe.
    const wordNearOpRe = new RegExp('( (?:[Aa][Dd][Jj][0-9]*|N[0-9]+|W[0-9]+|NEXT|NEAR|SAME))(?= )', 'g');
    const embaseRe = new RegExp('(([\/][A-Za-z])\\w+|([\:][A-Za-z])\\w+|([,][A-Za-z])\\w+|([.][A-Za-z])\\w+)', 'gi');
    const bracketPairRe = new RegExp('[(][^()]*?[^()\\[]*[)]', 'gm');
    const squareBracketPairRe = new RegExp('[\\[][^\\[\\]]*?[^\\[\\]]*[\\]]', 'gm');

    const specialColon = str_Random();
    const specialSlash = str_Random();
    const specialBracketOpen = str_Random();
    const specialBracketClose = str_Random();
    const specialSquareBracketOpen = str_Random();
    const specialSquareBracketClose = str_Random();
    const special = "___";

    function str_Random() {
        const length = 10;
        let result = '';
        const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';

        // Loop to generate characters for the specified length
        for (let i = 0; i < length; i++) {
            const randomInd = Math.floor(Math.random() * characters.length);
            result += characters.charAt(randomInd);
        }

        result = '@' + result + '@';
        return result;
    }

    function nearOpFunction(x) {
        x = "<div class=near>" + x + " " + "</div>";
        x = x.replace(new RegExp('/', 'gi'), specialSlash);
        return x;
    }

    function embaseFunction(x) {
        x = "<div class=embase>" + x + "</div>";
        return x;
    }

    function booleanAndFunction(x) {
        x = "<div class=\"boolean and\">" + x + "</div>";
        return x;
    }

    function booleanOrFunction(x) {
        x = "<div class=\"boolean or\">" + x + "</div>";
        return x;
    }

    function doubleBooleanAndFunction(x) {
        x = x.replace(new RegExp(' ', 'gi'), special);
        x = "<div class=\"double-boolean-and\">" + x + "</div>";
        __W.add("double-and");
        return x;
    }

    function doubleBooleanOrFunction(x) {
        x = x.replace(new RegExp(' ', 'gi'), special);
        x = "<div class=\"double-boolean-or\">" + x + "</div>";
        __W.add("double-or");
        return x;
    }

    function booleanNotFunction(x) {
        x = "<div class=\"boolean not\">" + x + "</div>";
        return x;
    }

    function bracketPairFunction(x) {
        x = x.replace("(", "<div class=\"brackets\"><div class=\"bracket-open\">(</div>");
        x = x.replace(")", "<div class=\"bracket-close\">)</div></div>");
        x = x.replace('(', specialBracketOpen);
        x = x.replace(')', specialBracketClose);
        return x;
    }

    function squareBracketPairFunction(x) {
        x = x.replace("[", "<div class=\"square-brackets\">[");
        x = x.replace("]", "]</div>");
        x = x.replace('[', specialSquareBracketOpen);
        x = x.replace(']', specialSquareBracketClose);
        return x;
    }

    function quotedTermToElement(x) {
        x = x.replace(new RegExp(' ', 'gi'), special);
        x = "<div class=quote-term>" + x + "</div>";
        x = x.replace(new RegExp('/', 'gi'), specialSlash);
        x = x.replace(new RegExp(':', 'gi'), specialColon);
        x = x.replace(new RegExp('[(]', 'gi'), specialBracketOpen);
        x = x.replace(new RegExp('[)]', 'gi'), specialBracketClose);
        return x;
    }

    function termReFunction(x) {
        x = x.replace("<div", "</div><div");
        x = x.replace("/div>", "/div><div class=\"term\">");
        return x;
    }

    function syntaxParser(str) {
        time = Date.now();

        str = str.replace(quotedTermRe, function (x) {
            return quotedTermToElement(x);
        });

        str = str.replace(embaseRe, function (x) {
            return embaseFunction(x);
        });

        str = str.replace(nearOpRe, function (x) {
            return nearOpFunction(x);
        });

        str = str.replace(wordNearOpRe, function (x) {
            return nearOpFunction(x);
        });

        str = str.replace(doubleAndRe, function (x) {
            return doubleBooleanAndFunction(x);
        });

        str = str.replace(doubleOrRe, function (x) {
            return doubleBooleanOrFunction(x);
        });

        str = str.replace(andRe, function (x) {
            return booleanAndFunction(x);
        });

        str = str.replace(orRe, function (x) {
            return booleanOrFunction(x);
        });

        str = str.replace(notRe, function (x) {
            return booleanNotFunction(x);
        });

        // brackets
        let strPreBrackets = "";
        while (str !== strPreBrackets) {
            strPreBrackets = str;

            str = str.replaceAll(bracketPairRe, function (x) {
                return bracketPairFunction(x);
            });

            str = str.replaceAll(squareBracketPairRe, function (x) {
                return squareBracketPairFunction(x);
            });
        }

        // lonely brackets
        str = str.replaceAll("(", "<div class=\"lonely-bracket-open\">(</div>");
        str = str.replaceAll(")", "<div class=\"lonely-bracket-close\">)</div>");
        str = str.replaceAll("[", "<div class=\"lonely-square-bracket-open\">[</div>");
        str = str.replaceAll("]", "<div class=\"lonely-square-bracket-close\">]</div>");

        str = str.replace(new RegExp(specialSlash, 'gi'), '/'); //un-special-fy
        str = str.replace(new RegExp(specialColon, 'gi'), ':'); //un-special-fy
        str = str.replace(new RegExp(special, 'gi'), ' '); //un-special-fy
        str = str.replace('class=embase', 'class=\"embase\"'); //un-special-fy embase
        str = str.replace('</div>.', '</div><div class="embase">.</div>'); //embas "." cleanup
        str = str.replace('class=quote-term', 'class=\"quote-term\"'); //un-special-fy quote
        str = str.replace(new RegExp(specialBracketOpen, 'gi'), '('); //un-special-fy
        str = str.replace(new RegExp(specialBracketClose, 'gi'), ')'); //un-special-fy
        str = str.replace(new RegExp(specialSquareBracketOpen, 'gi'), '['); //un-special-fy
        str = str.replace(new RegExp(specialSquareBracketClose, 'gi'), ']'); //un-special-fy

        // make stray words elements
        str = "<div class=\"search-string\"><div class=\"dummy\"></div>" + str + "<div class=\"dummy\"></div></div>"
        let strOld = "";
        while (str !== strOld) {
            strOld = str;
            str = str.replace(termRe, function (x) {
                return termReFunction(x);
            }); //make stray words elements

            str = str.replace(termStrayRe, function (x) {
                return termReFunction(x);
            }); //make stray words elements

            str = str.replace(termStrayExtraRe, function (x) {
                return termReFunction(x);
            }); //make stray words elements

            str = str.replace(termStrayNumberRe, function (x) {
                return termReFunction(x);
            }); //make stray words elements

            str = str.replace(termStraySpaceNumberRe, function (x) {
                return termReFunction(x);
            }); //make stray words elements

            str = str.replace(termStraySpaceNumberSpaceRe, function (x) {
                return termReFunction(x);
            }); //make stray words elements

            str = str.replace(termStrayNumberSpaceRe, function (x) {
                return termReFunction(x);
            }); //make stray words elements
        }

        return str;
    }

// ---- PARSER END ----

const WARN_TEXT = {
  'bracket-open': 'Too many ( in query. Or not enough ) in query.',
  'bracket-close': 'Too many ) in query. Or not enough ( in query.',
  'square-bracket-open': 'Too many [ in query. Or not enough ] in query.',
  'square-bracket-close': 'Too many ] in query. Or not enough [ in query.',
  'quotes': 'Incorrect number of quote signs.',
  'double-or': 'Duplicate OR-operators.',
  'double-and': 'Duplicate AND-operators.',
  'ambiguous-and': 'Semantically potentially unclear boolean operator(s). Not fixing these in very long strings may impact medsyntax performance.',
  // Extra checks (Medsyntax Framework): operators, and syntax that depends on the chosen database.
  'double-op': 'Two operators in a row.',
  'dangling-op': 'Operator without a search term before or after it.',
  'not-op': 'Write NOT as AND NOT.',
  'op-case': 'Operator in lower case.',
  'empty-brackets': 'Empty brackets.',
  'wrong-db': 'Syntax from another database.',
  'field-tag': 'Unknown field tag.',
  'wildcard': 'Wildcard this database does not support.',
  'no-field-tag': 'No field tag: Advanced Search in Web of Science needs one, for example TS=(diabet*).'
};
const WARN_ORDER = Object.keys(WARN_TEXT);

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function escText(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// Ported from syntaxCheck(): clean-up before parsing.
function cleanQuery(raw) {
  const notices = [];
  let str = raw.replace(/[\u000A\u000D\u2028\u2029]/g, ' ');
  str = str.replace(/\r?\n|\r/g, ' ');
  const dq = str.replace(/[“”″‶]/g, '"');
  if (dq !== str) notices.push('Your input query included one (or some) unexpected types of double quote signs. These quote signs have been replaced with regular double quote signs.');
  str = dq;
  const sq = str.replace(/[‘’′‵]/g, '\'');
  if (sq !== str) notices.push('Your input query included one (or some) unexpected types of single quote signs. These quote signs have been replaced with regular single quote signs.');
  str = sq;
  // Whole words only, so Scopus fields such as AUTHOR( and words such as )ORGANISM stay as they are.
  str = str.replaceAll(new RegExp(/\bAND\(/gi), 'AND (');
  str = str.replaceAll(new RegExp(/\)AND\b/gi), ') AND');
  str = str.replaceAll(new RegExp(/\)OR\b/gi), ') OR');
  str = str.replaceAll(new RegExp(/\bOR\(/gi), 'OR (');
  str = str.replaceAll(new RegExp(/\)NOT\b/gi), ') NOT');
  str = str.replaceAll(new RegExp(/\bNOT\(/gi), 'NOT (');
  return { str, notices };
}

// Bracket check: walks the query once, skipping text inside quotes (the parser
// does not pair brackets inside quotes either). Finds every ( or [ without a
// partner, so the message can say how many and where.
// Replaces the count + indexOf check of MedsyntaxQA, which gave both
// "Too many (" and "Too many )" for a query like "(a OR b".
function bracketReport(str, open, close) {
  const useQuote = q => (str.split(q).length - 1) % 2 === 0;   // only skip quotes that are balanced
  const dq = useQuote('"'), sq = useQuote("'");
  let inQ = null, opens = 0, closes = 0;
  const stack = [], strayClose = [];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inQ) { if (c === inQ) inQ = null; continue; }
    if ((c === '"' && dq) || (c === "'" && sq)) { inQ = c; continue; }
    if (c === open) { opens++; stack.push(i); }
    else if (c === close) { closes++; if (stack.length) stack.pop(); else strayClose.push(i); }
  }
  return { opens, closes, strayOpen: stack, strayClose };
}
// Text around position pos, split so the page can highlight the bracket itself.
function snippet(str, pos) {
  const a = Math.max(0, pos - 18), b = Math.min(str.length, pos + 19);
  return { pre: (a > 0 ? '…' : '') + str.slice(a, pos), ch: str[pos], post: str.slice(pos + 1, b) + (b < str.length ? '…' : '') };
}
// Plain-language detail for a bracket warning, with the bracket highlighted and,
// for an unclosed field tag such as "T2DM[tiab", a suggested fix ("T2DM[tiab]").
function bracketDetails(str, r, open, close, kOpen, kClose, details) {
  const counts = r.opens === r.closes
    ? `${r.opens} opening ${open} and ${r.closes} closing ${close}, but they don't pair up.`
    : `${r.opens} opening ${open} but ${r.closes} closing ${close}.`;
  if (r.strayOpen.length) {
    const n = r.strayOpen.length, pos = r.strayOpen[0];
    let fix = '';
    if (open === '[') {
      // Term + tag up to the next space or bracket: "T2DM[tiab" -> "T2DM[tiab]".
      let a = pos; while (a > 0 && !/[\s()]/.test(str[a - 1])) a--;
      let b = pos + 1; while (b < str.length && !/[\s()\[\]]/.test(str[b])) b++;
      fix = `Did you mean ${str.slice(a, b)}${close}?`;
    } else {
      fix = `Add a ${close} where this group should end.`;
    }
    details[kOpen] = { lead: counts, text: n === 1 ? `This ${open} is never closed:` : `${n} × ${open} are never closed. The first one:`,
                       at: snippet(str, pos), fix };
    __W.add(kOpen);
  }
  if (r.strayClose.length) {
    const n = r.strayClose.length, pos = r.strayClose[0];
    const fix = open === '['
      ? `Remove this ${close}, or add a ${open} before the field tag.`
      : `Remove this ${close}, or add a ${open} where the group should start.`;
    details[kClose] = { lead: counts, text: n === 1 ? `This ${close} has no ${open} before it:` : `${n} × ${close} have no ${open} before them. The first one:`,
                        at: snippet(str, pos), fix };
    __W.add(kClose);
  }
}

// ---- Extra checks (Medsyntax Framework) ----
// Quoted text is masked first, so words and brackets inside "phrases" are never flagged.
// Positions stay the same, so the warning can highlight the right spot.
function maskQuotes(str) {
  const balanced = q => (str.split(q).length - 1) % 2 === 0;
  let out = str;
  if (balanced('"')) out = out.replace(/"[^"]*"/g, m => '"' + 'x'.repeat(m.length - 2) + '"');
  if (balanced("'")) out = out.replace(/'[^']*'/g, m => "'" + 'x'.repeat(m.length - 2) + "'");
  return out;
}
function spot(str, pos, len) {
  const a = Math.max(0, pos - 18), b = Math.min(str.length, pos + len + 18);
  return { pre: (a > 0 ? '…' : '') + str.slice(a, pos), ch: str.slice(pos, pos + len), post: str.slice(pos + len, b) + (b < str.length ? '…' : '') };
}
function addFinding(details, key, text, at) {
  __W.add(key);
  if (!details[key]) details[key] = { text, at, count: 1 };
  else details[key].count++;
}

// PubMed field tags (short and long forms), lower case. Proximity (:~N) and :noexp are handled separately.
const PUBMED_TAGS = new Set(('ad affl affiliation all "all fields" au author auid "author identifier" book cn "corporate author" ' +
  'cois "conflict of interest statement" crdt "create date" dcom "completion date" dp "publication date" "date - publication" ' +
  'edat "entry date" "date - entry" ed editor filter sb subset fau "full author name" 1au "first author" "first author name" ' +
  'ir investigator fir "full investigator name" isbn ip issue ta journal jour la language lastau "last author" "last author name" ' +
  'lid "location id" lr "modification date" majr "mesh major topic" mh mesh "mesh terms" mhda "mesh date" nm "supplementary concept" ' +
  'ot "other term" pa "pharmacological action" pg pagination pt "publication type" pmid uid pl "place of publication" ' +
  'pdat pubn publisher rn "ec/rn number" si "secondary source id" sh subheading subheadings tiab "title/abstract" ti title ' +
  'tw "text word" "text words" tt "transliterated title" vi volume gr "grants and funding" ps "personal name as subject" ' +
  'pmcid mid "manuscript id" jid nlmid "nlm unique id" dsso "date - mesh"').match(/"[^"]+"|\S+/g).map(t => t.replace(/"/g, '')));
function isPubmedTag(raw) {
  let t = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  let m = t.match(/^(.*?):~\d+$/);                          // proximity, e.g. tiab:~3
  if (m) return ['tiab', 'ti', 'ad', 'title/abstract', 'title', 'affiliation'].includes(m[1].trim());
  m = t.match(/^(.*?):\s*noexp$/);                          // mh:noexp, majr:noexp, sh:noexp
  if (m) return ['mh', 'mesh', 'mesh terms', 'majr', 'mesh major topic', 'sh', 'subheading'].includes(m[1].trim());
  return PUBMED_TAGS.has(t);
}

// ---- Databases (Medsyntax Framework) ----
// Each database: how its syntax looks, which syntax families it accepts, its field codes,
// and an example of how to write each kind of search there (used in the warnings).
// Families: see syntaxSpans(). Kinds: field, subject, prox, limit.
const MS_DATABASES = [
  { id: 'pubmed', label: 'PubMed', sub: 'MEDLINE via PubMed', refPrefix: '#', notOp: 'NOT', upperOps: true,
    accepts: ['pubmed-tag'], wild: ['*'],
    placeholder: 'term OR "phrase"[Mesh] OR trunc*[tiab]',
    how: { field: 'write diabet*[tiab]', subject: 'write "Diabetes Mellitus"[Mesh]', prox: 'write "hand hygiene"[tiab:~3]',
           limit: 'use the filters on the left of the results page', wildcard: 'PubMed only has * at the end of a word, for example diabet*.' } },
  { id: 'embase', label: 'Embase', sub: 'Embase.com', refPrefix: '#', notOp: 'NOT',
    accepts: ['colon-field', 'embase-emtree', 'embase-limit', 'near-slash', 'next-slash'], wild: ['*', '?', '$'],
    codes: new Set('ab ad af an au ca cn co ct cy de dn dp ds dt ed ff ft ia ii ip is it jt kw la lnk lng ln mj mn oa ok pd pg pt py rn sd so ti tn tt ui vi'.split(' ')),
    placeholder: "'term'/exp OR trunc*:ti,ab,kw",
    how: { field: 'write diabet*:ti,ab,kw', subject: "write 'diabetes mellitus'/exp", prox: 'write hand NEAR/3 hygiene',
           limit: 'write for example [english]/lim', wildcard: 'Embase uses * (truncation), ? (one character) and $ (zero or one character).' } },
  { id: 'ovid', label: 'Ovid', sub: 'MEDLINE, Embase or PsycINFO via Ovid', refPrefix: '', notOp: 'NOT',
    accepts: ['ovid-field', 'ovid-heading', 'ovid-mp', 'adj'], wild: ['*', '$', '#', '?'],
    codes: new Set('ab af an au ax bt by ca cm cp cr ct cy dc dd di dj dm dp dq ds dt dv ec ed ep fs fx gs hw id in ip is jc jn jw jx kf kw la lg mp mf mh ms nm no ot pa pg ph pm ps pt px rd rn rs rw rx sh so st su sy ti tm tn tw tx ui up vo xs yr'.split(' ')),
    placeholder: 'exp Term/ OR trunc*.ti,ab.',
    how: { field: 'write diabet*.ti,ab.', subject: 'write exp Diabetes Mellitus/', prox: 'write hand adj3 hygiene',
           limit: 'use limit 1 to english language', wildcard: 'Ovid uses * or $ (truncation), # (one character) and ? (zero or one character).' } },
  { id: 'ebsco', label: 'EBSCO', sub: 'CINAHL or MEDLINE via EBSCOhost', refPrefix: 'S', notOp: 'NOT',
    accepts: ['ebsco-field', 'ebsco-prox'], wild: ['*', '?', '#'],
    placeholder: '(MH "Term+") OR TI trunc* OR AB trunc*',
    how: { field: 'write TI diabet* OR AB diabet*', subject: 'write (MH "Diabetes Mellitus+")', prox: 'write hand N3 hygiene',
           limit: 'use the limiters on the search screen', wildcard: 'EBSCO uses * (truncation), ? (one character) and # (zero or one character).' } },
  { id: 'cochrane', label: 'Cochrane Library', sub: 'CENTRAL and Cochrane Reviews', refPrefix: '#', notOp: 'NOT',
    accepts: ['colon-field', 'cochrane-mesh', 'near-slash', 'near-plain', 'next-plain'], wild: ['*', '?'],
    codes: new Set('ti ab kw au so pt doi an yr'.split(' ')),
    placeholder: '[mh "Term"] OR trunc*:ti,ab,kw',
    how: { field: 'write diabet*:ti,ab,kw', subject: 'write [mh "Diabetes Mellitus"]', prox: 'write hand NEAR/3 hygiene',
           limit: 'use the filters on the results page', wildcard: 'The Cochrane Library uses * (truncation) and ? (one character).' } },
  { id: 'wos', label: 'Web of Science', sub: 'Core Collection', refPrefix: '#', notOp: 'NOT', needsTag: true,
    accepts: ['wos-tag', 'near-slash', 'near-plain', 'same'], wild: ['*', '?', '$'],
    codes: new Set('ts ti ab ak kp au ai gp ed so do py cf ad og oo sg sa ci zp cu fo fg ft su wc is ut pmid dt publ la all'.split(' ')),
    placeholder: 'TS=(trunc* OR "phrase")',
    how: { field: 'write TS=(diabet*)', subject: 'Web of Science has no subject headings: search the words, for example TS=("diabetes mellitus")',
           prox: 'write hand NEAR/3 hygiene', limit: 'use the filters on the results page', wildcard: 'Web of Science uses * (truncation), ? (one character) and $ (zero or one character).' } },
  { id: 'scopus', label: 'Scopus', sub: '', refPrefix: '#', notOp: 'AND NOT',
    accepts: ['scopus-field', 'scopus-prox'], wild: ['*', '?'],
    codes: new Set(('ABS AFFIL AFFILCITY AFFILCOUNTRY AFFILORG AF-ID ALL ARTNUM AU-ID AUTH AUTHCOLLAB AUTHFIRST AUTHKEY AUTHLASTNAME AUTHOR-NAME ' +
      'CASREGNUMBER CHEM CHEMNAME CODEN CONF CONFLOC CONFNAME CONFSPONSORS DOCTYPE DOI EDFIRST EDITOR EDLASTNAME EISSN EXACTSRCTITLE EXACTKEYWORD ' +
      'FIRSTAUTH FUND-SPONSOR FUND-ACR FUND-NO INDEXTERMS ISBN ISSN ISSNP ISSUE KEY LANGUAGE LIMIT-TO EXCLUDE MANUFACTURER OPENACCESS PAGEFIRST PAGELAST PAGES ' +
      'PMID PUBLISHER PUBSTAGE PUBYEAR REF REFAUTH REFTITLE REFSRCTITLE REFPUBYEAR SEQBANK SEQNUMBER SRCTITLE SRCTYPE SUBJAREA TITLE TITLE-ABS TITLE-ABS-KEY ' +
      'TITLE-ABS-KEY-AUTH TRADENAME VOLUME WEBSITE').toLowerCase().split(' ')),
    placeholder: 'TITLE-ABS-KEY(trunc* OR "phrase")',
    how: { field: 'write TITLE-ABS-KEY(diabet*)', subject: 'write INDEXTERMS("diabetes mellitus")', prox: 'write hand W/3 hygiene',
           limit: 'use the filters on the results page', wildcard: 'Scopus uses * (truncation) and ? (one character).' } }
];
const msDb = id => MS_DATABASES.find(d => d.id === id) || MS_DATABASES[0];

// Who uses a syntax family, for "this is ... syntax" in the warning.
const FAMILY_OWNER = {
  'pubmed-tag': 'PubMed', 'embase-limit': 'Embase', 'embase-emtree': 'Embase', 'cochrane-mesh': 'Cochrane Library',
  'ovid-mp': 'Ovid', 'ovid-field': 'Ovid', 'ovid-heading': 'Ovid', 'adj': 'Ovid', 'colon-field': 'Embase or Cochrane Library',
  'wos-tag': 'Web of Science', 'same': 'Web of Science', 'scopus-field': 'Scopus', 'scopus-prox': 'Scopus',
  'ebsco-field': 'EBSCO', 'ebsco-prox': 'EBSCO', 'near-slash': 'Embase, Cochrane Library or Web of Science',
  'near-plain': 'Cochrane Library or Web of Science', 'next-slash': 'Embase', 'next-plain': 'Cochrane Library'
};

// Every piece of database-specific syntax in the (quote-masked) query: { fam, kind, pos, len, code }.
// A span is only reported once: later families skip text an earlier family already took.
function syntaxSpans(m) {
  const out = [], taken = [];
  const free = (p, l) => !taken.some(t => p < t[0] + t[1] && t[0] < p + l);
  const add = (fam, kind, pos, len, code) => { if (!len || !free(pos, len)) return; taken.push([pos, len]); out.push({ fam, kind, pos, len, code }); };
  const each = (re, fn) => { let r; re.lastIndex = 0; while ((r = re.exec(m))) { fn(r); if (!r[0].length) re.lastIndex++; } };
  // Square brackets: PubMed tags, Cochrane [mh ...], Embase [...]/lim, and Ovid's [mp=...] history note.
  let rest = m;
  each(/\[([^\[\]]*)\](\/[a-z]+)?/gi, r => {
    const c = r[1].trim(), lc = c.toLowerCase();
    if (r[2]) add('embase-limit', 'limit', r.index, r[0].length);
    else if (/^m[hj](\s+\S|\s*\^|\s*\/)/i.test(c)) add('cochrane-mesh', 'subject', r.index, r[0].length);
    else if (/^[a-z]{2,3}\s*=/i.test(c)) add('ovid-mp', 'field', r.index, r[0].length);
    else {
      const kind = /:~\d/.test(lc) ? 'prox' : /^(mh|mesh|mesh terms|majr|mesh major topic)(:\s*noexp)?$/.test(lc) ? 'subject' : 'field';
      add('pubmed-tag', kind, r.index, r[0].length, c);
    }
    rest = rest.slice(0, r.index) + ' '.repeat(r[0].length) + rest.slice(r.index + r[0].length);
  });
  m = rest;
  // Field codes.
  each(/(?<=[\w*$#?"')])\.([a-z]{2,3}(?:,[a-z]{2,3})*)\.(?=[\s)]|$)/gi, r => add('ovid-field', 'field', r.index, r[0].length, r[1]));
  each(/(?<=[\w*?$'")])\/(exp|de|mj)\b/gi, r => add('embase-emtree', 'subject', r.index, r[0].length));
  each(/(?<=[\w*?$'")]):([a-z]{2,4}(?:,[a-z]{2,4})*)\b/gi, r => add('colon-field', 'field', r.index, r[0].length, r[1]));
  each(/(?:^|(?<=[\s(]))([A-Za-z]{2,4})\s*=/g, r => add('wos-tag', 'field', r.index, r[0].length, r[1]));
  each(/(?:^|(?<=[\s(]))(PUBYEAR)\s*[<>=]/g, r => add('scopus-field', 'field', r.index, r[1].length, r[1]));
  each(/(?:^|(?<=[\s(]))([A-Z]{3,}(?:-[A-Z]+)*)(\s*)\(/g, r => {
    if (/^(AND|OR|NOT|NEAR|NEXT|SAME)$/.test(r[1])) return;
    const known = MS_DATABASES.find(d => d.id === 'scopus').codes.has(r[1].toLowerCase());
    if (known || !r[2]) add('scopus-field', 'field', r.index, r[1].length, r[1]);
  });
  each(/(?:^|(?<=[\s(]))(TI|AB|SU|MH|MM|TX|KW|AU|SO|PT|DE|ZU|ZT|AF|LA|JN|MJ|MW|SH|AN|IS|IB)\s+(?!(?:AND|OR|NOT)\b)(?=["'(\w*])/g,
    r => add('ebsco-field', /^(MH|MM|DE|SU|MJ|MW|SH)$/.test(r[1]) ? 'subject' : 'field', r.index, r[1].length, r[1]));
  // Subject headings in Ovid: exp Heading/ and Heading/ (a slash at the end of a word).
  each(/(?:^|(?<=[\s(]))exp\s+(?=\*?[A-Za-z])/g, r => add('ovid-heading', 'subject', r.index, 3));
  each(/(?<=\w)\/(?:[a-z]{2}(?:,[a-z]{2})*)?(?=[\s)]|$)/g, r => {
    if (/\band$/i.test(m.slice(0, r.index)) && r[0].toLowerCase() === '/or') return; // and/or is a word
    add('ovid-heading', 'subject', r.index, r[0].length);
  });
  // Proximity.
  each(/\bNEAR\/\d+/gi, r => add('near-slash', 'prox', r.index, r[0].length));
  each(/\bNEXT\/\d+/gi, r => add('next-slash', 'prox', r.index, r[0].length));
  each(/\b(?:W|PRE)\/\d+/gi, r => add('scopus-prox', 'prox', r.index, r[0].length));
  each(/\badj\d*\b/gi, r => add('adj', 'prox', r.index, r[0].length));
  each(/(?<=\s)[NW]\d+(?=\s)/g, r => add('ebsco-prox', 'prox', r.index, r[0].length));
  each(/\bNEAR\b(?![\/-])/g, r => add('near-plain', 'prox', r.index, r[0].length));
  each(/\bNEXT\b(?![\/-])/g, r => add('next-plain', 'prox', r.index, r[0].length));
  each(/\bSAME\b/g, r => add('same', 'prox', r.index, r[0].length));
  // Wildcards (truncation with * works everywhere).
  each(/(?<=\w)\$\d*/g, r => add('$', 'wildcard', r.index, r[0].length));
  each(/(?<=[A-Za-z])#|#(?=[A-Za-z])/g, r => add('#', 'wildcard', r.index, 1));
  each(/(?<=\w)\?|\?(?=\w)/g, r => add('?', 'wildcard', r.index, 1));
  return out;
}

// Is this field code right for the database? PubMed uses its own (longer) list.
function knownCode(db, sp) {
  if (sp.fam === 'pubmed-tag') return isPubmedTag(sp.code);
  if (!db.codes || !sp.code) return true;
  return sp.code.toLowerCase().split(',').every(c => db.codes.has(c.trim()));
}

// End a sentence with one full stop, also after an example such as diabet*.ti,ab.
const stop = t => (/\.$/.test(t) ? t : t + '.');

function extraChecks(str, details, opts) {
  opts = opts || {};
  const db = msDb(opts.db);
  const m = maskQuotes(str);
  const OP = '(AND|OR|NOT)';
  let r;
  // Two operators in a row. "AND AND" and "OR OR" are already caught by the original parser.
  // Scopus writes exclusion as AND NOT; the other databases as NOT.
  const dbl = new RegExp('(^|[\\s()])' + OP + '\\s+' + OP + '(?=[\\s()]|$)', 'gi');
  while ((r = dbl.exec(m))) {
    const a = r[2].toUpperCase(), b = r[3].toUpperCase();
    const pos = r.index + r[1].length, len = r[0].length - r[1].length;
    const andNot = a === 'AND' && b === 'NOT';
    if (!(a === b && a !== 'NOT') && !(andNot && db.notOp === 'AND NOT')) {
      addFinding(details, 'double-op', `“${a} ${b}”: use one operator.${andNot ? ` In ${db.label} write a NOT b (Scopus uses a AND NOT b).` : ''}`, spot(str, pos, len));
    }
    dbl.lastIndex = pos + r[2].length;
  }
  // Scopus: NOT on its own is not an operator.
  if (db.notOp === 'AND NOT') {
    const lone = /(?<!\bAND\s+)(?<=^|[\s()])NOT(?=[\s(]|$)/gi;
    while ((r = lone.exec(m))) addFinding(details, 'not-op', 'Scopus writes exclusion as a AND NOT b.', spot(str, r.index, 3));
  }
  // PubMed only reads AND, OR and NOT as operators when they are in capitals.
  if (db.upperOps) {
    const low = /(?<=\s)(and|or|not)(?=\s)/g;
    while ((r = low.exec(m))) addFinding(details, 'op-case', `Write ${r[1].toUpperCase()} in capitals: PubMed searches a lower-case “${r[1]}” as a word.`, spot(str, r.index, r[1].length));
  }
  // Operator at the start, at the end, right after ( or right before ).
  const lead = new RegExp('(^|\\()\\s*' + OP + '(?=[\\s(]|$)', 'gi');
  while ((r = lead.exec(m))) {
    const pos = r.index + r[0].length - r[2].length;
    addFinding(details, 'dangling-op', `${r[2].toUpperCase()} has no search term before it.`, spot(str, pos, r[2].length));
  }
  const trail = new RegExp('(^|[\\s)])' + OP + '\\s*(?=\\)|$)', 'gi');
  while ((r = trail.exec(m))) {
    const pos = r.index + r[1].length;
    addFinding(details, 'dangling-op', `${r[2].toUpperCase()} has no search term after it.`, spot(str, pos, r[2].length));
    trail.lastIndex = pos + r[2].length;
  }
  // Empty brackets.
  const empty = /\(\s*\)|\[\s*\]/g;
  while ((r = empty.exec(m))) addFinding(details, 'empty-brackets', 'Remove them or put search terms inside.', spot(str, r.index, r[0].length));
  // Field tags, subject headings, proximity and wildcards: right for this database?
  const spans = syntaxSpans(m);
  spans.forEach(sp => {
    const text = str.slice(sp.pos, sp.pos + sp.len).trim();
    const at = spot(str, sp.pos, sp.len);
    if (sp.kind === 'wildcard') {
      if (!db.wild.includes(sp.fam)) addFinding(details, 'wildcard', `“${sp.fam}” does not work in ${db.label}. ${db.how.wildcard}`, at);
      return;
    }
    if (!db.accepts.includes(sp.fam)) {
      addFinding(details, 'wrong-db', `“${text}” is ${FAMILY_OWNER[sp.fam]} syntax. In ${db.label}, ${stop(db.how[sp.kind])}`, at);
      return;
    }
    if (knownCode(db, sp)) return;
    const msg = sp.fam === 'pubmed-tag'
      ? (/:~\d+\s*$/.test(sp.code)
        ? `[${sp.code}]: proximity (:~N) only works with [tiab], [ti] or [ad].`
        : `[${sp.code}] is not a PubMed field tag. Check the spelling, for example [tiab], [mh] or [pt].`)
      : `“${text}” is not a field code in ${db.label}. Check the spelling, or ${stop(db.how.field)}`;
    addFinding(details, 'field-tag', msg, at);
  });
  // Web of Science Advanced Search needs a field tag such as TS=. Checked on the full query only.
  if (opts.full && db.needsTag && !spans.some(sp => sp.fam === 'wos-tag')) {
    addFinding(details, 'no-field-tag', 'Advanced Search in Web of Science needs a field tag, for example TS=(diabet* OR "blood glucose").', spot(str, 0, 0));
  }
}

// Ported from syntaxCheck() + afterParseFunction(), scoped to one target element.
function runMedsyntax(raw, target, opts) {
  opts = opts || {};
  __W = new Set();
  const cleaned = cleanQuery(raw);
  const str = cleaned.str;
  let hasError = false;
  if ((str.match(/"/g) || []).length % 2 !== 0) { __W.add('quotes'); hasError = true; }
  if ((str.match(/'/g) || []).length % 2 !== 0) { __W.add('quotes'); hasError = true; }

  const html = syntaxParser(escText(str));
  target.innerHTML = html;

  const details = {};
  const round = bracketReport(str, '(', ')');
  const square = bracketReport(str, '[', ']');
  bracketDetails(str, round, '(', ')', 'bracket-open', 'bracket-close', details);
  bracketDetails(str, square, '[', ']', 'square-bracket-open', 'square-bracket-close', details);
  extraChecks(str, details, opts);
  const bracketsOk = !round.strayOpen.length && !round.strayClose.length && !square.strayOpen.length && !square.strayClose.length;
  if (!bracketsOk) hasError = true;

  if (!hasError) {
    const $t = $(target);
    let amb = false;
    $t.find('.brackets .boolean.and, .search-string .boolean.and').each(function () {
      if ($(this).siblings('.or').length) { amb = true; return false; }
    });
    if (amb) {
      $t.find('.brackets .boolean.or, .search-string .boolean.or').each(function () { $(this).siblings('.and').addClass('boolean-error-and'); });
      $t.find('.brackets .boolean.and, .search-string .boolean.and').each(function () { $(this).siblings('.or').addClass('boolean-error-or'); });
      __W.add('ambiguous-and');
    }
  }

  if (opts.onCommit && bracketsOk && !__W.has('quotes')) attachScopeEditor(target, opts);
  return { str, notices: cleaned.notices, warnings: WARN_ORDER.filter(k => __W.has(k)), details };
}

// ---- Scope-driven editor (hover, click, edit, Enter), ported and scoped per target ----
let activeEdit = null;
function attachScopeEditor(target, opts) {
  let elementForHover;
  $(target).find('.search-string div').on('mousemove', function () {
    if (elementForHover !== this) {
      if ($(this).hasClass('hover')) return false;
      makeEditScope(target, this, opts);
      elementForHover = this;
    }
    elementForHover = null;
    return false;
  });
  $(target).on('mouseleave', function () { if (!$(target).find('.dynamic-input').length) $(target).find('div').removeClass('hover').off('mousedown'); });
}
function makeEditScope(target, element, opts) {
  $(target).find('div').removeClass('hover').off('mousedown');
  if ($(element).parent().hasClass('square-brackets')) element = $(element).parent()[0];
  const down = e => hoverMouseDown(e, target, opts);
  if ($(element).hasClass('brackets')) { $(element).addClass('hover').on('mousedown', down); }
  const walk = (el, dir) => {
    let $el = $(el);
    while ($el.length && !$el.hasClass('brackets')) {
      $el.off('mousedown').addClass('hover').on('mousedown', down);
      $el = dir === 'next' ? $el.next() : $el.prev();
    }
  };
  walk(element, 'next');
  walk(element, 'prev');
}
function hoverMouseDown(event, target, opts) {
  event.preventDefault();
  event.stopPropagation();
  $(target).find('div').off('mousemove');
  const $h = $(target).find('.hover');
  const text = $h.text();
  $h.wrapAll("<div class='newInputTarget' />");
  const $ta = $('<textarea class="dynamic-input" aria-label="Edit this part of the query"></textarea>');
  $(target).find('.newInputTarget').replaceWith($ta);
  $ta.val(text.trim());
  const size = () => { $ta[0].style.height = '1px'; $ta[0].style.height = (12 + $ta[0].scrollHeight) + 'px'; };
  $ta.on('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); onEnterDynamicInput(target, $ta, opts); }
    if (e.key === 'Escape') { e.preventDefault(); activeEdit = null; opts.onCancel && opts.onCancel(); }
  }).on('input', size);
  size();
  activeEdit = { target, ta: $ta[0], cancel: opts.onCancel };
  $ta.focus();
}
// Same checks as onEnterDynamicInput() in MedsyntaxQA; inline message instead of alert().
function onEnterDynamicInput(target, $ta, opts) {
  const node = document.createTextNode(' ' + $ta.val().replace(/\n/g, ' ') + ' ');
  $ta.replaceWith(node);
  const str = $(target).text();
  let err = null;
  if ((str.match(/"/g) || []).length % 2 !== 0) err = 'number of " error: please fix before pressing Enter';
  else if ((str.match(/'/g) || []).length % 2 !== 0) err = "number of ' error: please fix before pressing Enter";
  else {
    const bo = (str.match(/\(/g) || []).length, bc = (str.match(/\)/g) || []).length;
    const so = (str.match(/\[/g) || []).length, sc = (str.match(/]/g) || []).length;
    if (bo !== bc || str.indexOf('(') > str.indexOf(')')) err = '( or ) bracket error: please fix before pressing Enter';
    else if (so !== sc || str.indexOf('[') > str.indexOf(']')) err = '[ or ] bracket error: please fix before pressing Enter';
  }
  if (err) {
    $(node).replaceWith($ta);
    $ta.next('.edit-msg').remove();
    $ta.after('<span class="edit-msg">' + escText(err) + '</span>');
    $ta.focus();
    return;
  }
  activeEdit = null;
  opts.onCommit(str.replace(/  +/g, ' ').trim());
}
document.addEventListener('mousedown', function (e) {
  if (activeEdit && !activeEdit.ta.contains(e.target)) { const c = activeEdit.cancel; activeEdit = null; c && c(); }
}, true);
