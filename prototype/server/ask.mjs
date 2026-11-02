// Free-text replies for the prototype. One local Cursor agent, no tools, so it
// can only talk. The scripted cards stay in the app; this answers what the user
// types, and may name a card choice when their words are clearly that choice.
import { Agent, AuthenticationError } from '@cursor/sdk'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

// Tokens this server may spend on free-text replies before it stops calling Cursor.
// Restart the dev server to refill it. Override with ASK_TOKEN_BUDGET=300000 npm run dev.
const BUDGET = Number(process.env.ASK_TOKEN_BUDGET) || 200_000
// Vite re-imports this file after every edit, so the running total lives on globalThis.
const spend = (globalThis.__wordsmithAskSpend ??= { tokens: 0 })
const HISTORY_TURNS = 6
const TURN_CHARS = 600
const DETAILED_FOLDERS = 3

const SYSTEM = `You are the assistant inside a contract-repository prototype. A scripted walk proposes how to file the agreements, one card at a time. You handle what the user types: questions, objections, and anomalies that are not the card in front of them.

Each message you receive contains the recent transcript, the open card if one is waiting, and a snapshot of every file as the preview shows it now. That snapshot is the only source of truth for what the files are. Earlier turns can be stale.
To keep the message short, only the folders the question is about carry path, note and excerpt. Every other file lists id, name, type, status, handling, version and date. If an answer needs an excerpt you were not given, say which file to ask about.

Reply with one JSON object and nothing else, no markdown fence:
{"text":"the reply","group":null,"decision":null}

text: plain sentences the user will read. Line breaks are fine. No headings, no bullet markup.
group: the folder name copied exactly from the snapshot when the reply is about one folder, otherwise null.
decision: null, or {"step":"<the open step>","value":"<one allowed value>"} when the latest message is clearly choosing an option on the open card.

Rules:
- Answer only from the snapshot. If a fact is not in it, say so.
- An excerpt is not the whole document. A filename that says signed is a label, not a confirmed signature.
- handling is who may see a file, separate from its status. When a file you name has handling "Internal only" or "Do not send", say so before anyone shares it outside the company.
- A question, a hesitation, or a comment about a different file is not a choice. Leave decision null and answer them.
- You cannot move files. A decision only tells the app to update the preview through the card the user was already on.
- Keep the reply short, as a colleague who has read the files.`

let chain = Promise.resolve()

function enqueue(task) {
  const run = chain.then(task, task)
  chain = run.then(
    () => {},
    () => {},
  )
  return run
}

