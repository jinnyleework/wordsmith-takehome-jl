// Free-text replies for the prototype. One local Cursor agent, no tools, so it
// can only talk. The scripted cards stay in the app; this answers what the user
// types, and may name a card choice when their words are clearly that choice.
import { Agent, AuthenticationError } from '@cursor/sdk'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

const SYSTEM = `You are the assistant inside a contract-repository prototype. A scripted walk proposes how to file the agreements, one card at a time. You handle what the user types: questions, objections, and anomalies that are not the card in front of them.

Each message you receive contains the current transcript, the open card if one is waiting, and a snapshot of every file as the preview shows it now. That snapshot is the only source of truth for what the files are. Earlier turns can be stale.

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

let agentPromise = null
let chain = Promise.resolve()

function enqueue(task) {
  const run = chain.then(task, task)
  chain = run.then(
    () => {},
    () => {},
  )
  return run
}

function getAgent() {
  if (!agentPromise) {
    agentPromise = Agent.create({
      model: { id: 'composer-2.5' },
      tools: [],
      local: { cwd: root, settingSources: [] },
    }).catch((err) => {
      agentPromise = null
      throw err
    })
  }
  return agentPromise
}

async function reset() {
  const pending = agentPromise
  agentPromise = null
  if (!pending) return { ok: true }
  const agent = await pending
  await agent[Symbol.asyncDispose]()
  return { ok: true }
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
  for (const turn of body.history ?? []) lines.push(`${turn.role}: ${turn.text}`)
  lines.push(`Latest message: ${body.text}`, `File snapshot: ${JSON.stringify(body.view)}`)
  // The instructions travel with the message. A custom system prompt is not enabled on every account.
  return `${SYSTEM}\n\n${lines.join('\n')}`
}

async function ask(body) {
  if (!body || typeof body.text !== 'string' || !body.text.trim()) {
    return { text: 'Ask me about a file, a company, or the choice on the card.', group: null, decision: null }
  }
  const agent = await getAgent()
  const run = await agent.send(promptFor(body), { local: { force: true } })
  console.log(`cursor ask ${run.id}`)
  const result = await run.wait()
  if (result.status !== 'finished') {
    const message = result.error?.message || `Cursor run ${result.status}`
    if (isAuthFailure(new Error(message))) await dropAgent()
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

async function dropAgent() {
  const pending = agentPromise
  agentPromise = null
  if (!pending) return
  try {
    const agent = await pending
    await agent[Symbol.asyncDispose]()
  } catch {
    // The failed agent is already unusable.
  }
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
      if (path === '/api/ask/reset') return await reset()
      return await ask(await bodyReady)
    } catch (err) {
      if (!isAuthFailure(err)) throw err
      await dropAgent()
      const error = new Error(LOGIN)
      error.status = 401
      throw error
    }
  })
    .then((result) => send(res, 200, result))
    .catch((err) => {
      const status = err.status === 401 ? 401 : 500
      send(res, status, { message: err instanceof Error ? err.message : 'Cursor request failed' })
    })
}
