import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  IconFileText,
  IconBuilding,
  IconCategory,
  IconProgressCheck,
  IconCalendar,
  IconVersions,
  IconNotes,
  IconChevronRight,
  IconSearch,
  IconCheck,
  IconMinus,
  IconMessageFilled,
  IconLayoutSidebarRight,
  IconX,
  IconArrowUpRight,
  IconLock,
} from '@tabler/icons-react'
import { FileIcon } from './FileIcon'
import { AddStatusField } from './AddStatusField'
import { addStatus, statusStyle, useAddedStatuses } from '../statuses'
import { AiText } from './motion'
import filterIcon from '../assets/filter.svg'
import { formatDate, formatSize, type Status } from '../data'
import {
  facetValue,
  parentOf,
  type DateSource,
  type Facet,
  type FieldEdit,
  type Group,
  type Handling,
  type Rewrite,
  type RewriteCells,
  type ViewRow,
  type VersionLabel,
} from '../flow'

type ColumnId = 'name' | 'counterparty' | 'type' | 'status' | 'date' | 'version' | 'notes'

// A folder level already shows this fact, so its column can sit at the end.
const facetColumn: Record<Facet, ColumnId> = {
  counterparty: 'counterparty',
  type: 'type',
  status: 'status',
  year: 'date',
}

// Fixed widths so columns line up across type tables and don't jump between counterparties.
// The date column is wide enough for "Last modified" once that choice replaces the filename date.
// Columns for the chosen folder levels go last: the folders already show that fact.
function sheetColumns(dateLabel: string, filed: Facet[]) {
  const columns: { id: ColumnId; label: string; icon: typeof IconFileText; width: number }[] = [
    { id: 'name', label: 'Name', icon: IconFileText, width: 324 },
    { id: 'counterparty', label: 'Counterparty', icon: IconBuilding, width: 200 },
    { id: 'type', label: 'Type', icon: IconCategory, width: 140 },
    { id: 'status', label: 'Status', icon: IconProgressCheck, width: 150 },
    { id: 'date', label: dateLabel, icon: IconCalendar, width: 156 },
    { id: 'version', label: 'Version', icon: IconVersions, width: 170 },
    { id: 'notes', label: 'Notes', icon: IconNotes, width: 320 },
  ]
  const sink = new Set(filed.map((facet) => facetColumn[facet]))
  return [...columns.filter((column) => !sink.has(column.id)), ...columns.filter((column) => sink.has(column.id))]
}
const builtInStatuses: Status[] = ['Signed', 'Final', 'Draft', 'Pending', 'Template', 'Unlabelled', 'Undefined', 'Conflicting']

function useStatusOptions(): Status[] {
  return [...builtInStatuses, ...useAddedStatuses()]
}

// The canonical name leads with the company. Employment files keep that company even though they share one folder.
function counterpartyOf(row: ViewRow) {
  const company = row.name.split(' – ')[0]?.trim()
  return company || row.folder.replace(/^_/, '') || '—'
}
const versionOptions: VersionLabel[] = ['—', 'Current', 'Template', 'Archived', 'Duplicate', 'Open', 'Needs your answer']

// Figma table cells: page background, subtle right and bottom borders
const cell = 'border-r border-b border-border-subtle px-3 py-2'
// Checkbox slot is always reserved, left of the expand chevron. The control shows on hover.
const nameCell = 'border-r border-b border-border-subtle py-2 pr-3 pl-1.5'

type Mode = 'before' | 'preview' | 'applied'