// A new agent for every question. The message already carries the transcript, so an
// agent that remembered earlier turns would pay for them twice, more on every turn.
function createAgent() {
  return Agent.create({
    model: { id: 'composer-2.5' },
    tools: [],
    local: { cwd: root, settingSources: [] },
  })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString() || '{}'
      try {
        resolve(JSON.parse(raw))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function parseAnswer(raw) {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return { text: '', group: null, decision: null }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : trimmed
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1) return { text: trimmed, group: null, decision: null }
  try {
    const json = JSON.parse(body.slice(start, end + 1))
    return {
      text: typeof json.text === 'string' ? json.text.trim() : '',
      group: typeof json.group === 'string' && json.group.trim() ? json.group.trim() : null,
      decision: json.decision && typeof json.decision === 'object' ? json.decision : null,
    }
  } catch {
    return { text: trimmed, group: null, decision: null }
  }
}

function cleanDecision(decision, open) {
  if (!decision || !open || decision.step !== open.step) return null
  const allowed = new Set((open.options ?? []).map((option) => option.value))
  if (typeof decision.value !== 'string' || !allowed.has(decision.value)) return null
  return { step: open.step, value: decision.value }
}

function compactRow(row, detailed) {
  const { path, note, excerpt, ...rest } = row
  const out = detailed ? { ...rest, path, note, excerpt } : rest
  return Object.fromEntries(Object.entries(out).filter(([, value]) => value !== null && value !== undefined && value !== ''))
}

// Full detail only for the folders in play: the asked-about file's folder, then folders
// named in the latest message or the last two turns.
function detailedFolders(body) {
  const folders = (body.view ?? []).map((group) => group.folder)
  const picked = []
  if (body.about?.folder && folders.includes(body.about.folder)) picked.push(body.about.folder)
  const recent = [body.text, ...(body.history ?? []).slice(-2).map((turn) => turn.text)].join('\n').toLowerCase()
  for (const folder of folders) {
    const name = folder.replace(/^_/, '').toLowerCase()
    if (!picked.includes(folder) && recent.includes(name)) picked.push(folder)
  }
  return new Set(picked.slice(0, DETAILED_FOLDERS))
}

function snapshot(body) {
  const detailed = detailedFolders(body)
  return (body.view ?? []).map((group) => ({
    folder: group.folder,
    summary: group.summary,
    files: (group.files ?? []).map((row) => compactRow(row, detailed.has(group.folder))),
  }))
}

function clip(text) {
  return text.length > TURN_CHARS ? `${text.slice(0, TURN_CHARS)}…` : text
}

function promptFor(body) {
  const lines = [
    `Mode: ${body.mode}`,
    `Decisions so far: ${JSON.stringify(body.decisions)}`,
  ]
  if (body.open) {
    lines.push(`Open card: ${body.open.step}`, 'Allowed choices:')
    for (const option of body.open.options ?? []) lines.push(`- ${option.value}: ${option.means}`)
    lines.push('Set decision only when the latest message clearly picks one of these. Otherwise decision is null.')
  } else {
    lines.push('No card is waiting for a choice. decision is null.')
  }
  if (body.about) {
    lines.push(`The question is about this file: ${JSON.stringify(body.about)}`)
  }
  lines.push('Transcript so far:')
  for (const turn of (body.history ?? []).slice(-HISTORY_TURNS)) lines.push(`${turn.role}: ${clip(turn.text)}`)
  lines.push(`Latest message: ${body.text}`, `File snapshot: ${JSON.stringify(snapshot(body))}`)
  // The instructions travel with the message. A custom system prompt is not enabled on every account.
  return `${SYSTEM}\n\n${lines.join('\n')}`
}

async function ask(body) {
  if (!body || typeof body.text !== 'string' || !body.text.trim()) {
    return { text: 'Ask me about a file, a company, or the choice on the card.', group: null, decision: null }
  }
  if (spend.tokens >= BUDGET) {
    const error = new Error(`The demo’s token budget is used up (${spend.tokens.toLocaleString()} of ${BUDGET.toLocaleString()}). Restart the dev server to refill it.`)
    error.status = 429
    throw error
  }
  const prompt = promptFor(body)
  const agent = await createAgent()
  let result
  try {
    const run = await agent.send(prompt, { local: { force: true } })
    console.log(`cursor ask ${run.id}`)
    result = await run.wait()
    const used = result.usage?.totalTokens ?? (await agent.getUsage().catch(() => null))?.usage.totalTokens
    // No usage reported: count roughly four characters a token so the budget still moves.
    spend.tokens += used ?? Math.ceil((prompt.length + (result.result ?? '').length) / 4)
    console.log(`cursor ask tokens ${used ?? 'estimated'} · ${spend.tokens.toLocaleString()} of ${BUDGET.toLocaleString()} used`)
  } finally {
    await agent[Symbol.asyncDispose]().catch(() => {})
  }
  if (result.status !== 'finished') {
    const message = result.error?.message || `Cursor run ${result.status}`
    throw new Error(message)
  }
  const parsed = parseAnswer(result.result)
  console.log(`cursor ask done ${result.durationMs ?? '?'}ms`)
  return {
    text: parsed.text || 'I couldn’t phrase that from the files. Ask me again, naming the company or the file.',
    group: parsed.group,
    decision: cleanDecision(parsed.decision, body.open),
  }
}

function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

const LOGIN = 'Cursor isn’t signed in for this prototype yet. Run npm run cursor-login in Wordsmith/prototype, then ask again.'

function isAuthFailure(err) {
  if (err instanceof AuthenticationError) return true
  const message = err instanceof Error ? err.message : String(err)
  return /api key|unauthenticated|not logged|logged out/i.test(message)
}

export function handle(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, { message: 'POST only' })
    return Promise.resolve()
  }
  const path = req.url?.split('?')[0]
  // Read now. The handler runs later, behind the one-at-a-time queue.
  const bodyReady = readBody(req)
  return enqueue(async () => {
    try {
      // Nothing to clear: each question already gets its own agent. The budget is kept.
      if (path === '/api/ask/reset') return { ok: true }
      return await ask(await bodyReady)
    } catch (err) {
      if (!isAuthFailure(err)) throw err
      const error = new Error(LOGIN)
      error.status = 401
      throw error
    }
  })
    .then((result) => send(res, 200, result))
    .catch((err) => {
      const status = err.status === 401 || err.status === 429 ? err.status : 500
      send(res, status, { message: err instanceof Error ? err.message : 'Cursor request failed' })
    })
}
