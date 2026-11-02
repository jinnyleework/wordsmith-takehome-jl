import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PanelLeft, ChevronDown, CirclePlus, Notebook, ArrowUp, ArrowDown, Check, RotateCcw, X } from 'lucide-react'
import { IconMessageFilled } from '@tabler/icons-react'
import { FileIcon } from './FileIcon'
import { ActionPlayback, type PlaybackItem } from './cards'
import type { Decisions, Step } from '../flow'
import { cssRect, zoom } from '../zoom'

export interface Message {
  role: 'user' | 'assistant'
  text: string
  steps?: string[]
  // Label for the collapsible steps line; defaults to "Worked through N steps"
  stepsLabel?: string
  // A proposal the user answers with controls, rendered from the current decisions
  card?: Step
  // The file a user question was asked about
  about?: string
  // false = show the whole reply at once (restored transcripts)
  stream?: boolean
  // The closing summary after Apply, so undo can take it back off the thread
  closing?: boolean
  // Counts of what the assistant just did, shown as a Playback card
  playback?: PlaybackItem[]
  // The assistant visibly working through steps; `next` is said once it's done
  working?: {
    steps: string[]
    doneLabel: string
    // Present-tense name while the list is running; falls back to doneLabel
    label?: string
    next: Message[]
    done?: boolean
    // How long each step runs (ms), and which step rewrites the preview
    durations?: number[]
    rewriteAt?: number
  }
}

const chatWidth = { initial: 380, min: 320, max: 680, key: 'wordsmith-chat-width' }

function savedChatWidth() {
  try {
    const saved = Number(localStorage.getItem(chatWidth.key))
    if (saved >= chatWidth.min && saved <= chatWidth.max) return saved
  } catch {
    // Storage can be blocked; fall back to the default
  }
  return chatWidth.initial
}

