# Contract Repository — Data Audit

Oct 30, 2026 · @Jinny Lee

## Summary

The 220 files hold about **191 distinct agreements**, but only **48 files (19 groups) are true version chains**, and those chains are where the risk sits: acting on a superseded draft.

- **Scale:** 220 files across 23 folders; 100 pdf, 67 doc, 53 docx; 28 counterparties; 10 document types.
- **Identity:** 22 filenames name no counterparty. 10 of those can be recovered from the excerpt; **12 cannot**.
- **Dates:** 62 filenames carry no date; **17 are ambiguous** between day-first and month-first (e.g. `08-12-20`); five date formats are in use.
- **Status:** filenames use 20+ status words (final, FINAL(2), final\_v2, signed, executed, pending signature, redline, old, copy, backup…), several of them contradictory within one name.
- **Folders:** about 38 files sit in a folder whose type contradicts the file; 4 folders are holding areas (Unsorted, Downloads, Desktop dump, To Review).

**Stance:** the tool extracts *facts* about each file and leaves the *structure* (naming convention, folder tree) to the user. The audit defines what can be known, not how it should be organised.

*Note: the data is synthetic, so some patterns (e.g. SOWs citing MSAs that are missing) are likely artefacts. They're kept here because the same patterns occur in real repositories.*

## Fields given vs. signals inside them

The CSV has 7 columns, but most of the useful facts are packed inside three of them, and each source is reliable for different things.

| Source | Signals inside it | How far to trust it |
| --- | --- | --- |
| `filename` | Counterparty, document type, date, status word (signed, draft…), version (v1–v3, FINAL(2)), copy markers ((1), copy, backup), handling notes (DO NOT SEND, internal only, PLEASE READ) | Low. Typed by people, often contradicts itself (`signed_…_unsigned`, `FINAL(2)-2019-draft not final`) |
| `content_excerpt` | Document type, counterparty (most types), subject ("cloud migration"), property address (leases), parent MSA date (SOWs), OCR quality | Highest available, but short. Employment and some NDA excerpts are generic and name nobody |
| `folder_path` | Someone's past intent: type (NDAs, Real Estate), year, status (Signed, Archive), handling rules (Templates (do not use), Backup - DO NOT DELETE) | Low as a fact, high as a *constraint*. Folder names are instructions left by people |
| `date_modified` | When the file was last touched | Very low. 14 files share 2026-06-01, which looks like a bulk migration |
| `size_kb`, `file_type` | Format; tiny files (11 under 200 KB) may be stubs or cover pages | Supporting evidence only |
| `file_id` | Stable key | The only truly reliable identifier. Every action in the plan should key on it |

Nothing in the data proves a document is signed. "Signed" is only ever a filename or folder claim, so the tool should say "labelled signed", never "signed".

## Mess taxonomy

The mess falls into four kinds: which file is in force, what a file is, where it belongs, and how it's spelled. Only the first two can mislead a retrieval; the last two are cosmetic.

| Pattern | Files | Example from the data | Risk if mishandled |
| --- | --- | --- | --- |
| **Version chains:** several versions of one agreement | 48 in 19 groups | Pinnacle MSA: `v1-for review`, `FINAL-20180115-redline`, `FINAL_v2-2018`, `signed-19.01.2018` | High: the wrong version gets retrieved |
| **Contradictory status in one name** | ~6 | `signed_Employment Contract_Jan2022_unsigned`, `ACME_CORP-MSA-FINAL(2)-2019-draft not final`, `…reviewed-20230812-old-do not use` | High: the status can't be read from the name |
| **No winner in a chain:** nothing labelled signed | e.g. Acme MSA (3), Tandem MSA (4) | Acme: `FINAL(2)…draft not final`, `copy`, `draft PLEASE READ` | High: any pick is a guess |
| **Look-alikes that aren't versions:** same counterparty and type, different deal | e.g. 5 Vantage partnerships, 6 Crestline NDAs | Vantage JVs cover pilot programme, payment processing, marketing… | High: merging loses a live agreement |
| **Employment files named after a company** | 30 | 4 "Harbourline" employment files, probably 4 different people | High: wrong merge, plus personal data in `/Shared` (7 files) |
| **Unidentifiable** | 12 no counterparty; 9 poor OCR | `MNDA v3 2020.pdf`, `10-23-23_Lease_v3.docx` | Medium: can't be filed or retrieved by name |
| **Same property, different landlords** | 7 leases | 5 Harbour View, Leith: Corvus, Ashworth, Bluewave, Marlin (×3) | Medium: either a data error or a real dispute |
| **Orphan SOWs:** the parent MSA is missing | most of 13 | Greymoor SOW cites an MSA dated 20 Dec 2019; no Greymoor MSA exists | Medium: the governing terms can't be found |
| **Folder contradicts the file** | ~38 | Software licence in `/Legal/NDAs`; employment contract in `/Shared/…/Vendors` | Low once facts are extracted |
| **Folders that are instructions** | 15 | `Templates (do not use)`, `Backup - DO NOT DELETE` | Medium: ignoring them breaks trust |
| **Ambiguous or missing dates** | 17 ambiguous, 62 none | `08-12-20` could be 8 Dec or 12 Aug | Medium: can break the ordering of a chain |
| **Formatting noise** | most files | SHOUTY\_CASE (36), double spaces (20), `__` (8), `(1)` copies (20) | Low: safe to fix automatically |

