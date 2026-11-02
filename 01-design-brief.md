# Contract Clean-Up Assistant — Design Brief

@Jinny Lee

## Problem and context

**Legal teams can't trust their own repository to answer "what did we sign?"** The cost isn't untidy folders. It's that a person, or increasingly an AI assistant, retrieves the wrong version of an agreement and acts on it.

- **Who:** an in-house legal team that has inherited years of repository sprawl. Clean-up is slow, manual and owned by nobody.
- **What the sample shows:** 220 files hold about 191 distinct agreements. 48 files form 19 version chains, which is where the wrong-version risk sits. 12 files can't be tied to any counterparty, and nothing in the data proves a document is signed.
- **Why now:** Wordsmith's assistant reads the repository. A messy repository doesn't just slow people down; it makes the AI give wrong answers with confidence.

See the [Data Audit](02-data-audit.md) for the evidence and the [Design Decisions](05-design-decisions.md) log for the reasoning behind this brief.

> **Updated after the build.** This brief was written before the prototype; it's kept as the plan, with notes where the build differs. The main change: each decision applies as it's made, with an undo on its card, and only renaming waits for the end. Counts from the audit (191 agreements, 19 chains, 12 unidentified) came out as about 207 agreements, 10 chains and 10 unidentified in the build, because it links versions cautiously.

## How might we

**How might we turn a repository nobody trusts into a source of truth, where every agreement points to its in-force version, through one conversation that a lawyer can finish in a single sitting?**

Supporting questions:

1. HMW let users set the organisation rules by talking, not by filling in a form?
2. HMW keep users in control of bulk changes to real documents without the process turning into an interrogation?
3. HMW make uncertainty (duplicates, look-alikes, contradictions, unknowns) visible instead of resolving it silently?
4. HMW let users check each decision as it's made, and reverse it with no room for misinterpretation?
5. HMW make the result trustworthy for the AI that reads it, not just for the people who browse it?

## Users, jobs and trust needs

The primary user runs the clean-up, but the result serves two readers: people browsing the folders, and the AI answering questions.

| Who | Job to be done | What they need to trust it |
| --- | --- | --- |
| **Owner of the clean-up** (in-house counsel or legal ops) | When I inherit a messy repository, I want every agreement to point to its in-force version, so that anyone can answer "what did we sign?" without checking by hand | Evidence behind each decision; nothing irreversible; only decisions that need a lawyer are asked; folder instructions and personal data respected |
| **Colleague browsing** the repository | When I need a contract, I want a structure that makes sense to a person, so I can find and check it myself | A convention that is logical and consistent; superseded versions out of the way but not gone |
| **Wordsmith's AI** reading the repository | When asked for an agreement, return the in-force version and say when it's unsure | Structured facts (type, counterparty, status, what supersedes what) and an explicit open state, not just tidy filenames |

## Principles and the human/AI line

**The model does the reading and proposes; the human decides anything that needs a lawyer; nothing changes without the user's say, and every change can be undone.**

1. **A source of truth, not just tidiness.** Success means the right document gets retrieved.
2. **Facts are fixed; the convention is yours.** The model extracts what each file is; the user decides how it's named and filed.
3. **Never silent.** Every automatic decision is played back in the conversation.
4. **Confirm patterns, not files.** One answer settles a whole group.
5. **Say only what the evidence supports.** "Labelled signed", never "signed"; "assumed" when the model fills a gap.
6. **Apply as you go, rename last, then test.** Each decision changes the repository when the user applies its card, and can be undone; renaming comes at the end; finish with a retrieval test. *(Revised in the build; originally "preview first, apply once".)*
7. **Chat for intent, controls for exact operations.** Judgement happens in language; undo and approval are controls with one meaning.
8. **Never delete.** Superseded files are archived, and every change is logged and reversible.

