# Medsyntax: syntax to add

Ideas for search syntax that Medsyntax could recognise, colour and check. Written 22 November 2026.

> **Check before building.** The database syntax below is from general knowledge, not checked against each vendor's current help pages. Verify every rule against the official documentation (PubMed User Guide, Ovid Syntax Guide, Embase.com help, EBSCO help, Cochrane Library help, Web of Science and Scopus search guides) before it goes into the parser.

Related: the *Syntax esperanto* idea in [medsyntax-framework-todo.md](medsyntax-framework-todo.md) builds on this file. Medsyntax first needs to *understand* each database's syntax before it can *translate* between them.

---

## 1. What Medsyntax already recognises

From the parser in `scripts/medsyntax-engine.js` (copied from MedsyntaxQA):

| Already works | Example | How it shows |
|---|---|---|
| Phrases in double or single quotes | `"patient safety"` | grey highlight |
| Single terms, truncation `*` | `nurs*` | dashed underline |
| `AND`, `OR`, `NOT` (upper or lower case) | `a OR b` | bold, dark blue |
| Doubled operators | `a OR OR b` | red, warning |
| Nested round brackets | `(a OR (b AND c))` | coloured scope boxes |
| Square-bracket tags | `[tiab]`, `[Mesh]` | grey |
| Proximity written as `word/number` | `NEAR/3`, `W/2` | grey, bold |
| Field codes after `/`, `:`, `,` or `.` | `/de`, `:ti,ab`, `.mp` | grey |
| Brackets and quotes without a partner | `(a OR b` | red, warning |
| AND and OR mixed in one scope | `a OR b AND c` | dark red / dark blue, warning |

---

## 2. Syntax to add, per database

### PubMed
| Syntax | Example | What it means | Suggested display / check |
|---|---|---|---|
| Field tags with options | `[mh:noexp]`, `[majr]`, `[sh]`, `[tiab:~3]` | MeSH without explosion, major topic, subheading, proximity in title/abstract | Colour per tag type; recognise `:~N` as proximity |
| Proximity search | `"hand hygiene"[tiab:~2]` | words within N words of each other | Show as proximity; warn if used outside `[tiab]`, `[ti]` or `[ad]` |
| MeSH with subheading | `"Diabetes Mellitus/therapy"[Mesh]` | heading plus qualifier | Show the qualifier in a different shade |
| Publication type, language, date | `"randomized controlled trial"[pt]`, `english[la]`, `2019:2024[dp]` | limits | Show as *limit*, not as a concept term; check date format `YYYY:YYYY` or `YYYY/MM/DD` |
| Search history | `#1 AND #2` | refers to earlier searches | Show as a *reference* chip; warn if the number doesn't exist |
| Unknown tags | `[tiabs]` | typo | ✅ Done: "Unknown PubMed field tag" |

### Ovid (MEDLINE, Embase, PsycINFO)
| Syntax | Example | What it means | Suggested display / check |
|---|---|---|---|
| Subject heading | `exp Diabetes Mellitus/`, `Diabetes Mellitus/` | exploded / not exploded | Show `exp` as a heading marker; heading in its own colour |
| Focus / subheadings | `*Diabetes Mellitus/`, `/th`, `/dt` | major focus, subheading | Recognise leading `*` (not truncation) |
| Field suffixes | `.ti,ab.`, `.mp.`, `.kf.`, `.tw.` | fields after the term | Already partly works; add a list of valid codes and warn on unknown ones |
| Proximity | `hand adj3 hygiene`, `adj` | within N words, any order | Show as proximity (now not recognised: `adj3` looks like a word) |
| Limited truncation | `colo$2`, `nurs$` | at most N extra characters | Recognise `$` and `$N` as truncation |
| Wildcards | `wom#n`, `colo?r` | exactly one / zero or one character | Recognise `#` and `?` inside words |
| Line numbers | `1 or 2`, `3 and 4`, `or/1-5` | combine earlier lines | Show as references; check `or/1-5` ranges |
| Frequency | `diabet*.ti,ab. /freq=2` | term appears at least N times | Show as option |
| Limits | `limit 5 to english`, `limit 5 to yr="2019 -Current"` | limits on a line | Show as limit |

### Embase.com
| Syntax | Example | What it means | Suggested display / check |
|---|---|---|---|
| Emtree headings | `'diabetes mellitus'/exp`, `/de`, `/mj` | exploded / not exploded / major | Single quotes + `/exp` as a heading |
| Field codes | `:ti,ab,kw` | title, abstract, author keywords | Already partly works; validate codes |
| Proximity | `hand NEAR/3 hygiene`, `NEXT/3` | any order / fixed order | `NEAR/n` works; add `NEXT/n` as ordered proximity |
| Drug and disease links | `/dd_dt`, `/dm_th` | link terms | Recognise as subheading-like codes |
| Limits | `[english]/lim`, `[2019-2024]/py`, `[embase]/lim` | limits | Show as limits |

### EBSCO (CINAHL, APA PsycINFO, MEDLINE via EBSCO)
| Syntax | Example | What it means | Suggested display / check |
|---|---|---|---|
| Field prefixes | `TI`, `AB`, `TX`, `SU` | field *before* the term | Recognise prefix codes (now the term `TI` looks like a word) |
| Headings | `(MH "Diabetes Mellitus+")`, `(MM "…")` | heading (+ = explode), major | Show as heading; `+` = explode marker |
| Proximity | `hand N3 hygiene`, `W3` | near (any order) / within (ordered) | Recognise `Nn` and `Wn` |
| Wildcards | `wom#n`, `colo?r` | as in Ovid (`#` and `?` swap meaning in some cases: check) | Recognise |
| Search history | `S1 AND S2` | earlier searches | Show as references |

