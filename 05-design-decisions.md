# Contract Clean-Up — Design Decisions

@Jinny Lee

The assistant builds a trusted source of truth: it decides the obvious, asks about patterns, proposes the one-offs, and shows every change as it lands, with an undo on each.

> **Revised during the build.** This log was written before the prototype. Where the build changed a decision, the section says so and keeps the original reasoning, so the change is visible. The main revision is Tension 1: decisions now apply as you go, and only renaming waits for the end.

## Tension 1: immediate verification vs. speed

**Decision (revised): apply each decision as it's made, with an undo on every card; rename last.** The original decision was a live preview and one Apply at the end. In the build, a separate preview meant the user checked everything twice, once on the preview and again at Apply. An undo on every card already makes each step reversible, so applying as you go gives the same safety with real feedback.

| Option | Verification | Speed and effort | Risk |
| --- | --- | --- | --- |
| Apply everything once, at the end | Late: the outcome is seen only after the files change | Fast, one click | Errors are found after they've landed |
| **Apply decision by decision (chosen in the build)** | **Immediate, on the real repository** | **One click per decision, which the user was making anyway** | **Partial states if the user stops halfway; undo on every card keeps each step reversible** |
| Live preview, one Apply (original choice) | Immediate, on a preview of the result | No extra clicks, but the outcome is checked twice | Judgement errors show before Apply; only mechanical ones can appear after |

How it plays out in the build:

1. Each decision card has its own **Apply**. Pressing it updates the folders, statuses and versions in the register straight away, and the chat plays back what changed.
2. Every applied card keeps **Undo changes**, so any decision can be reversed later.
3. **Renaming is the last decision,** because names are the most visible change and depend on every fact before them. A "Ready to apply" card lists everything that has happened, and **Accept changes** renames the files.
4. Nothing is ever deleted. Every original path is logged, and the whole run can be undone after Accept changes.
5. Afterwards, the assistant invites a **retrieval test** ("Ask me for any agreement") to check the goal was met, not just the folders.

*Risk to watch:* applying as you go leaves a half-organised repository if the user stops mid-way. That's acceptable for one sitting; the paused state (see AI principles) is what would make it safe at scale.

## Tension 2: involvement vs. interrogation

**Decision: the user confirms patterns, not files, sorted by risk.** Organisation is never silent, but 220 files come down to roughly 12–15 questions, each with a suggested answer, so the flow fits one sitting.

| Tier | What's in it | Approx. files | How it shows up in chat |
| --- | --- | --- | --- |
| **1. Easy wins** | Formatting, unambiguous facts, single-file agreements, clean version chains (e.g. Pinnacle MSA) | ~150 | Decided automatically, then played back as a batch summary: "I've lined up 148 renames, here's the pattern." The user can spot-check or undo |
| **2. Patterns** | ~7 recurring decisions: copies and backups, chains with no signed version, employment files, unidentifiable files, look-alikes, folders that are instructions, orphan SOWs | ~40–60 | Played back as options, A or B, with real examples and a recommended default. One answer settles the whole group |
| **3. One-offs** | ~5–8 specific cases: the Leith landlord clash, filenames that contradict themselves, ambiguous dates that change a chain's order | ~10–15 | Proposed directly with evidence and a suggested answer; can be cleared together ("accept all except Acme") |

Why patterns, not files: one pattern answer ("keep employment files separate and flag the personal data") settles 30 files at once, and the user's attention goes to decisions only a lawyer can make.

*In the build:* the tiers held, at roughly 65% easy wins, 25% patterns and 10% one-offs of the 220 files, across 13–14 decisions. Two things changed. Easy wins aren't a separate batch card: they land as a side effect of the structure answers. And each one-off gets its own card rather than one "accept all" card, because each needs its own evidence.

## Tension 3: going back without misinterpretation

**Principle (decided): chat for intent, controls for exact operations.** Undoing a change has one right answer, so it's a control on the thing being undone, not a request the model has to interpret. Language stays for judgement calls ("leave the employment ones where they are"), where interpreting is the point.

What's decided:

- **The unit of undo is a decision,** not a message or a moment in the conversation.
- **Every decision is a card** showing its scope ("Superseded versions → `_Archive` · 31 files") with its own undo control.
- **Show the effects before undoing.** "Reopens 30 files · changes 2 later decisions." Ask for confirmation only when an undo affects other decisions; a self-contained undo happens at once and can itself be undone.
- **Typed requests are a fallback, never the main way.** If the user types "go back on Acme", the assistant points to the matching card and waits for a click. It never acts on its own reading of the request.
- **Changing the convention is not an undo.** It's a new version of the view, shown with how many files would move.
- **After Apply:** undo the whole run, one batch or one file from the Apply summary. A failed retrieval test is fixed by correcting the fact, which flows through to the plan.

*In the build:* each card has Undo changes, and the run has Undo run after Accept changes. Undo per batch or per file after the run, and the history panel, weren't built.

The interface isn't decided yet:

| Option | How it works | Strength | Weakness |
| --- | --- | --- | --- |
| **Undo on each card in the feed** | Each decision card carries undo and edit | Undo sits next to its context; feels native to chat | Older cards scroll away; hard to see every decision at once |
| **Decision history panel** | A running list beside the preview, each item with undo and edit | Everything in one place; works for 15+ decisions | A second surface competing with chat; drifts toward a wizard |
| **Preview versions** | Step back through earlier states of the preview tree | Very visual; easy before/after comparison | Restores a moment, not a decision: undoing one thing also undoes everything after it |
| **Hybrid** | Cards in the feed, plus a compact history listing the same cards | Context and overview, one object in two places | More to build in the time-box |

*Leaning:* the hybrid, because the history is the same cards collected in one place. Preview versions conflict with the decision-level undo principle.

## Setting the convention

**Decision: the assistant proposes; the user picks and orders the facets.** The current folders show four organising principles colliding (by type 54 files, by status 49, by year 43, by counterparty 12, with no principle at all for 62), so the user reacts to concrete options instead of writing a scheme from scratch.

1. **Show the evidence.** "Your team has filed contracts four different ways."
2. **Propose one to three conventions,** each rendered on three of the user's real files, e.g. by counterparty → type, or by type → status → year.
3. **The user picks the facets that matter and sets their order** (e.g. type, then status, then year). Facets come only from the facts layer: counterparty, type, status, year, subject.
4. **Fine-tune by talking** ("ISO dates", "drop the status words"). Each change re-renders the examples, with a count of files affected.
5. **Confirm with a control** ("Use this convention"). The convention becomes a decision card, undoable like any other.

*Watch-out:* status as a folder level means a file moves whenever its status changes (draft → signed). The assistant should point this out when status is picked as a folder level, not as part of the filename.

*In the build:* the convention became two short questions instead of a facet picker. First the top level (counterparty, type or status, with counterparty recommended), then the second level. Hovering an option previews its folders on the user's own files. The file-name pattern is a separate question at the very end ("Counterparty – Type – date" recommended, or keep today's names). Fine-tuning the convention by talking wasn't built.

