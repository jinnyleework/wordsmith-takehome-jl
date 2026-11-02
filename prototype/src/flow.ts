// The clean-up conversation as data: what the user has decided so far, the
// numbers each card quotes, and the preview the right-hand panel shows.
import { allRows, summaries, type FileRow, type Status } from './data'

// Top level of the filing: A counterparty, B type, C status
export type Convention = 'A' | 'B' | 'C'
export type Choice = 'A' | 'B'

// A fact a folder level can be split by
export type Facet = 'counterparty' | 'type' | 'status' | 'year'
export const topFacet: Record<Convention, Facet> = { A: 'counterparty', B: 'type', C: 'status' }

export function englishList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

// A recognisable folder to talk about, rather than whichever name sorts first
const sampleNames: Record<Convention, string> = { A: 'Acme Corp', B: 'MSA', C: 'Final' }

export function sampleFolderName(c: Convention) {
  return sampleNames[c]
}

// Status and year pull versions of one agreement into different folders. Type and counterparty do not.
export function splittingFacets(d: Decisions): Array<'status' | 'year'> {
  const levels: Facet[] = []
  if (d.convention) levels.push(topFacet[d.convention])
  if (d.secondLevel) levels.push(d.secondLevel)
  return levels.filter((f): f is 'status' | 'year' => f === 'status' || f === 'year')
}

// What the user says should count as the current file in a version chain
export type CurrentRule = 'signed' | 'final' | 'latest'

// Which date the register treats as the agreement date
export type DateSource = 'filename' | 'modified'

// What to do with files whose name has no date. Review walks through them one at a time.
export type UndatedPass = 'review' | 'skip' | 'dated' | 'modified'

// What to do with files whose name has no status. Review walks through them one at a time.
export type NoStatusPass = 'bulk' | 'review' | 'rules' | 'undefined' | 'set'

// How files are renamed on Apply. 'keep' leaves every filename as it is today.
export type NamingPattern = 'ctd' | 'tcd' | 'dct' | 'keep'

export const namingLabels: Record<NamingPattern, string> = {
  ctd: 'Counterparty – Type – date',
  tcd: 'Type – Counterparty – date',
  dct: 'date – Counterparty – Type',
  keep: 'the names they have today',
}

// What a file is called under a pattern, in full, for the cards to quote
export function patternName(r: FileRow, pattern: NamingPattern, source: DateSource | null) {
  if (pattern === 'keep') return basename(r.original).replace(/\.\w+$/, '')
  const core = r.name.replace(/\.\w+$/, '').replace(/ – (?:19|20)\d\d(?:-\d\d)?(?:-\d\d)?$/, '')
  const [counterparty, ...rest] = core.split(' – ')
  const date = agreementDate(r, source)
  const parts =
    pattern === 'ctd' ? [counterparty, ...rest, date] : pattern === 'tcd' ? [...rest, counterparty, date] : [date, counterparty, ...rest]
  return parts.filter(Boolean).join(' – ')
}

// What to do with files that name no company. Review walks through them one at a time.
export type UnidentifiedPass = 'review' | 'placed' | 'left'

export interface Decisions {
  convention: Convention | null
  // How files are split inside each top-level folder
  secondLevel: Facet | null
  // Null until the user chooses. Until then the register keeps the date from the filename.
  dateSource: DateSource | null
  // Null until the filename-date path asks. Last-edited dates never reach this.
  undated: UndatedPass | null
  easyWins: boolean
  // Which version wins, once the user has answered. 'skip' leaves the column blank.
  currentRule: CurrentRule | 'skip' | null
  // Agreements with several versions and none signed. 'skip' leaves them unset.
  chains: Choice | 'skip' | null
  employment: Choice | null
  // Files from Templates (do not use). A is a Templates folder. B is status Template, kept in the company folder.
  templates: Choice | null
  // Specific cases, each accepted, changed, or skipped
  solara: Choice | 'skip' | null
  vantage: Choice | 'skip' | null
  // Filenames that contradict themselves. A trusts the correction (Draft). B keeps the stronger word. 'skip' leaves Conflicting.
  conflicts: Choice | 'skip' | null
  // Files whose name has no status word. Null until that card is answered.
  noStatus: NoStatusPass | null
  // Which filename rules to apply. Null means every rule, once noStatus is set. A shorter list leaves the rest for the next card.
  statusRules: StatusRuleId[] | null
  // Status chosen for a rule, when it isn't the recommended one. Null keeps each rule's own status.
  statusMarks: StatusMarks | null
  // Files with no company. Review places the ones the description supports, then the rest by hand.
  unidentified: UnidentifiedPass | null
  // Company folder chosen for a file that had none. Wins over the extracted folder.
  placements: Record<string, string>
  // The filename pattern, chosen just before Apply
  naming: NamingPattern | null
  applied: boolean
}

export const noDecisions: Decisions = {
  convention: null,
  secondLevel: null,
  dateSource: null,
  undated: null,
  easyWins: false,
  currentRule: null,
  templates: null,
  chains: null,
  employment: null,
  solara: null,
  vantage: null,
  conflicts: null,
  noStatus: null,
  statusRules: null,
  statusMarks: null,
  unidentified: null,
  placements: {},
  naming: null,
  applied: false,
}