export function Chat({
  messages,
  onSend,
  renderCard,
  thinking,
  onRestart,
  onWorkingDone,
  onWorkingStep,
  about,
  onClearAbout,
  onShow,
  filing,
}: {
  messages: Message[]
  onSend: (text: string) => void
  renderCard: (step: Step) => ReactNode
  thinking: boolean
  onRestart: () => void
  onWorkingDone: (index: number) => void
  onWorkingStep: (index: number, step: number) => void
  // The file the next question is about, picked from a register row
  about: { name: string; display: string } | null
  onClearAbout: () => void
  onShow?: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
  // The filing on screen, so a playback example opens the folder that actually holds it
  filing: Decisions
}) {
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (about) input.current?.focus()
  }, [about])
  const scroller = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const [width, setWidth] = useState(savedChatWidth)

  // Replies are written one message at a time: an assistant message waits, unshown,
  // until every message before it has finished writing
  const written = useRef(new WeakSet<Message>())
  const [, setWrittenCount] = useState(0)
  function markWritten(m: Message) {
    if (written.current.has(m)) return
    written.current.add(m)
    setWrittenCount((n) => n + 1)
  }
  const writing = messages.findIndex(
    (m) => m.role === 'assistant' && !m.working && !!m.text && m.stream !== false && !written.current.has(m),
  )

  // Drag the right edge to resize; the width is remembered for next time
  function startResize(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width
    const z = zoom()
    let next = startWidth
    const move = (ev: PointerEvent) => {
      next = Math.min(chatWidth.max, Math.max(chatWidth.min, startWidth + (ev.clientX - startX) / z))
      setWidth(next)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
      try {
        localStorage.setItem(chatWidth.key, String(Math.round(next)))
      } catch {
        // Storage can be blocked; the width just won't be remembered
      }
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function checkBottom() {
    const el = scroller.current
    if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 24)
  }

  function scrollToBottom() {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }

  // Keep the newest card in view; cards are tall, so scroll after layout
  useLayoutEffect(() => {
    scrollToBottom()
    checkBottom()
  }, [messages, thinking])

  function submit() {
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  return (
    <section className="relative flex shrink-0 flex-col border-r border-border-subtle" style={{ width }}>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat"
        onPointerDown={startResize}
        onDoubleClick={() => setWidth(chatWidth.initial)}
        className="group absolute inset-y-0 -right-1.5 z-20 w-3 cursor-col-resize"
      >
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors group-hover:bg-border-base group-active:bg-brand" />
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
      {/* The header floats over the feed; what scrolls under it blurs progressively */}
      <header className="absolute inset-x-0 top-0 z-10 flex h-12 items-center gap-3 px-4">
        <div aria-hidden className="progressive-blur">
          <div />
          <div />
          <div />
        </div>
        <PanelLeft size={15} className="text-text-subtle" />
        <span className="text-text-subtle">Repositories</span>
        <span className="h-4 w-px bg-border-base" />
        <span>Organise data</span>
        <button
          onClick={onRestart}
          title="Restart the demo"
          className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-body-s text-text-subtle hover:bg-surface-hover"
        >
          <RotateCcw size={13} />
          Restart
        </button>
      </header>

      <div
        ref={scroller}
        data-chat-scroll
        onScroll={checkBottom}
        className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pt-12 pb-4"
      >
        <div className="mt-auto" />
        {!messages.some((m) => m.card) && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-text-subtle">
              I’m connected to your contract repository. I’ll propose how to organise it and change nothing until
              you’ve seen the result.
            </p>
            <button
              onClick={() => onSend('Organise my documents')}
              className="rounded-[20px] border border-border-base px-3 py-1.5 hover:bg-surface-hover"
            >
              Organise my documents
            </button>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === 'assistant' && writing >= 0 && i > writing ? null : m.role === 'user' ? (
            <div key={i} className="flex flex-col items-end gap-1 self-end">
              {m.about && (
                <span className="flex items-center gap-1 text-body-s text-text-subtle">
                  <IconMessageFilled size={12} />
                  About {m.about}
                </span>
              )}
              <div className="rounded-[20px] bg-surface-subtle px-3 py-2">{m.text}</div>
            </div>
          ) : (
            <AssistantMessage
              key={i}
              message={m}
              card={m.card && renderCard(m.card)}
              onWorkingDone={() => onWorkingDone(i)}
              onWorkingStep={(step) => onWorkingStep(i, step)}
              onWritten={() => markWritten(m)}
              onShow={onShow}
              filing={filing}
            />
          ),
        )}
        {thinking && <p className="shimmer self-start text-body-s">Thinking…</p>}
      </div>

      <button
        onClick={scrollToBottom}
        aria-label="Scroll to the latest message"
        tabIndex={atBottom ? -1 : 0}
        className={`absolute bottom-3 left-1/2 z-10 grid size-8 -translate-x-1/2 place-items-center rounded-full border border-border-subtle bg-body text-text-subtle shadow-[0_3px_8px_#1717171a] transition-[opacity,transform] duration-200 hover:text-text-base ${
          atBottom ? 'pointer-events-none translate-y-1 opacity-0' : 'opacity-100'
        }`}
      >
        <ArrowDown size={15} />
      </button>
      </div>

      <div className="px-6 pb-4">
        <div className="rounded-[20px] border border-border-subtle bg-body p-3 shadow-[0_3px_4px_#1717170d]">
          {about && (
            <span className="mb-2 flex w-fit max-w-full items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-base px-2 py-0.5 text-body-s text-text-subtle">
              <FileIcon name={about.name} />
              <span className="truncate">About {about.display}</span>
              <button onClick={onClearAbout} aria-label="Stop asking about this file" className="hover:text-text-base">
                <X size={12} />
              </button>
            </span>
          )}
          <textarea
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={2}
            placeholder={about ? 'Ask about this file' : 'Ask Wordsmith'}
            className="w-full resize-none bg-transparent outline-none placeholder:text-text-disabled"
          />
          <div className="flex items-center gap-3 text-text-subtle">
            <CirclePlus size={15} />
            <Notebook size={15} />
            <button
              onClick={submit}
              disabled={!draft.trim()}
              className="ml-auto grid size-6 place-items-center rounded-full bg-brand text-text-on-color disabled:bg-surface-subtle disabled:text-text-disabled"
            >
              <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function AssistantMessage({
  message,
  card,
  onWorkingDone,
  onWorkingStep,
  onWritten,
  onShow,
  filing,
}: {
  message: Message
  card?: ReactNode
  onWorkingDone: () => void
  onWorkingStep: (step: number) => void
  onWritten: () => void
  onShow?: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
  filing: Decisions
}) {
  const [open, setOpen] = useState(false)
  const instant = message.stream === false
  const [textDone, setTextDone] = useState(instant || !message.text)
  const revealed = useRef<HTMLDivElement>(null)
  const shown = textDone && !!(card || message.playback)

  // Lets the next message start writing. Re-reported if the message object is replaced.
  const onWrittenRef = useRef(onWritten)
  useLayoutEffect(() => {
    onWrittenRef.current = onWritten
  })
  useEffect(() => {
    if (textDone) onWrittenRef.current()
  }, [textDone, message])

  // A card lands after its text has streamed, so bring all of it into view then,
  // and again while it settles (reveal animation, late layout)
  useLayoutEffect(() => {
    const el = revealed.current
    if (!shown || !el) return
    const fit = () => scrollIntoChat(el)
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    const stop = setTimeout(() => observer.disconnect(), 800)
    return () => {
      clearTimeout(stop)
      observer.disconnect()
    }
  }, [shown])

  if (message.working) return <Working working={message.working} onDone={onWorkingDone} onStep={onWorkingStep} />
  return (
    <div className="flex flex-col gap-3">
      {message.steps && (
        <div>
          <button onClick={() => setOpen(!open)} className="flex items-center gap-0.5 text-body-s text-text-subtle">
            {message.stepsLabel ?? `Worked through ${message.steps.length} steps`}
            <ChevronDown size={13} className={open ? 'rotate-180' : ''} />
          </button>
          {open && (
            <ul className="mt-2 flex flex-col gap-1.5 border-l border-border-base pl-3 text-body-s text-text-subtle">
              {message.steps.map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <Check size={13} className="mt-[3px] shrink-0 text-brand" />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {message.text && (
        <StreamedText text={message.text} instant={instant} onDone={() => setTextDone(true)} />
      )}
      <div ref={revealed} className="flex flex-col gap-3 empty:hidden">
        {message.playback && textDone && (
          <div className={!instant && message.text ? 'animate-reveal' : undefined}>
            <ActionPlayback items={message.playback} onShow={onShow} filing={filing} />
          </div>
        )}
        {card && textDone && <div className={!instant && message.text ? 'animate-reveal' : undefined}>{card}</div>}
      </div>
    </div>
  )
}

// Scroll the chat just far enough to show the whole element. One taller than the
// chat is pinned by its top instead, so its heading is never cut off.
function scrollIntoChat(el: HTMLElement) {
  const scroller = el.closest<HTMLElement>('[data-chat-scroll]')
  if (!scroller) return
  const box = cssRect(el)
  const view = cssRect(scroller)
  const gap = 16
  // The header floats over the top of the feed, so the visible area starts below it
  const top = view.top + parseFloat(getComputedStyle(scroller).paddingTop)
  const delta =
    box.height > view.bottom - top - gap * 2 ? box.top - top - gap : Math.max(0, box.bottom - view.bottom + gap)
  if (delta !== 0) scroller.scrollBy({ top: delta, behavior: 'smooth' })
}

function StreamedText({
  text,
  instant,
  onDone,
}: {
  text: string
  instant: boolean
  onDone: () => void
}) {
  const tokens = useMemo(() => text.split(/(\s+)/).filter((t) => t.length > 0), [text])
  const reduce =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const skip = instant || reduce
  const [visible, setVisible] = useState(skip ? tokens.length : 0)
  const p = useRef<HTMLParagraphElement>(null)
  const done = useRef(skip)
  const onDoneRef = useRef(onDone)
  useLayoutEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    if (skip) {
      if (!done.current) {
        done.current = true
        onDoneRef.current()
      }
      return
    }
    if (visible >= tokens.length) {
      if (!done.current) {
        done.current = true
        onDoneRef.current()
      }
      return
    }
    let next = visible
    while (next < tokens.length && /^\s+$/.test(tokens[next])) next++
    if (next < tokens.length) next++
    const t = setTimeout(() => setVisible(next), 30)
    return () => clearTimeout(t)
  }, [visible, tokens, skip])

  useLayoutEffect(() => {
    const scroller = p.current?.closest('[data-chat-scroll]')
    if (scroller) scroller.scrollTop = scroller.scrollHeight
  }, [visible])

  if (skip) return <p className="whitespace-pre-line">{text}</p>

  return (
    <p ref={p} className="whitespace-pre-line">
      {tokens.slice(0, visible).map((token, i) => (
        <span key={i} className={/^\s+$/.test(token) ? undefined : 'animate-word'}>
          {token}
        </span>
      ))}
    </p>
  )
}

// Chain of thought played out live, like Cursor's agent activity: the block stays
// open while steps tick, then folds into one line the user can reopen.
function Working({
  working,
  onDone,
  onStep,
}: {
  working: NonNullable<Message['working']>
  onDone: () => void
  onStep: (step: number) => void
}) {
  const [step, setStep] = useState(working.done ? working.steps.length : 0)
  const [open, setOpen] = useState(!working.done)
  const root = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onDone, onStep })
  useLayoutEffect(() => {
    callbacks.current = { onDone, onStep }
  })

  useEffect(() => {
    if (working.done) return
    if (step >= working.steps.length) {
      const t = setTimeout(() => {
        setOpen(false)
        callbacks.current.onDone()
      }, 700)
      return () => clearTimeout(t)
    }
    callbacks.current.onStep(step)
    const t = setTimeout(() => setStep(step + 1), working.durations?.[step] ?? 900)
    return () => clearTimeout(t)
  }, [step, working.done, working.steps.length, working.durations])

  useLayoutEffect(() => {
    root.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [step])

  const running = !working.done && step < working.steps.length
  const showList = running || open
  const shown = running ? working.steps.slice(0, step + 1) : working.steps

  return (
    <div ref={root} className={`flex flex-col text-body-s text-text-subtle ${showList ? 'gap-2' : ''}`}>
      {running ? (
        <span className="shimmer self-start font-medium">{working.label ?? working.doneLabel}</span>
      ) : (
        <button onClick={() => setOpen(!open)} className="flex items-center gap-0.5 self-start">
          {working.doneLabel}
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${showList ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <ul className="flex min-h-0 flex-col gap-1.5 overflow-hidden border-l border-border-base pl-3">
          {shown.map((s, i) => (
            <li key={s} className={`animate-reveal ${i === step && running ? 'shimmer' : ''}`}>
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
