import { PenLine, GitCompareArrows, LayoutGrid } from 'lucide-react'
import type { Group, Rewrite } from '../flow'
import { AiText } from './motion'

const actions = [
  { label: 'Review proposals', icon: PenLine },
  { label: 'View changes', icon: GitCompareArrows },
  { label: 'Status', icon: LayoutGrid },
]

export const folderHeadings = { before: 'Current folders', preview: 'Preview', applied: 'Files' } as const

export function Sidebar({
  groups,
  selected,
  onSelect,
  mode,
  rewrite,
}: {
  groups: Group[]
  selected: string
  onSelect: (name: string) => void
  mode: keyof typeof folderHeadings
  // Set while the assistant is rewriting the preview. Null leaves every label still.
  rewrite: Rewrite | null
}) {
  return (
    <aside className="flex w-[216px] shrink-0 flex-col overflow-y-auto border-r border-border-subtle bg-surface-light px-3 pb-4">
      <h2 className="flex h-12 shrink-0 items-center px-1 font-medium text-text-subtle">Actions</h2>
      {actions.map(({ label, icon: Icon }) => (
        <button key={label} className="flex items-center gap-2 rounded-lg px-2 py-1 text-left text-text-subtle hover:bg-surface-hover">
          <Icon size={16} className="text-text-base" />
          {label}
        </button>
      ))}

      <h2 className="mt-6 mb-2 px-1 font-medium text-text-subtle">
        <AiText text={folderHeadings[mode]} writing={!!rewrite?.heading} />
      </h2>
      {/* Rows stay put by position. A rewrite shimmers only the folder labels that change. */}
      {groups.map((c, i) => {
        const delay = Math.min(i, 10) * 32
        const label = mode === 'before' ? c.name.replace(/^\/Legal\/|^\//, '') : c.name
        return (
          <button
            key={i}
            onClick={() => onSelect(c.name)}
            title={c.name}
            className={`flex shrink-0 items-center justify-between rounded-lg px-2 py-1.5 text-left ${
              selected === c.name ? 'bg-surface-selected' : 'hover:bg-surface-hover'
            }`}
          >
            <span className="min-w-0 flex-1 truncate">
              <AiText text={label} writing={!!rewrite?.folderNames.has(c.name)} delay={delay} />
            </span>
            <span className="ml-2 text-[12px] text-text-disabled tabular-nums">
              <AiText text={String(c.rows.length)} writing={!!rewrite?.folderCounts.has(c.name)} delay={delay} />
            </span>
          </button>
        )
      })}
    </aside>
  )
}