## Candidate data structures

There are two layers. The **facts layer** is fixed in *what* it records and is extracted by the model, then confirmed by people. The **convention layer** is entirely the user's: a view generated from the facts, so changing it re-generates the plan without re-reviewing the facts.

### Facts layer: what we record (fixed)

| Object | Fields | Notes |
| --- | --- | --- |
| **File** | `file_id`, original path and name, doc type, counterparty, subject, document date, status claim (labelled signed / draft / pending…), version label, handling flags (do not use, do not delete, internal only, personal data), OCR quality | Every field carries its **evidence** (filename, excerpt or folder) and a **confidence** |
| **Agreement** | `agreement_id`, counterparty, type, subject, member files, in-force file, state (resolved / resolved by you / open), open reason, decided by, rationale | The unit of review and of retrieval. One agreement can hold 1–6 files |
| **Relationship** | supersedes, duplicate of, amends, governed by (SOW → MSA) | Lets the AI answer "what governs this SOW?" and flag missing parents |
| **Decision** | what was decided, by model or person, when, why, which files it affected | The audit trail behind every change. It's also what makes a change reversible |

### Convention layer: how it's organised (user-defined)

| Object | What the user controls | Example of a change made by talking |
| --- | --- | --- |
| **Naming rule** | Which facts appear, in what order, date format, separators, casing | "Counterparty first, ISO dates, no status words" |
| **Folder rule** | Hierarchy by any fact: counterparty, type, year, state | "Group by counterparty, then type" |
| **Vocabulary** | Labels for types and statuses; merging categories | "Treat Partnership, JV and Collab as one type" |
| **Handling of superseded versions** | Archive folder, suffix, or leave in place | "Move old versions to `_Superseded` inside each counterparty" |
| **Exceptions** | Files or folders the rules don't touch | "Leave Templates alone", "don't move HR files" |

### Output: the change plan

The plan is one row per file: `file_id`, action (rename, move, archive, flag, leave), old path, new path, reason, confidence, decided by. It is generated from the facts plus the convention, it can be exported, and it can be undone.

## Edge cases to demo, and open questions

Six cases from this dataset show each kind of judgement. Together they make a demo script.

| Case | Files | What it shows |
| --- | --- | --- |
| **Pinnacle Insurance MSA:** a clean chain | 4 | Automatic: labelled signed beats FINAL\_v2 beats redline beats v1; the others go to superseded, and the chat says so |
| **Acme Corp MSA:** a chain with no winner | 3 | Proposed with a default: "Nothing is labelled signed. I'll treat the 2019 FINAL(2) as in force, though its name also says 'draft not final'. OK?" |
| **Vantage partnerships:** look-alikes | 5 | Restraint: same counterparty and type but 5 different deals, so they're kept apart and the chat explains why |
| **Harbourline employment files** | 4 | Sensitivity: probably different people, not versions; personal data in `/Shared` gets flagged |
| **5 Harbour View, Leith** | 7 | A contradiction the model can't resolve: four landlords for one property |
| **`MNDA v3 2020.pdf`:** unidentifiable | 1 (of 12) | The honest "I don't know": parked as open with the gap stated, not guessed |

### Open questions the data raises

- Are any of the 13 orphan SOWs governed by an MSA held outside this repository?
- Is there an authoritative signature source (e-signature platform, executed-copies log) that would turn "labelled signed" into "signed"?
- Who owns personal data in employment files? Should the tool move them, or only flag them to HR?
- Should `Templates (do not use)` and `Backup - DO NOT DELETE` be off-limits, or are they themselves mess?
- For ambiguous dates, does the team's locale (UK, given the Edinburgh, Leith and Glasgow addresses) settle day-first ordering?