export const endState: Decisions = {
  convention: 'A',
  secondLevel: 'type',
  dateSource: 'filename',
  undated: 'skip',
  easyWins: true,
  currentRule: 'signed',
  templates: 'B',
  chains: 'A',
  employment: 'B',
  solara: 'A',
  vantage: 'A',
  conflicts: 'A',
  noStatus: 'rules',
  // Null applies every filename rule: clean versions become Final; copy, backup, old, duplicate saves and a version number stay Undefined.
  statusRules: null,
  statusMarks: null,
  unidentified: 'placed',
  // Recommendations the description, a version, a date, or the filename can support.
  // The lease, the statement of work, and the 2017 licence still have more than one company.
  placements: {
    F0034: 'Harbourline Shipping',
    F0016: 'Harbourline Shipping',
    F0127: 'Anchor Point Bank',
    F0092: 'Brightpath Health',
    F0009: 'Marlin',
    F0153: 'Corvus Data',
    F0139: 'Marlin',
  },
  naming: 'ctd',
  applied: true,
}

// The order the assistant walks through; each step's card waits on one decision.
export type Step = 'report' | 'convention' | 'secondLevel' | 'dates' | 'undated' | 'templates' | 'easyWins' | 'chains' | 'employment' | 'solara' | 'vantage' | 'unidentified' | 'conflicts' | 'noStatus' | 'naming' | 'playback' | 'applied'

// ---- Numbers the cards quote, all counted from the data ----

const heads = new Set(allRows.filter((r) => r.versionOf).map((r) => r.versionOf!))
const chainHeads = allRows.filter((r) => heads.has(r.id))
// A placed file keeps its original folder on the row until the preview copies it.
const isPerson = (r: FileRow) => (allRows.find((x) => x.id === r.id) ?? r).folder === 'Employment'

// The folder name is an instruction: these are not finished agreements.
export function isTemplate(r: FileRow) {
  return r.original.includes('/Templates (do not use)/')
}

export const stats = {
  files: allRows.length,
  agreements: allRows.filter((r) => r.version !== 'Archived').length,
  counterparties: new Set(allRows.map((r) => r.folder).filter((f) => f !== 'Employment' && f !== '_Unidentified')).size,
  types: new Set(allRows.filter((r) => !isPerson(r)).map((r) => r.type)).size,
  chains: chainHeads.length,
  signedChains: chainHeads.filter((r) => r.version === 'Current'),
  assumedChains: chainHeads.filter((r) => r.version === 'Current (assumed)'),
  archived: allRows.filter((r) => r.version === 'Archived').length,
  singles: allRows.filter((r) => !heads.has(r.id) && !r.versionOf && !isPerson(r) && r.folder !== '_Unidentified').length,
  employment: allRows.filter(isPerson).length,
  employmentShared: allRows.filter((r) => isPerson(r) && r.original.startsWith('/Shared')).length,
  templates: allRows.filter(isTemplate).length,
  // Templates that would otherwise be the current file of their own agreement
  templateSingles: allRows.filter((r) => isTemplate(r) && !isPerson(r) && !r.versionOf && !heads.has(r.id)).length,
  unidentified: allRows.filter((r) => r.folder === '_Unidentified').length,
  originalFolders: new Set(allRows.map((r) => dirname(r.original))).size,
  // Filename date and last-edited date, compared at the precision the name states
  dateConflicts: allRows.filter((r) => r.date != null && !r.modified.startsWith(r.date)).length,
  fullDateConflicts: allRows.filter((r) => r.date != null && r.date.length === 10 && r.date !== r.modified).length,
  editedLater: allRows.filter((r) => r.date != null && r.date.length === 10 && r.modified > r.date).length,
  undated: allRows.filter((r) => r.date == null).length,
  unlabelled: allRows.filter((r) => r.status === 'Unlabelled').length,
  yearMoves: allRows.filter((r) => (r.date?.slice(0, 4) ?? '') !== r.modified.slice(0, 4)).length,
  sameDaySaves: Math.max(
    ...[...allRows.reduce((m, r) => m.set(r.modified, (m.get(r.modified) ?? 0) + 1), new Map<string, number>()).values()],
  ),
}

// The date the register shows for this source. A hand edit in the table is applied later and wins.
export function agreementDate(r: FileRow, source: DateSource | null): string | null {
  return source === 'modified' ? r.modified : r.date
}

// How the team files today, from the audit (05-design-decisions.md, "Setting the convention")
export const filedToday = [
  { label: 'Type', files: 54, color: 'bg-viz-orange' },
  { label: 'Status', files: 49, color: 'bg-viz-green' },
  { label: 'Year', files: 43, color: 'bg-viz-midnight' },
  { label: 'Counterparty', files: 12, color: 'bg-viz-yellow' },
  { label: 'Unsorted', files: 62, color: 'bg-viz-pear' },
]

// The top-level folders each convention would leave, for the hover preview
export function topFolders(c: Convention): string[] {
  return buildGroups({ ...noDecisions, convention: c, employment: 'A' }).map((g) => g.name)
}

export function facetValue(r: FileRow, f: Facet): string {
  if (f === 'counterparty') return r.folder
  if (f === 'type') return r.type
  if (f === 'status') return r.status
  return r.date?.slice(0, 4) ?? 'No date'
}

// One real top-level folder and the subfolders it would get, for the hover preview
export function sampleSubfolders(c: Convention, f: Facet): { folder: string; subfolders: string[] } {
  const groups = buildGroups({ ...noDecisions, convention: c, employment: 'A' })
  const sample =
    groups.find((g) => g.name === sampleFolderName(c)) ??
    groups.find((g) => g.name !== 'Employment' && !g.name.startsWith('_')) ??
    groups[0]
  const subfolders = [...new Set(sample.rows.map((r) => facetValue(r, f)))].sort()
  return { folder: sample.name, subfolders }
}