### Cochrane Library
| Syntax | Example | What it means | Suggested display / check |
|---|---|---|---|
| MeSH | `[mh "Diabetes Mellitus"]`, `[mh ^"…"]` | MeSH explode / single term | Show as heading |
| Field codes | `:ti,ab,kw` | title, abstract, keywords | Validate codes |
| Proximity | `NEAR/3`, `NEXT` | any order / adjacent | `NEXT` without number is new |
| Line numbers | `#1 OR #2` | search history | Show as references |

### Web of Science
| Syntax | Example | What it means | Suggested display / check |
|---|---|---|---|
| Field tags | `TS=(…)`, `TI=(…)`, `AB=`, `AK=` | topic, title, abstract, author keywords | Recognise `XX=` before a bracket |
| Proximity | `NEAR/5`, `SAME` | within N words, same address | Recognise `SAME` |
| Operator order | `NEAR > SAME > NOT > AND > OR` | fixed precedence | Warn when brackets are missing and the order changes the meaning |
| Wildcards | `*`, `?`, `$` | truncation / one character / zero or one | Recognise `$` |

### Scopus
| Syntax | Example | What it means | Suggested display / check |
|---|---|---|---|
| Field functions | `TITLE-ABS-KEY(…)`, `TITLE(…)`, `AUTHKEY(…)` | field as a function around terms | Recognise the function name and its brackets |
| Proximity | `W/3`, `PRE/3` | within / precedes | `W/n` works; add `PRE/n` |
| Exact phrase | `{heart attack}` | exact match, including punctuation | Recognise curly braces (now unknown) |
| Operators | `AND NOT` | Scopus uses `AND NOT` | Show as one operator; warn on plain `NOT` |
| Operator order | OR before AND before AND NOT | different from most databases | Warn when brackets are missing |

---

## 3. New checks (warnings) worth adding

| Priority | Check | Example | Message idea |
|---|---|---|---|
| ✅ Done | Operator at the start or end (also right after `(` or before `)`) | `OR diabetes`, `diabetes AND` | "Operator without a search term before or after it." |
| ✅ Done | Empty brackets, round and square | `()`, `[]` | "Empty brackets." |
| On hold | Truncation inside quotes | `"information scientist*"` | **Not built.** As far as I know, current PubMed *does* support truncation inside phrases (e.g. `"breast feed*"[tiab]`), so this warning may be wrong for PubMed. Check the PubMed User Guide first. |
| ✅ Done (PubMed) | Unknown PubMed field tag, including proximity on a field that doesn't support it | `[tiabs]`, `[mh:~2]` | "Unknown PubMed field tag." |
| Medium | Proximity in a database that doesn't support it | `NEAR/3` in PubMed | "PubMed doesn't support NEAR/3. Use `[tiab:~3]` instead." |
| Medium | Lowercase operators in databases that read them as words | `a and b` in Scopus or Google Scholar | "Use upper case AND." |
| Medium | Truncation too short | `pa*`, `ca*` | "Very short truncation finds many unrelated words." |
| Medium | Truncation at the start | `*diabetes` | "Left truncation isn't supported in most databases." |
| Medium | Duplicate term | `diabet* OR diabetes` | "diabetes is already covered by diabet*." |
| Medium | Line reference to a line that doesn't exist | `#7 AND #2` with only 5 lines | "Line #7 doesn't exist." |
| Low | Stopwords in phrases | `"quality of life"` (fine) vs `of` as a term | Note only |
| Low | Unusual characters | en dash `–`, non-breaking space | "Replaced an unusual character." (like the smart-quote clean-up) |
| Low | Very long query | > 4,000 characters in PubMed | "PubMed may cut off very long queries." |

---

Also added: **two operators in a row** for every combination (`AND OR`, `OR AND`, `NOT NOT`, `AND NOT`…), next to the existing "Duplicate AND/OR-operators" warnings. Status as of 22 November 2026, in `scripts/medsyntax-engine.js` (`extraChecks`).

## 4. How to add this to the parser

1. **Choose the database first.** Add a database selector (PubMed, Ovid, Embase.com, EBSCO, Cochrane, Web of Science, Scopus). Many symbols mean different things per database (`#`, `?`, `$`, `NOT`), so the rules must depend on the chosen database.
2. **Per database, one rule file:** valid field tags, proximity patterns, wildcard symbols, operator precedence, limits. Keep it as data (a JSON object), not as code, so librarians can review and extend it.
3. **New token types** in `syntaxParser`, each with its own CSS class:
   - `heading`: subject headings (MeSH, Emtree, CINAHL);
   - `field`: field tags and suffixes;
   - `proximity`: proximity operators;
   - `wildcard`: wildcard symbols;
   - `limit`: limits;
   - `ref`: search-history references (`#1`, `S1`, line numbers).
4. **Colours:** keep the current look (grey for tags, bold for operators) and add a small set: for example a soft blue underline for headings, italic for limits, a chip for references. Check contrast in both themes.
5. **Warnings:** add each new check to `WARN_TEXT` with the same per-box and full-query display as the existing 8.
6. **Test set:** a page with example queries per database and the expected tokens and warnings, run after every change.

## 5. Suggested order

1. ~~Operator at start or end, empty brackets~~ (done), truncation inside quotes (on hold, see above).
2. Database selector + PubMed rules (largest user group).
3. Ovid rules (`adjN`, `exp …/`, `$`, line numbers).
4. Embase.com and Cochrane.
5. EBSCO, Web of Science, Scopus.
6. Then the syntax esperanto (translation between databases).
