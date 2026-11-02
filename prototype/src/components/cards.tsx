// Chat cards: every proposal from the assistant arrives as one of these.
// Words carry intent; controls carry commitment (design.md, "Cards in the chat").
// Visual system from the Figma report card (node 2009:143219): grey title bar,
// white sections split by grey sub-header bars, outlined tiles.
import { useEffect, useId, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck, IconLoader2, IconArrowBackUp, IconArrowLeft, IconArrowRight, IconArrowUpRight, IconChevronRight, IconChevronUp, IconSearch } from '@tabler/icons-react'
import { FileIcon } from './FileIcon'
import { AddStatusField } from './AddStatusField'
import { addStatus, statusStyle, useAddedStatuses } from '../statuses'
import {
  buildGroups,
  byId,
  cases,
  companyFolders,
  companyIsFolder,
  conflictStatus,
  conflicting,
  employmentInFiling,
  englishList,
  facetValue,
  familySplits,
  filedToday,
  folderOf,
  isTemplate,
  namingLabels,
  patternName,
  sampleSubfolders,
  splittingFacets,
  stats,
  topFacet,
  topFolders,
  unidentifiedFiles,
  unidentifiedPitch,
  unidentifiedQueue,
  unidentifiedRead,
  statusGap,
  statusRuleFor,
  statusRuleSplit,
  versionsOf,
  type Choice,
  type Convention,
  type CurrentRule,
  type DateSource,
  type Decisions,
  type StatusMarks,
  type StatusRuleId,
  type Facet,
  type Group,
  type NamingPattern,
  type ViewRow,
} from '../flow'
import { allRows, formatDate, type FileRow, type Status } from '../data'

// ---- Shared pieces ----

function Bar({ children, first }: { children: ReactNode; first?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-2 border-b border-border-subtle bg-surface-base px-2 py-1.5 text-body-s font-medium text-text-subtle ${
        first ? '' : 'border-t'
      }`}
    >
      {children}
    </div>
  )
}

function Card({ title, scope, children }: { title: string; scope?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-body shadow-[0_1px_4px_#1717170a]">
      <Bar first>
        <span>{title}</span>
        {scope && <span className="font-normal">{scope}</span>}
      </Bar>
      {children}
    </div>
  )
}

// A titled part of a card; the first part of a card goes untitled under the card's own bar.
function Section({ title, aside, children }: { title?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <>
      {title && (
        <Bar>
          <span>{title}</span>
          {aside}
        </Bar>
      )}
      <div className="flex flex-col gap-2 p-2 text-body-s">{children}</div>
    </>
  )
}

function Actions({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-1.5 border-t border-border-subtle bg-surface-base px-2 py-1.5">{children}</div>
  )
}

function Button({
  children,
  onClick,
  primary,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  primary?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[22px] items-center gap-1 rounded-lg px-2 text-body-s font-medium shadow-[0_2px_3px_#64646414] disabled:opacity-40 ${
        primary
          ? 'bg-neutral-950 text-text-on-color hover:bg-neutral-950/85'
          : 'border border-border-subtle bg-body text-text-subtle hover:bg-surface-hover'
      }`}
    >
      {children}
    </button>
  )
}

function Tile({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-xl border border-border-subtle px-2 py-1">
      <span className="text-[16px] leading-6 font-semibold tracking-[-0.35px]">{value}</span>
      <span className="text-body-s text-text-subtle">{label}</span>
    </div>
  )
}

export type PlaybackItem = { value: ReactNode; label: string; rowIds?: string[] }

