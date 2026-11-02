import { useState } from 'react'
import { IconPlus } from '@tabler/icons-react'

// The last row of a status menu: type a status the list doesn't have, then Enter to add and choose it.
export function AddStatusField({ onAdd }: { onAdd: (name: string) => void }) {
  const [text, setText] = useState('')
  return (
    <label className="mt-1 flex items-center gap-2 border-t border-border-subtle px-2 pt-2 pb-1 text-body-s">
      <IconPlus size={12} className="shrink-0 text-text-subtle" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !text.trim()) return
          e.preventDefault()
          onAdd(text)
          setText('')
        }}
        placeholder="Add a status"
        aria-label="Add a status"
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-subtle"
      />
    </label>
  )
}