| Who decides | What | Example |
| --- | --- | --- |
| **Model decides, then plays it back** | Formatting, unambiguous facts, single-file agreements, clean version chains | Pinnacle MSA: the labelled-signed version is in force; the other three are superseded |
| **Model proposes A or B, human picks** | Recurring patterns (about 7) | "Treat copies and `(1)` files as duplicates of their twin?" |
| **Human decides, model suggests a default** | One-offs (about 5–8) and chains with no signed version | Acme MSA: "I'd treat the 2019 FINAL(2) as in force, though its name also says 'draft not final'" |
| **Human only** | Which convention and file-name pattern; applying each decision; every undo; any edit to a field | "Group by counterparty, then type" |
| **Never** | Deleting files; claiming a signature the data can't prove; merging look-alikes without asking | Vantage's 5 partnerships stay separate |

## Scope

**The prototype covers one sitting, from "here's my repository" to an applied, tested source of truth.** The chat runs the flow; the folder tree and the register of agreements sit beside it and update as each decision is applied.

*As planned* (the build's flow is summarised after the list):

1. **Read and report.** The assistant summarises what it found in plain language: "220 files, about 191 agreements, 19 with several versions, 12 I can't identify."
2. **Agree the convention.** The assistant shows how the team has filed so far, then proposes one to three conventions, each shown on 3 of the user's real files, leading with counterparty → type (employment kept separate) as the recommended default. The user picks the facets that matter and orders them (e.g. type, then status, then year), fine-tunes by talking, and confirms with a button. The preview redraws at each step.
3. **Play back the easy wins.** Batch cards: "148 renames, here's the pattern." Each card has undo.
4. **Decide the patterns.** About 7 A/B questions, one at a time, each with real examples and a suggested answer.
5. **Clear the one-offs.** One card with about 5–8 cases, each with evidence and a suggested answer; accept all or pick out exceptions.
6. **Play back the outcome and apply.** Resolved, resolved by you, open; a before/after tree; one Apply.
7. **Test it.** "Ask me for any agreement." The answer is the in-force file, with caveats where the agreement is open.

*As built:* read and report; top level and second level of folders; which date to use; templates; what counts as current; then one card each for unsigned version chains, employment, Solara, Vantage, unidentified files, contradictory names and missing status; then the file-name pattern. Each card is applied as it's answered. A "Ready to apply" card lists everything that has happened, **Accept changes** renames the files, and the retrieval test follows. That's 13–14 decisions.

| In scope for the time-box | Out of scope (say what's next) |
| --- | --- |
| Extraction run ahead of time over all 220 files; the model live only for the conversation | Real document-system integration and file writes |
| Chat feed with decision cards (undo on each) and the live register | Pausing to check with colleagues (e.g. Slack); answering open items later, when someone asks for that document |
| Simulated Apply with undo *(export of the change plan and register wasn't built)* | Multiple users, permissions, approval routing |
| The six demo cases from the audit (Pinnacle, Acme, Vantage, Harbourline employment, Leith lease, unidentified MNDA) | Reading full documents; confirming signatures from a signing platform |

## Requirements and success criteria

**The prototype succeeds if every file is accounted for, there are 15 or fewer decisions, and the retrieval test returns the right file for all six demo cases.**

Must have:

- Every file gets an action (rename, move, archive, flag, leave) with a reason, a confidence level and who decided.
- Every agreement gets a state: resolved, resolved by you, or open with the gap stated.
- Every extracted fact shows its evidence (filename, excerpt or folder).
- The convention is set and changed in conversation, and the register updates in the next message.
- Every decision is a card with an undo control that shows what else it changes first. Corrections, typed or edited directly, become cards too, after the assistant checks their impact. *(Built: undo on every card, and direct edits to any field. Not built: impact shown before undo, correction cards.)*
- Nothing is deleted. Apply is simulated, logged and reversible.
- The change plan and the register can be exported. *(Not built.)*

| Success criterion | Target |
| --- | --- |
| Files with an action and a reason | 220 of 220 |
| Decisions the user makes (patterns + one-offs) | 15 or fewer |
| Time from start to Accept changes in the demo | Under 15 minutes |
| Files deleted | 0 |
| Retrieval test on the six demo cases | Correct in-force file, or an honest caveat, for all six |

For a real product, track how often the retrieved document is correct, how long a clean-up takes, and how often users override automatic decisions. A high override rate means the model is deciding too much; a near-zero rate may mean users aren't really checking.

## Constraints and assumptions

**Constraints:** a 3–5 hour time-box; shadcn components; any LLM API; chat-first rather than a wizard; synthetic data with short excerpts, not full documents.

**Assumptions:**

- **Dates are read day-first.** A filename like `08-12-20` could be 8 December or 12 August. The addresses (Edinburgh, Leith, Glasgow, Manchester) point to a UK team, which writes the day first, so ambiguous dates are read that way and the reading should be shown to the user (not built in the prototype). It matters because the date decides the order of versions in a chain.
- One person owns the clean-up and completes it in one sitting. It's a one-user flow, not collaborative.
- The repository lives in Wordsmith, connected to wherever files come from (email, Slack, the user's machine, OneDrive). Apply reorganises it there, and people still browse it. Wordsmith already has access to every contract, so sending content to the model is not a concern.

The full list is in [03-assumptions.md](03-assumptions.md).
- The excerpt is the most reliable signal available; the filename and folder are claims, not facts.

**Where this pushes back on the task brief:**

| The brief says | This brief's position |
| --- | --- |
| A "cleanly organised, reliably named" repository is the goal | Organisation is how we get there. The goal is retrieving the right in-force document |
| "A few hundred file records" | Count agreements, not files: 220 files, about 191 agreements by the audit (207 in the build, which links versions more cautiously) |
| No fixed convention; up to the user | Agreed for the convention. But the *facts* need a fixed shape, or there's nothing reliable to build a convention from |
| Files sit in folders "that no longer make sense" | Some folder names are instructions (`Templates (do not use)`, `DO NOT DELETE`) and should be respected |
| The messy cases are mainly filename vs. content | In this data the bigger contradictions are a filename against itself, and files that look alike but are separate deals |
| Employment agreements are just another contract type | They're a privacy issue (personal data in `/Shared`), not a filing problem |

## Open questions and risks

**The undo interface is the main interaction question left before building.**

Open questions:

- [ ] **Undo interface:** an undo on each card, a history panel, or both (leaning both)? *Built: an undo on each card, plus Undo run. The history panel is still open.*
- [ ] **Who proposes the convention first:** decided: the assistant proposes one to three conventions; the user picks and orders the facets (see Design Decisions #12).
- [ ] **Corrections mid-conversation:** decided: edit directly or say it; the assistant checks the impact, scopes it on a card and offers to generalise once (see Design Decisions #13)
- [ ] **Pausing to check elsewhere:** would a user stop to ask a colleague (e.g. on Slack) or check another system, and can open items be answered later, for example when someone asks for that document?
- [ ] **Signature evidence:** is there a signing platform or log of executed copies that could turn "labelled signed" into "signed"?
- [ ] **Personal data:** should employment files be moved, or only flagged to HR?

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| The model merges look-alikes that are separate deals | Medium | Group by deal subject as well as counterparty and type; merging is always the user's call |
| Too many questions; the flow feels like an interrogation | Medium | Ask about patterns, not files; suggest an answer every time; clear one-offs in one card |
| The register isn't trusted as verification because it doesn't look like the team's system | Medium | Mirror the real folder tree; let users open any file from its row; finish with a retrieval test |
| Applying as you go leaves a half-organised repository if the user stops mid-way | Medium | Undo on every card and Undo run; a paused state (designed, not built) |
| A live LLM is slow or inconsistent during the demo | High | Run extraction ahead of time; use the model live only for the conversation |
| Patterns in the synthetic data don't hold in real repositories | Low | Design for the type of mess, not the exact counts |