export function ActionPlayback({
  items,
  onShow,
  filing,
}: {
  items: PlaybackItem[]
  onShow?: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
  filing?: Decisions
}) {
  const [open, setOpen] = useState(false)
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set())
  const [first, second, ...rest] = items
  const changes = items.filter((item) => item.rowIds?.length)
  const groups = useMemo(() => (filing ? buildGroups(filing) : []), [filing])
  // Match the preview: subfolders only exist once a second level is chosen.
  const by = filing?.convention && filing.secondLevel ? filing.secondLevel : null

  function toggle(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl bg-surface-base">
      <div className="px-2 py-1.5 text-body-s font-medium text-text-subtle">Playback:</div>
      <div className="flex flex-col gap-2 px-2 pb-2">
        <div className="flex gap-2">
          {[first, second].filter(Boolean).map((item) => (
            <PlaybackTile key={item.label} {...item} />
          ))}
        </div>
        {rest.map((item) => (
          <PlaybackTile key={item.label} {...item} />
        ))}
        {changes.length > 0 && (
          <div className="-mx-2 flex flex-col border-t border-border-subtle px-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="flex items-center gap-0.5 text-body-s text-text-subtle"
            >
              {open ? <IconChevronUp size={13} className="shrink-0" /> : <IconChevronRight size={13} className="shrink-0" />}
              Changes
            </button>
            {open && (
              <div className="mt-1 flex flex-col">
                {changes.map((item, index) => {
                  const key = `${index}:${item.label}`
                  const expanded = openKeys.has(key)
                  const folders = expanded ? changeFolders(item.rowIds!, groups, by) : []
                  return (
                    <div key={key}>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => toggle(key)}
                        className="flex w-full items-start gap-0.5 py-0.5 text-left text-body-s text-text-subtle"
                      >
                        <IconChevronRight size={13} className={`mt-0.5 shrink-0 ${expanded ? 'rotate-90' : ''}`} />
                        <span>
                          <span className="font-medium text-text-base">{item.value}</span> {item.label}
                        </span>
                      </button>
                      {expanded && (
                        <div className="flex flex-col">
                          {folders.map((folder) => (
                            <ChangeFolder
                              key={folder.name}
                              folder={folder}
                              openKeys={openKeys}
                              onToggle={toggle}
                              onShow={onShow}
                              path={key}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// One change, split the way the preview is: top folder, then the subfolder, then each file.
function changeFolders(ids: string[], groups: Group[], by: Facet | null) {
  const wanted = new Set(ids)
  const folders: ChangeFolder[] = []
  for (const group of groups) {
    const rows = group.rows.filter((row) => wanted.has(row.id)).sort((a, b) => a.display.localeCompare(b.display))
    if (rows.length === 0) continue
    if (!by) {
      folders.push({ name: group.name, ids: rows.map((row) => row.id), sections: null, rows })
      continue
    }
    const buckets = new Map<string, ViewRow[]>()
    for (const row of rows) {
      const section = facetValue(row, by)
      const list = buckets.get(section)
      if (list) list.push(row)
      else buckets.set(section, [row])
    }
    folders.push({
      name: group.name,
      ids: rows.map((row) => row.id),
      rows,
      sections: [...buckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, sectionRows]) => ({ name, ids: sectionRows.map((row) => row.id), rows: sectionRows })),
    })
  }
  return folders
}

type ChangeFolder = {
  name: string
  ids: string[]
  rows: ViewRow[]
  sections: { name: string; ids: string[]; rows: ViewRow[] }[] | null
}

function ChangeFolder({
  folder,
  openKeys,
  onToggle,
  onShow,
  path,
}: {
  folder: ChangeFolder
  openKeys: Set<string>
  onToggle: (key: string) => void
  onShow?: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
  path: string
}) {
  const key = `${path}/${folder.name}`
  const expanded = openKeys.has(key)
  const sections = folder.sections
  return (
    <div>
      <ChangeBranch
        label={folder.name}
        count={folder.ids.length}
        expanded={expanded}
        depth={1}
        onToggle={() => onToggle(key)}
        onShow={onShow && ((mode) => onShow(folder.name, folder.ids, mode))}
        showLabel={`Show changes in ${folder.name}`}
      />
      {expanded && sections && (
        <div className="flex flex-col">
          {sections.map((section) => (
            <ChangeSection
              key={section.name}
              folder={folder.name}
              section={section}
              openKeys={openKeys}
              onToggle={onToggle}
              onShow={onShow}
              path={key}
            />
          ))}
        </div>
      )}
      {expanded && !sections && <ChangeFiles folder={folder.name} rows={folder.rows} depth={2} onShow={onShow} />}
    </div>
  )
}

function ChangeSection({
  folder,
  section,
  openKeys,
  onToggle,
  onShow,
  path,
}: {
  folder: string
  section: { name: string; ids: string[]; rows: ViewRow[] }
  openKeys: Set<string>
  onToggle: (key: string) => void
  onShow?: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
  path: string
}) {
  const key = `${path}/${section.name}`
  const expanded = openKeys.has(key)
  return (
    <div>
      <ChangeBranch
        label={section.name}
        count={section.ids.length}
        expanded={expanded}
        depth={2}
        onToggle={() => onToggle(key)}
        onShow={onShow && ((mode) => onShow(folder, section.ids, mode))}
        showLabel={`Show changes in ${folder}, ${section.name}`}
      />
      {expanded && <ChangeFiles folder={folder} rows={section.rows} depth={3} onShow={onShow} />}
    </div>
  )
}

function ChangeFiles({
  folder,
  rows,
  depth,
  onShow,
}: {
  folder: string
  rows: ViewRow[]
  depth: number
  onShow?: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
}) {
  return (
    <>
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-0.5 py-0.5" style={{ paddingLeft: depth * 16 }}>
          <span className="w-[13px] shrink-0" />
          <FileIcon name={row.original} />
          <span className="min-w-0 flex-1 truncate text-body-s text-text-subtle" title={row.display}>
            {row.display}
          </span>
          {onShow && <PreviewButton label={`Show ${row.display}`} onShow={(mode) => onShow(folder, [row.id], mode)} />}
        </div>
      ))}
    </>
  )
}

function ChangeBranch({
  label,
  count,
  expanded,
  depth,
  onToggle,
  onShow,
  showLabel,
}: {
  label: string
  count: number
  expanded: boolean
  depth: number
  onToggle: () => void
  onShow?: (mode?: 'hold' | 'release') => void
  showLabel: string
}) {
  return (
    <div className="flex items-center gap-0.5" style={{ paddingLeft: depth * 16 }}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-0.5 py-0.5 text-left text-body-s text-text-subtle"
      >
        <IconChevronRight size={13} className={`shrink-0 ${expanded ? 'rotate-90' : ''}`} />
        <span className="min-w-0 truncate" title={label}>
          {label}
        </span>
        <span className="ml-1 shrink-0 tabular-nums text-text-disabled">{count}</span>
      </button>
      {onShow && <PreviewButton label={showLabel} onShow={onShow} />}
    </div>
  )
}

function PreviewButton({ label, onShow }: { label: string; onShow: (mode?: 'hold' | 'release') => void }) {
  return (
    <button
      type="button"
      onMouseEnter={() => onShow('hold')}
      onMouseLeave={() => onShow('release')}
      onClick={() => onShow()}
      aria-label={label}
      title="Show in table"
      className="grid size-6 shrink-0 place-items-center rounded-md text-text-subtle hover:bg-surface-hover hover:text-text-base"
    >
      <IconArrowUpRight size={14} stroke={1.75} />
    </button>
  )
}

function PlaybackTile({ value, label }: PlaybackItem) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5 rounded-xl bg-surface-subtle px-2 py-1">
      <span className="text-[16px] leading-6 font-semibold tracking-[-0.35px]">{value}</span>
      <span className="text-body-s text-text-subtle">{label}</span>
    </div>
  )
}

// ---- C1 Opening report ----

export function OpeningReportCard({ onStart, started }: { onStart: () => void; started: boolean }) {
  const total = filedToday.reduce((n, f) => n + f.files, 0)
  return (
    <Card title="Organisation report">
      <div className="flex gap-2 p-2">
        <Tile value={stats.agreements} label="Total agreements" />
        <Tile value={stats.counterparties} label="Counterparty categories" />
        <Tile value={stats.originalFolders} label="Folders found currently" />
      </div>
      <Section title="Current file structure">
        <span className="font-medium text-text-subtle">Documents are filed by:</span>
        <div className="flex h-4 w-full overflow-hidden">
          {filedToday.map((f) => (
            <div key={f.label} className={f.color} style={{ width: `${(f.files / total) * 100}%` }} title={`${f.label}: ${f.files} files`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          {filedToday.map((f) => (
            <span key={f.label} className="flex items-center gap-2 font-medium text-text-subtle">
              <span className={`size-2 rounded-full ${f.color}`} />
              {f.label} · {f.files}
            </span>
          ))}
        </div>
      </Section>
      {!started && (
        <Actions>
          <Button primary onClick={onStart}>
            Let’s organise
          </Button>
        </Actions>
      )}
    </Card>
  )
}

// ---- C2 Convention: top level, then second level ----

interface LevelOption<K> {
  key: K
  label: string
  detail: string
  recommended?: boolean
  disabled?: boolean
  // What hovering the option previews, shown beside the card.
  // `wide` is for a file, the line about it, and an outcome tag side by side.
  preview: { caption: string; body: ReactNode; wide?: boolean }
}

const previewCount = 3

// Floats beside the hovered option, outside the chat column (Figma nodes 2009:145945, 2009:153959).
// It hugs its content; file rows may grow to 520px before they wrap.
function Preview({
  caption,
  top,
  left,
  wide,
  children,
}: {
  caption: string
  top: number
  left: number
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`pointer-events-none fixed z-20 flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-body shadow-[0_6px_16px_#1f1f1f0f] ${
        wide ? 'w-max max-w-[520px] min-w-[168px]' : 'w-max max-w-[380px] min-w-[168px]'
      }`}
      style={{ top, left }}
    >
      <span className="truncate px-2 py-1.5 text-body-s font-medium text-text-subtle">{caption}</span>
      <div className="flex flex-col items-start gap-1 px-2 pb-2">{children}</div>
    </div>
  )
}

// The filename a chip stands for: the real file when we have one, otherwise the label.
function pillName(name: string | undefined, children: ReactNode) {
  if (name) return name.slice(name.lastIndexOf('/') + 1)
  return typeof children === 'string' ? children : ''
}

// A bordered chip naming a folder or file (the Figma "Filter Pills").
// `name` is the real filename, so a file chip can show its Word or PDF icon.
// The tooltip only appears when the label is cut off.
function Pill({ children, name, full }: { children: ReactNode; name?: string; full?: boolean }) {
  const label = pillName(name, children)
  const [tip, setTip] = useState<{ top: number; left: number; maxWidth: number; above: boolean } | null>(null)

  useEffect(() => {
    if (!tip) return
    const hide = () => setTip(null)
    window.addEventListener('scroll', hide, true)
    return () => window.removeEventListener('scroll', hide, true)
  }, [tip])

  function showTip(e: MouseEvent<HTMLSpanElement>) {
    if (!label) return
    const text = e.currentTarget.querySelector(':scope > span')
    const clipped = !!text && (text.scrollWidth > text.clientWidth + 1 || text.scrollHeight > text.clientHeight + 1)
    if (!clipped) return
    const anchor = e.currentTarget.closest('[data-example-row]') ?? e.currentTarget
    const r = anchor.getBoundingClientRect()
    const maxWidth = Math.min(360, window.innerWidth - 16)
    const left = Math.max(8, Math.min(r.left, window.innerWidth - maxWidth - 8))
    const above = r.bottom + 48 > window.innerHeight
    setTip({ top: above ? r.top - 4 : r.bottom + 4, left, maxWidth, above })
  }

  return (
    <span
      className={`flex items-center gap-1 rounded-lg border border-border-subtle bg-body px-2 py-1 text-body-s font-medium text-text-subtle shadow-[0_1px_4px_#1717170a] ${
        full ? 'max-w-full min-w-0' : 'max-w-[200px] shrink-0'
      }`}
      onMouseEnter={showTip}
      onMouseLeave={() => setTip(null)}
    >
      {name && <FileIcon name={name} />}
      <span className={full ? 'min-w-0 break-words' : 'min-w-0 truncate'}>{children}</span>
      {tip &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-40 w-max rounded-lg border border-border-subtle bg-body px-2 py-1 text-body-s font-medium text-text-base shadow-[0_6px_16px_#1f1f1f0f] [overflow-wrap:anywhere]"
            style={{
              top: tip.top,
              left: tip.left,
              maxWidth: tip.maxWidth,
              transform: tip.above ? 'translateY(-100%)' : undefined,
            }}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  )
}

function FolderPills({ folders }: { folders: string[] }) {
  return (
    <>
      {folders.slice(0, previewCount).map((f) => (
        <Pill key={f}>{f}</Pill>
      ))}
      {folders.length > previewCount && (
        <span className="px-0.5 text-body-s text-text-subtle">and {folders.length - previewCount} more</span>
      )}
    </>
  )
}

// One folder level as a choice: tiles, a hover preview, and once applied the other
// options fold away so only the chosen one stays (Figma nodes 2009:143323, 2009:146044)
function LevelCard<K extends string>({
  title,
  intro,
  optionsTitle,
  options: given,
  value,
  onConfirm,
  onUndo,
  onSkip,
  onBack,
  skipped,
  skipNote,
  locked,
}: {
  title: string
  // Shown above the options, e.g. the issue and its example files
  intro?: ReactNode
  optionsTitle?: string
  options: LevelOption<K>[]
  value: K | null
  onConfirm: (k: K) => void
  onUndo: () => void
  // Present when this question can be left for later
  onSkip?: () => void
  onBack?: () => void
  skipped?: boolean
  skipNote?: string
  locked: boolean
}) {
  // The recommended option always comes first
  const options = [...given].sort((a, b) => Number(!!b.recommended) - Number(!!a.recommended))
  // Nothing is filled in until the user hovers or picks an option
  const [pick, setPick] = useState<K | null>(value)
  const [hover, setHover] = useState<{ key: K; top: number; left: number } | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const decided = value !== null || !!skipped
  const shown = (k: K) => !skipped && (!decided || k === value)
  const blocked = !!pick && !!options.find((o) => o.key === pick)?.disabled
  const chosen = blocked ? null : pick
  const hovered = hover && options.find((o) => o.key === hover.key)
  return (
    <Card title={title}>
      {intro}
      {optionsTitle && !skipped && <Bar>{optionsTitle}</Bar>}
      <div ref={list} className="flex flex-col p-2" onMouseLeave={() => setHover(null)}>
        {options.map((o) => {
          const active = decided ? o.key === value : chosen === o.key
          const firstShown = options.find((x) => shown(x.key))?.key === o.key
          return (
            <div
              key={o.key}
              inert={!shown(o.key)}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                shown(o.key) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className={`transition-[padding] duration-300 ${firstShown ? '' : 'pt-2'}`}>
                  <button
                    disabled={decided || o.disabled}
                    onClick={() => {
                      if (!o.disabled) setPick(o.key)
                    }}
                    onMouseEnter={(e) => {
                      if (decided || o.disabled) return
                      const r = e.currentTarget.getBoundingClientRect()
                      const card = list.current!.getBoundingClientRect()
                      // Keep the preview on screen when the option sits near the bottom of the chat
                      setHover({ key: o.key, top: Math.min(r.top, window.innerHeight - 160), left: card.right + 8 })
                    }}
                    className={`flex w-full flex-col gap-0.5 rounded-xl border px-2 py-1 text-left transition-colors ${
                      active
                        ? `border-transparent ${decided ? 'bg-surface-selected' : 'bg-surface-hover'}`
                        : 'border-border-subtle hover:bg-surface-hover'
                    }`}
                  >
                    <span className="text-body-m font-medium">
                      {decided ? o.label.replace('Organise ', 'Organised ') : o.label}
                    </span>
                    <span className="text-body-s text-text-subtle">{o.detail}</span>
                    {/* Figma node 2009:143328: a plain brand-coloured line under the description */}
                    {o.recommended && <span className="py-0.5 text-body-s font-medium text-brand">Recommended</span>}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {skipped && skipNote && <span className="px-1 py-1 text-body-s text-text-subtle">{skipNote}</span>}
      </div>
      {hover && hovered && !decided && (
        <Preview caption={hovered.preview.caption} top={hover.top} left={hover.left} wide={hovered.preview.wide}>
          {hovered.preview.body}
        </Preview>
      )}
      <Actions>
        {decided && !locked && <Button onClick={onUndo}>Undo changes</Button>}
        {decided ? (
          <span className="flex h-[22px] items-center rounded-lg bg-surface-disabled px-2 text-body-s font-medium text-text-on-color shadow-[0_2px_3px_#64646414]">
            {skipped ? 'Skipped' : 'Applied'}
          </span>
        ) : (
          <>
            {onBack && <Button onClick={onBack}>Back</Button>}
            {onSkip && <Button onClick={onSkip}>Skip</Button>}
            <Button primary disabled={!chosen} onClick={() => chosen && onConfirm(chosen)}>
              Apply
            </Button>
          </>
        )}
      </Actions>
    </Card>
  )
}

const topLevelOptions: LevelOption<Convention>[] = (
  [
    { key: 'A', label: 'Organise by Counterparty', why: 'Everything with one company lives in the same place.', recommended: true },
    { key: 'B', label: 'Organise by Type', why: 'All documents of one type are in the same place.' },
    { key: 'C', label: 'Organise by Status', why: 'Files move again every time their status changes.' },
  ] as const
).map(({ why, ...o }) => {
  const folders = topFolders(o.key)
  return {
    ...o,
    detail: `Leaves ${folders.length} top folders. ${why}`,
    preview: { caption: 'Preview:', body: <FolderPills folders={folders} /> },
  }
})

export function ConventionCard(props: {
  value: Convention | null
  onConfirm: (c: Convention) => void
  onUndo: () => void
  locked: boolean
}) {
  return <LevelCard title="Organisation convention" options={topLevelOptions} {...props} />
}

const facetLabel: Record<Facet, string> = {
  counterparty: 'Then by Counterparty',
  type: 'Then by Type',
  status: 'Then by Status',
  year: 'Then by Year',
}

// The reason has to be true of the folder already chosen, not only of counterparty → type.
function facetWhy(top: Convention, f: Facet): string {
  if (f === 'type' && top === 'A') return 'An MSA sits next to its SOWs and amendments.'
  if (f === 'type') return 'Same-status files of one type sit together. An MSA and its SOW stay apart when their status differs.'
  if (f === 'counterparty' && top === 'B') return 'One folder per company inside each type.'
  if (f === 'counterparty') return 'One folder per company inside each status. A company’s draft and signed copy stay in different top folders.'
  if (f === 'status') return 'Files move again when their status changes, and versions of one agreement can land in different folders.'
  if (f === 'year' && top === 'C') return 'Versions of one agreement can split across years, as well as sitting in different status folders.'
  return 'Versions of one agreement can split across years.'
}

export function SecondLevelCard({
  top,
  ...props
}: {
  top: Convention
  value: Facet | null
  onConfirm: (f: Facet) => void
  onUndo: () => void
  locked: boolean
}) {
  const facets = (['type', 'status', 'year', 'counterparty'] as Facet[]).filter((f) => f !== topFacet[top])
  const recommended: Facet = top === 'A' ? 'type' : 'counterparty'
  const options: LevelOption<Facet>[] = facets.map((f) => {
    const { folder, subfolders } = sampleSubfolders(top, f)
    return {
      key: f,
      label: facetLabel[f],
      detail: `${folder} gets ${subfolders.length} folder${subfolders.length === 1 ? '' : 's'}. ${facetWhy(top, f)}`,
      recommended: f === recommended,
      preview: { caption: `Inside ${folder}:`, body: <FolderPills folders={subfolders} /> },
    }
  })
  return <LevelCard title="Second level" options={options} {...props} />
}

// ---- C4/C5 Issues: patterns and specific cases, one card each (Figma node 2009:151194) ----

type Tag = 'Current' | 'Archived' | 'Candidate' | (string & {})

function TagPill({ tag }: { tag: Tag }) {
  return (
    <span
      title={tag}
      className={`max-w-full min-w-0 truncate rounded-md px-2 py-0.5 text-body-s font-medium ${
        tag === 'Current' ? 'bg-brand-subtle text-brand' : 'bg-surface-subtle text-text-subtle'
      }`}
    >
      {tag}
    </span>
  )
}

interface ExampleFile {
  file: string
  says: string
  // Filename with its extension, for the chip's file-type icon
  source?: string
}

// A file as a chip, what its name claims, and optionally what an answer would make it
function ExampleRow({ file, says, tag, source }: ExampleFile & { tag?: Tag }) {
  return (
    <span data-example-row className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <Pill name={source ?? file}>{file}</Pill>
      {says && <span className="max-w-full min-w-0 text-body-s font-medium text-text-subtle">{says}</span>}
      {tag && (
        <span className="flex max-w-full min-w-0 items-center gap-1">
          <IconArrowRight size={12} stroke={1.75} className="shrink-0 text-text-subtle" aria-label="becomes" />
          <TagPill tag={tag} />
        </span>
      )}
    </span>
  )
}

interface IssueOption<K extends string = Choice> {
  key: K
  label: string
  detail: string
  recommended?: boolean
  disabled?: boolean
  // What each example file becomes under this answer
  outcome: (ExampleFile & { tag: Tag })[]
}

// The last "Show in table" button that was hovered keeps its grey highlight.
let heldShowId: string | null = null
const heldShowListeners = new Set<(id: string | null) => void>()

function holdShowButton(id: string) {
  heldShowId = id
  heldShowListeners.forEach((fn) => fn(id))
}

function useShowHeld(id: string) {
  const [held, setHeld] = useState(() => heldShowId === id)
  useEffect(() => {
    const fn = (current: string | null) => setHeld(current === id)
    heldShowListeners.add(fn)
    return () => {
      heldShowListeners.delete(fn)
    }
  }, [id])
  return held
}

function IssueCard<K extends string>({
  number,
  heading,
  problem,
  example,
  customExample,
  note,
  onShowExample,
  options,
  value,
  onSkip,
  onBack,
  skipNote,
  ...decision
}: {
  number?: number
  heading?: string
  problem: string
  example: ExampleFile[]
  // Replaces the example list, for a step the user picks through before applying.
  customExample?: ReactNode
  note?: string
  onShowExample?: (mode?: 'hold' | 'release') => void
  options: IssueOption<K>[]
  value: K | 'skip' | null
  onConfirm: (c: K) => void
  onUndo: () => void
  onSkip?: () => void
  onBack?: () => void
  skipNote?: string
  locked: boolean
}) {
  const showId = useId()
  const showHeld = useShowHeld(showId)
  const skipped = value === 'skip'
  return (
    <LevelCard
      {...decision}
      value={skipped ? null : value}
      skipped={skipped}
      onSkip={onSkip}
      onBack={onBack}
      skipNote={skipNote}
      title={heading ?? `Issue ${number}:`}
      intro={
        <div className="flex flex-col gap-2 p-2">
          <span className="px-1 text-body-m font-medium">{problem}</span>
          {customExample ?? (
            <>
              <span className="flex items-center justify-between px-1 text-body-s font-medium text-text-subtle">
                Example:
                {onShowExample && (
                  <button
                    onClick={() => onShowExample()}
                    onMouseEnter={() => {
                      holdShowButton(showId)
                      onShowExample('hold')
                    }}
                    onMouseLeave={() => onShowExample('release')}
                    aria-label="Show in table"
                    title="Show in table"
                    className={`grid size-6 place-items-center rounded-md text-text-subtle transition-colors hover:bg-surface-hover ${showHeld ? 'bg-surface-hover' : ''}`}
                  >
                    <IconArrowUpRight size={14} stroke={1.75} />
                  </button>
                )}
              </span>
              {example.map((f) => (
                <ExampleRow key={f.file + f.says} {...f} />
              ))}
            </>
          )}
          {note && <span className="px-1 text-body-s text-text-subtle">{note}</span>}
        </div>
      }
      optionsTitle="Options:"
      options={options.map((o) => ({
        ...o,
        preview: {
          caption: 'Preview:',
          wide: true,
          body: o.outcome.map((f) => <ExampleRow key={f.file + f.tag} {...f} />),
        },
      }))}
    />
  )
}

interface IssueProps {
  value: Choice | 'skip' | null
  onConfirm: (c: Choice) => void
  onUndo: () => void
  onShow: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
  locked: boolean
  onSkip?: () => void
  skipNote?: string
}

// What each file's name claims, in plain words
const nameSays: Record<string, string> = {
  Signed: 'says signed',
  Template: 'status Template',
  Final: 'says FINAL',
  Draft: 'says draft',
  Pending: 'says pending signature',
  Unlabelled: 'no label',
  Undefined: 'no status found',
  Conflicting: 'says FINAL and draft',
}

// A copy mark isn't a status, but it's still what the name says
function nameSaysOf(file: FileRow) {
  if (file.status === 'Unlabelled' && /\bcopy\b/i.test(fileLabel(file))) return 'says copy'
  return nameSays[file.status] ?? `status ${file.status}`
}

const short = (name: string) => name.replace(/\.\w+$/, '')

// The filename in the repository today. Counterparty – Type – date is only a
// file's name once Apply renames it, so cards and previews keep this until then.
function fileLabel(file: FileRow) {
  return file.original.slice(file.original.lastIndexOf('/') + 1)
}

function outcomeRow(file: FileRow, tag: Tag) {
  const label = fileLabel(file)
  return { file: short(label), says: nameSaysOf(file), tag, source: label }
}

export function DatesCard({
  d,
  onShow,
  value,
  onConfirm,
  onUndo,
  locked,
}: {
  d: Decisions
  value: DateSource | null
  onConfirm: (source: DateSource) => void
  onUndo: () => void
  onShow: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
  locked: boolean
}) {
  const file = byId('F0012')
  const label = fileLabel(file)
  const name = short(label)
  const example = [
    {
      file: name,
      says: `name says ${formatDate(file.date)} · last edited ${formatDate(file.modified)}`,
      source: label,
    },
  ]
  const yearNote =
    d.secondLevel === 'year' ? ' You split by year, so the last-edited date moves files into the year they were saved.' : ''
  return (
    <IssueCard
      heading="Dates"
      problem={`${stats.dateConflicts} files have a date in the name that is not the day the file was last edited.`}
      example={example}
      note={`None of the ${stats.fullDateConflicts} full dates match that day, and ${stats.editedLater} of them were saved later. ${stats.sameDaySaves} files share one save day. ${stats.undated} files have no date in the name.${yearNote}`}
      onShowExample={(mode) => onShow(folderOf(file.id, d) ?? file.folder, [file.id], mode)}
      value={value === 'modified' ? 'B' : value === 'filename' ? 'A' : null}
      onConfirm={(c) => onConfirm(c === 'A' ? 'filename' : 'modified')}
      onUndo={onUndo}
      locked={locked}
      options={[
        {
          key: 'A',
          label: 'Keep the date in the filename',
          detail: `The date written for the agreement. Last edited stays on the file. Files with no date in the name can be dated one by one, or left as they are.`,
          outcome: [{ file: name, says: `Date column shows ${formatDate(file.date)}`, tag: 'From the name', source: label }],
        },
        {
          key: 'B',
          label: 'Use the last-edited date',
          detail: `Every file gets that full day, including the ${stats.undated} with nothing in the name. ${stats.yearMoves} files move to the year they were last saved.`,
          recommended: true,
          outcome: [{ file: name, says: `Column becomes Last modified, ${formatDate(file.modified)}`, tag: 'Last modified', source: label }],
        },
      ]}
    />
  )
}

function filesWithoutADate() {
  return allRows
    .filter((r) => r.date == null)
    .sort((a, b) => a.folder.localeCompare(b.folder) || a.original.localeCompare(b.original))
}

// A year, a year and month, or a full day. Anything else is left for the user to correct.
function suppliedDate(raw: string): string | null {
  const t = raw.trim()
  const full = t.match(/^((?:19|20)\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  if (full) {
    const parsed = new Date(Date.UTC(Number(full[1]), Number(full[2]) - 1, Number(full[3])))
    if (parsed.getUTCFullYear() !== Number(full[1]) || parsed.getUTCMonth() !== Number(full[2]) - 1) return null
    return `${full[1]}-${full[2]}-${full[3]}`
  }
  if (/^(?:19|20)\d\d-(?:0[1-9]|1[0-2])$/.test(t)) return t
  if (/^(?:19|20)\d\d$/.test(t)) return t
  return null
}

function UndatedReview({
  d,
  onShow,
  onDate,
  onBack,
  onFinish,
}: {
  d: Decisions
  onShow: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
  onDate: (id: string, date: string) => void
  onBack: () => void
  onFinish: (dated: string[], skipped: string[]) => void
}) {
  const files = useMemo(filesWithoutADate, [])
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState('')
  const [invalid, setInvalid] = useState(false)
  const dated = useRef<string[]>([])
  const skipped = useRef<string[]>([])
  const showFile = useRef(onShow)
  showFile.current = onShow
  const file = files[index]
  const parsed = suppliedDate(draft)

  useEffect(() => {
    if (!file) return
    showFile.current(folderOf(file.id, d) ?? file.folder, [file.id])
  }, [file, d])

  if (!file) return null

  function advance(nextDated: string[], nextSkipped: string[]) {
    if (index + 1 >= files.length) onFinish(nextDated, nextSkipped)
    else {
      setIndex((i) => i + 1)
      setDraft('')
      setInvalid(false)
    }
  }

  function save() {
    if (!parsed) {
      setInvalid(true)
      return
    }
    onDate(file.id, parsed)
    const nextDated = [...dated.current, file.id]
    dated.current = nextDated
    advance(nextDated, skipped.current)
  }

  function skipOne() {
    const nextSkipped = [...skipped.current, file.id]
    skipped.current = nextSkipped
    advance(dated.current, nextSkipped)
  }

  function skipRest() {
    const rest = files.slice(index).map((f) => f.id)
    onFinish(dated.current, [...skipped.current, ...rest])
  }

  const label = fileLabel(file)
  return (
    <Card title="Undated files" scope={`${index + 1} of ${files.length}`}>
      <div className="flex flex-col gap-2 p-2">
        <span className="flex items-center justify-between gap-2 px-1">
          <span className="text-body-m font-medium">Set a date, or skip this file.</span>
          <button
            onClick={() => onShow(folderOf(file.id, d) ?? file.folder, [file.id])}
            onMouseEnter={() => onShow(folderOf(file.id, d) ?? file.folder, [file.id], 'hold')}
            onMouseLeave={() => onShow(folderOf(file.id, d) ?? file.folder, [file.id], 'release')}
            aria-label="Show in table"
            title="Show in table"
            className="grid size-6 shrink-0 place-items-center rounded-md text-text-subtle hover:bg-surface-hover"
          >
            <IconArrowUpRight size={14} stroke={1.75} />
          </button>
        </span>
        <ExampleRow file={label.replace(/\.\w+$/, '')} says={`no date in the name · last edited ${formatDate(file.modified)}`} source={label} />
        <label className="flex flex-col gap-1 px-1">
          <span className="text-body-s text-text-subtle">Date</span>
          <input
            autoFocus
            value={draft}
            aria-label={`Date for ${label}`}
            placeholder="2021, 2021-03, or 2021-03-15"
            onChange={(e) => {
              setDraft(e.target.value)
              setInvalid(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
            }}
            className="w-full rounded-lg border border-border-subtle bg-body px-2 py-1 text-body-s text-text-base outline-none focus:border-neutral-950"
          />
        </label>
        <span className="flex items-center justify-between gap-2 px-1">
          <span className="text-body-s text-text-subtle">
            {invalid ? 'Use a year, a year and month, or a full date.' : 'A year is enough when the name has nothing finer.'}
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <button
              type="button"
              onClick={() => {
                setDraft(file.modified)
                setInvalid(false)
              }}
              className="text-body-s font-medium text-text-subtle underline decoration-border-subtle underline-offset-2 hover:text-text-base"
            >
              Use last edited
            </button>
            <span className="text-body-s font-medium text-brand">Recommended</span>
          </span>
        </span>
      </div>
      <Actions>
        <Button onClick={onBack}>Back</Button>
        {index < files.length - 1 && <Button onClick={skipRest}>Skip the rest</Button>}
        <Button onClick={skipOne}>Skip this file</Button>
        <Button primary disabled={!parsed} onClick={save}>
          Save date
        </Button>
      </Actions>
    </Card>
  )
}

export function UndatedCard({
  d,
  value,
  onShow,
  onReview,
  onUseModified,
  onSkip,
  onDate,
  onBack,
  onFinish,
  onUndo,
  locked,
}: {
  d: Decisions
  value: 'review' | 'skip' | 'dated' | 'modified' | null
  onShow: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
  onReview: () => void
  onUseModified: () => void
  onSkip: () => void
  onDate: (id: string, date: string) => void
  onBack: () => void
  onFinish: (dated: string[], skipped: string[]) => void
  onUndo: () => void
  locked: boolean
}) {
  const files = filesWithoutADate()
  const sample = files[0]
  if (d.dateSource !== 'filename') {
    return (
      <Card title="Undated files">
        <div className="px-3 py-2 text-body-s text-text-subtle">
          These files take the day they were last edited, so there’s nothing to set.
        </div>
      </Card>
    )
  }
  if (value === 'review' && !locked) {
    return <UndatedReview d={d} onShow={onShow} onDate={onDate} onBack={onBack} onFinish={onFinish} />
  }
  const name = sample ? fileLabel(sample).replace(/\.\w+$/, '') : 'Undated file'
  const example = sample
    ? [{ file: name, says: `no date in the name · last edited ${formatDate(sample.modified)}`, source: fileLabel(sample) }]
    : []
  const yearNote = d.secondLevel === 'year' ? ' You split by year, so a file with no date sits in No date until you give it one.' : ''
  return (
    <IssueCard
      heading="Undated files"
      problem={`${files.length} files have no date in the name.`}
      example={example}
      note={`Last edited is the day the file was saved.${yearNote}`}
      onShowExample={sample ? (mode) => onShow(folderOf(sample.id, d) ?? sample.folder, files.map((f) => f.id), mode) : undefined}
      value={value === 'dated' ? 'A' : value === 'skip' ? 'B' : value === 'modified' ? 'C' : null}
      onConfirm={(c) => (c === 'A' ? onReview() : c === 'C' ? onUseModified() : onSkip())}
      onUndo={onUndo}
      locked={locked}
      options={[
        {
          key: 'A',
          label: 'Date each one',
          detail: 'One file at a time. Set a year, a month, or a full day, and skip any file you want to leave blank.',
          outcome: [{ file: name, says: 'you set the date', tag: 'Dated', source: sample ? fileLabel(sample) : name }],
        },
        {
          key: 'C',
          label: 'Use the last-edited date',
          detail: `All ${files.length} get the day the file was last saved.`,
          recommended: true,
          outcome: [
            {
              file: name,
              says: sample ? `Date column shows ${formatDate(sample.modified)}` : 'the day it was last saved',
              tag: 'Last edited',
              source: sample ? fileLabel(sample) : name,
            },
          ],
        },
        {
          key: 'B',
          label: 'Leave them undated',
          detail: 'Nothing is filled in. The name had no date, and that stays the record.',
          outcome: [{ file: name, says: 'Date column stays blank', tag: 'Undated', source: sample ? fileLabel(sample) : name }],
        },
      ]}
    />
  )
}

export function TemplatesCard({
  d,
  onShow,
  ...props
}: IssueProps & { d: Decisions }) {
  const file = byId('F0217')
  const original = file.original.slice(file.original.lastIndexOf('/') + 1).replace(/\.\w+$/, '')
  const example = [{ file: original, says: 'folder says do not use · name says signed', source: file.original }]
  const byStatus = d.convention === 'C' || d.secondLevel === 'status'
  const stay =
    byStatus
      ? 'Status becomes Template, so they leave the signed and final folders and collect under Template.'
      : d.convention === 'B'
        ? 'They stay in the type folder. Crestline’s lease stays in Lease, with status Template instead of Signed.'
        : 'They stay in the company folder. Crestline’s lease stays in Crestline, with status Template instead of Signed.'
  return (
    <IssueCard
      {...props}
      heading="Templates"
      problem={`${stats.templates} files sit in Templates (do not use). A template is not a signed agreement.`}
      example={example}
      note="This is Crestline’s only lease, and the filename calls it executed. The other seven include drafts, a copy, a FINAL work order, and a Harbourline employment contract marked internal only."
      onShowExample={(mode) => onShow(folderOf(file.id, d) ?? 'Crestline', [file.id], mode)}
      options={[
        {
          key: 'B',
          label: 'Mark the status as Template',
          detail: stay,
          recommended: true,
          outcome: [
            {
              ...example[0],
              says: byStatus ? 'collects under Template' : d.convention === 'B' ? 'stays in the type folder' : 'stays in the company folder',
              tag: 'Template',
            },
          ],
        },
        {
          key: 'A',
          label: 'Put them in a Templates folder',
          detail: 'They leave the company folders, and none of them is the current file. Crestline’s lease leaves Crestline.',
          outcome: [{ ...example[0], says: 'leaves the company folder', tag: 'Templates/' }],
        },
      ]}
    />
  )
}

// ---- File names: the pattern Apply renames to ----

export function NamingCard({
  d,
  value,
  onConfirm,
  onUndo,
  onShow,
  locked,
}: {
  d: Decisions
  value: NamingPattern | null
  onConfirm: (c: NamingPattern) => void
  onUndo: () => void
  onShow: IssueProps['onShow']
  locked: boolean
}) {
  const file = byId('F0148')
  const original = patternName(file, 'keep', d.dateSource)
  const example = [{ file: original, says: 'one of four Acme MSA files', source: file.original }]
  const becomes = (pattern: NamingPattern) => [{ ...example[0], says: '', tag: patternName(file, pattern, d.dateSource) }]
  return (
    <IssueCard<NamingPattern>
      heading="File names"
      problem={`Your ${stats.files} files are named dozens of ways. Renaming is the last thing Apply does, so choose the pattern first.`}
      example={example}
      note="Whichever pattern you choose, the original name stays logged against each file, so a rename can be undone."
      onShowExample={(mode) => onShow(folderOf(file.id, d) ?? 'Acme Corp', [file.id], mode)}
      value={value}
      onConfirm={onConfirm}
      onUndo={onUndo}
      locked={locked}
      options={[
        {
          key: 'ctd',
          label: namingLabels.ctd,
          detail: 'Files with one company sort together, then by type.',
          recommended: true,
          outcome: becomes('ctd'),
        },
        {
          key: 'tcd',
          label: namingLabels.tcd,
          detail: 'Every MSA sorts together, whichever company it is with.',
          outcome: becomes('tcd'),
        },
        {
          key: 'dct',
          label: namingLabels.dct,
          detail: 'Files sort oldest first in every folder. Files with no date start with the company.',
          outcome: becomes('dct'),
        },
        {
          key: 'keep',
          label: 'Keep the names they have',
          detail: 'Files move and get a status, but each one keeps its filename.',
          outcome: [{ ...example[0], says: 'stays as it is', tag: original }],
        },
      ]}
    />
  )
}

export function CurrentRuleCard({
  value,
  onConfirm,
  onUndo,
  onSkip,
  locked,
  dateSource = null,
}: {
  value: CurrentRule | 'skip' | null
  onConfirm: (rule: CurrentRule) => void
  onUndo: () => void
  onSkip?: () => void
  locked: boolean
  dateSource?: DateSource | null
}) {
  const byDate = (a: FileRow, b: FileRow) =>
    ((dateSource === 'modified' ? b.modified : b.date) ?? '').localeCompare((dateSource === 'modified' ? a.modified : a.date) ?? '')
  const pinnacle = stats.signedChains.find((r) => r.folder === 'Pinnacle Insurance')!
  const files = [pinnacle, ...versionsOf(pinnacle.id)].sort(byDate)
  const pending = byId(cases.solara.pending)
  const kept = byId(cases.solara.kept)
  const solara = [pending, kept].sort(byDate)
  const options: LevelOption<CurrentRule>[] = [
    {
      key: 'signed',
      label: 'A signed file',
      detail: 'When a name says signed, that file is current. FINAL and draft are archived, whatever their dates.',
      recommended: true,
      preview: {
        caption: 'Pinnacle Insurance MSA:',
        wide: true,
        body: files.map((f) => (
          <ExampleRow key={f.id} {...outcomeRow(f, f.status === 'Signed' ? 'Current' : 'Archived')} />
        )),
      },
    },
    {
      key: 'final',
      label: 'The latest FINAL',
      detail: 'The newest file marked FINAL is current, even if another file says signed. Agreements with no FINAL still need a decision.',
      preview: {
        caption: 'Pinnacle Insurance MSA:',
        wide: true,
        body: files.map((f) => (
          <ExampleRow key={f.id} {...outcomeRow(f, f.status === 'Final' ? 'Current' : 'Archived')} />
        )),
      },
    },
    {
      key: 'latest',
      label: 'The newest file',
      detail: 'The latest date wins, whatever the name says. On Pinnacle that’s the signed copy. On Solara Energy the pending NDA would become current.',
      preview: {
        caption: 'Solara Energy, where the newest file isn’t signed:',
        wide: true,
        body: solara.map((f) => (
          <ExampleRow key={f.id} {...outcomeRow(f, f.id === pending.id ? 'Current' : 'Archived')} />
        )),
      },
    },
  ]
  return (
    <LevelCard
      title="What counts as current"
      options={options}
      value={value === 'skip' ? null : value}
      skipped={value === 'skip'}
      skipNote="Version roles stay blank. You can set a current file later."
      onConfirm={onConfirm}
      onUndo={onUndo}
      onSkip={onSkip}
      locked={locked}
    />
  )
}

export function ChainsCard({ onShow, d, ...props }: IssueProps & { d: Decisions }) {
  const acme = stats.assumedChains.find((r) => r.folder === 'Acme Corp')!
  const files = [acme, ...versionsOf(acme.id)].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const others = Object.entries(
    stats.assumedChains
      .filter((r) => r !== acme)
      .reduce<Record<string, number>>((m, r) => ({ ...m, [`${r.folder} ${r.type}`]: (m[`${r.folder} ${r.type}`] ?? 0) + 1 }), {}),
  ).map(([name, n]) => (n > 1 ? `${name} ×${n}` : name))
  const splits = splittingFacets(d)
  // The claim is about the name in the repository, so the chip shows that name
  const originalName = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.\w+$/, '')
  const example = files.map((f) => ({ file: originalName(f.original), says: nameSaysOf(f), source: f.original }))
  return (
    <IssueCard
      {...props}
      skipNote="These stay without a current file."
      number={1}
      problem={`${stats.assumedChains.length} agreements have several versions, but nothing proves which is current.`}
      example={example}
      note={`The same rule applies to: ${others.join(', ')}.${splits.length ? ` Filing by ${englishList(splits)} puts some of these versions in different folders.` : ''}`}
      onShowExample={(mode) => onShow(folderOf(acme.id, d) ?? 'Acme Corp', files.map((f) => f.id), mode)}
      options={[
        {
          key: 'A',
          label: 'Treat the latest FINAL as current',
          detail: 'Anyone asking gets that file, with the caveat that nothing proves it was signed.',
          recommended: true,
          outcome: files.map((f, i) => ({ ...example[i], tag: f === acme ? 'Current' : 'Archived' })),
        },
        {
          key: 'B',
          label: 'Leave it open',
          detail: 'No file is current until someone confirms. Asking returns the candidates instead.',
          outcome: example.map((e) => ({ ...e, tag: 'Candidate' })),
        },
      ]}
    />
  )
}

const conflictClaim: Record<string, string> = {
  F0024: 'says FINAL and “not final”',
  F0068: 'says DRAFT and unsigned',
  F0076: 'says “draft not final”',
  F0131: 'says signed and unsigned',
  F0176: 'says draft and “not final”',
}

export function ConflictsCard({ onShow, d, ...props }: IssueProps & { d: Decisions }) {
  const files = conflicting
  const example = files.map((f) => ({
    file: short(fileLabel(f)),
    says: conflictClaim[f.id] ?? 'the name contradicts itself',
    source: fileLabel(f),
  }))
  const byStatus = d.convention === 'C' || d.secondLevel === 'status'
  const showFolder = folderOf(files[0].id, d) ?? files[0].folder
  const sameFolder = files.every((f) => folderOf(f.id, d) === showFolder)
  return (
    <IssueCard
      {...props}
      skipNote="Status stays Conflicting."
      heading="Conflicting names"
      problem={`${files.length} filenames contradict themselves, so the status is still Conflicting.`}
      example={example}
      note="Each name takes back its own claim: “not final” or “unsigned”. Acme’s MSA is the current file of that agreement either way."
      onShowExample={(mode) => onShow(showFolder, sameFolder ? files.map((f) => f.id) : [files[0].id], mode)}
      options={[
        {
          key: 'A',
          label: 'Treat them as drafts',
          detail: byStatus
            ? '“Not final” and “unsigned” win. They leave Conflicting and collect under Draft.'
            : '“Not final” and “unsigned” win. None of these stays Signed or Final.',
          recommended: true,
          outcome: example.map((e) => ({ ...e, tag: 'Draft' })),
        },
        {
          key: 'B',
          label: 'Keep the stronger word',
          detail: byStatus
            ? 'Acme’s MSA moves to Final and the Ashworth employment contract moves to Signed. The other three move to Draft.'
            : 'FINAL stays Final and signed stays Signed. A name that only takes itself back stays Draft.',
          outcome: files.map((f, i) => ({ ...example[i], tag: conflictStatus(f, 'B') })),
        },
      ]}
    />
  )
}

const manualStatuses: Status[] = ['Signed', 'Final', 'Draft', 'Pending', 'Undefined']

// A hint in the filename, read the same way the sheet would. A version number or "old" is not a status.
function suggestedStatus(file: FileRow, marks?: StatusMarks | null): { status: Status; because: string } | null {
  const rule = statusRuleFor(file)
  return rule ? { status: marks?.[rule.id] ?? rule.status, because: rule.because } : null
}

function StatusMenu({
  value,
  onChange,
  label,
  fit,
  disabled,
}: {
  value: Status | ''
  onChange: (status: Status) => void
  label: string
  // Hugs the tag, so it can sit in a sentence. Otherwise the field fills the row.
  fit?: boolean
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState({ top: 0, left: 0, width: 0 })
  const root = useRef<HTMLDivElement>(null)
  const options = [...manualStatuses, ...useAddedStatuses()]

  function choose(status: Status) {
    onChange(status)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function onPointer(e: Event) {
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
    if (disabled) return
    const rect = root.current?.getBoundingClientRect()
    if (!rect) return
    const height = options.length * 32 + 8 + 40
    const top = rect.bottom + 4 + height > window.innerHeight ? Math.max(8, rect.top - 4 - height) : rect.bottom + 4
    const width = Math.max(rect.width, 176)
    const left = Math.min(rect.left, window.innerWidth - width - 8)
    setPlace({ top, left: Math.max(8, left), width })
    setOpen((current) => !current)
  }

  return (
    <div ref={root} className={fit ? 'relative inline-flex' : 'relative max-w-full'}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={toggle}
        className={`items-center justify-between gap-2 rounded-lg border border-border-subtle bg-body px-2 py-1 text-left ${
          fit ? 'inline-flex' : 'flex w-full'
        } ${disabled ? '' : 'hover:bg-surface-hover'}`}
      >
        {value ? (
          <span className={`inline-block rounded-md px-2 py-0.5 text-body-s font-medium whitespace-nowrap ${statusStyle(value)}`}>{value}</span>
        ) : (
          <span className="text-body-s text-text-subtle">Choose a status</span>
        )}
        <IconChevronRight size={14} className={`shrink-0 text-text-subtle transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={label}
          style={{ top: place.top, left: place.left, width: place.width }}
          className="fixed z-30 flex flex-col rounded-xl border border-border-base bg-white p-1 shadow-[0_3px_8px_#1717170d]"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => choose(option)}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-surface-hover"
            >
              <span className="grid size-3.5 shrink-0 place-items-center text-brand">{option === value && <IconCheck size={12} />}</span>
              <span className={`inline-block rounded-md px-2 py-0.5 text-body-s font-medium whitespace-nowrap ${statusStyle(option)}`}>{option}</span>
            </button>
          ))}
          <AddStatusField
            onAdd={(name) => {
              const status = addStatus(name, options)
              if (status) choose(status)
            }}
          />
        </div>
      )}
    </div>
  )
}

function FolderMenu({
  value,
  options,
  onChange,
  label,
}: {
  value: string
  options: readonly string[]
  onChange: (folder: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [place, setPlace] = useState({ top: 0, left: 0, width: 0 })
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const shown = options.filter((folder) => folder.toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    if (!open) return
    function onPointer(e: Event) {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onScroll(e: Event) {
      if (panel.current?.contains(e.target as Node)) return
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

  useEffect(() => {
    if (!open) return
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [open])

  function toggle() {
    const rect = root.current?.getBoundingClientRect()
    if (!rect) return
    const height = 248
    const top = rect.bottom + 4 + height > window.innerHeight ? Math.max(8, rect.top - 4 - height) : rect.bottom + 4
    const width = Math.max(rect.width, 256)
    const left = Math.min(rect.left, window.innerWidth - width - 8)
    setPlace({ top, left: Math.max(8, left), width })
    setQuery('')
    setOpen((current) => !current)
  }

  return (
    <div ref={root} className="relative max-w-full">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border-subtle bg-body px-2 py-1 text-left text-body-s hover:bg-surface-hover"
      >
        <span className={`truncate ${value ? '' : 'text-text-subtle'}`}>{value || 'Choose a folder'}</span>
        <IconChevronRight size={14} className={`shrink-0 text-text-subtle transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div
          ref={panel}
          role="listbox"
          aria-label={label}
          style={{ top: place.top, left: place.left, width: place.width }}
          className="fixed z-30 flex flex-col rounded-xl border border-border-base bg-white p-1 shadow-[0_3px_8px_#1717170d]"
        >
          <label className="mx-1 mb-1 flex items-center gap-1.5 rounded-md bg-surface-base px-1.5 py-1">
            <IconSearch size={12} className="shrink-0 text-text-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search folders"
              className="min-w-0 flex-1 bg-transparent text-body-s outline-none placeholder:text-text-subtle"
            />
          </label>
          <div ref={list} className="max-h-52 overflow-auto">
            {shown.length === 0 && <p className="px-2 py-1 text-body-s text-text-subtle">No folders</p>}
            {shown.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                title={option}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-body-s hover:bg-surface-hover"
              >
                <span className="grid size-3.5 shrink-0 place-items-center text-brand">{option === value && <IconCheck size={12} />}</span>
                <span className="truncate">{option}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-body-s text-text-subtle">{label}</span>
      <span className="break-words text-body-s">{children}</span>
    </div>
  )
}

function ReviewFile({
  label,
  type,
  excerpt,
  poor,
}: {
  label: string
  type: string
  excerpt: string
  poor?: boolean
}) {
  const pdf = /\.pdf$/i.test(label)
  return (
    <div className="flex justify-center overflow-hidden rounded-xl bg-surface-base px-4 pt-4">
      <button
        type="button"
        aria-label={`Open ${label}`}
        title="Opens the document"
        className="group/file relative mb-[-0.75rem] flex w-40 flex-col overflow-hidden rounded-sm border border-border-subtle bg-white text-left shadow-[0_2px_8px_#1717171a]"
      >
        <span className={`h-1 shrink-0 ${pdf ? 'bg-[#e5372b]' : 'bg-[#2b7cd3]'}`} />
        <span className="flex flex-col gap-2 p-3 pb-5">
          <span className="text-[8px] font-medium tracking-wide text-text-disabled uppercase">{type}</span>
          <span className="line-clamp-3 text-[11px] leading-tight font-semibold">{label.replace(/\.\w+$/, '')}</span>
          <span className={`line-clamp-6 text-[8px] leading-[11px] text-text-subtle ${poor ? 'select-none blur-[2px]' : ''}`}>
            {excerpt}
          </span>
          <span className="flex flex-col gap-1.5 pt-1">
            <span className="h-px w-16 bg-border-base" />
            <span className="h-px w-10 bg-border-base" />
          </span>
        </span>
        <span className="pointer-events-none absolute top-[38%] left-1/2 flex h-[22px] -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-lg bg-neutral-950 px-2 text-body-s font-medium text-text-on-color opacity-0 shadow-[0_2px_3px_#64646414] transition-opacity group-hover/file:opacity-100 group-focus-visible/file:opacity-100">
          Open
          <IconArrowUpRight size={12} stroke={1.75} />
        </span>
      </button>
    </div>
  )
}

function NoStatusReview({
  d,
  files,
  onShow,
  onStatus,
  onBack,
  onFinish,
}: {
  d: Decisions
  files: FileRow[]
  onShow: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
  onStatus: (id: string, status: Status) => void
  onBack: () => void
  onFinish: (set: string[], skipped: string[]) => void
}) {
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState<Status | ''>('')
  const choices = useRef<Map<string, Status | 'skip'>>(new Map())
  const showFile = useRef(onShow)
  showFile.current = onShow
  const file = files[index]

  useEffect(() => {
    if (!file) return
    showFile.current(folderOf(file.id, d) ?? file.folder, [file.id])
    const prior = choices.current.get(file.id)
    setDraft(prior === 'skip' ? '' : prior ?? suggestedStatus(file, d.statusMarks)?.status ?? '')
  }, [file, d])

  if (!file) return null

  function finishFromChoices() {
    const set: string[] = []
    const skipped: string[] = []
    for (const item of files) {
      const choice = choices.current.get(item.id)
      if (choice && choice !== 'skip') set.push(item.id)
      else skipped.push(item.id)
    }
    onFinish(set, skipped)
  }

  function keep(status: Status | '') {
    // Undefined is the recommendation for a version, not a status someone typed in.
    if (status && status !== 'Undefined') {
      onStatus(file.id, status)
      choices.current.set(file.id, status)
      return
    }
    choices.current.set(file.id, 'skip')
  }

  function back() {
    keep(draft)
    if (index === 0) onBack()
    else setIndex((i) => i - 1)
  }

  function next() {
    keep(draft)
    if (index + 1 >= files.length) finishFromChoices()
    else setIndex((i) => i + 1)
  }

  function skipRest() {
    for (const item of files.slice(index)) choices.current.set(item.id, 'skip')
    finishFromChoices()
  }

  const label = fileLabel(file)
  const suggestion = suggestedStatus(file, d.statusMarks)
  const recommendation = !suggestion
    ? 'I can’t tell the status.'
    : suggestion.status === 'Undefined'
      ? 'I’d leave this Undefined.'
      : `I’d mark this ${suggestion.status}.`
  const arrow =
    'grid size-[22px] shrink-0 place-items-center rounded-lg border border-border-subtle bg-body text-text-subtle shadow-[0_2px_3px_#64646414] hover:bg-surface-hover'
  return (
    <Card title={suggestion ? 'Recommended status' : 'Choose a status'} scope={`${index + 1} of ${files.length}`}>
      <div className="flex flex-col gap-3 p-2">
        <span className="flex items-center justify-between gap-2 px-1">
          <span className="text-body-m font-medium">{recommendation}</span>
          <button
            onClick={() => onShow(folderOf(file.id, d) ?? file.folder, [file.id])}
            onMouseEnter={() => onShow(folderOf(file.id, d) ?? file.folder, [file.id], 'hold')}
            onMouseLeave={() => onShow(folderOf(file.id, d) ?? file.folder, [file.id], 'release')}
            aria-label="Show in table"
            title="Show in table"
            className="grid size-6 shrink-0 place-items-center rounded-md text-text-subtle hover:bg-surface-hover"
          >
            <IconArrowUpRight size={14} stroke={1.75} />
          </button>
        </span>
        <ReviewFile label={label} type={file.type} excerpt={file.excerpt} />
        <div className="flex flex-col gap-2 px-1">
          <ReviewFact label="Name">{label}</ReviewFact>
          <ReviewFact label="Original file path">{file.original}</ReviewFact>
          <ReviewFact label="Description">{file.excerpt}</ReviewFact>
          <ReviewFact label="Decision process">{suggestion?.because ?? statusGap(file).because}</ReviewFact>
        </div>
        <div className="flex flex-col gap-1 px-1">
          <span className="text-body-s text-text-subtle">Status</span>
          <StatusMenu key={file.id} value={draft} label={`Status for ${label}`} onChange={setDraft} />
          <span className="text-body-s text-text-subtle">
            {suggestion && draft === suggestion.status
              ? suggestion.status === 'Undefined'
                ? 'Recommended. Next leaves it Undefined.'
                : 'Recommended. Next keeps it.'
              : draft && draft !== 'Undefined'
                ? 'Next saves this status.'
                : 'Next leaves this file Undefined.'}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-1.5 border-t border-border-subtle bg-surface-base px-2 py-1.5">
        <button type="button" onClick={back} aria-label={index === 0 ? 'Back' : 'Previous file'} title={index === 0 ? 'Back' : 'Previous file'} className={arrow}>
          <IconArrowLeft size={14} stroke={1.75} />
        </button>
        {index < files.length - 1 && <Button onClick={skipRest}>Skip the rest</Button>}
        <button type="button" onClick={next} aria-label={index + 1 >= files.length ? 'Finish' : 'Next file'} title={index + 1 >= files.length ? 'Finish' : 'Next file'} className="grid size-[22px] shrink-0 place-items-center rounded-lg bg-neutral-950 text-text-on-color shadow-[0_2px_3px_#64646414] hover:bg-neutral-950/85">
          <IconArrowRight size={14} stroke={1.75} />
        </button>
      </div>
    </Card>
  )
}

function rulePhrase(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function RulePaper({ file }: { file: FileRow }) {
  const label = fileLabel(file)
  const pdf = /\.pdf$/i.test(label)
  const poor = file.excerpt.startsWith('Scanned copy, OCR quality poor')
  return (
    <div
      title={label}
      className="flex w-32 shrink-0 flex-col overflow-hidden rounded-sm border border-border-subtle bg-white text-left shadow-[0_2px_8px_#1717171a]"
    >
      <span className={`h-1 shrink-0 ${pdf ? 'bg-[#e5372b]' : 'bg-[#2b7cd3]'}`} />
      <span className="flex flex-col gap-1 p-2">
        <span className="truncate text-[8px] font-medium tracking-wide text-text-disabled uppercase">{file.type}</span>
        <span className="line-clamp-2 text-[10px] leading-tight font-semibold">{label.replace(/\.\w+$/, '')}</span>
        <span className={`line-clamp-4 text-[8px] leading-[11px] text-text-subtle ${poor ? 'select-none blur-[2px]' : ''}`}>{file.excerpt}</span>
      </span>
    </div>
  )
}

function StatusRuleList({
  groups,
  selected,
  marks,
  locked,
  onChange,
  onMark,
}: {
  groups: ReturnType<typeof statusRuleSplit>['groups']
  selected: StatusRuleId[]
  marks: StatusMarks
  locked: boolean
  onChange: (ids: StatusRuleId[]) => void
  onMark: (id: StatusRuleId, status: Status) => void
}) {
  const chosen = new Set(selected)
  const all = groups.every((group) => chosen.has(group.id))
  function toggle(id: StatusRuleId) {
    onChange(chosen.has(id) ? selected.filter((item) => item !== id) : [...selected, id])
  }
  const sections = [
    { id: 'status' as const, title: 'A status' },
    { id: 'version' as const, title: 'A version' },
  ]
  return (
    <div className="flex flex-col gap-3">
      {sections.map((section, index) => (
        <div key={section.id} className="flex flex-col gap-2">
          <span className="flex items-center justify-between px-1 text-body-s font-medium text-text-subtle">
            {section.title}
            {index === 0 && !locked && !all && (
              <button type="button" onClick={() => onChange(groups.map((group) => group.id))} className="text-brand">
                Select all
              </button>
            )}
          </span>
          {groups
            .filter((group) => group.section === section.id)
            .map((group) => {
              const on = chosen.has(group.id)
              const status = marks[group.id] ?? group.status
              const phrase = `${rulePhrase(group.label)} will be marked as`
              const count = group.files.length
              return (
                <div key={group.id} className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-body p-2 shadow-[0_1px_4px_#1717170a]">
                  <div className="flex items-start gap-2 px-0.5">
                    <div
                      role="checkbox"
                      aria-checked={on}
                      aria-label={phrase}
                      tabIndex={locked ? -1 : 0}
                      onClick={() => !locked && toggle(group.id)}
                      onKeyDown={(e) => {
                        if (locked || (e.key !== ' ' && e.key !== 'Enter')) return
                        e.preventDefault()
                        toggle(group.id)
                      }}
                      className={`mt-1.5 grid size-3.5 shrink-0 place-items-center rounded-[4px] border ${
                        on ? 'border-brand bg-brand text-text-on-color' : 'border-border-base bg-body'
                      } ${locked ? '' : 'cursor-pointer'}`}
                    >
                      {on && <IconCheck size={10} stroke={3} />}
                    </div>
                    <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-body-s">
                      <span>{phrase}</span>
                      <StatusMenu
                        fit
                        disabled={locked}
                        value={status}
                        label={`${phrase} a status`}
                        onChange={(next) => onMark(group.id, next)}
                      />
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="px-0.5 text-body-s text-text-subtle">
                      {count} {count === 1 ? 'file' : 'files'}
                    </span>
                    <div className="flex gap-2 overflow-x-auto rounded-lg bg-surface-base p-3">
                      {group.files.map((file) => (
                        <RulePaper key={file.id} file={file} />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      ))}
    </div>
  )
}

export function NoStatusCard({
  d,
  value,
  onShow,
  onBulk,
  onReview,
  onRules,
  onUndefined,
  onStatus,
  onBack,
  onFinish,
  onUndo,
  locked,
}: {
  d: Decisions
  value: 'bulk' | 'review' | 'rules' | 'undefined' | 'set' | null
  onShow: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
  onBulk: (ids: StatusRuleId[], marks: StatusMarks | null) => void
  onReview: () => void
  onRules: () => void
  onUndefined: () => void
  onStatus: (id: string, status: Status) => void
  onBack: () => void
  onFinish: (set: string[], skipped: string[]) => void
  onUndo: () => void
  locked: boolean
}) {
  const every = statusRuleSplit()
  // Null until the user changes a box. A saved choice, including from Back, wins over the default of every rule.
  const [picked, setPicked] = useState<StatusRuleId[] | null>(d.statusRules)
  const [marks, setMarks] = useState<StatusMarks>(d.statusMarks ?? {})
  useEffect(() => setPicked(d.statusRules), [d.statusRules])
  useEffect(() => setMarks(d.statusMarks ?? {}), [d.statusMarks])
  const active = picked ?? every.groups.map((group) => group.id)
  const settled = statusRuleSplit(value === 'undefined' ? [] : d.statusRules, d.statusMarks)
  if (value === 'review' && !locked) {
    return (
      <NoStatusReview
        d={d}
        files={settled.rest}
        onShow={onShow}
        onStatus={onStatus}
        onBack={onBack}
        onFinish={onFinish}
      />
    )
  }
  if (value === 'bulk' && !locked) {
    const { rest } = settled
    const held = every.groups.filter((group) => d.statusRules != null && !d.statusRules.includes(group.id))
    const gaps = (['version', 'bare', 'reviewed', 'internal'] as const)
      .map((kind) => ({ kind, files: rest.filter((file) => !statusRuleFor(file) && statusGap(file).kind === kind) }))
      .filter((gap) => gap.files.length > 0)
    const labels = { version: 'only a version number', bare: 'a name with no status', reviewed: 'the word reviewed', internal: 'internal only' }
    const rows = [
      ...held.map((group) => {
        const file = group.files[0]
        return {
          file: short(fileLabel(file)),
          says: `${group.files.length} say ${group.label}, left out`,
          source: fileLabel(file),
        }
      }),
      ...gaps.map((gap) => {
        const file = gap.files[0]
        return {
          file: short(fileLabel(file)),
          says: `${labels[gap.kind]}, ${gap.files.length} file${gap.files.length === 1 ? '' : 's'}`,
          source: fileLabel(file),
        }
      }),
    ]
    const stay = englishList([...new Set(settled.applied.map((group) => group.status))])
    const settledCount = settled.applied.reduce((n, group) => n + group.files.length, 0)
    return (
      <IssueCard
        heading="No status"
        problem={`I’d leave these ${rest.length} Undefined.`}
        example={rows}
        note={
          held.length
            ? 'The rules you didn’t apply stay open. A version number, “reviewed”, and “internal only” aren’t a status. The files you did settle stay as they are.'
            : 'A version number, “reviewed”, and “internal only” aren’t a status. The files the rules already settled stay as they are.'
        }
        onShowExample={rest[0] ? (mode) => onShow(folderOf(rest[0].id, d) ?? rest[0].folder, rest.map((file) => file.id), mode) : undefined}
        value={null}
        onConfirm={(c) => (c === 'A' ? onRules() : onReview())}
        onUndo={onBack}
        onBack={onBack}
        locked={false}
        options={[
          {
            key: 'A',
            label: 'Mark these Undefined',
            detail: `The ${settledCount} already settled stay ${stay}. These ${rest.length} stay Undefined.`,
            recommended: true,
            outcome: rows.map((row) => ({ ...row, tag: 'Undefined' })),
          },
          {
            key: 'B',
            label: 'Set each one',
            detail: `One file at a time, ${rest.length} files. Skip any you want left Undefined.`,
            outcome: rest[0] ? [{ file: short(fileLabel(rest[0])), says: 'you set the status', tag: 'You set it', source: fileLabel(rest[0]) }] : [],
          },
        ]}
      />
    )
  }
  const byStatus = d.convention === 'C' || d.secondLevel === 'status'
  const chosen = value === 'undefined' ? 'B' : value ? 'A' : null
  const shown = value === 'undefined' ? [] : value ? (d.statusRules ?? every.groups.map((group) => group.id)) : active
  const preview = statusRuleSplit(shown, marks)
  const all = shown.length === every.groups.length
  const counted = new Map<Status, number>()
  for (const group of preview.applied) counted.set(group.status, (counted.get(group.status) ?? 0) + group.files.length)
  const marked = [...counted.entries()].map(([status, count]) => `${count} as ${status}`)
  const applyDetail = [
    ...preview.applied.map((group) => `${rulePhrase(group.label)} becomes ${group.status} (${group.files.length}).`),
    !shown.length
      ? 'Choose at least one.'
      : preview.rest.length
        ? `Then you only see the ${preview.rest.length} still without a status.`
        : 'Nothing is left to set by hand.',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <IssueCard
      heading="No status"
      problem={
        value === 'undefined'
          ? `None of these were applied. All ${stats.unlabelled} stay without a status.`
          : marked.length
            ? `I’d mark ${englishList(marked)}.`
            : `I wasn’t able to find a status for ${stats.unlabelled} files.`
      }
      example={[]}
      customExample={
        <>
          <StatusRuleList
            groups={every.groups}
            selected={shown}
            marks={marks}
            locked={locked}
            onChange={setPicked}
            onMark={(id, status) => setMarks((current) => ({ ...current, [id]: status }))}
          />
          <div className="flex flex-col gap-0.5 px-1 pt-1">
            <span className="text-body-s text-text-subtle">Decision process</span>
            <span className="text-body-s">
              {value === 'undefined'
                ? `None of these rules were applied. All ${stats.unlabelled} stay without a status.`
                : `A status comes from the name: a clean version becomes Final. Copy, backup, old, a duplicate save, a version number, “reviewed”, and “internal only” aren’t a status, so those stay Undefined. A name that only says what the agreement is has no status word either. Uncheck a rule to set those files yourself.${byStatus ? ' You file by status, so anything left Undefined collects there.' : ''}`}
            </span>
          </div>
        </>
      }
      value={chosen}
      onConfirm={(c) => {
        if (c === 'B') {
          onUndefined()
          return
        }
        const overrides: StatusMarks = {}
        for (const group of every.groups) {
          const chosenStatus = marks[group.id]
          if (chosenStatus && chosenStatus !== group.status) overrides[group.id] = chosenStatus
        }
        onBulk(shown, Object.keys(overrides).length ? overrides : null)
      }}
      onUndo={onUndo}
      locked={locked}
      options={[
        {
          key: 'A',
          label: !shown.length
            ? 'Apply the selected rules, then see what’s left'
            : preview.rest.length === 0
              ? 'Apply the rules'
              : all
                ? 'Apply all, then see what’s left'
                : 'Apply the selected rules, then see what’s left',
          detail: applyDetail,
          recommended: shown.length > 0,
          disabled: shown.length === 0,
          outcome: preview.applied.map((group) => ({
            file: short(fileLabel(group.files[0])),
            says: group.label,
            tag: group.status,
            source: fileLabel(group.files[0]),
          })),
        },
        {
          key: 'B',
          label: 'Mark them all Undefined',
          detail: `All ${stats.unlabelled} stay without a status, including the names that say backup, old, or clean.`,
          outcome: every.groups.slice(0, 1).map((group) => ({
            file: short(fileLabel(group.files[0])),
            says: 'Status column shows Undefined',
            tag: 'Undefined' as const,
            source: fileLabel(group.files[0]),
          })),
        },
      ]}
    />
  )
}

export function EmploymentCard({ onShow, d, ...props }: IssueProps & { d: Decisions }) {
  const harbourline = allRows.filter(
    (r) => r.folder === 'Employment' && r.name.startsWith('Harbourline Shipping – Employment') && !(d.templates === 'A' && isTemplate(r)),
  )
  const employmentCount = employmentInFiling(d)
  const example = harbourline.map((r) => ({
    file: r.original.slice(r.original.lastIndexOf('/') + 1).replace(/\.\w+$/, ''),
    says: 'names Harbourline',
    source: r.original,
  }))
  const top = d.convention ? topFacet[d.convention] : 'counterparty'
  const together =
    top === 'status'
      ? 'Kept together, instead of spread across status folders.'
      : top === 'type'
        ? 'Kept out of the type folders the whole team browses.'
        : 'Kept out of company folders the whole team browses.'
  const beside =
    top === 'counterparty'
      ? 'Easier to find from a company, but mixes personal data into shared folders.'
      : `Puts them in company folders beside the ${top} folders, and mixes personal data into folders the whole team can open.`
  return (
    <IssueCard
      {...props}
      number={2}
      problem={`${employmentCount} employment files are named after a company, but each is with a person.`}
      example={example}
      note={`These ${harbourline.length} are probably ${harbourline.length} different people. ${stats.employmentShared} employment files sit in /Shared with personal data.`}
      onShowExample={(mode) => onShow(folderOf(harbourline[0].id, d) ?? 'Employment', harbourline.map((r) => r.id), mode)}
      options={[
        {
          key: 'B',
          label: 'File each under the company in its name',
          detail: beside,
          recommended: true,
          outcome: example.map((e) => ({ ...e, tag: 'Harbourline Shipping/' })),
        },
        {
          key: 'A',
          label: 'One Employment folder, flagged to HR',
          detail: together,
          outcome: example.map((e) => ({ ...e, tag: 'Employment/' })),
        },
      ]}
    />
  )
}

export function SolaraCard({ onShow, d, ...props }: IssueProps & { d: Decisions }) {
  const pending = byId(cases.solara.pending)
  const kept = byId(cases.solara.kept)
  const example = [pending, kept].map((f) => ({ file: short(fileLabel(f)), says: nameSaysOf(f), source: fileLabel(f) }))
  const apart = familySplits(kept.id, d)
  return (
    <IssueCard
      {...props}
      skipNote="Neither NDA is marked current from this question."
      number={3}
      problem="Solara Energy’s newest NDA is still pending signature."
      example={example}
      note={`Its 2020 NDA is signed, and it is a separate agreement that stays current either way.${apart.length ? ` Under this filing the pending file and the 2022 one sit in different ${englishList(apart)} folders.` : ''}`}
      onShowExample={(mode) => onShow(folderOf(kept.id, d) ?? 'Solara Energy', [pending.id, kept.id], mode)}
      options={[
        {
          key: 'A',
          label: `Keep the ${formatDate(kept.date)} NDA as current`,
          detail: 'The pending one waits in _Archive until it’s signed.',
          recommended: true,
          outcome: [
            { ...example[0], tag: 'Archived' },
            { ...example[1], tag: 'Current' },
          ],
        },
        {
          key: 'B',
          label: 'Make the pending NDA current',
          detail: 'Anyone asking gets an NDA that isn’t signed yet.',
          outcome: [
            { ...example[0], tag: 'Current' },
            { ...example[1], tag: 'Archived' },
          ],
        },
      ]}
    />
  )
}

export function VantageCard({ onShow, d, ...props }: IssueProps & { d: Decisions }) {
  const [first, second] = [byId(cases.vantage.first), byId(cases.vantage.second)]
  const example = [first, second].map((f) => ({ file: short(fileLabel(f)), says: nameSaysOf(f), source: fileLabel(f) }))
  return (
    <IssueCard
      {...props}
      skipNote="Both licences stay as they are."
      number={4}
      problem="Two Vantage Retail Group licences from 2023 would get the same new name."
      example={example}
      note="Both say FINAL and describe a software licence; they may be the same document saved twice."
      onShowExample={(mode) => onShow(folderOf(first.id, d) ?? 'Vantage Retail Group', [first.id, second.id], mode)}
      options={[
        {
          key: 'A',
          label: 'Keep both, with the file ID on the sheet',
          detail: 'The names stay the same. Open either file and the sheet shows its ID, so neither overwrites the other.',
          recommended: true,
          outcome: [first, second].map((f) => ({ file: short(fileLabel(f)), says: `File ID ${f.id}`, tag: 'Current', source: fileLabel(f) })),
        },
        {
          key: 'B',
          label: 'Treat them as duplicates',
          detail: 'Keep the first as current and archive the other.',
          outcome: [
            { file: short(fileLabel(first)), says: '', tag: 'Current', source: fileLabel(first) },
            { file: short(fileLabel(second)), says: '', tag: 'Archived', source: fileLabel(second) },
          ],
        },
      ]}
    />
  )
}

export function UnidentifiedCard({
  d,
  value,
  onShow,
  onReview,
  onLeave,
  onPlace,
  onBack,
  onFinish,
  onUndo,
  locked,
}: {
  d: Decisions
  value: 'review' | 'placed' | 'left' | null
  onShow: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
  onReview: () => void
  onLeave: () => void
  onPlace: (id: string, folder: string) => void
  onBack: () => void
  onFinish: (placed: Record<string, string>, skipped: string[]) => void
  onUndo: () => void
  locked: boolean
}) {
  const files = unidentifiedQueue(d)
  if (value === 'review' && !locked) {
    return (
      <UnidentifiedReview d={d} onShow={onShow} onPlace={onPlace} onBack={onBack} onFinish={onFinish} />
    )
  }
  const recommended = files.filter((f) => unidentifiedRead(f).kind === 'recommend')
  const example = recommended.map((f) => {
    const read = unidentifiedRead(f)
    return {
      file: short(fileLabel(f)),
      says: read.kind === 'recommend' ? read.hint : 'no company',
      source: fileLabel(f),
    }
  })
  const where = companyIsFolder(d) ? 'They sit in _Unidentified.' : 'There’s no company folder to put them in.'
  return (
    <IssueCard
      heading="Unidentified files"
      problem={`${files.length} files have no company. ${where}`}
      example={example}
      note={unidentifiedPitch(d)}
      onShowExample={
        files[0] ? (mode) => onShow(folderOf(files[0].id, d) ?? '_Unidentified', files.map((f) => f.id), mode) : undefined
      }
      value={value === 'placed' || value === 'review' ? 'A' : value === 'left' ? 'B' : null}
      onConfirm={(c) => (c === 'A' ? onReview() : onLeave())}
      onUndo={onUndo}
      locked={locked}
      options={[
        {
          key: 'A',
          label: 'Place the ones I can read',
          detail: 'Use the recommended folders, then choose a folder for each file that still has more than one company. Skip any you want left unidentified.',
          recommended: true,
          outcome: recommended.map((f) => {
            const read = unidentifiedRead(f)
            const folder = read.kind === 'recommend' ? read.folder : '_Unidentified'
            return { file: short(fileLabel(f)), says: read.kind === 'recommend' ? read.hint : 'no company', tag: `${folder}/`, source: fileLabel(f) }
          }),
        },
        {
          key: 'B',
          label: 'Leave them in _Unidentified',
          detail: 'Nothing is guessed. They stay together until someone can read them.',
          outcome: recommended.map((f) => ({
            file: short(fileLabel(f)),
            says: 'no company',
            tag: '_Unidentified/',
            source: fileLabel(f),
          })),
        },
      ]}
    />
  )
}

function UnidentifiedReview({
  d,
  onShow,
  onPlace,
  onBack,
  onFinish,
}: {
  d: Decisions
  onShow: (group: string, rowIds?: string[], mode?: 'hold' | 'release') => void
  onPlace: (id: string, folder: string) => void
  onBack: () => void
  onFinish: (placed: Record<string, string>, skipped: string[]) => void
}) {
  const files = useMemo(() => unidentifiedQueue(d), [d.employment, d.templates])
  const companies = useMemo(companyFolders, [])
  const [index, setIndex] = useState(0)
  const placed = useRef<Record<string, string>>({})
  const skipped = useRef<string[]>([])
  const showFile = useRef(onShow)
  showFile.current = onShow
  const file = files[index]
  const read = file ? unidentifiedRead(file) : null
  const suggested = read?.kind === 'recommend' ? read.folder : ''
  const [draft, setDraft] = useState(suggested)
  const [draftFor, setDraftFor] = useState(file?.id)
  // Reset before paint, so Next can't file this document into the previous one's folder.
  if (file && draftFor !== file.id) {
    setDraftFor(file.id)
    const prior = placed.current[file.id]
    setDraft(prior ?? (skipped.current.includes(file.id) ? '' : suggested))
  }

  useEffect(() => {
    if (!file) return
    showFile.current(folderOf(file.id, d) ?? file.folder, [file.id])
  }, [file, d])

  if (!file || !read) return null

  function advance(nextPlaced: Record<string, string>, nextSkipped: string[]) {
    if (index + 1 >= files.length) onFinish(nextPlaced, nextSkipped)
    else setIndex((i) => i + 1)
  }

  function remember(folder: string) {
    onPlace(file.id, folder)
    const nextPlaced = { ...placed.current, [file.id]: folder }
    placed.current = nextPlaced
    skipped.current = skipped.current.filter((id) => id !== file.id)
    return nextPlaced
  }

  function back() {
    if (draft) remember(draft)
    if (index === 0) onBack()
    else setIndex((i) => i - 1)
  }

  function next() {
    if (draft) {
      advance(remember(draft), skipped.current)
      return
    }
    const nextPlaced = { ...placed.current }
    delete nextPlaced[file.id]
    placed.current = nextPlaced
    const nextSkipped = skipped.current.includes(file.id) ? skipped.current : [...skipped.current, file.id]
    skipped.current = nextSkipped
    advance(nextPlaced, nextSkipped)
  }

  function skipRest() {
    const rest = files.slice(index).map((f) => f.id)
    const nextPlaced = { ...placed.current }
    for (const id of rest) delete nextPlaced[id]
    const earlier = skipped.current.filter((id) => !rest.includes(id))
    onFinish(nextPlaced, [...earlier, ...rest])
  }

  const label = fileLabel(file)
  const poor = read.kind === 'manual' && file.excerpt.startsWith('Scanned copy, OCR quality poor')
  return (
    <Card title={read.kind === 'recommend' ? 'Recommended folder' : 'Choose a folder'} scope={`${index + 1} of ${files.length}`}>
      <div className="flex flex-col gap-3 p-2">
        <span className="flex items-center justify-between gap-2 px-1">
          <span className="text-body-m font-medium">
            {read.kind === 'recommend' ? `I’d file this under ${read.folder}.` : 'I can’t tell which company this is.'}
          </span>
          <button
            onClick={() => onShow(folderOf(file.id, d) ?? file.folder, [file.id])}
            onMouseEnter={() => onShow(folderOf(file.id, d) ?? file.folder, [file.id], 'hold')}
            onMouseLeave={() => onShow(folderOf(file.id, d) ?? file.folder, [file.id], 'release')}
            aria-label="Show in table"
            title="Show in table"
            className="grid size-6 shrink-0 place-items-center rounded-md text-text-subtle hover:bg-surface-hover"
          >
            <IconArrowUpRight size={14} stroke={1.75} />
          </button>
        </span>
        <ReviewFile label={label} type={file.type} excerpt={file.excerpt} poor={poor} />
        <div className="flex flex-col gap-2 px-1">
          <ReviewFact label="Name">{label}</ReviewFact>
          <ReviewFact label="Original file path">{file.original}</ReviewFact>
          <ReviewFact label="Description">{file.excerpt}</ReviewFact>
          <ReviewFact label="Decision process">{read.because}</ReviewFact>
        </div>
        <div className="flex flex-col gap-1 px-1">
          <span className="text-body-s text-text-subtle">Folder</span>
          <FolderMenu key={file.id} value={draft} options={companies} label={`Folder for ${label}`} onChange={setDraft} />
          <span className="text-body-s text-text-subtle">
            {draft ? 'Next places it in this folder.' : 'Next leaves this file in _Unidentified.'}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-1.5 border-t border-border-subtle bg-surface-base px-2 py-1.5">
        <button type="button" onClick={back} aria-label={index === 0 ? 'Back' : 'Previous file'} title={index === 0 ? 'Back' : 'Previous file'} className="grid size-[22px] shrink-0 place-items-center rounded-lg border border-border-subtle bg-body text-text-subtle shadow-[0_2px_3px_#64646414] hover:bg-surface-hover">
          <IconArrowLeft size={14} stroke={1.75} />
        </button>
        {index < files.length - 1 && <Button onClick={skipRest}>Skip the rest</Button>}
        <button type="button" onClick={next} aria-label={index + 1 >= files.length ? 'Finish' : 'Next file'} title={index + 1 >= files.length ? 'Finish' : 'Next file'} className="grid size-[22px] shrink-0 place-items-center rounded-lg bg-neutral-950 text-text-on-color shadow-[0_2px_3px_#64646414] hover:bg-neutral-950/85">
          <IconArrowRight size={14} stroke={1.75} />
        </button>
      </div>
    </Card>
  )
}

// ---- C10 Playback ----

export function PlaybackCard({
  d,
  onApply,
  applied,
  canApply,
}: {
  d: Decisions
  onApply: () => void
  applied: boolean
  canApply: boolean
}) {
  const folders = buildGroups(d).length
  const top = d.convention ? topFacet[d.convention] : 'agreed'
  const second = d.secondLevel ? `, each split by ${d.secondLevel}` : ''
  const lines: [string, string][] = [
    ['Move', `${stats.files} files into ${folders} ${top} folders${second}`],
    ['Archive', `${stats.archived} superseded versions into _Archive`],
    [
      'Mark',
      d.currentRule === 'skip'
        ? `version roles left unset on ${stats.chains} agreements`
        : d.chains === 'skip'
          ? `${stats.assumedChains.length} agreements with no signed file left without a current version`
          : d.chains === 'A'
            ? `${stats.assumedChains.length} agreements current`
            : `${stats.assumedChains.length} agreements open`,
    ],
    [
      'File',
      d.employment === 'B'
        ? `${employmentInFiling(d)} employment files under the company named in each one`
        : `${employmentInFiling(d)} employment files into one Employment folder, flagged to HR`,
    ],
    [
      'Date',
      d.dateSource === 'modified'
        ? `the last-edited day on all ${stats.files} files`
        : d.undated === 'dated'
          ? `the date in the filename, plus the dates set on files that had none`
          : d.undated === 'modified'
            ? `the date in the filename, and the last-edited day on the ${stats.undated} files that had none`
            : `the date in the filename, leaving ${stats.undated} files with no date undated`,
    ],
    d.naming === 'keep'
      ? ['Rename', `nothing; every file keeps its name`]
      : ['Rename', `${stats.files} files to ${namingLabels[d.naming ?? 'ctd']}`],
    [
      'Templates',
      d.templates === 'A'
        ? `${stats.templates} files moved to a Templates folder`
        : `${stats.templates} files marked status Template and left in their folders`,
    ],
    [
      'Status',
      d.conflicts === 'skip'
        ? `${conflicting.length} contradictory names left as Conflicting`
        : d.conflicts === 'B'
          ? `${conflicting.length} contradictory names kept their stronger word`
          : `${conflicting.length} contradictory names marked Draft`,
    ],
    [
      'Undefined',
      d.noStatus === 'undefined'
        ? `${stats.unlabelled} files with no status marked Undefined`
        : d.noStatus === 'set'
          ? `Final from the name, then the rest set by hand`
          : `Final from the name, and the rest marked Undefined`,
    ],
    [
      'Place',
      (() => {
        const files = unidentifiedFiles(d)
        const placed = files.filter((r) => d.placements[r.id]).length
        return placed
          ? `${placed} of ${files.length} unidentified files given a company`
          : `${files.length} unidentified files left in _Unidentified`
      })(),
    ],
  ]
  return (
    <Card title="Ready to apply" scope={`${stats.files} files`}>
      <div className="flex gap-2 p-2">
        <Tile value={folders} label="Folders" />
        <Tile value={stats.archived} label="Archived" />
        <Tile value={0} label="Deleted" />
      </div>
      <Section title="What happens, in order">
        {lines.map(([verb, what]) => (
          <span key={verb} className="flex gap-2">
            <span className="w-[76px] shrink-0 font-medium">{verb}</span>
            <span className="text-text-subtle">{what}</span>
          </span>
        ))}
        <span className="text-text-subtle">Every original path is logged, so any of it can be undone.</span>
      </Section>
      {!applied && (
        <Actions>
          <Button>Edit</Button>
          <Button primary onClick={onApply} disabled={!canApply}>
            Accept changes
          </Button>
        </Actions>
      )}
    </Card>
  )
}

// ---- C11 Apply summary ----

const applySteps = ['Moving files', 'Archiving superseded versions', 'Renaming files']

export function ApplyCard({ onDone, onUndo, done }: { onDone: () => void; onUndo: () => void; done: boolean }) {
  const [step, setStep] = useState(done ? applySteps.length : 0)
  useEffect(() => {
    if (step >= applySteps.length) {
      if (!done) onDone()
      return
    }
    const t = setTimeout(() => setStep(step + 1), 700)
    return () => clearTimeout(t)
  }, [step, done, onDone])
  return (
    <Card title={done ? 'Applied' : 'Applying'} scope={`${stats.files} files`}>
      <Section>
        {applySteps.map((s, i) => (
          <span key={s} className={`flex items-center gap-1.5 ${i > step ? 'text-text-disabled' : ''}`}>
            {i < step ? (
              <IconCheck size={14} className="text-brand" />
            ) : i === step ? (
              <IconLoader2 size={14} className="animate-spin text-text-subtle" />
            ) : (
              <span className="size-3.5" />
            )}
            {s}
          </span>
        ))}
      </Section>
      {done && (
        <Actions>
          <Button onClick={onUndo}>
            <IconArrowBackUp size={14} stroke={1.75} />
            Undo run
          </Button>
        </Actions>
      )}
    </Card>
  )
}
