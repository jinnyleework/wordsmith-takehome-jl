// Motion for text the assistant is rewriting in the preview.
import { useEffect, useMemo, useState } from 'react'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function tokensOf(text: string) {
  return text.split(/(\s+)/).filter((t) => t.length > 0)
}

// While `writing`, the words carry the same loader shader as the chat. When the
// value changes during a write, they fade in one at a time; the shader drops
// off as soon as the write ends, even if the last words are still settling.
export function AiText({ text, writing, delay = 0 }: { text: string; writing: boolean; delay?: number }) {
  const reduce = reduced()
  const tokens = useMemo(() => tokensOf(text), [text])
  const [shown, setShown] = useState(text)
  const [visible, setVisible] = useState(() => (writing && !reduced() ? 0 : tokensOf(text).length))
  const [pending, setPending] = useState(() => writing && !reduced())
  const [running, setRunning] = useState(false)

  if (shown !== text) {
    setShown(text)
    const animate = writing && !reduce
    setPending(animate)
    setVisible(animate ? 0 : tokens.length)
    setRunning(false)
  }

  useEffect(() => {
    if (!pending) return
    const t = window.setTimeout(() => {
      setPending(false)
      setRunning(true)
    }, delay)
    return () => clearTimeout(t)
  }, [pending, delay, shown])

  useEffect(() => {
    if (!running || visible >= tokens.length) return
    let next = visible
    while (next < tokens.length && /^\s+$/.test(tokens[next])) next++
    if (next < tokens.length) next++
    const t = window.setTimeout(() => setVisible(next), 30)
    return () => clearTimeout(t)
  }, [running, visible, tokens])

  const shader = writing && !reduce && visible > 0
  // One shader for the whole run of text, so a single highlight travels across it.
  // The words only fade; they don't each carry their own band.
  return (
    <span className={shader ? 'shimmer' : undefined}>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return token
        const on = i < visible
        return (
          <span key={i} className={!on ? 'opacity-0' : running ? 'animate-word' : undefined}>
            {token}
          </span>
        )
      })}
    </span>
  )
}