**Default recommendation: counterparty → type, with employment kept separate.** The assistant leads with this convention and the user can still pick another or reorder the facets. It matches the question the product answers ("what did we sign with X?"), keeps an SOW next to the MSA that governs it, and makes gaps visible (e.g. Greymoor's SOWs with no MSA). Both orders give two folder levels; counterparty first gives 30 top folders instead of 10. Employment files go to one Employment folder flagged to HR, because the company in their filename is probably not who signed. Costs to name in the conversation: it's a new habit (no folder is named after a counterparty today), and it splits the 5 Harbour View, Leith leases across four landlords, so the register and the one-off card must surface that clash. Simulated on the data in [backup/convention-simulation.md](backup/convention-simulation.md).

## Marking current and archived versions

**Decision: every file carries a version role, so a person or an agent always knows which file to reference.** The role is stored in the register as data, and mirrored in the folder so people see it too. An agent reads the register, never the filename: filenames are where "FINAL" and "signed" already lie.

| Role | Meaning | What an agent does with it |
| --- | --- | --- |
| **Current** | The version to reference for this agreement | Returns it |
| **Current (assumed)** | Chosen without a signed label, e.g. the latest FINAL, and confirmed by the user | Returns it, with the caveat ("assumed; nothing is labelled signed") |
| **Archived** | Superseded by the current version, or a duplicate of another file. Kept, never deleted | Ignores it unless asked for history; it points to its current file |
| **Open** | A chain where no current version is chosen yet | Doesn't pick one; lists the candidates and states the gap |

How it works:

1. **One current file per agreement, not per counterparty or type.** Look-alikes each keep their own: Vantage's 5 partnerships are 5 current files.
2. **The model sets roles for clear chains,** using the same order as the audit (labelled signed beats FINAL beats redline beats v1), and plays them back. Pinnacle MSA: the 19 Jan 2018 labelled-signed file is current; the other 3 are archived.
3. **Chains with no signed label stay open until the user decides.** The assistant suggests a default: Acme MSA, "I'd treat the 2019 FINAL(2) as current (assumed)". The answer becomes a card, undoable like any other.
4. **Single-file agreements are current automatically.**
5. **In the folder, archived files move to `_Archive` inside their type folder** (e.g. `Acme Corp/MSA/_Archive/`). The type folder then holds only current files, so a person browsing sees one file per agreement.
6. **Filenames don't carry the role.** No "FINAL" or "current" in the new names, because words in names go stale. The date stays, so the order of a chain is still readable in `_Archive`.
7. **Every role records why and who decided it:** the evidence (labelled signed, latest date), "decided by model" or "decided by you", and which file it supersedes.

In the sample data: 19 chains (48 files) become 19 current files and 29 archived, plus the copies and `(1)` duplicates that the patterns step resolves.

*In the build:* versions are linked only when the type and the excerpt match, so the prototype finds 10 chains, not 19, and archives 13 files. The others stay separate agreements, because merging two live agreements is worse than leaving two versions apart. That gives about 207 agreements rather than the audit's 191.

*Watch-out:* "latest" isn't always "current". Solara's NDAs: one labelled signed (Oct 2020), then an unlabelled one (Jul 2022) and one pending signature (Apr 2025). The latest-dated file isn't in force yet, and it may be a new NDA rather than a version. The model never chooses the current file by date alone when a signed label exists, and it checks the subject before treating later files as versions (Tandem's later SOWs cover different projects).

## Corrections mid-conversation

**Decision: the user states the intent, in words or by editing directly; the assistant checks the impact and turns it into a card with an exact scope.** Nothing is corrected silently, and earlier decisions are marked as overridden, never rewritten.

| Kind of correction | Example | How it's made |
| --- | --- | --- |
| **Fix a fact** | "That's not Vantage, it's Ashworth" | Edit the field directly in the preview or register, or say it |
| **Carve out an exception** | "Leave the employment ones where they are" | Say it; the assistant proposes the exact set of files |
| **Change a rule** | "Actually, keep copies as separate files" | Say it, or undo the pattern card and answer again |
| **Teach from one example** | "Acme's in-force one is the copy" | Fix the one case; the assistant offers to apply it to similar files |

How it works:

1. **Facts can be edited directly** in the preview or register, because a field edit can't be misread.
2. **After any correction, the assistant checks the impact** before anything lands: "Changing this counterparty moves the file into the Ashworth licence agreement and makes it the in-force version. 1 agreement affected."
3. **The correction becomes a card** with its scope and what it overrides ("Overrides 'Group by counterparty' for 30 files"), confirmed with a control, then undoable like any other card.
4. **Offer to generalise, once; never assume.** "4 other files have the same pattern. Apply the same?"
5. **The most specific decision wins** when decisions conflict, and the card says which one it overrides.
6. **Corrections made mid-batch:** the assistant pauses, confirms the correction, re-checks what it had queued, and reports it ("That changes 3 proposals I'd queued. Updated.").

*In the build:* only the direct edit was built. Every field the model fills in (status, date, version, notes) can be edited in the table or in a file's side sheet, so the user can override any decision. Corrections said in chat, the impact check, correction cards and the offer to generalise weren't built.

## Decision log

Sixteen decisions so far. Each one names the alternative it rules out. Rows marked *(revised in the build)* or *(partly built)* say what changed.

