# Design

Every screen, card and state that needs designing, with the job each one does. Use it as the checklist for mockups and the build.

Mockups so far: [canvas](https://claude.ai/artifact/DVEZ4AVoHAdqs6P2Mpb9BH) (Main = S3 + S4; Detour = S6 + S7).

## Screens

Each screen is a state of one workspace: the chat on the left and a view on the right. Only the view changes.

| # | Screen | Job to be done (when… I want… so I can…) | Stage | Mocked? |
| --- | --- | --- | --- | --- |
| S0 | **Start** (connection assumed) | When I open the tool, I want to point it at my repository, so I can start without setup | 1 | Not designed (A6) |
| S1 | **Opening report** | When the assistant has read everything, I want to know the size of the job and what it couldn't identify, so I can trust where we're starting | 1 | No |
| S2 | **Convention picker** | When I set up the organisation, I want to react to proposals on my own files and pick and order facets, so I don't have to invent a scheme | 2 | No |
| S3 | **Workspace: chat + grouped register** | While I make decisions, I want to see their effect on the repository straight away, so I can check each one as I go | 3–5 | Yes (Main) |
| S4 | **Version stack** (expanded row) | When an agreement has several versions, I want to see which is in force and why, so I can agree or correct it | 3–5 | Yes (Main) |
| S5 | **Detour: preview** | When I'm unsure, I want to look at the document without losing my place, so I can decide with confidence | Any | No |
| S6 | **Detour: ask** | When the details don't answer my question, I want to ask about the document, so I can decide without opening every file | Any | Yes (Detour) |
| S7 | **Detour: compare** | When versions look alike, I want to see what differs, so I can choose the right one | 4–5 | Yes (Detour) |
| S8 | **One-offs review** | When a handful of cases need me, I want them in one place with evidence and suggestions, so I can clear them quickly | 5 | No |
| S9 | **Playback** (old-to-new flow + change list + state counts) | Before anything changes, I want to see the whole outcome, so I can apply with confidence | 6 | No |
| S10 | **Apply summary** | After applying, I want to know what moved, what failed and how to undo, so nothing is a surprise | 6 | No |
| S11 | **Retrieval test** | When it's done, I want to ask for any agreement and get the right file, so I know the source of truth works | 7 | No |
| S12 | **Paused / resume summary** | When I come back, I want to know where I was and what's still waiting, so I can pick up without re-reading | Any | No |
| S13 | **Folder tree view** | When I want reassurance, I want to see the result as folders, so it looks like a system I recognise | 3–7 | No (toggle only) |
| S14 | **New file arrives** (ongoing filing) | When a new document lands, I want it filed by the agreed convention, with a question only if unsure, so the repository stays clean | After | No; explain in the prototype |

## Cards in the chat

Every card has a header (kind + scope), a body (what and why) and controls. Words carry intent; controls carry commitment.

| # | Card | Purpose | States to design | Controls |
| --- | --- | --- | --- | --- |
| C1 | **Opening report** | What was found; counts and unknowns | Reading (progress) · Complete · Partial (some files unreadable) | Start |
| C2 | **Convention** | Proposed organisation | Proposed (1–3 options) · Adjusting (facets reordered, examples redraw) · Warning (e.g. a facet missing for many files) · Confirmed · Undone · Replaced by a new version | Pick option, reorder facets, Use this convention, Undo |
| C3 | **Easy win (batch)** | Decisions the assistant made, played back | Applied to preview · Expanded (file list) · Spot-check sample shown · Undone · Partly overridden by a correction | Show files, Show in register, Undo |
| C4 | **Pattern question** | One policy choice across a group | Active (A/B + default) · Answered · Left open · Waiting on a person · Undone · Overridden | A, B, Leave open, Waiting on a person, Confirm, Undo |
| C5 | **One-offs** | A few specific cases, each with evidence | Active (n cases) · Partly accepted · All accepted · A case waiting · High-risk case (can't be bulk-accepted) | Accept all, Accept all except…, per-case choice, Undo |
| C6 | **Correction** | A change the user asked for, scoped | Proposed with impact · Adjusting scope · Applied · Offer to generalise ("4 others match") · Undone | Apply correction, Adjust scope, Apply to similar, Undo |
| C7 | **Undo confirmation** | What an undo affects | Self-contained (instant, no card) · Affects other decisions (confirm) · After Apply (shows what happened since) | Undo, Cancel |
| C8 | **Detour answer** | A read-only answer about documents | Answered with source · Can't answer (says why) · Attached to a card as evidence · New fact found (offers a correction) | Attach to card, Ask a colleague, Back to decision |
| C9 | **Waiting on a person** | A question for someone else | Drafted (with evidence) · Marked as sent · Answered · Ageing (shows how long) | Copy question, Mark sent, Record answer |
| C10 | **Playback** | The whole outcome before Apply | Ready · Ready with open or waiting items (never blocks) | Review changes, Apply |
| C11 | **Apply summary** | What changed | Applying (progress) · Done · Partial (some files failed) · Retrying · Undone (run, batch or file) | Retry, Undo run, Undo batch, Export plan, Export register |
| C12 | **Retrieval answer** | The in-force file for a request | Resolved · Assumed (caveat) · Open (caveat) · Wrong (user corrects the fact) | Open file, Correct, Show versions |
| C13 | **Resume summary** | Where the user left off | Nothing changed · Files changed since (flagged) · Answers came in | Continue |
| C14 | **New file filed** | Ongoing filing after the clean-up | Filed automatically · Needs a question · Joins an existing agreement (supersedes) | Undo, Answer |

## States on agreements and rows

These show in the register, the version stack and retrieval answers. Each one is a word plus a style; colour never carries meaning alone.

| State | Means | Example |
| --- | --- | --- |
| **Resolved · labelled signed** | A filename or folder says signed | Pinnacle MSA |
| **Resolved · in /Signed** | The folder says signed | Tandem MSA |
| **Resolved · only version** | A single file | Cobalt Freight MSA |
| **Resolved by you** | The user chose the in-force version | Acme MSA after the one-off |
| **Assumed** | Default accepted; nothing proves it | Acme FINAL(2) under pattern A |
| **Needs your answer** | Waiting on a question in the chat (linked to the card) | Acme MSA during Q4 |
| **Conflicting** | Sources disagree | Marlin lease: two files labelled signed |
| **Open** | Unresolved; the gap is stated | MNDA v3 2020: no counterparty |
| **Waiting on a person** | Someone else needs to answer | A policy call for a partner |
| **Exception** | A user rule overrides the convention | Employment files stay put |
| **Held** | Legal hold; never moved | (none in the sample) |
| **Personal data** (flag) | Contains personal data | 7 employment files in /Shared |

## States on individual facts

| State | Means |
| --- | --- |
| **Extracted** | Read by the model, with its source (filename, excerpt, folder) |
| **Edited by you** | Changed directly by the user, with the impact checked |
| **Conflicting sources** | Filename, excerpt and folder disagree; all are shown |
| **Missing** | Not found anywhere; shown as a gap, never guessed |

## Workspace elements outside the cards

| Element | Purpose | States |
| --- | --- | --- |
| **Stage progress** | Where you are in the 7 stages | Per stage; paused |
| **Facet bar** | The convention as reorderable chips | Default, reordering, warning |
| **View toggle** | Register / Folder tree / Changes | One active |
| **Decision history** | Every card in one list (undo interface still open) | Open, filtered |
| **Pinned decision** | The card you were on, during a detour | Pinned, returned |
| **Composer** | Ask or describe a change; scoped to a card during a detour | Default, scoped |