// `by` is the second folder level: each value gets its own table. With no second
// level (today's folders, or before it's chosen) the folder is one flat table.
export function Register({
  group: cp,
  mode,
  top = null,
  by,
  onAsk,
  rewrite,
  dateSource = null,
  highlightIds = [],
  highlightHeld = false,
  folders,
  onMove,
  onDelete,
  onEdit,
}: {
  group: Group
  mode: Mode
  // The folder levels already chosen. Their columns move to the end of each table.
  top?: Facet | null
  by: Facet | null
  onAsk: (row: ViewRow) => void
  // Which cells this rewrite changes. Null while the preview is sitting still.
  rewrite: Rewrite | null
  // Null or filename: the column is Date, taken from the name at whatever precision it has.
  // Modified: the column is renamed and shows the day the file was last saved.
  dateSource?: DateSource | null
  onEdit: (id: string, patch: FieldEdit) => void
  highlightIds?: string[]
  // While an arrow is hovered the blue stays; a click still fades on its own.
  highlightHeld?: boolean
  folders: string[]
  onMove: (ids: string[], folder: string) => void
  onDelete: (ids: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editOpen, setEditOpen] = useState(false)
  const [editPanel, setEditPanel] = useState<'menu' | 'move' | 'delete'>('menu')
  const [moveQuery, setMoveQuery] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const editRef = useRef<HTMLDivElement>(null)
  const types = [...new Set(cp.rows.map((r) => r.type))]
  const dateLabel = dateSource === 'modified' ? 'Last modified' : 'Date'
  const filed = [top, by].filter((facet): facet is Facet => facet != null)

  const q = query.trim().toLowerCase()
  const matches = (r: ViewRow) =>
    !q || [r.display, r.original, r.note, r.excerpt, r.id, r.type, counterpartyOf(r)].some((s) => s.toLowerCase().includes(q))
  const visible = cp.rows.filter((r) => !hidden.has(r.type) && matches(r))

  function toggleType(t: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (!next.delete(t)) next.add(t)
      return next
    })
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function selectRows(ids: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function closeEdit() {
    setEditOpen(false)
    setEditPanel('menu')
    setMoveQuery('')
  }

  function finish(action: () => void) {
    action()
    setSelected(new Set())
    closeEdit()
  }

  useEffect(() => {
    if (!editOpen) return
    function onPointer(e: MouseEvent) {
      if (!editRef.current?.contains(e.target as Node)) closeEdit()
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [editOpen])

  const picked = [...selected]
  const destinations = folders.filter((f) => f !== cp.name)
  const moveQueryNorm = moveQuery.trim().toLowerCase()
  const moveTargets = destinations.filter((f) => folderLabel(f, mode).toLowerCase().includes(moveQueryNorm))
  const detail = cp.rows.find((r) => r.id === detailId) ?? null

  return (
    <section className="relative flex min-w-0 flex-1 flex-col">
      <header className="flex items-end justify-between gap-3 border-b border-border-subtle px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="truncate text-[16px] leading-6 font-medium tracking-[-0.35px]">
            <AiText text={cp.name} writing={!!rewrite?.folderNames.has(cp.name)} />
          </h1>
        </div>
        <button className="shrink-0 rounded-lg px-2 py-0.5 font-medium text-text-subtle hover:bg-surface-hover">Add file</button>
      </header>

      <div className="relative flex items-center justify-between gap-2 border-b border-border-subtle p-2">
        <label className="flex w-[360px] min-w-0 items-center gap-2 rounded-lg bg-surface-base px-1.5 py-1">
          <IconSearch size={12} className="shrink-0 text-text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-body-s outline-none placeholder:text-text-subtle"
          />
        </label>
        <div className="flex shrink-0 items-center gap-2">
          {selected.size > 0 && (
            <div ref={editRef} className="relative">
              <button
                type="button"
                aria-expanded={editOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setFilterOpen(false)
                  setEditPanel('menu')
                  setMoveQuery('')
                  setEditOpen((open) => !open)
                }}
                className={`flex h-6 items-center rounded-lg border px-2 text-body-s font-medium shadow-[0_1px_4px_#1717170a] ${
                  editOpen ? 'border-brand/70 bg-brand-subtle text-brand' : 'border-border-subtle text-text-subtle hover:bg-surface-hover'
                }`}
              >
                Edit
              </button>
              {editOpen && (
                <EditMenu
                  panel={editPanel}
                  count={picked.length}
                  targets={moveTargets}
                  moveQuery={moveQuery}
                  mode={mode}
                  onMoveQuery={setMoveQuery}
                  onShowMove={() => setEditPanel('move')}
                  onShowDelete={() => setEditPanel('delete')}
                  onBack={() => setEditPanel('menu')}
                  onMove={(folder) => finish(() => onMove(picked, folder))}
                  onDelete={() => finish(() => onDelete(picked))}
                />
              )}
            </div>
          )}
          <button
            onClick={() => {
              closeEdit()
              setFilterOpen(!filterOpen)
            }}
            aria-label="Filter by type"
            className={`grid h-6 w-7 place-items-center rounded-lg border shadow-[0_1px_4px_#1717170a] ${
              hidden.size ? 'border-brand/70 bg-brand-subtle text-brand' : 'border-border-subtle text-text-subtle'
            }`}
          >
            <img src={filterIcon} alt="" width={12} height={12} />
          </button>
        </div>
        {filterOpen && (
          <div className="absolute top-full right-2 z-10 mt-1 flex w-44 flex-col rounded-xl border border-border-base bg-white p-1 shadow-[0_3px_8px_#1717170d]">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-body-s hover:bg-surface-hover"
              >
                <span className="grid size-3.5 place-items-center text-brand">
                  {!hidden.has(t) && <IconCheck size={12} />}
                </span>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {by === null
          ? visible.length > 0 && (
              <SectionTable
                label={null}
                rows={visible}
                mode={mode}
                searching={!!q}
                onAsk={onAsk}
                highlightIds={highlightIds}
                highlightHeld={highlightHeld}
                selected={selected}
                onToggle={toggleRow}
                onSelectRows={selectRows}
                cells={rewrite?.cells ?? null}
                sectionWriting={false}
                dateHeaderWriting={!!rewrite?.dateHeader}
                dateLabel={dateLabel}
                filed={filed}
                wave={0}
                onEdit={onEdit}
                detailId={detailId}
                onOpen={setDetailId}
              />
            )
          : [...new Set(visible.map((r) => facetValue(r, by)))]
              .sort()
              .map((v, i) => (
                <SectionTable
                  key={v}
                  label={v}
                  rows={visible.filter((r) => facetValue(r, by) === v)}
                  mode={mode}
                  searching={!!q}
                  onAsk={onAsk}
                  highlightIds={highlightIds}
                  highlightHeld={highlightHeld}
                  selected={selected}
                  onToggle={toggleRow}
                onSelectRows={selectRows}
                  cells={rewrite?.cells ?? null}
                  sectionWriting={!!rewrite?.sections.has(`${cp.name}/${v}`)}
                  dateHeaderWriting={!!rewrite?.dateHeader}
                  dateLabel={dateLabel}
                  filed={filed}
                  wave={i}
                  onEdit={onEdit}
                  detailId={detailId}
                  onOpen={setDetailId}
                />
              ))}
        {visible.length === 0 && <p className="p-3 text-body-s text-text-subtle">No files match.</p>}
      </div>
      {detail && (
        <>
          <button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 z-20 cursor-default"
            onClick={() => setDetailId(null)}
          />
          <FileSheet
            row={detail}
            renamed={mode === 'applied'}
            dateLabel={dateLabel}
            onClose={() => setDetailId(null)}
            onEdit={onEdit}
          />
        </>
      )}
    </section>
  )
}

function SectionTable({
  label,
  rows,
  mode,
  searching,
  onAsk,
  highlightIds,
  highlightHeld,
  selected,
  onToggle,
  onSelectRows,
  cells,
  sectionWriting,
  dateHeaderWriting,
  dateLabel,
  filed,
  wave,
  onEdit,
  detailId,
  onOpen,
}: {
  label: string | null
  rows: ViewRow[]
  mode: Mode
  searching: boolean
  onAsk: (row: ViewRow) => void
  highlightIds: string[]
  highlightHeld: boolean
  selected: Set<string>
  onToggle: (id: string) => void
  onSelectRows: (ids: string[], on: boolean) => void
  cells: Map<string, RewriteCells> | null
  sectionWriting: boolean
  dateHeaderWriting: boolean
  dateLabel: string
  filed: Facet[]
  wave: number
  onEdit: (id: string, patch: FieldEdit) => void
  detailId: string | null
  onOpen: (id: string) => void
}) {
  const columns = sheetColumns(dateLabel, filed)
  const tableWidth = columns.reduce((w, c) => w + c.width, 0)
  const statusOptions = useStatusOptions()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // Nest superseded files only once version roles are actually filled in
  const nest = mode !== 'before' && rows.some((r) => r.versionLabel !== '—')
  const isOpen = (id: string) => searching || expanded.has(id)

  useEffect(() => {
    if (!highlightIds.length) return
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const r of rows) {
        if (highlightIds.includes(r.id)) {
          next.add(r.id)
          const parent = parentOf(r)
          if (parent) next.add(parent)
        }
      }
      return next
    })
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const first = highlightIds.map((rowId) => document.querySelector(`[data-row-id="${rowId}"]`)).find(Boolean)
        first?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    })
    return () => cancelAnimationFrame(id)
  }, [highlightIds])

  useEffect(() => {
    if (!cells?.size) return
    setExpanded((prev) => {
      let next = prev
      for (const row of rows) {
        const parent = parentOf(row)
        if (parent && cells.has(row.id) && !next.has(parent)) {
          if (next === prev) next = new Set(prev)
          next.add(parent)
        }
      }
      return next
    })
  }, [cells, rows])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  const allIds = rows.map((r) => r.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = allIds.some((id) => selected.has(id))

  const nested = (r: ViewRow) => nest && rows.some((h) => h.id === parentOf(r))
  const ordered = rows
    .filter((r) => !nested(r))
    .flatMap((r) => {
      // Earlier versions newest first, then duplicates of the file itself
      const versions = nest
        ? rows
            .filter((v) => parentOf(v) === r.id)
            .sort((a, b) => Number(!!a.duplicateOf) - Number(!!b.duplicateOf) || (b.versionNo ?? 0) - (a.versionNo ?? 0))
        : []
      return [r, ...(isOpen(r.id) ? versions : [])].map((row) => ({ row, versions }))
    })

  return (
    <div style={{ minWidth: tableWidth }}>
      {label !== null && (
        <div className="border-b border-border-subtle bg-surface-base px-2 py-1.5">
          <span className="inline-block rounded-lg border border-border-subtle bg-body px-2 py-1 text-body-s font-medium text-text-subtle shadow-[0_1px_4px_#1717170a]">
            <AiText text={label} writing={sectionWriting} delay={Math.min(wave, 8) * 40} />
          </span>
        </div>
      )}
      <table className="w-full table-fixed border-collapse bg-body text-body-m text-text-subtle">
        <colgroup>
          {columns.map((c) => (
            <col key={c.label} style={{ width: c.width }} />
          ))}
        </colgroup>
        <thead>
          <tr className="text-left">
            {columns.map(({ id, label: column, icon: Icon }) => (
              <th
                key={id}
                className={`border-r border-b border-border-subtle py-2 font-medium whitespace-nowrap ${
                  id === 'name' ? 'pr-2 pl-1.5' : 'px-2'
                }`}
              >
                <span className="flex items-center gap-1">
                  {id === 'name' && (
                    <>
                      <RowCheck
                        checked={allSelected}
                        indeterminate={!allSelected && someSelected}
                        label="all"
                        force
                        onToggle={() => onSelectRows(allIds, !allSelected)}
                      />
                      <span className="w-4 shrink-0" aria-hidden />
                    </>
                  )}
                  <Icon size={14} stroke={1.75} />
                  {id === 'date' ? <AiText text={column} writing={dateHeaderWriting} /> : column}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.map(({ row: r, versions }, i) => {
            const child = nested(r)
            const checked = selected.has(r.id)
            const open = detailId === r.id
            const delay = Math.min(wave * 48 + i * 28, 420)
            const change = cells?.get(r.id)
            return (
              <tr
                key={r.id}
                data-row-id={r.id}
                className={`group hover:bg-surface-hover ${checked ? 'bg-surface-selected' : child ? 'bg-surface-base' : ''} ${highlightIds.includes(r.id) ? (highlightHeld ? 'bg-brand-subtle!' : 'animate-row-flash') : ''}`}
              >
                {columns.map((column) => {
                  if (column.id === 'name') {
                    return (
                      <td key={column.id} className={`${nameCell} group/cell relative max-w-0 overflow-hidden`}>
                        <span className={`flex w-full min-w-0 items-center gap-1 ${open ? 'pr-10' : 'group-hover:pr-10'}`}>
                          <RowCheck
                            checked={checked}
                            label={r.display}
                            force={selected.size > 0}
                            onToggle={() => onToggle(r.id)}
                          />
                          {child ? (
                            <span className="w-[34px] shrink-0" />
                          ) : versions.length > 0 ? (
                            <button
                              onClick={() => toggle(r.id)}
                              aria-label={`${isOpen(r.id) ? 'Hide' : 'Show'} ${versions.length} archived ${versions.length === 1 ? 'file' : 'files'}`}
                              className="grid size-4 shrink-0 place-items-center rounded hover:bg-surface-hover"
                            >
                              <IconChevronRight size={14} stroke={1.75} className={isOpen(r.id) ? 'rotate-90' : ''} />
                            </button>
                          ) : (
                            <span className="w-4 shrink-0" />
                          )}
                          <span className="flex min-w-0 flex-1 items-center gap-1.5">
                            <FileIcon name={mode === 'applied' ? r.name : r.original} />
                            <NameText name={r.display}>
                              <AiText text={r.display} writing={!!change?.name} delay={delay} />
                            </NameText>
                            {r.handling && <HandlingTag handling={r.handling} />}
                          </span>
                        </span>
                        {/* Sit over the end of the name, which shortens while the row is hovered. */}
                        <span
                          className={`absolute top-1/2 right-1.5 z-[1] flex -translate-y-1/2 items-center gap-0.5 ${
                            open ? '' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100'
                          }`}
                        >
                          <button
                            onClick={() => onOpen(r.id)}
                            aria-label={`Details for ${r.display}`}
                            title="File details"
                            className="grid size-4 place-items-center rounded text-text-subtle hover:bg-surface-hover hover:text-text-base"
                          >
                            <IconLayoutSidebarRight size={14} />
                          </button>
                          <button
                            onClick={() => onAsk(r)}
                            aria-label={`Ask about ${r.display}`}
                            title="Ask about this file"
                            className="grid size-4 place-items-center rounded text-text-subtle hover:bg-surface-hover hover:text-text-base"
                          >
                            <IconMessageFilled size={14} />
                          </button>
                        </span>
                      </td>
                    )
                  }
                  if (column.id === 'counterparty') {
                    return (
                      <td key={column.id} className={`${cell} max-w-0`}>
                        <span className="block min-w-0 truncate" title={counterpartyOf(r)}>
                          {counterpartyOf(r)}
                        </span>
                      </td>
                    )
                  }
                  if (column.id === 'type') {
                    return (
                      <td key={column.id} className={`${cell} max-w-0`}>
                        <span className="block min-w-0 truncate" title={r.type}>
                          <AiText text={r.type} writing={!!change?.type} delay={delay} />
                        </span>
                      </td>
                    )
                  }
                  if (column.id === 'status') {
                    return (
                      <td key={column.id} className={cell}>
                        <EditableSelect
                          value={r.status}
                          options={statusOptions}
                          onAdd={(text) => addStatus(text, statusOptions)}
                          label={`Status for ${r.display}`}
                          onChange={(status) => onEdit(r.id, { status })}
                        >
                          <StatusPill status={r.status} writing={!!change?.status} delay={delay} />
                        </EditableSelect>
                      </td>
                    )
                  }
                  if (column.id === 'date') {
                    return (
                      <td key={column.id} className={`${cell} whitespace-nowrap`}>
                        <EditableText
                          value={r.date ?? ''}
                          label={`${dateLabel} for ${r.display}`}
                          onChange={(date) => onEdit(r.id, { date: date.trim() && date.trim() !== '—' ? date.trim() : null })}
                        >
                          <AiText text={formatDate(r.date)} writing={!!change?.date} delay={delay} />
                        </EditableText>
                      </td>
                    )
                  }
                  if (column.id === 'version') {
                    return (
                      <td key={column.id} className={cell}>
                        <EditableSelect
                          value={r.versionLabel}
                          options={versionOptions}
                          label={`Version for ${r.display}`}
                          onChange={(versionLabel) => onEdit(r.id, { versionLabel })}
                        >
                          <VersionPill version={r.versionLabel} number={nest ? r.versionNo : undefined} writing={!!change?.version} delay={delay} />
                        </EditableSelect>
                      </td>
                    )
                  }
                  return (
                    <td key={column.id} className={`${cell} max-w-0`}>
                      <EditableText
                        value={r.note}
                        label={`Notes for ${r.display}`}
                        onChange={(note) => onEdit(r.id, { note })}
                      >
                        <NoteText text={r.note} writing={!!change?.note} delay={delay} />
                      </EditableText>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EditableSelect<T extends string>({
  value,
  options,
  onChange,
  onAdd,
  label,
  children,
}: {
  value: T
  options: readonly T[]
  onChange: (value: T) => void
  // Lets the user type an option the list doesn't have. Returns the option to choose.
  onAdd?: (text: string) => T | null
  label: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState({ top: 0, left: 0 })
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onScroll() {
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  function toggle() {
    const rect = root.current?.getBoundingClientRect()
    if (!rect) return
    const height = options.length * 28 + 8 + (onAdd ? 40 : 0)
    const top = rect.bottom + 4 + height > window.innerHeight ? Math.max(8, rect.top - 4 - height) : rect.bottom + 4
    const left = Math.min(rect.left, window.innerWidth - 176 - 8)
    setPlace({ top, left: Math.max(8, left) })
    setOpen((current) => !current)
  }

  return (
    <div ref={root} className="relative max-w-full">
      <button type="button" aria-label={label} aria-expanded={open} aria-haspopup="listbox" onClick={toggle} className="block max-w-full text-left">
        {children}
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={label}
          style={{ top: place.top, left: place.left }}
          className="fixed z-30 flex w-44 flex-col rounded-xl border border-border-base bg-white p-1 shadow-[0_3px_8px_#1717170d]"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-body-s hover:bg-surface-hover"
            >
              <span className="grid size-3.5 shrink-0 place-items-center text-brand">
                {option === value && <IconCheck size={12} />}
              </span>
              {option}
            </button>
          ))}
          {onAdd && (
            <AddStatusField
              onAdd={(text) => {
                const option = onAdd(text)
                if (!option) return
                onChange(option)
                setOpen(false)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

function EditableText({
  value,
  onChange,
  label,
  wrap,
  children,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  wrap?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const cancel = useRef(false)
  if (!open) {
    return (
      <button type="button" aria-label={label} onClick={() => { setDraft(value); setOpen(true) }} className={`block min-h-5 w-full bg-transparent text-left ${wrap ? '' : 'truncate'}`}>
        {children}
      </button>
    )
  }
  return (
    <input
      autoFocus
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (!cancel.current && draft !== value) onChange(draft)
        cancel.current = false
        setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          cancel.current = true
          e.currentTarget.blur()
        }
      }}
      className="w-full bg-transparent text-body-m outline-none"
    />
  )
}

function HandlingTag({ handling }: { handling: Handling }) {
  return (
    <span
      title={`${handling}: check before sharing outside the company`}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border-subtle px-1.5 py-px text-body-s whitespace-nowrap text-text-subtle"
    >
      <IconLock size={12} stroke={1.75} />
      {handling}
    </span>
  )
}

function Pill({ tone, children }: { tone: 'brand' | 'neutral' | 'warn'; children: React.ReactNode }) {
  const styles = {
    brand: 'bg-brand-subtle text-brand',
    neutral: 'bg-surface-subtle text-text-subtle',
    warn: 'bg-amber-50 text-amber-700',
  }
  return <span className={`inline-block rounded-md px-2 py-0.5 text-body-s font-medium whitespace-nowrap ${styles[tone]}`}>{children}</span>
}

function StatusPill({ status, writing, delay }: { status: Status; writing: boolean; delay: number }) {
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-body-s font-medium whitespace-nowrap ${statusStyle(status)}`}>
      <AiText text={status} writing={writing} delay={delay} />
    </span>
  )
}

function VersionPill({
  version,
  number,
  writing,
  delay,
}: {
  version: VersionLabel
  number?: number
  writing: boolean
  delay: number
}) {
  const text = <AiText text={version} writing={writing} delay={delay} />
  if (version === '—') return <span className="text-text-disabled">{text}</span>
  const tone =
    version === 'Archived' || version === 'Duplicate' || version === 'Open' || version === 'Template'
      ? 'neutral'
      : version === 'Needs your answer'
        ? 'warn'
        : 'brand'
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Pill tone={tone}>{text}</Pill>
      {number != null && <span className="text-body-s text-text-subtle">v{number}</span>}
    </span>
  )
}

function folderLabel(name: string, mode: Mode) {
  return mode === 'before' ? name.replace(/^\/Legal\/|^\//, '') : name
}

const menuItem = 'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-body-s hover:bg-surface-hover'

function EditMenu({
  panel,
  count,
  targets,
  moveQuery,
  mode,
  onMoveQuery,
  onShowMove,
  onShowDelete,
  onBack,
  onMove,
  onDelete,
}: {
  panel: 'menu' | 'move' | 'delete'
  count: number
  targets: string[]
  moveQuery: string
  mode: Mode
  onMoveQuery: (value: string) => void
  onShowMove: () => void
  onShowDelete: () => void
  onBack: () => void
  onMove: (folder: string) => void
  onDelete: () => void
}) {
  return (
    <div role="menu" className="absolute top-full right-0 z-20 mt-1 rounded-xl border border-border-base bg-white shadow-[0_3px_8px_#1717170d]">
      {panel === 'menu' && (
        <div className="flex w-44 flex-col p-1">
          <p className="px-2 py-1 text-body-s text-text-subtle">{count} selected</p>
          <button type="button" role="menuitem" onClick={onShowMove} className={`${menuItem} justify-between`}>
            Move
            <IconChevronRight size={14} />
          </button>
          <div className="my-1 h-px bg-border-subtle" />
          <button type="button" role="menuitem" onClick={onShowDelete} className={`${menuItem} text-red-700`}>
            Delete
          </button>
        </div>
      )}
      {panel === 'move' && (
        <div className="flex w-56 flex-col p-1">
          <button type="button" onClick={onBack} className="flex items-center gap-1 rounded-md px-2 py-1 text-left text-body-s text-text-subtle hover:bg-surface-hover">
            <IconChevronRight size={13} className="rotate-180" />
            Move to
          </button>
          <label className="mx-1 mb-1 flex items-center gap-1.5 rounded-md bg-surface-base px-1.5 py-1">
            <IconSearch size={12} className="shrink-0 text-text-subtle" />
            <input
              autoFocus
              value={moveQuery}
              onChange={(e) => onMoveQuery(e.target.value)}
              placeholder="Folder"
              className="min-w-0 flex-1 bg-transparent text-body-s outline-none placeholder:text-text-subtle"
            />
          </label>
          <div className="max-h-52 overflow-auto">
            {targets.length === 0 && <p className="px-2 py-1 text-body-s text-text-subtle">No folders</p>}
            {targets.map((folder) => (
              <button key={folder} type="button" title={folder} onClick={() => onMove(folder)} className={menuItem}>
                <span className="truncate">{folderLabel(folder, mode)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {panel === 'delete' && (
        <div className="flex w-56 flex-col gap-2 p-2">
          <p className="text-body-s">
            Delete {count} {count === 1 ? 'file' : 'files'}?
          </p>
          <p className="text-body-s text-text-subtle">They’re taken out of the repository.</p>
          <div className="flex justify-end gap-1">
            <button type="button" onClick={onBack} className="rounded-md px-2 py-1 text-body-s text-text-subtle hover:bg-surface-hover">
              Cancel
            </button>
            <button type="button" onClick={onDelete} className="rounded-md px-2 py-1 text-body-s font-medium text-red-700 hover:bg-red-50">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function NoteText({ text, writing = false, delay = 0 }: { text: string; writing?: boolean; delay?: number }) {
  const [tip, setTip] = useState<{ top: number; left: number; maxWidth: number; above: boolean } | null>(null)
  return (
    <span
      className="block min-w-0 truncate"
      onMouseEnter={(e) => {
        const el = e.currentTarget
        if (!text || el.scrollWidth <= el.clientWidth + 1) return
        const r = el.getBoundingClientRect()
        const maxWidth = Math.min(360, window.innerWidth - 16)
        const left = Math.max(8, Math.min(r.left, window.innerWidth - maxWidth - 8))
        const above = r.bottom + 72 > window.innerHeight
        setTip({ top: above ? r.top - 4 : r.bottom + 4, left, maxWidth, above })
      }}
      onMouseLeave={() => setTip(null)}
    >
      <AiText text={text || '—'} writing={writing} delay={delay} />
      {tip &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-40 rounded-lg border border-border-subtle bg-body px-2.5 py-1.5 text-body-s text-text-base shadow-[0_6px_16px_#1f1f1f0f] [overflow-wrap:anywhere]"
            style={{ top: tip.top, left: tip.left, maxWidth: tip.maxWidth, transform: tip.above ? 'translateY(-100%)' : undefined }}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  )
}

function NameText({ name, children }: { name: string; children: React.ReactNode }) {
  const [tip, setTip] = useState<{ top: number; left: number; maxWidth: number } | null>(null)
  return (
    <span
      className="block min-w-0 flex-1 truncate"
      onMouseEnter={(e) => {
        const el = e.currentTarget
        if (el.scrollWidth <= el.clientWidth + 1) return
        const r = el.getBoundingClientRect()
        const row = el.closest('tr')?.getBoundingClientRect() ?? r
        const left = Math.max(8, r.left - 8)
        const maxWidth = Math.min(420, window.innerWidth - left - 8)
        setTip({ top: row.bottom + 4, left, maxWidth })
      }}
      onMouseLeave={() => setTip(null)}
    >
      {children}
      {tip &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-40 w-max rounded-lg border border-border-subtle bg-body px-2 py-1 text-body-s font-medium text-text-base shadow-[0_6px_16px_#1f1f1f0f] [overflow-wrap:anywhere]"
            style={{ top: tip.top, left: tip.left, maxWidth: tip.maxWidth }}
          >
            {name}
          </span>,
          document.body,
        )}
    </span>
  )
}

function RowCheck({
  checked,
  indeterminate,
  label,
  force,
  onToggle,
}: {
  checked: boolean
  indeterminate?: boolean
  label: string
  force: boolean
  onToggle: () => void
}) {
  const shown = checked || indeterminate || force
  const on = checked || indeterminate
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label === 'all' ? 'Select all' : `Select ${label}`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`grid size-3.5 shrink-0 place-items-center rounded-[4px] border ${
        on ? 'border-brand bg-brand text-text-on-color' : 'border-border-base bg-body'
      } ${
        shown
          ? 'opacity-100'
          : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100'
      }`}
    >
      {checked && <IconCheck size={10} stroke={3} />}
      {indeterminate && <IconMinus size={10} stroke={3} />}
    </button>
  )
}

function FileSheet({
  row,
  renamed,
  dateLabel,
  onClose,
  onEdit,
}: {
  row: ViewRow
  renamed: boolean
  dateLabel: string
  onClose: () => void
  onEdit: (id: string, patch: FieldEdit) => void
}) {
  const statusOptions = useStatusOptions()
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const editing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement
      if (!editing) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const shownName = renamed ? row.name : row.display
  const pdf = /\.pdf$/i.test(shownName)
  const note = row.note

  return (
    <aside className="absolute inset-y-0 right-0 z-30 flex w-[380px] max-w-full flex-col border-l border-border-subtle bg-body shadow-[-8px_0_24px_#17171714]">
      <header className="flex items-start gap-2 px-3 py-3">
        <span className="mt-0.5">
          <FileIcon name={shownName} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-body-m font-medium">{row.display}</h2>
          <p className="truncate text-body-s text-text-subtle" title={row.original}>
            {row.original}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="grid size-6 shrink-0 place-items-center rounded-md text-text-subtle hover:bg-surface-hover"
        >
          <IconX size={14} />
        </button>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-auto px-3 py-3">
        <div className="flex flex-col items-center gap-2 rounded-xl bg-surface-base px-4 py-4">
          <DocPreview row={row} pdf={pdf} />
          <button
            type="button"
            className="flex h-[22px] items-center gap-1 rounded-lg border border-border-subtle bg-body px-2 text-body-s font-medium text-text-base shadow-[0_2px_3px_#64646414] hover:bg-surface-hover"
          >
            Open
            <IconArrowUpRight size={12} stroke={1.75} />
          </button>
        </div>
        <div className="flex flex-col">
          <Meta label="Name">
            <span className="block break-words">{shownName}</span>
          </Meta>
          <Meta label="Original file path">
            <span className="block break-words">{row.original}</span>
          </Meta>
          <Meta label="Status">
            <EditableSelect
              value={row.status}
              options={statusOptions}
              onAdd={(text) => addStatus(text, statusOptions)}
              label={`Status for ${row.display}`}
              onChange={(status) => onEdit(row.id, { status })}
            >
              <StatusPill status={row.status} writing={false} delay={0} />
            </EditableSelect>
          </Meta>
          {row.handling && (
            <Meta label="Handling">
              <HandlingTag handling={row.handling} />
            </Meta>
          )}
          <Meta label={dateLabel}>
            <EditableText
              value={row.date ?? ''}
              label={`${dateLabel} for ${row.display}`}
              onChange={(date) => onEdit(row.id, { date: date.trim() && date.trim() !== '—' ? date.trim() : null })}
            >
              {formatDate(row.date)}
            </EditableText>
          </Meta>
          <Meta label="Version">
            <EditableSelect
              value={row.versionLabel}
              options={versionOptions}
              label={`Version for ${row.display}`}
              onChange={(versionLabel) => onEdit(row.id, { versionLabel })}
            >
              <VersionPill version={row.versionLabel} number={row.versionLabel !== '—' ? row.versionNo : undefined} writing={false} delay={0} />
            </EditableSelect>
          </Meta>
          <Meta label="Notes">
            <EditableText wrap value={note} label={`Notes for ${row.display}`} onChange={(next) => onEdit(row.id, { note: next })}>
              <span className="block">{note || '—'}</span>
            </EditableText>
          </Meta>
          <Meta label="File ID">{row.id}</Meta>
          <Meta label="Size">{formatSize(row.sizeKb)}</Meta>
          {dateLabel === 'Date' && <Meta label="Last modified">{formatDate(row.modified)}</Meta>}
        </div>
      </div>
    </aside>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-2 py-2">
      <span className="pt-0.5 text-body-s text-text-subtle">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function DocPreview({ row, pdf }: { row: ViewRow; pdf: boolean }) {
  return (
    <div className="flex h-56 w-40 flex-col overflow-hidden rounded-sm border border-border-subtle bg-white shadow-[0_2px_8px_#1717171a]">
      <div className={`h-1 ${pdf ? 'bg-[#e5372b]' : 'bg-[#2b7cd3]'}`} />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <span className="text-[8px] font-medium tracking-wide text-text-disabled uppercase">{row.type}</span>
        <span className="line-clamp-3 text-[11px] leading-tight font-semibold">{row.display}</span>
        <p className="line-clamp-6 text-[8px] leading-[11px] text-text-subtle">{row.excerpt}</p>
        <div className="mt-auto flex flex-col gap-1.5 pt-2">
          <span className="h-px w-16 bg-border-base" />
          <span className="h-px w-10 bg-border-base" />
        </div>
      </div>
    </div>
  )
}