| # | Decision | Why | Rejected alternative |
| --- | --- | --- | --- |
| 1 | **The goal is a source of truth;** the change plan is how we get there | Legal's real question is "what is our signed agreement with X?"; tidy names are a side effect | A tidy folder tree as the end goal |
| 2 | **Success = the right document is retrieved,** by a person or the AI, with an honest caveat when unsure | The repository's most frequent reader is becoming the AI | Measuring success by how clean the folders look |
| 3 | **A complete account, not complete answers.** Every agreement is resolved, resolved by you, or open with the gap stated | The data can't prove a signature; forcing answers would mean guessing | Promising that every agreement gets resolved |
| 4 | **Two layers: facts and convention.** Facts are fixed in what they record; the naming and folder convention is a user-defined view | Flexibility without vagueness; changing the convention costs nothing | A pre-set naming scheme, or no structure at all |
| 5 | **The convention layer stays,** logical to a person | People need to navigate and verify for themselves | "Never show a structure" (AI register only) |
| 6 | **Organisation is never silent.** The user confirms the convention and sense-checks the result | Trust comes from taking part, not from the model sounding confident | Fully automatic clean-up |
| 7 | **Three tiers:** easy wins played back, patterns as A/B options, one-offs proposed directly | Keeps involvement to about 12–15 questions, not 220 | Reviewing file by file, or one long question queue |
| 8 | **Apply each decision as it's made, rename last, then a retrieval test** *(revised in the build; originally "preview while deciding, one Apply")* | Real feedback on every answer; undo on each card keeps it reversible; checking once instead of twice | Apply at the end with no preview; a separate preview with one Apply |
| 9 | **Non-destructive:** never delete; superseded versions archived; every change logged and undoable | Legal teams are wary of bulk changes to real documents | Removing duplicates |
| 10 | **Evidence-based language:** "labelled signed", never "signed". When nothing is labelled signed, propose the latest FINAL as **assumed** | Nothing in the data proves execution; a default answer is faster than an open question | Stating a status the evidence can't support, or leaving every such chain open |
| 11 | **Chat for intent, controls for exact operations.** Undo is a control on each decision, with its effects shown first | An exact action has one right answer; interpreting it invites error | Undo by typing a request; undo by stepping back through the conversation |
| 12 | **The assistant proposes conventions; the user picks and orders the facets** *(revised in the build: a top level, then a second level, each with a recommendation)* | People react to examples better than they describe schemes; the data shows four competing principles | The user writing a scheme from scratch; the model choosing one convention for them |
| 13 | **Corrections: edit directly or say it; the assistant checks the impact, scopes it on a card, and offers to generalise once** *(partly built: direct edits only)* | Direct edits can't be misread; checking the impact stops quiet side effects; offering to generalise saves repeat fixes without assuming | Corrections applied silently; the model widening the scope on its own; chat-only corrections |
| 14 | **Detours: preview, ask or compare from any card; questions are read-only and the card waits, pinned** *(partly built: open a file or ask about it from any row; compare wasn't built)* | Deciding often needs a look first; a detour must never cost the user their place or change anything quietly | Forcing decisions from metadata alone; questions that silently update facts |
| 15 | **Counterparty → type is the recommended default convention,** with employment as its own folder; the user can still choose | Matches "what did we sign with X?", keeps SOWs with their MSAs and shows gaps; employment counterparties are people, not companies | Type first as the default; no default, leaving the user to choose cold |
| 16 | **Every file has a version role: current, current (assumed), archived or open,** stored in the register and mirrored by an `_Archive` folder | Agents and people need one unambiguous file to reference; filenames already contradict themselves | Status words in filenames as the marker; the latest date wins automatically; deleting old versions |

Scope decision for the prototype: the user completes the flow **in one sitting**, so it must be short enough to finish in one go.

## Still open

The undo principle is set (Tension 3); its exact interface is the biggest open question.

- **Graceful fallbacks: "I made a change and I don't think it worked."** Partly decided in Tension 3: the unit is a decision and undo is a control, not a request. The build has card undo and Undo run. Still open: a history panel, and three moments:
  - During the flow: reversing a decision that later decisions built on.
  - Changing the convention after confirming it.
  - After Accept changes: undoing one batch or one file rather than the whole run, and finding out from a failed retrieval test that something is wrong.
- **Answering later, and pausing to check elsewhere.** Would a user stop mid-flow to ask a colleague (e.g. on Slack) or check another system? If so, can open items be resolved later, for example when someone asks for that document? Out of scope for the prototype (one sitting), but part of the story.
- **Who proposes the convention first:** decided (see Setting the convention): the assistant proposes, the user picks and orders the facets.
- **Corrections mid-conversation:** decided (see Corrections mid-conversation).
- **Build approach (done):** run the extraction over all 220 files once ahead of time for a fast, repeatable demo, and use the model live only for the conversation.