export function cappedList(items: readonly string[], cap = 4): string {
  const shown = items.slice(0, cap)
  const more = items.length - shown.length
  return more ? `${englishList(shown)}, and ${more} more` : englishList(shown)
}

// Which of the chosen folder levels actually separate this agreement's versions
export function familySplits(id: string, d: Decisions): Array<'status' | 'year'> {
  const family = [byId(id), ...versionsOf(id)]
  return splittingFacets(d).filter((f) => new Set(family.map((r) => facetValue(r, f))).size > 1)
}

export function versionsOf(id: string) {
  return allRows.filter((r) => r.versionOf === id)
}

export function byId(id: string) {
  return allRows.find((r) => r.id === id)!
}

// ---- What the right-hand panel shows ----

export type VersionLabel = FileRow['version'] | 'Duplicate' | 'Template' | 'Needs your answer' | 'Open' | '—'

// The file a row nests under in the register: the current version it was superseded by, or the file it duplicates.
export function parentOf(r: FileRow): string | undefined {
  return r.versionOf ?? r.duplicateOf
}

// Employment files still in the filing. A template is set aside once that question is answered.
export function employmentInFiling(d: Decisions) {
  return allRows.filter((r) => isPerson(r) && !(d.templates === 'A' && isTemplate(r))).length
}

// Who may see or receive the file. It sits beside the status, since an internal-only file can still be signed,
// and it outlives the rename that drops the words from the name.
export type Handling = 'Internal only' | 'Do not send'

export function handlingOf(r: FileRow): Handling | null {
  const words = fileWords(fileName(r))
  if (/internal only/.test(words)) return 'Internal only'
  if (/do not send/.test(words)) return 'Do not send'
  return null
}

export interface ViewRow extends FileRow {
  display: string
  versionLabel: VersionLabel
  handling: Handling | null
  // Position in its agreement's chain, oldest first by agreement date. Undated files and single files have none.
  versionNo?: number
}

// A direct edit in the register. It wins over the derived preview for that file.
export interface FieldEdit {
  status?: FileRow['status']
  date?: string | null
  note?: string
  versionLabel?: VersionLabel
}

export interface Group {
  name: string
  rows: ViewRow[]
  summary: string
}

export function dirname(path: string) {
  return path.slice(0, path.lastIndexOf('/')) || '/'
}

function basename(path: string) {
  return path.slice(path.lastIndexOf('/') + 1)
}

// Under convention B or C the folder is the type, so the counterparty stays in the name.
function groupOf(r: FileRow, d: Decisions) {
  if (!d.convention) return dirname(r.original)
  if (d.templates === 'A' && isTemplate(r)) return 'Templates'
  if (isPerson(r)) {
    if (d.employment !== 'B') return 'Employment'
    if (d.placements[r.id]) return d.placements[r.id]
    const company = r.name.split(' – ')[0]
    return company === 'Unidentified' ? '_Unidentified' : company
  }
  if (d.convention === 'A') return d.placements[r.id] ?? r.folder
  return d.convention === 'B' ? r.type : r.status
}

function displayName(r: FileRow, d: Decisions) {
  // The new pattern is the last thing that happens, on Apply. Until then the
  // register keeps each file's name exactly as it is in the repository today.
  if (!d.convention || !d.applied || d.naming === 'keep') return basename(r.original)
  const named = d.placements[r.id] ? r.name.replace(/^Unidentified – /, `${d.placements[r.id]} – `) : r.name
  const ext = /\.\w+$/.exec(named)?.[0] ?? ''
  // The extracted name is "Company – Type[ – detail] – date"; rebuild it in the chosen
  // order, with the date the user settled on (source, supplied or edited), if any.
  const core = named.slice(0, named.length - ext.length).replace(/ – (?:19|20)\d\d(?:-\d\d)?(?:-\d\d)?$/, '')
  const [company, ...rest] = core.split(' – ')
  const date = r.date ? [r.date] : []
  const parts =
    d.naming === 'tcd' ? [...rest, company, ...date] : d.naming === 'dct' ? [...date, company, ...rest] : [company, ...rest, ...date]
  return parts.join(' – ') + ext
}

function newest(files: FileRow[], source: DateSource | null) {
  const key = (f: FileRow) => agreementDate(f, source) ?? ''
  return [...files].sort((a, b) => key(b).localeCompare(key(a)) || a.id.localeCompare(b.id))[0]
}

