# Assumptions

Every assumption the design rests on, in one place. If one turns out wrong, the decisions that depend on it are named so they can be revisited.

## Users and context

| # | Assumption | Why | Depends on it |
| --- | --- | --- | --- |
| A1 | **One user, not collaborative.** One person owns the clean-up and runs it end to end. No shared sessions, approvals or roles. | Keeps the flow focused; collaboration is a separate problem | Pausing ("waiting on a person" means the user asks someone outside the tool) |
| A2 | **The user completes the flow in one sitting** in the prototype. | The flow must be short enough; pausing is designed but not built | Three tiers, ~12–15 questions |
| A3 | **The user is in-house counsel or legal ops,** able to make policy calls for most patterns. | That's who inherits the repository | Who decides what (human/AI line) |
| A4 | **A UK team.** Ambiguous dates are read day-first, and the assumption is stated on screen. | The addresses are in Edinburgh, Leith, Glasgow and Manchester | Date parsing; version order in chains |

## Tool and environment

| # | Assumption | Why | Depends on it |
| --- | --- | --- | --- |
| A5 | **The repository lives in Wordsmith.** Apply reorganises the documents inside the tool; the user is ordering their documentation there. | Wordsmith is where the documents and the assistant are | Apply, undo, the register |
| A6 | **A connection to the files already exists** (email, Slack, the user's machine, OneDrive and similar). The import flow is not designed. | Out of scope; listed under next explorations | Stage 1, Read and report |
| A7 | **Confidentiality is not a concern.** Wordsmith already has access to every contract, so sending content to the model needs no special handling. | Stated by the product context | Detours, extraction |
| A8 | **People still browse the repository,** so the convention must make sense to a person. | Lawyers verify for themselves | The convention layer (decision 5) |
| A9 | **The AI is a main reader of the result.** | Retrieval is the success test | Decision 2; the facts layer |

## Data

| # | Assumption | Why | Depends on it |
| --- | --- | --- | --- |
| A10 | **The excerpt is the most reliable signal;** filenames and folders are claims, not facts. | Filenames often contradict themselves | Evidence rules; "labelled signed" |
| A11 | **Nothing in the data proves a signature.** | Only filenames and folders mention signing | "Labelled signed", "assumed" |
| A12 | **Folder names that sound like instructions are instructions** (`Templates (do not use)`, `DO NOT DELETE`). | People left them on purpose | Pattern question on protected folders |
| A13 | **The data is synthetic.** Some patterns (e.g. SOWs citing missing MSAs) may be artefacts but are kept because they happen in real repositories. | It's a take-home dataset | Demo cases |

## Prototype

| # | Assumption | Why | Depends on it |
| --- | --- | --- | --- |
| A14 | **Extraction runs ahead of time** over all 220 files; the model is live only for the conversation. | Fast, repeatable demo | Demo reliability |
| A15 | **Apply is simulated.** Each card's Apply updates the structure and the register as it's made; Accept changes renames the files at the end. (Exporting the change plan wasn't built.) | No real files to move | Every decision card; the final Accept changes |
| A16 | **Detours run on excerpts and file details,** not full documents. | Only excerpts are provided | Ask and compare |
