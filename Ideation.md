# Ideation

Oct 30, 2026 · @Jinny Lee

The organisation is best shown as agreements grouped by the user's chosen facets, not as a folder tree; this page lays out the options behind that view.

## Why a folder tree may be the wrong main view

**A tree shows where files sit, but the user is checking which agreement is in force, and four of our decisions work against a tree.**

- **The unit is the agreement, not the file.** A tree shows 220 files; the user is checking about 191 agreements.
- **The risky cases hide in a tree.** A version chain or a set of look-alikes just appears as similar-looking files sitting next to each other.
- **State has nowhere to go.** "Assumed", "open" and "waiting on a person" aren't folders or filenames.
- **Changing the convention reshuffles the whole tree,** so before and after are hard to compare.

A tree is still needed, though: people have to recognise their own document system before they trust the result.

## Nine ways to show the organisation

**The views range from a working surface (register, grouped register) to moment-specific views (change list, old-to-new flow).** No single view does everything.

| # | View | What it looks like | Best for | Falls short on |
| --- | --- | --- | --- | --- |
| 1 | **Register table** | One row per agreement: counterparty, type, subject, in-force file, number of versions, state | Scanning, sorting, editing facts in place; what the AI reads | The relationships between versions are flattened |
| 2 | **Grouped register** | The register, with rows grouped under the user's chosen facets (e.g. type → status → year) | **The convention becomes the grouping:** reordering facets regroups the rows | Gets deep if many facets are picked |
| 3 | **Version stack** | Expand an agreement: in-force file on top, superseded versions behind, with the evidence for each | Showing chains, and why one version won | One agreement at a time |
| 4 | **Folder tree** | A mirror of the document system after the change | Familiarity: "this is what it'll look like" | The four problems above |
| 5 | **Change list** | Old path → new path, changes only, filterable by action | Line-by-line checking before Apply; an audit record | Dry; no sense of the overall structure |
| 6 | **Old-to-new flow** | Old folders on the left, new groups on the right, bands sized by file count | The big picture at the playback ("62 files from Unsorted → 14 counterparties") | Not something to work in |
| 7 | **Counterparty view** | A card per counterparty: MSA → SOWs → amendments, DPAs, NDAs | Relationships and gaps, e.g. SOWs whose MSA is missing | Too much to build in a 3–5 hour prototype |
| 8 | **State board** | Columns for resolved / resolved by you / open / waiting | Where attention is needed; progress | Shows progress, not organisation |
| 9 | **No structure, just ask** | Search or chat only; the AI answers from the facts | The AI-first extreme; already in the flow as the retrieval test | Fails the "a person can check it themselves" decision |

### Two more views for detours

These open from any card, row or version stack when the user needs to check before deciding, and close back to the same card.

| # | View | What it looks like | Best for | Falls short on |
| --- | --- | --- | --- | --- |
| 10 | **Document preview** | The file opens beside the chat, with the pending card pinned above it | Looking before deciding; seeing the passage an answer cites | Only excerpts in the prototype data |
| 11 | **Side-by-side compare** | Two versions in columns, differences highlighted (dates, parties, status words) | Choosing between versions in a chain | Needs real document text to be convincing |

## Recommendation, and the view at each stage

**Use the grouped register (2) as the main view, with version stacks (3) when a row is expanded and a tree toggle (4) for reassurance.** It's one object for both layers: each row is a fact, and the grouping is the user's convention, so choosing and ordering facets visibly regroups the table.

| Stage | View beside the chat | Why |
| --- | --- | --- |
| 1 Read | State board (8) as counts | Shows the size of the job and the unknowns up front |
| 2 Convention | Grouped preview of 3 example files (2) | Each facet change redraws something concrete |
| 3 Easy wins | Grouped register (2) | Spot-checks happen in the working view |
| 4–5 Patterns and one-offs | Version stacks (3) | The evidence for each version sits side by side |
| 6 Playback | Old-to-new flow (6) + change list (5) | The big picture first, then line by line |
| After Apply | Register (1), tree toggle (4) | What colleagues and the AI use from then on |

## Questions to test when mocking up

- [ ] Does regrouping the register when facets change read as "this is my convention", or does it still need a tree to feel real?
- [ ] Where does the register live while chatting: a side panel, or inline cards in the feed that expand?
- [ ] Can a version stack show filename, excerpt and folder evidence without becoming a wall of text?
- [ ] How do "assumed", "open" and "waiting" look in a row: a badge, a colour, or a sentence?
- [ ] Is the old-to-new flow worth building in the time-box, or does a change list with counts do the job?
- [ ] Should direct edits to facts happen in the register, the version stack, or both?