// Reassigns who is current inside a chain when the user picks a rule other than
// "signed", which is how the rows were extracted. Chains the rule
// doesn't move stay as they are, for the later questions.
export function applyCurrentRule(rows: FileRow[], rule: CurrentRule | 'skip' | null, source: DateSource | null = null): FileRow[] {
  if (!rule || rule === 'signed' || rule === 'skip') return rows
  const headIds = new Set(rows.filter((r) => r.versionOf).map((r) => r.versionOf!))
  const groups = new Map<string, FileRow[]>()
  for (const r of rows) {
    const key = r.versionOf ?? (headIds.has(r.id) ? r.id : undefined)
    if (!key) continue
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  const replacements = new Map<string, FileRow>()
  for (const files of groups.values()) {
    const head = files.find((f) => f.version === 'Current' || f.version === 'Current (assumed)')
    if (!head) continue
    const pool = rule === 'final' ? files.filter((f) => f.status === 'Final') : files
    if (pool.length === 0) continue
    const winner = newest(pool, source)
    if (winner.id === head.id) continue
    const why = rule === 'final' ? 'Latest FINAL, by your choice' : 'Newest file, by your choice'
    for (const f of files) {
      replacements.set(
        f.id,
        f.id === winner.id
          ? { ...f, version: 'Current', versionOf: undefined, note: why }
          : {
              ...f,
              version: 'Archived',
              versionOf: winner.id,
              note: f.id === head.id ? 'Was current, until you chose what counts' : 'Superseded by your choice of what counts as current',
            },
      )
    }
  }
  return replacements.size === 0 ? rows : rows.map((r) => replacements.get(r.id) ?? r)
}

export function ruleSwaps(rule: CurrentRule, source: DateSource | null = null) {
  return ruleChangeIds(rule, source).current.length
}

// Files a version rule actually moves: the new current file, and the one that was current before.
export function ruleChangeIds(rule: CurrentRule | 'skip', source: DateSource | null = null) {
  if (rule === 'signed' || rule === 'skip') return { current: [] as string[], archived: [] as string[] }
  const before = new Map(allRows.map((r) => [r.id, r.version]))
  const after = applyCurrentRule(allRows, rule, source)
  return {
    current: after.filter((r) => r.version === 'Current' && !before.get(r.id)!.startsWith('Current')).map((r) => r.id),
    archived: after.filter((r) => r.version === 'Archived' && before.get(r.id)!.startsWith('Current')).map((r) => r.id),
  }
}

function versionLabel(r: FileRow, d: Decisions): VersionLabel {
  // A template is not the current agreement, even when the filename says signed or FINAL.
  if (d.templates === 'A' && isTemplate(r)) return 'Template'
  // Version roles are a later decision. Until that step, or when it is skipped,
  // the column stays empty even though the folders have already been redrawn.
  // An answer about the unsigned chains can still mark just those.
  if (!d.convention || !d.easyWins || d.currentRule === 'skip') {
    if (d.currentRule === 'skip' && r.version === 'Current (assumed)') {
      if (d.chains === 'A') return 'Current'
      if (d.chains === 'B') return 'Open'
    }
    return '—'
  }
  if (r.duplicateOf) return 'Duplicate'
  if (r.version !== 'Current (assumed)') return r.version
  if (d.chains === 'A') return 'Current'
  return d.chains === 'B' ? 'Open' : 'Needs your answer'
}

// The specific cases: Solara's pending NDA and Vantage's two same-named licences
export const cases = {
  solara: { pending: 'F0071', kept: 'F0013' },
  vantage: { first: 'F0014', second: 'F0017' },
}

// A company folder under the chosen filing. Employment and _Unidentified are not companies.
export function companyFolders(): string[] {
  return [...new Set(allRows.map((r) => r.folder))]
    .filter((f) => f !== 'Employment' && f !== '_Unidentified')
    .sort((a, b) => a.localeCompare(b))
}

// True when a company is a folder the user will actually see.
export function companyIsFolder(d: Decisions) {
  if (!d.convention) return false
  return topFacet[d.convention] === 'counterparty' || d.secondLevel === 'counterparty'
}

// Files the name couldn't tie to a company. Employment files only join the list when
// they would otherwise land in _Unidentified, which is when each person is filed by company.
export function unidentifiedFiles(d: Decisions): FileRow[] {
  return allRows.filter((r) => {
    if (d.templates === 'A' && isTemplate(r)) return false
    if (r.folder === '_Unidentified') return true
    return d.employment === 'B' && r.folder === 'Employment' && r.name.startsWith('Unidentified – ')
  })
}

export type UnidentifiedRead =
  | { kind: 'recommend'; folder: string; because: string; hint: string; from: 'description' | 'context' }
  | { kind: 'manual'; because: string }

// A recommendation where one company is the best reading: a name in the description, or the same
// type sitting next to a version and a date the company already has. Ties stay with the user.
const unidentifiedReads: Record<string, UnidentifiedRead> = {
  F0034: {
    kind: 'recommend',
    folder: 'Harbourline Shipping',
    from: 'description',
    hint: 'description names Harbourline',
    because:
      'The description says “between the Company and Harbourlin…”. Harbourline Shipping is the only match, and it already has DPAs. The rest of the scan can’t be read.',
  },
  F0016: {
    kind: 'recommend',
    folder: 'Harbourline Shipping',
    from: 'context',
    hint: 'v1 of Harbourline’s May 2025 DPA',
    because:
      'This is a DPA marked v1, from November 2024. DPA_v2_May2025 is the next version, six months later, and that description names Harbourline Shipping. I’d file this one with it.',
  },
  F0127: {
    kind: 'recommend',
    folder: 'Anchor Point Bank',
    from: 'description',
    hint: 'description names Anchor Point',
    because:
      'The description says “under which An…”. On other MSAs that sentence names the company, and only Anchor Point Bank starts that way. The scan cuts off, so check it before placing.',
  },
  F0092: {
    kind: 'recommend',
    folder: 'Brightpath Health',
    from: 'context',
    hint: 'v2, six days before Brightpath’s',
    because:
      'This is a master agreement, v2, dated 27 Nov 2017. Brightpath Health has “Master Agreement-v2_FINAL” dated 3 Dec 2017, six days later. I’d treat this as the copy from just before that final.',
  },
  F0009: {
    kind: 'recommend',
    folder: 'Marlin',
    from: 'context',
    hint: 'same filename pattern as Marlin',
    because:
      'The name is “IP License-FINAL_v2” plus a date, 22 Jun 2021. Marlin’s licence is named the same way: “IP License-FINAL_v2”, dated 25 Aug 2017. No other company uses that pattern.',
  },
  F0153: {
    kind: 'recommend',
    folder: 'Corvus Data',
    from: 'context',
    hint: 'the other 2023 NDA is Corvus’s',
    because:
      'An executed confidentiality agreement from July 2023. The only other NDA from 2023 is Corvus Data’s, marked final. This may be the signed copy of that one.',
  },
  F0139: {
    kind: 'recommend',
    folder: 'Marlin',
    from: 'context',
    hint: 'name starts with M',
    because:
      'The name is “MNDA v3 2020”. Companies beginning with M are Marlin and Meridian Cloud Systems, and neither has an NDA. I’d try Marlin: its next file is a partnership from February 2021, so this may be the confidentiality agreement just before it.',
  },
  F0162: {
    kind: 'manual',
    because:
      'The description names 5 Harbour View, Leith, and no landlord. Corvus Data, Ashworth Textiles, Bluewave Logistics and Marlin each already have a lease there. Bluewave’s is also a v3, from 30 Oct 2022, a year before this one.',
  },
  F0134: {
    kind: 'manual',
    because:
      'The description is a supply chain logistics engagement under an MSA dated 17 June 2018, and no MSA here has that date. The same subject is already on files for Silvergate, Brightpath Health, Halden, Corvus Data and Solara Energy, so the phrase doesn’t pick a company. Bluewave, Greymoor, Cobalt Freight and Harbourline have logistics in the name, and none of their files is this engagement.',
  },
  F0187: {
    kind: 'manual',
    because:
      'The scan doesn’t name a company. The closest licences are Bluewave Logistics’s “IP License old 2017”, Harbourline Shipping’s v3 from 28 Jun 2017, and Marlin’s FINAL v2 from 25 Aug 2017.',
  },
}

export function unidentifiedRead(r: FileRow): UnidentifiedRead {
  return (
    unidentifiedReads[r.id] ?? {
      kind: 'manual',
      because: r.excerpt.startsWith('Scanned copy, OCR quality poor')
        ? 'The scan is too poor to read a company name.'
        : 'The description doesn’t name a company.',
    }
  )
}

const recommendOrder = ['F0034', 'F0127', 'F0016', 'F0092', 'F0009', 'F0153', 'F0139']

// What the assistant says before the file-by-file pass.
export function unidentifiedPitch(d: Decisions): string {
  const files = unidentifiedFiles(d)
  const recommended = files.map(unidentifiedRead).filter((r) => r.kind === 'recommend')
  const manual = files.length - recommended.length
  const described = recommended.filter((r) => r.from === 'description').length
  const lined = recommended.length - described
  const how = [
    described ? `${described} from the description` : '',
    lined ? `${lined} because a version, a date or the filename lines up with a company already here` : '',
  ].filter(Boolean)
  const place = recommended.length === 1 ? 'a folder for 1' : `a folder for ${recommended.length}`
  const rest = manual === 1 ? 'The other 1 needs you to choose.' : `The other ${manual} need you to choose.`
  return `I can recommend ${place}: ${how.join(', and ')}. ${rest}`
}

// Recommendations first, then readable files that still don’t name a company, then poor scans.
export function unidentifiedQueue(d: Decisions): FileRow[] {
  const rank = (r: FileRow) => {
    if (unidentifiedRead(r).kind === 'recommend') return 0
    return r.excerpt.startsWith('Scanned copy, OCR quality poor') ? 2 : 1
  }
  return [...unidentifiedFiles(d)].sort((a, b) => {
    const byRank = rank(a) - rank(b)
    if (byRank !== 0) return byRank
    if (rank(a) === 0) return recommendOrder.indexOf(a.id) - recommendOrder.indexOf(b.id)
    return a.original.localeCompare(b.original)
  })
}

export function unidentifiedOutcome(d: Decisions): string {
  const files = unidentifiedFiles(d)
  const rank = (id: string) => {
    const i = recommendOrder.indexOf(id)
    return i === -1 ? recommendOrder.length : i
  }
  const placed = files.filter((r) => d.placements[r.id]).sort((a, b) => rank(a.id) - rank(b.id))
  const left = files.length - placed.length
  if (placed.length === 0) return `All ${files.length} stay in _Unidentified.`
  const shown = placed.slice(0, 2).map((r) => `${d.placements[r.id]} (${r.type})`)
  const more = placed.length - shown.length
  const list = more ? `${shown.join(', ')}, and ${more} more` : englishList(shown)
  const where = companyIsFolder(d)
    ? 'They leave _Unidentified and sit with that company.'
    : 'Your folders aren’t split by company, so the company is recorded on the file and it stays in the folder it’s already in.'
  const rest = left ? ` ${left} stay in _Unidentified, where there wasn’t one company to file them under.` : ''
  const verb = placed.length === 1 ? 'has' : 'have'
  return `${placed.length} now ${verb} a company: ${list}. ${where}${rest}`
}

// Filenames that say two incompatible things, so the extracted status is Conflicting.
export const conflicting = allRows.filter((r) => r.status === 'Conflicting')

// A trusts the word that takes the claim back ("not final", "unsigned"): every one is a draft.
// B keeps a real FINAL or signed word, and only the names that merely take themselves back become drafts.
export function conflictStatus(r: FileRow, choice: Choice): FileRow['status'] {
  if (choice === 'A') return 'Draft'
  const name = r.original.toLowerCase().replace(/[_-]+/g, ' ').replace(/not\s+final/g, '')
  if (/\b(signed|executed)\b/.test(name)) return 'Signed'
  if (/\bfinal\b/.test(name)) return 'Final'
  return 'Draft'
}

// A status or a version read from the filename, applied to every file that matches before anyone opens one.
// Copy, backup, old, a duplicate save, a version number, "reviewed", and "internal only" are not a status,
// so those rules leave the file Undefined. Most of these files are the only one their agreement has.
export type StatusRuleId = 'clean' | 'copy' | 'backup' | 'duplicate' | 'old' | 'version' | 'reviewed' | 'internal' | 'bare'

// A status the user picked for a rule, in place of the one the name suggests.
export type StatusMarks = Partial<Record<StatusRuleId, Status>>

export type StatusRule = {
  id: StatusRuleId
  status: Status
  label: string
  because: string
}

function fileWords(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

const statusRules: (StatusRule & { section: 'status' | 'version'; test: (name: string) => boolean })[] = [
  {
    id: 'clean',
    section: 'status',
    status: 'Final',
    label: 'clean version',
    because: 'The name says clean version, which is the accepted text.',
    test: (name) => /\bclean\b/.test(fileWords(name)),
  },
  {
    id: 'copy',
    section: 'version',
    status: 'Undefined',
    label: 'copy',
    because: 'The name says copy. That says how the file was made, not whether it was signed.',
    test: (name) => /\bcopy\b/.test(fileWords(name)),
  },
  {
    id: 'backup',
    section: 'version',
    status: 'Undefined',
    label: 'backup',
    because: 'The name says backup. That says where it was kept, not whether it was signed.',
    test: (name) => /\bbackup\b/.test(fileWords(name)),
  },
  {
    id: 'duplicate',
    section: 'version',
    status: 'Undefined',
    label: 'duplicate save',
    because: 'The name has (1) or (2), the mark of a second save. That doesn’t say whether it was signed.',
    test: (name) => /\(\d+\)/.test(name),
  },
  {
    id: 'old',
    section: 'version',
    status: 'Undefined',
    label: 'old',
    because: 'The name says old. That’s someone’s note on its age, not whether it was signed.',
    test: (name) => /\bold\b/.test(fileWords(name)),
  },
  {
    id: 'reviewed',
    section: 'version',
    status: 'Undefined',
    label: 'reviewed',
    because: 'The name says reviewed. That isn’t signed, final, or draft.',
    test: (name) => /\breviewed\b/.test(fileWords(name)),
  },
  {
    id: 'internal',
    section: 'version',
    status: 'Undefined',
    label: 'internal only',
    because: 'The name says internal only. That’s who can see it, so it’s kept as a handling flag, not a status.',
    test: (name) => /internal only/.test(fileWords(name)),
  },
  {
    id: 'version',
    section: 'version',
    status: 'Undefined',
    label: 'only a version number',
    because: 'The name has a version number and no status. v1 or v2 doesn’t say whether it was signed.',
    test: (name) => /\bv\d+\b/.test(fileWords(name)),
  },
  {
    id: 'bare',
    section: 'version',
    status: 'Undefined',
    label: 'a name with no status',
    because: 'The name names the agreement, and sometimes who it’s with and when. It doesn’t say signed, final, or draft.',
    test: () => true,
  },
]

function fileName(r: FileRow) {
  return r.original.slice(r.original.lastIndexOf('/') + 1)
}

export function statusRuleFor(r: FileRow): StatusRule | null {
  if (r.status !== 'Unlabelled') return null
  const name = fileName(r)
  const found = statusRules.find((rule) => rule.test(name))
  if (!found) return null
  return { id: found.id, status: found.status, label: found.label, because: found.because }
}

export type StatusGap = 'version' | 'reviewed' | 'internal' | 'bare'

export function statusGap(r: FileRow): { kind: StatusGap; because: string } {
  const name = fileName(r)
  const words = fileWords(name)
  if (/\breviewed\b/.test(words))
    return { kind: 'reviewed', because: 'The name says reviewed. That isn’t signed, final, or draft.' }
  if (/internal only/.test(words))
    return { kind: 'internal', because: 'The name says internal only. That’s who can see it, so it’s kept as a handling flag, not a status.' }
  if (/\bv\d+\b/.test(words))
    return { kind: 'version', because: 'The name has a version number and no status. v1 or v2 doesn’t say whether it was signed.' }
  return { kind: 'bare', because: 'The name names the agreement, and sometimes who it’s with and when. It doesn’t say signed, final, or draft.' }
}

// `chosen` null applies every rule. A list applies only those, and the rest join the files the name doesn't settle.
export function statusRuleSplit(chosen?: StatusRuleId[] | null, marks?: StatusMarks | null) {
  const grouped = statusRules.map((rule) => ({ ...rule, status: marks?.[rule.id] ?? rule.status, files: [] as FileRow[] }))
  const unmatched: FileRow[] = []
  for (const file of allRows) {
    if (file.status !== 'Unlabelled') continue
    const name = fileName(file)
    const index = statusRules.findIndex((rule) => rule.test(name))
    if (index === -1) unmatched.push(file)
    else grouped[index].files.push(file)
  }
  const groups = grouped.filter((group) => group.files.length > 0)
  const active = new Set(chosen ?? groups.map((group) => group.id))
  const applied = groups.filter((group) => active.has(group.id))
  const final = applied.filter((group) => group.status === 'Final').flatMap((group) => group.files)
  const blank = applied.filter((group) => group.status === 'Undefined').flatMap((group) => group.files)
  const rest = [...groups.filter((group) => !active.has(group.id)).flatMap((group) => group.files), ...unmatched]
  return { groups, applied, final, blank, rest }
}

function settledLine(applied: { label: string; status: Status; files: FileRow[] }[]) {
  const byStatus = new Map<Status, { labels: string[]; count: number }>()
  for (const group of applied) {
    const current = byStatus.get(group.status) ?? { labels: [], count: 0 }
    current.labels.push(group.label)
    current.count += group.files.length
    byStatus.set(group.status, current)
  }
  return [...byStatus.entries()]
    .map(([status, { labels, count }]) => `${count} ${count === 1 ? 'is' : 'are'} ${status}, where the name is ${englishList(labels)}.`)
    .join(' ')
}

export function noStatusOutcome(d: Decisions): string {
  if (d.noStatus === 'undefined') return `All ${stats.unlabelled} files with no status in the name are marked Undefined.`
  const { applied, rest } = statusRuleSplit(d.statusRules, d.statusMarks)
  const settled = settledLine(applied)
  const leftOut = d.statusRules != null && d.statusRules.length < statusRuleSplit().groups.length
  if (d.noStatus === 'set')
    return rest.length
      ? `${settled} You set a status on some of the other ${rest.length}. The ones you skipped are Undefined.`
      : settled
  if (!rest.length) return settled
  return leftOut
    ? `${settled} The other ${rest.length} are Undefined, including the rules you didn’t apply.`
    : `${settled} The other ${rest.length} are Undefined.`
}

// Apply the answers to the specific cases on top of the extracted version roles
function applyCases(r: FileRow, d: Decisions): FileRow {
  const { solara, vantage } = cases
  // A later, specific answer beats the general rule about what counts as current
  if (d.solara === 'A' && (r.id === solara.pending || r.id === solara.kept)) {
    const original = allRows.find((x) => x.id === r.id)!
    if (r.version !== original.version || r.versionOf !== original.versionOf) return original
  }
  if (d.solara === 'B' && r.id === solara.pending)
    return { ...r, version: 'Current', versionOf: undefined, note: 'Made current by you; not signed yet' }
  if (d.solara === 'B' && r.id === solara.kept)
    return { ...r, version: 'Archived', versionOf: solara.pending, note: 'Superseded by the pending NDA, by your choice' }
  if (d.vantage === 'A' && (r.id === vantage.first || r.id === vantage.second)) {
    const other = r.id === vantage.first ? vantage.second : vantage.first
    return { ...r, note: `File ID ${r.id} is on the sheet, so it stays distinct from ${other}` }
  }
  if (d.vantage === 'B' && r.id === vantage.second)
    return { ...r, version: 'Archived', duplicateOf: vantage.first, note: `Duplicate of ${vantage.first}, by your choice` }
  return r
}

// Manual edits from the register sit on top of the conversation, so a move
// or delete survives the preview redrawing.
export function applyManualEdits(groups: Group[], placed: Record<string, string>, removedIds: readonly string[]): Group[] {
  if (removedIds.length === 0 && Object.keys(placed).length === 0) return groups
  const removed = new Set(removedIds)
  const names = groups.map((g) => g.name)
  const buckets = new Map<string, ViewRow[]>(groups.map((g) => [g.name, []]))
  for (const g of groups) {
    for (const row of g.rows) {
      if (removed.has(row.id)) continue
      const dest = placed[row.id]
      const target = dest && dest !== g.name ? dest : g.name
      if (!buckets.has(target)) {
        names.push(target)
        buckets.set(target, [])
      }
      buckets.get(target)!.push(row)
    }
  }
  return names.map((name) => {
    const rows = buckets.get(name) ?? []
    const base = groups.find((g) => g.name === name)
    return {
      name,
      rows,
      summary: base?.summary ?? `${rows.length} file${rows.length === 1 ? '' : 's'}.`,
    }
  })
}

export function buildGroups(d: Decisions, edits: Record<string, FieldEdit> = {}): Group[] {
  const map = new Map<string, ViewRow[]>()
  for (const raw of applyCurrentRule(allRows, d.currentRule, d.dateSource)) {
    const base = applyCases(raw, d)
    const edit = edits[base.id]
    const rule = statusRuleFor(base)
    const rulesOn = d.noStatus === 'bulk' || d.noStatus === 'review' || d.noStatus === 'rules' || d.noStatus === 'set'
    const blankSettled = d.noStatus === 'undefined' || d.noStatus === 'rules' || d.noStatus === 'set'
    const status =
      edit?.status !== undefined
        ? edit.status
        : d.templates === 'B' && isTemplate(base)
          ? ('Template' as const)
          : (d.conflicts === 'A' || d.conflicts === 'B') && base.status === 'Conflicting'
            ? conflictStatus(base, d.conflicts)
            : rulesOn && rule && (d.statusRules == null || d.statusRules.includes(rule.id))
              ? (d.statusMarks?.[rule.id] ?? rule.status)
              : blankSettled && base.status === 'Unlabelled'
                ? ('Undefined' as const)
                : base.status
    const r: FileRow = {
      ...base,
      folder: d.placements[base.id] ?? base.folder,
      status,
      date: edit?.date !== undefined ? edit.date : agreementDate(base, d.dateSource),
      // Notes stay the spreadsheet excerpt. A direct edit replaces that text;
      // decisions about version and status do not rewrite it.
      note: edit?.note !== undefined ? edit.note : base.excerpt,
    }
    const g = groupOf(r, d)
    const row = { ...r, display: displayName(r, d), versionLabel: edit?.versionLabel ?? versionLabel(r, d), handling: handlingOf(r) }
    map.set(g, [...(map.get(g) ?? []), row])
  }
  numberVersions([...map.values()].flat())
  const last = (s: string) => s.startsWith('_') || s === 'Employment' || s === 'Templates'
  return [...map.entries()]
    .sort(([a], [b]) => Number(last(a)) - Number(last(b)) || a.localeCompare(b))
    .map(([name, rows]) => ({
      name,
      rows: rows.sort((a, b) => a.type.localeCompare(b.type) || (b.date ?? '').localeCompare(a.date ?? '')),
      summary: summaries[name] ?? `${rows.length} file${rows.length === 1 ? '' : 's'}.`,
    }))
}

// v1, v2… come from the agreement dates in a chain, not from the version a filename claims.
// A duplicate is not a version, and an undated file has no place in the order.
function numberVersions(rows: ViewRow[]) {
  const heads = new Set(rows.filter((r) => r.versionOf).map((r) => r.versionOf!))
  const chains = new Map<string, ViewRow[]>()
  for (const r of rows) {
    const key = r.versionOf ?? (heads.has(r.id) ? r.id : undefined)
    if (key) chains.set(key, [...(chains.get(key) ?? []), r])
  }
  for (const chain of chains.values()) {
    chain
      .filter((r) => r.date)
      .sort((a, b) => a.date!.localeCompare(b.date!) || a.id.localeCompare(b.id))
      .forEach((r, i) => (r.versionNo = i + 1))
  }
}

export function folderOf(id: string, d: Decisions): string | undefined {
  return buildGroups(d).find((g) => g.rows.some((r) => r.id === id))?.name
}

// Which cells a rewrite actually changes, so the preview shimmers those and leaves the rest still.
export type RewriteCells = { name: boolean; status: boolean; date: boolean; version: boolean; note: boolean; type: boolean }

export type Rewrite = {
  // Folder labels whose text is being replaced
  folderNames: Set<string>
  // Folder counts whose number changes
  folderCounts: Set<string>
  heading: boolean
  dateHeader: boolean
  // `${folder}/${section}` labels that appear or disappear
  sections: Set<string>
  cells: Map<string, RewriteCells>
}

export type RewriteSide = {
  groups: Group[]
  by: Facet | null
  heading: string
  dateLabel: string
}

export function diffRewrite(before: RewriteSide, after: RewriteSide): Rewrite {
  const left = snapPreview(before.groups, before.by)
  const right = snapPreview(after.groups, after.by)
  const cells = new Map<string, RewriteCells>()
  for (const id of new Set([...left.rows.keys(), ...right.rows.keys()])) {
    const prev = left.rows.get(id)
    const next = right.rows.get(id)
    if (!prev || !next) continue
    const change: RewriteCells = {
      name: prev.display !== next.display,
      status: prev.status !== next.status,
      date: prev.date !== next.date,
      version: prev.version !== next.version,
      note: prev.note !== next.note,
      type: prev.type !== next.type,
    }
    if (change.name || change.status || change.date || change.version || change.note || change.type) cells.set(id, change)
  }

  const folderNames = new Set<string>()
  const folderCounts = new Set<string>()
  const sections = new Set<string>()
  for (const name of new Set([...left.folders.keys(), ...right.folders.keys()])) {
    const prev = left.folders.get(name)
    const next = right.folders.get(name)
    if (!prev || !next) {
      folderNames.add(name)
      folderCounts.add(name)
      for (const section of prev?.sections ?? []) sections.add(`${name}/${section}`)
      for (const section of next?.sections ?? []) sections.add(`${name}/${section}`)
      continue
    }
    if (prev.ids.size !== next.ids.size) folderCounts.add(name)
    for (const section of prev.sections) if (!next.sections.has(section)) sections.add(`${name}/${section}`)
    for (const section of next.sections) if (!prev.sections.has(section)) sections.add(`${name}/${section}`)
  }

  return {
    folderNames,
    folderCounts,
    heading: before.heading !== after.heading,
    dateHeader: before.dateLabel !== after.dateLabel,
    sections,
    cells,
  }
}

function snapPreview(groups: Group[], by: Facet | null) {
  const rows = new Map<string, { display: string; status: string; date: string | null; version: string; note: string; type: string }>()
  const folders = new Map<string, { ids: Set<string>; sections: Set<string> }>()
  for (const group of groups) {
    const ids = new Set<string>()
    const sections = new Set<string>()
    for (const row of group.rows) {
      ids.add(row.id)
      if (by) sections.add(facetValue(row, by))
      rows.set(row.id, {
        display: row.display,
        status: row.status,
        date: row.date,
        version: `${row.versionLabel} ${row.versionNo ?? ''}`,
        note: row.note,
        type: row.type,
      })
    }
    folders.set(group.name, { ids, sections })
  }
  return { rows, folders }
}
