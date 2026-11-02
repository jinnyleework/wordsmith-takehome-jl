// Rows come from scripts/build-data.py, which reads convention-simulation.md
// and the dataset CSV; re-run it to regenerate. Each row carries its end-state
// name and version role; flow.ts derives what the preview shows before then.
import generated from './generated.json'

// What the file claims to be. Copy, backup, (1) and old describe another file, not a status.
export type BuiltInStatus = 'Signed' | 'Final' | 'Draft' | 'Pending' | 'Unlabelled' | 'Undefined' | 'Conflicting' | 'Template'
// Any other value is a status the user added
export type Status = BuiltInStatus | (string & {})
export type Version = 'Current' | 'Current (assumed)' | 'Archived'

export interface FileRow {
  id: string
  name: string
  original: string
  type: string
  status: Status
  date: string | null
  // When the file was last saved. A full day on every file, and often not the date in the name.
  modified: string
  // File size in kilobytes, from the repository export.
  sizeKb: number
  version: Version
  note: string
  // What the document says, as far as the model could read it
  excerpt: string
  // Set on archived files: the id of the current file they were superseded by
  versionOf?: string
  // Set on a file the user confirmed is the same document as another: the id of the one kept
  duplicateOf?: string
  // Counterparty folder under the recommended convention (or Employment / _Unidentified)
  folder: string
}

const data = generated as Record<string, { summary: string; rows: Omit<FileRow, 'folder'>[] }>

export const summaries: Record<string, string> = Object.fromEntries(
  Object.entries(data).map(([folder, { summary }]) => [folder, summary]),
)

export const allRows: FileRow[] = Object.entries(data).flatMap(([folder, { rows }]) =>
  rows.map((r) => ({ ...r, folder })),
)

export function formatDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  if (!/^\d{4}$/.test(y)) return d
  if (!m) return y
  const month = new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-GB', { month: 'short' })
  return day ? `${month} ${day}, ${y}` : `${month} ${y}`
}

export function formatSize(kb: number) {
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}
