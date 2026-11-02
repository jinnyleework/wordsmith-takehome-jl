import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, MessageSquare, LineChart, FileText, SquareCheck } from 'lucide-react'
import { Chat, type Message } from './components/Chat'
import { folderHeadings, Sidebar } from './components/Sidebar'
import { Register } from './components/Register'
import {
  ApplyCard,
  ChainsCard,
  ConflictsCard,
  ConventionCard,
  EmploymentCard,
  SolaraCard,
  VantageCard,
  CurrentRuleCard,
  DatesCard,
  UndatedCard,
  NoStatusCard,
  UnidentifiedCard,
  TemplatesCard,
  NamingCard,
  OpeningReportCard,
  PlaybackCard,
  SecondLevelCard,
} from './components/cards'
import { allRows, formatDate } from './data'
import {
  applyManualEdits,
  buildGroups,
  diffRewrite,
  type RewriteSide,
  type FieldEdit,
  byId,
  cappedList,
  cases,
  conflicting,
  conflictStatus,
  endState,
  englishList,
  familySplits,
  folderOf,
  employmentInFiling,
  noDecisions,
  isTemplate,
  sampleFolderName,
  sampleSubfolders,
  ruleChangeIds,
  ruleSwaps,
  splittingFacets,
  stats,
  topFacet,
  unidentifiedFiles,
  noStatusOutcome,
  namingLabels,
  statusRuleSplit,
  unidentifiedOutcome,
  unidentifiedPitch,
  versionsOf,
  type Decisions,
  type Step,
  type ViewRow,
} from './flow'

// What the assistant says as it reaches each step. Later steps follow the folders
// already chosen, so the same walk stays true for every permutation.
function spoken(step: Step, d: Decisions): string {
  const top = d.convention ? topFacet[d.convention] : null
  switch (step) {
    case 'report':
      return `I’ve read all ${stats.files} files. Here’s what I found before we change anything.`
    case 'convention':
      return 'Your team has filed contracts four different ways, and 62 files follow no rule at all. I’d recommend filing by counterparty, so everything with one company is in one place. Choose the top level of your filing below; hover an option to preview its folders.'
    case 'secondLevel':
      return `Now the second level: how should files be split inside each ${top ?? 'top-level'} folder? Hover an option to see it on one of your folders.`
    case 'dates': {
      const base = `On ${stats.dateConflicts} files the date in the name is not the day the file was last edited. None of the ${stats.fullDateConflicts} full dates match that day. Last edited is when the file was saved, often later. Which date should the register use?`
      return d.secondLevel === 'year' ? `${base} You split folders by year, so this choice moves files between year sections.` : base
    }
    case 'undated': {
      const base = `${stats.undated} files have no date in the name. You can set a date on each one, or leave them undated.`
      return d.secondLevel === 'year' ? `${base} You split by year, so a file with no date sits in No date until you give it one.` : base
    }
    case 'templates':
      return `${stats.templates} files sit in a folder named Templates (do not use). A template is not a signed agreement. I can put them in a Templates folder, or mark the status as Template and leave them in the company folder. Crestline’s only lease is one of them, and the filename calls it signed.`
    case 'easyWins':
      return 'Next, versions. Many of your agreements exist as several files: a draft, a FINAL, a signed copy. Each agreement needs one current file, so whoever looks for it gets the right one. What should count as current? Hover an option to see it on one of your agreements.'
    case 'chains': {
      const base =
        'Now the versions I couldn’t settle on my own: nothing in these is signed, so I need your call. One answer covers the whole group.'
      const splits = splittingFacets(d)
      if (splits.length === 0) return base
      return `${base} Filing by ${englishList(splits)} puts some versions of the same agreement in different folders. I’ll still treat them as one chain.`
    }
    case 'conflicts': {
      const move =
        d.convention === 'C' || d.secondLevel === 'status' ? ' You file by status, so this moves the files too.' : ''
      return `Last, status. ${conflicting.length} filenames contradict themselves, so I left the status as Conflicting. Acme’s MSA says FINAL and “draft not final”. An Ashworth employment contract says signed and unsigned. What should the status be?${move}`
    }
    case 'noStatus': {
      const { final, blank } = statusRuleSplit()
      const base = `The other ${stats.unlabelled} files have no status in the name. I can mark ${final.length} as Final from the name, and leave ${blank.length} Undefined. Copy, backup, old and a version number aren’t a status, and most of those files are the only one their agreement has.`
      return d.convention === 'C' || d.secondLevel === 'status'
        ? `${base} You file by status, so anything left Undefined collects there.`
        : base
    }
    case 'employment':
      if (top === 'type')
        return 'Next, employment contracts. They would be their own type folder, but each one is with a person, and several sit in /Shared with personal data.'
      if (top === 'status')
        return 'Next, employment contracts. Filing by status would scatter them across Draft, Final and the rest, and they contain personal data.'
      return 'Next, employment contracts. They name a company, but each is with a person, so they don’t fit a company folder cleanly.'
    case 'solara': {
      const base = 'Two specific cases left, one at a time. First, a Solara Energy NDA.'
      const apart = familySplits(cases.solara.kept, d)
      if (apart.length === 0) return base
      return `${base} The pending file and the 2022 one sit in different ${englishList(apart)} folders under this filing.`
    }
    case 'vantage':
      return 'Next, two Vantage Retail Group licences. Renaming them to Counterparty – Type – date gives them the same name, whichever folders you chose.'
    case 'unidentified': {
      const files = unidentifiedFiles(d)
      const where = d.convention === 'A' || d.secondLevel === 'counterparty' ? 'so they sit in _Unidentified' : 'so there’s no company to file them under'
      return `${files.length} files have no company, ${where}. ${unidentifiedPitch(d)}`
    }
    case 'naming':
      return `One more before I apply anything: file names. Renaming is the last step, and it changes all ${stats.files} names. Choose the pattern; the example shows what one of your Acme files would be called.`
    case 'playback': {
      const structure = top ? `${top}${d.secondLevel ? `, then ${d.secondLevel}` : ''}` : 'the folders you chose'
      const employment = d.employment === 'B' ? 'employment files under each company' : 'employment files together for HR'
      const dates = d.dateSource === 'modified' ? 'dates from when each file was last edited' : 'dates from the filename'
      return `That’s everything. Here’s the whole outcome for filing by ${structure}, with ${employment} and ${dates}, before I touch a file.`
    }
    case 'applied':
      return ''
  }
}

function stepMessage(step: Step, d: Decisions): Message {
  return {
    role: 'assistant',
    text: spoken(step, d),
    card: step,
  }
}

// Played out live after "Let’s organise", then folds into one line like Cursor's activity
function reading(next: Message[], done = false): Message {
  return {
    role: 'assistant',
    text: '',
    working: {
      label: 'Read file structure',
      steps: [
        `Listed ${stats.originalFolders} folders in the repository`,
        `Read ${stats.files} file names and their folder paths`,
        'Worked out how each folder is organised: type, status, year or counterparty',
        `Matched files to ${stats.counterparties} counterparties and ${stats.types} agreement types`,
      ],
      doneLabel: 'Read file structure',
      next,
      done,
      durations: [900, 1200, 1400, 1100],
    },
  }
}

const order: Step[] = ['report', 'convention', 'secondLevel', 'dates', 'undated', 'templates', 'easyWins', 'chains', 'employment', 'solara', 'vantage', 'unidentified', 'conflicts', 'noStatus', 'naming', 'playback', 'applied']

// Last-edited dates already fill every file, so the undated pass is only for filename dates.
function nextStep(from: Step, decisions: Decisions): Step {
  const start = order.indexOf(from) + 1
  for (let i = start; i < order.length; i++) {
    if (order[i] === 'undated' && decisions.dateSource !== 'filename') continue
    return order[i]
  }
  return 'applied'
}

function closing(d: Decisions): Message {
  const top = d.convention ? topFacet[d.convention] : 'the chosen'
  const second = d.secondLevel ? `, then ${d.secondLevel}` : ''
  const employment =
    d.employment === 'B' ? 'filed employment contracts under each company' : 'kept employment contracts in one folder for HR'
  return {
    role: 'assistant',
    closing: true,
    steps: [
      `Read ${stats.files} files and extracted the facts`,
      `Agreed to file by ${top}${second}, and ${employment}`,
      d.dateSource === 'modified'
        ? 'Used the last-edited date as the date on every file'
        : d.undated === 'dated'
          ? 'Kept the date written in each filename, and the dates set on files that had none'
          : d.undated === 'modified'
            ? 'Kept the date written in each filename, and used the last-edited day where the name had none'
            : 'Kept the date written in each filename, and left files with no date in the name undated',
      d.templates === 'A'
        ? `Kept ${stats.templates} templates in a Templates folder`
        : `Marked ${stats.templates} files as status Template and left them in their folders`,
      d.currentRule === 'skip'
        ? `Left version roles unset on ${stats.chains} agreements with several versions`
        : `Set version roles on ${stats.chains} agreements with several versions`,
      Object.keys(d.placements).length
        ? `Gave ${Object.keys(d.placements).length} of ${unidentifiedFiles(d).length} unidentified files a company`
        : `Left ${unidentifiedFiles(d).length} unidentified files in _Unidentified`,
      d.conflicts === 'skip'
        ? `Left ${conflicting.length} contradictory names as Conflicting`
        : d.conflicts === 'B'
          ? `Resolved ${conflicting.length} contradictory names by keeping the stronger word`
          : `Marked ${conflicting.length} contradictory names as Draft`,
      d.noStatus === 'undefined'
        ? `Marked ${stats.unlabelled} files with no status as Undefined`
        : d.noStatus === 'set'
          ? `Set Final from the name, then set the rest by hand`
          : `Set Final from the name, and marked the rest Undefined`,
      `Moved ${stats.files} files and archived ${stats.archived} superseded versions; nothing deleted`,
      d.naming === 'keep' ? 'Kept every filename as it was' : `Renamed files to one pattern: ${namingLabels[d.naming ?? 'ctd']}`,
    ],
    text:
      'Done. Every original path is logged, so you can undo the run, a batch or a single file.\n\nAsk me for any agreement to check it, for example “what’s our MSA with Acme?”',
    playback: playbackFor('applied', d),
  }
}

// The user's side of each answered card, so the chat reads as a conversation
const echoes: Partial<Record<Step, (d: Decisions) => string>> = {
  convention: (d) => `Organise by ${d.convention === 'A' ? 'counterparty' : d.convention === 'B' ? 'type' : 'status'}`,
  secondLevel: (d) => `Then by ${d.secondLevel}`,
  dates: (d) => (d.dateSource === 'modified' ? 'Use the last-edited date' : 'Keep the date in the filename'),
  undated: (d) =>
    d.undated === 'dated' ? 'Date each undated file' : d.undated === 'modified' ? 'Use the last-edited date' : 'Leave them undated',
  templates: (d) => (d.templates === 'A' ? 'Put them in a Templates folder' : 'Mark the status as Template'),
  easyWins: (d) =>
    d.currentRule === 'skip'
      ? 'Skip versions'
      : d.currentRule === 'final'
        ? 'The latest FINAL is current'
        : d.currentRule === 'latest'
          ? 'The newest file is current'
          : 'A signed file is current',
  chains: (d) => (d.chains === 'skip' ? 'Skip these versions' : d.chains === 'A' ? 'Treat the latest FINAL as current' : 'Leave it open'),
  conflicts: (d) =>
    d.conflicts === 'skip' ? 'Skip conflicting names' : d.conflicts === 'A' ? 'Treat them as drafts' : 'Keep the stronger word',
  noStatus: (d) => {
    if (d.noStatus === 'undefined') return 'Mark them all Undefined'
    if (d.noStatus === 'set') return 'Set the ones that were left'
    const { groups, rest } = statusRuleSplit(d.statusRules, d.statusMarks)
    const all = !d.statusRules || d.statusRules.length === groups.length
    if (rest.length === 0) return 'Apply the rules'
    return all ? 'Apply all, then see what’s left' : 'Apply the selected rules, then see what’s left'
  },
  employment: (d) => (d.employment === 'A' ? 'Keep them in one Employment folder' : 'File them under the company'),
  solara: (d) =>
    d.solara === 'skip' ? 'Skip the Solara NDA' : d.solara === 'A' ? 'Keep the 2022 NDA as current' : 'Make the pending NDA current',
  vantage: (d) =>
    d.vantage === 'skip' ? 'Skip the Vantage licences' : d.vantage === 'A' ? 'Keep both, file ID on the sheet' : 'Treat them as duplicates',
  unidentified: (d) =>
    d.unidentified === 'left' ? 'Leave them in _Unidentified' : 'Place the ones I can read',
  naming: (d) => (d.naming === 'keep' || !d.naming ? 'Keep the names they have' : `Name them ${namingLabels[d.naming]}`),
}

// What the assistant says once a decision has landed: what changed, in the user's data
function outcome(step: Step, d: Decisions): string | null {
  const groups = buildGroups(d)
  switch (step) {
    case 'convention': {
      const named = groups.filter((g) => g.name !== 'Employment' && g.name !== 'Templates' && !g.name.startsWith('_'))
      const extra = groups.filter((g) => g.name === 'Employment' || g.name === 'Templates' || g.name.startsWith('_')).map((g) => g.name)
      const examples = named.slice(0, 3).map((g) => g.name)
      const more = named.length - examples.length
      const tail = [...(more ? [`${more} more`] : []), ...extra]
      return `Done. In the preview your ${stats.files} files now sit in ${named.length} ${topFacet[d.convention!]} folders, including ${englishList(examples)}${tail.length ? `, plus ${englishList(tail)}` : ''}. Nothing has moved yet.`
    }
    case 'secondLevel': {
      const { folder, subfolders } = sampleSubfolders(d.convention!, d.secondLevel!)
      return `Each ${topFacet[d.convention!]} folder is now split by ${d.secondLevel}. ${folder}, for example, has ${subfolders.length}: ${cappedList(subfolders)}.`
    }
    case 'dates':
      return d.dateSource === 'modified'
        ? `The column is now Last modified: the day each file was last saved, a full date on all ${stats.files} files. ${stats.yearMoves} files sit in a different year from the one in the name, ${stats.undated} of them because the name had no date.${d.secondLevel === 'year' ? ' Year sections follow that day.' : ''}`
        : `The register keeps the date written in each name. The ${stats.dateConflicts} disagreements stay as written. ${stats.undated} files have no date in the name.`
    case 'undated':
      return d.undated === 'dated'
        ? 'Dates you set are in the Date column. Files you skipped stay without a date.'
        : d.undated === 'modified'
          ? `All ${stats.undated} files with no date in the name now use the day they were last saved.`
          : `All ${stats.undated} files stay without a date. Last edited stays on the file.`
    case 'templates':
      if (d.templates === 'A')
        return `All ${stats.templates} go to a Templates folder, and none of them is the current agreement. Crestline’s lease leaves Crestline. The filename calls it executed, and it is the only Crestline lease, so that company folder no longer has a lease.`
      if (d.convention === 'C' || d.secondLevel === 'status')
        return `The status on all ${stats.templates} is now Template, so they leave the signed and final folders and collect under Template. Crestline’s lease is no longer signed.`
      if (d.convention === 'B')
        return `The status on all ${stats.templates} is now Template. They stay in the type folder: Crestline’s lease stays in Lease, and it is no longer signed.`
      return `The status on all ${stats.templates} is now Template. They stay in the company folder: Crestline’s lease stays in Crestline, and it is no longer signed.`
    case 'easyWins': {
      if (d.currentRule === 'skip')
        return `Versions are left unset. The Version column stays blank, including on the ${stats.chains} agreements with several files. Nothing is archived.`
      const n = ruleSwaps(d.currentRule ?? 'signed', d.dateSource)
      if (d.currentRule === 'final')
        return `The latest FINAL is current, even when another file says signed. That changes ${n} agreement${n === 1 ? '' : 's'}, including Pinnacle Insurance’s MSA. Agreements with no FINAL still need your call. Nothing is deleted.`
      if (d.currentRule === 'latest')
        return `The newest file is current, whatever its name says. That changes ${n} agreement${n === 1 ? '' : 's'}, including Solara Energy’s pending NDA. Nothing is deleted.`
      return `Where a file is signed, that one is current: ${stats.signedChains.length} agreements, including Pinnacle Insurance’s MSA. Agreements with nothing signed still need your call. Nothing is deleted.`
    }
    case 'conflicts': {
      if (d.conflicts === 'skip') return `All ${conflicting.length} contradictory names stay Conflicting.`
      const byStatus = d.convention === 'C' || d.secondLevel === 'status'
      if (d.conflicts === 'A') {
        const where = byStatus ? ' They leave Conflicting and collect under Draft.' : ' They stay in their folders.'
        return `All ${conflicting.length} contradictory names are now Draft. “Not final” and “unsigned” win over FINAL and signed. Acme’s MSA stays the current file, with status Draft.${where}`
      }
      const where = byStatus
        ? ' Acme’s MSA moves to Final, the Ashworth employment contract moves to Signed, and the other three move to Draft.'
        : ' They stay in their folders.'
      const kept = conflicting.filter((r) => conflictStatus(r, 'B') !== 'Draft').length
      return `The stronger word wins on ${kept} of them. Acme’s MSA is Final, and the Ashworth employment contract is Signed. The other ${conflicting.length - kept} only take themselves back, so they are Draft.${where}`
    }
    case 'noStatus':
      return noStatusOutcome(d)
    case 'naming':
      return d.naming === 'keep'
        ? 'Every file keeps its name. The register still shows the type, date and status in their own columns.'
        : `On Apply, every file is renamed to ${namingLabels[d.naming!]}. Until then the register keeps today’s names.`
    case 'chains': {
      if (d.chains === 'skip')
        return `${stats.assumedChains.length} agreements with no signed file stay without a current version.`
      const acme = stats.assumedChains.find((r) => r.folder === 'Acme Corp')!
      const older = versionsOf(acme.id).length
      const apart = familySplits(acme.id, d)
      const acmeFile = acme.original.slice(acme.original.lastIndexOf('/') + 1).replace(/\.\w+$/, '')
      const intro = `${stats.assumedChains.length} agreements now point to their latest FINAL, marked current. Acme Corp’s MSA is “${acmeFile}”`
      return d.chains === 'A'
        ? apart.length
          ? `${intro}. Its other ${older} versions are marked archive, in different ${englishList(apart)} folders, so they won’t stack under it here.`
          : `${intro}; its other ${older} versions go to _Archive.`
        : `${stats.assumedChains.length} agreements stay open. When someone asks for one, I’ll list the candidate versions rather than pick one.${apart.length ? ` For Acme Corp’s MSA those versions sit in different ${englishList(apart)} folders.` : ''}`
    }
    case 'employment': {
      const n = employmentInFiling(d)
      if (d.employment === 'A') {
        if (d.convention === 'C')
          return `All ${n} employment files go to one Employment folder, flagged to HR, instead of being scattered across status folders. That includes the ${stats.employmentShared} that sit in /Shared today.`
        if (d.convention === 'B')
          return `All ${n} employment files go to one Employment folder, flagged to HR, instead of sitting among the type folders. That includes the ${stats.employmentShared} that sit in /Shared today.`
        return `All ${n} employment files go to one Employment folder, flagged to HR, including the ${stats.employmentShared} that sit in /Shared today.`
      }
      const harbourline = groups.find((g) => g.name === 'Harbourline Shipping')
      const people = harbourline?.rows.filter((r) => r.type === 'Employment').length ?? 0
      if (d.convention === 'A')
        return `Each employment file now sits under the company in its name. Harbourline Shipping has ${harbourline?.rows.length ?? 0} files, ${people} of them employment contracts.`
      const top = topFacet[d.convention!]
      return `Each employment file now sits in a folder named after the company, alongside the ${top} folders. Harbourline Shipping’s folder has ${people} employment file${people === 1 ? '' : 's'}. The company’s other contracts stay in their ${top} folders.`
    }
    case 'solara': {
      if (d.solara === 'skip') return 'Solara Energy’s two NDAs are left as they are. Neither is newly marked current.'
      const kept = byId(cases.solara.kept)
      const apart = familySplits(cases.solara.kept, d)
      const apartLine = apart.length
        ? ` The two files sit in different ${englishList(apart)} folders in this preview.`
        : ''
      return d.solara === 'A'
        ? `Solara Energy’s NDA from ${formatDate(kept.date)} stays current. The pending one waits in _Archive until it’s signed.${apartLine}`
        : `The pending Solara Energy NDA is now current, and the ${formatDate(kept.date)} one moves to _Archive.${apartLine}`
    }
    case 'unidentified':
      return unidentifiedOutcome(d)
    case 'vantage': {
      if (d.vantage === 'skip') return 'Both Vantage licences are left as they are. Neither is archived, and no file ID is added.'
      const place = d.convention && d.convention !== 'A' ? folderOf(cases.vantage.first, d) : undefined
      const folder = place ? ` in ${place}` : ''
      return d.vantage === 'A'
        ? `Both Vantage licences are kept${folder}. The names stay the same; each sheet shows its file ID, ${cases.vantage.first} and ${cases.vantage.second}.`
        : `The first Vantage licence is current${folder} and the second moves to _Archive as a duplicate.`
    }
    default:
      return null
  }
}

// What a typed reply may choose, when that card is the one waiting. The labels
// are the meanings; the values are what the preview already understands.
const choiceGuide: Partial<Record<Step, { value: string; means: string }[]>> = {
  convention: [
    { value: 'A', means: 'File by counterparty: one folder per company' },
    { value: 'B', means: 'File by agreement type' },
    { value: 'C', means: 'File by status' },
  ],
  secondLevel: [
    { value: 'counterparty', means: 'Inside each folder, split by counterparty' },
    { value: 'type', means: 'Inside each folder, split by agreement type' },
    { value: 'status', means: 'Inside each folder, split by status' },
    { value: 'year', means: 'Inside each folder, split by year' },
  ],
  dates: [
    { value: 'filename', means: 'Keep the date written in the filename' },
    { value: 'modified', means: 'Use the day the file was last edited' },
  ],
  undated: [
    { value: 'review', means: 'Go through the undated files and set a date on each one' },
    { value: 'modified', means: 'Give every undated file the day it was last edited' },
    { value: 'skip', means: 'Leave the undated files without a date' },
  ],
  templates: [
    { value: 'A', means: 'Put the files from Templates (do not use) in a Templates folder, out of the company folders' },
    { value: 'B', means: 'Mark their status as Template and keep them in the company folder' },
  ],
  easyWins: [
    { value: 'signed', means: 'A signed file is current, ahead of FINAL and draft' },
    { value: 'final', means: 'The latest file marked FINAL is current' },
    { value: 'latest', means: 'The newest file is current, whatever its name says' },
    { value: 'skip', means: 'Skip versions and leave the Version column blank' },
  ],
  chains: [
    { value: 'A', means: 'Use the latest FINAL as current' },
    { value: 'B', means: 'Leave these version chains open' },
    { value: 'skip', means: 'Skip these versions and leave them without a current file' },
  ],
  conflicts: [
    { value: 'A', means: 'Treat filenames that contradict themselves as drafts' },
    { value: 'B', means: 'Keep the stronger word: FINAL stays Final and signed stays Signed' },
    { value: 'skip', means: 'Skip these and leave the status Conflicting' },
  ],
  noStatus: [
    { value: 'rules', means: 'Mark Final where the name says clean version, and mark the rest Undefined. Copy, backup, old and a duplicate save are not a status' },
    { value: 'undefined', means: 'Mark every file with no status as Undefined' },
    { value: 'review', means: 'Apply those rules, then set the remaining files one by one' },
  ],
  employment: [
    { value: 'A', means: 'Keep employment contracts together in one Employment folder' },
    { value: 'B', means: 'File each employment contract under the company named in it' },
  ],
  solara: [
    { value: 'A', means: 'Keep the existing Solara NDA as current; the pending one waits until it’s signed' },
    { value: 'B', means: 'Make the pending Solara NDA the current file' },
    { value: 'skip', means: 'Skip the Solara NDA and leave both files as they are' },
  ],
  vantage: [
    { value: 'A', means: 'Keep both Vantage licences and record the file ID on each sheet' },
    { value: 'B', means: 'Treat the two Vantage licences as duplicates and archive the second' },
    { value: 'skip', means: 'Skip the Vantage licences and leave both as they are' },
  ],
  unidentified: [
    { value: 'review', means: 'Place the unidentified files: use the recommended folders, then choose a folder for the ones that still have more than one company' },
    { value: 'left', means: 'Leave unidentified files in _Unidentified' },
  ],
  naming: [
    { value: 'ctd', means: 'Rename files to Counterparty – Type – date' },
    { value: 'tcd', means: 'Rename files to Type – Counterparty – date' },
    { value: 'dct', means: 'Rename files to date – Counterparty – Type' },
    { value: 'keep', means: 'Keep every filename as it is' },
  ],
  playback: [{ value: 'apply', means: 'Apply the agreed filing to the repository' }],
}

function pendingStep(messages: Message[], d: Decisions): Step | null {
  const step = [...messages].reverse().find((m) => m.card)?.card
  if (step === 'convention' && !d.convention) return step
  if (step === 'secondLevel' && !d.secondLevel) return step
  if (step === 'dates' && !d.dateSource) return step
  if (step === 'undated' && !d.undated) return step
  if (step === 'templates' && !d.templates) return step
  if (step === 'easyWins' && !d.easyWins) return step
  if (step === 'chains' && !d.chains) return step
  if (step === 'conflicts' && !d.conflicts) return step
  if (step === 'noStatus' && !d.noStatus) return step
  if (step === 'employment' && !d.employment) return step
  if (step === 'solara' && !d.solara) return step
  if (step === 'vantage' && !d.vantage) return step
  if (step === 'unidentified' && !d.unidentified) return step
  if (step === 'naming' && !d.naming) return step
  if (step === 'playback' && !d.applied) return step
  return null
}

function openChoice(messages: Message[], d: Decisions) {
  const step = pendingStep(messages, d)
  if (!step) return null
  let options = choiceGuide[step] ?? []
  const top = d.convention
  if (step === 'secondLevel' && top) options = options.filter((o) => o.value !== topFacet[top])
  return { step, options }
}

function playbackFor(step: Step, d: Decisions = noDecisions): { value: number; label: string; rowIds: string[] }[] | undefined {
  const ids = (rows: { id: string }[]) => rows.map((r) => r.id)
  const headIds = new Set(allRows.filter((r) => r.versionOf).map((r) => r.versionOf!))
  const singles = allRows.filter(
    (r) =>
      !headIds.has(r.id) &&
      !r.versionOf &&
      r.folder !== 'Employment' &&
      r.folder !== '_Unidentified' &&
      !(d.templates === 'A' && isTemplate(r)),
  )
  const people = allRows.filter((r) => r.folder === 'Employment' && !(d.templates === 'A' && isTemplate(r)))
  const templates = allRows.filter(isTemplate)
  const groupsNow = () => buildGroups(d)
  const sampleRows = () => {
    if (!d.convention) return []
    return groupsNow().find((g) => g.name === sampleFolderName(d.convention!))?.rows ?? []
  }
  switch (step) {
    case 'convention': {
      const groups = groupsNow()
      const by = topFacet[d.convention ?? 'A']
      return [
        { value: stats.files, label: `Files were grouped by ${by} in the preview`, rowIds: ids(allRows) },
        { value: groups.length, label: 'Folders in the new structure', rowIds: ids(sampleRows()) },
      ]
    }
    case 'secondLevel': {
      const groups = groupsNow()
      return [
        { value: groups.length, label: `Folders were split by ${d.secondLevel}`, rowIds: ids(sampleRows()) },
        { value: stats.files, label: 'Files placed into the new subfolders in the preview', rowIds: ids(allRows) },
      ]
    }
    case 'easyWins': {
      if (d.currentRule === 'skip') {
        const chains = [...stats.signedChains, ...stats.assumedChains]
        return [
          {
            value: chains.length,
            label: 'Agreements with several versions were left without a current file',
            rowIds: ids(chains.flatMap((r) => [r, ...versionsOf(r.id)])),
          },
        ]
      }
      const rule = d.currentRule ?? 'signed'
      const singleCurrent = singles.length
      if (rule === 'final' || rule === 'latest') {
        const moved = ruleChangeIds(rule, d.dateSource)
        const n = moved.current.length
        const currentLabel =
          rule === 'final'
            ? `Agreement${n === 1 ? '' : 's'} now use their latest FINAL as current`
            : `Agreement${n === 1 ? '' : 's'} now use their newest file as current`
        const archivedLabel =
          rule === 'final'
            ? n === 1
              ? 'The file that was current was archived'
              : 'Files that were current, including signed copies, were archived'
            : n === 1
              ? 'The file that was current was archived'
              : 'Files that were current were archived'
        return [
          { value: n, label: currentLabel, rowIds: moved.current },
          { value: n, label: archivedLabel, rowIds: moved.archived },
          { value: singleCurrent, label: 'Files with only one version stay current', rowIds: ids(singles) },
        ]
      }
      const older = stats.signedChains.flatMap((r) => versionsOf(r.id))
      return [
        { value: singleCurrent, label: 'Files only have one file, and were marked as current by default', rowIds: ids(singles) },
        {
          value: stats.signedChains.length,
          label: 'Files have a version labelled as signed which were marked as current',
          rowIds: ids(stats.signedChains),
        },
        { value: older.length, label: 'Files were previous versions and were marked as archive', rowIds: ids(older) },
      ]
    }
    case 'chains': {
      if (d.chains === 'skip') {
        const older = stats.assumedChains.flatMap((r) => versionsOf(r.id))
        return [
          {
            value: stats.assumedChains.length,
            label: 'Agreements with no signed file were left without a current version',
            rowIds: ids([...stats.assumedChains, ...older]),
          },
        ]
      }
      const older = stats.assumedChains.flatMap((r) => versionsOf(r.id))
      return d.chains === 'A'
        ? [
            {
              value: stats.assumedChains.length,
              label: 'Agreements were marked current',
              rowIds: ids(stats.assumedChains),
            },
            {
              value: older.length,
              label: 'Older versions were marked as archive',
              rowIds: ids(older),
            },
          ]
        : [
            {
              value: stats.assumedChains.length,
              label: 'Agreements were left open — no current file was assumed',
              rowIds: ids([...stats.assumedChains, ...older]),
            },
          ]
    }
    case 'templates':
      return d.templates === 'A'
        ? [
            { value: templates.length, label: 'Files were moved to a Templates folder', rowIds: ids(templates) },
            { value: 1, label: 'Crestline lease left the company folder', rowIds: ['F0217'] },
          ]
        : [
            { value: templates.length, label: 'Files were marked with status Template', rowIds: ids(templates) },
            {
              value: 1,
              label:
                d.convention === 'C' || d.secondLevel === 'status'
                  ? 'Crestline lease collects under Template, not under signed'
                  : 'Crestline lease stays in its folder, status Template',
              rowIds: ['F0217'],
            },
          ]
    case 'employment':
      return d.employment === 'A'
        ? [
            { value: people.length, label: 'Employment files were filed in one Employment folder', rowIds: ids(people) },
            {
              value: people.filter((r) => r.original.startsWith('/Shared')).length,
              label: 'Of those sat in /Shared and are now flagged to HR',
              rowIds: ids(people.filter((r) => r.original.startsWith('/Shared'))),
            },
          ]
        : [
            {
              value: people.length,
              label: 'Employment files were filed under the company in their name',
              rowIds: ids(people),
            },
          ]
    case 'dates': {
      const conflicts = allRows.filter((r) => r.date != null && !r.modified.startsWith(r.date))
      const undated = allRows.filter((r) => r.date == null)
      const yearMoves = allRows.filter((r) => (r.date?.slice(0, 4) ?? '') !== r.modified.slice(0, 4))
      return d.dateSource === 'modified'
        ? [
            { value: stats.files, label: 'Files take the day they were last edited', rowIds: ids(allRows) },
            { value: yearMoves.length, label: 'Files sit in a different year from the one in the name', rowIds: ids(yearMoves) },
          ]
        : [
            {
              value: conflicts.length,
              label: 'Files keep the date in the name, where it differs from last edited',
              rowIds: ids(conflicts),
            },
            { value: undated.length, label: 'Files have no date in the name', rowIds: ids(undated) },
          ]
    }
    case 'undated': {
      const blank = allRows.filter((r) => r.date == null)
      return [
        {
          value: blank.length,
          label:
            d.undated === 'dated'
              ? 'Undated files were opened so a date could be set'
              : d.undated === 'modified'
                ? 'Files with no date in the name take the day they were last saved'
                : 'Files stay without a date in the name',
          rowIds: ids(blank),
        },
      ]
    }
    case 'solara': {
      if (d.solara === 'skip')
        return [
          {
            value: 2,
            label: 'Solara NDAs were left without a new current file',
            rowIds: [cases.solara.pending, cases.solara.kept],
          },
        ]
      const kept = byId(cases.solara.kept)
      return d.solara === 'A'
        ? [
            { value: 1, label: `NDA from ${formatDate(kept.date)} stays current`, rowIds: [cases.solara.kept] },
            { value: 1, label: 'Pending NDA waits in archive', rowIds: [cases.solara.pending] },
          ]
        : [
            { value: 1, label: 'Pending NDA is now current', rowIds: [cases.solara.pending] },
            { value: 1, label: `NDA from ${formatDate(kept.date)} moves to archive`, rowIds: [cases.solara.kept] },
          ]
    }
    case 'conflicts': {
      if (d.conflicts === 'skip') {
        return [
          {
            value: conflicting.length,
            label: 'Contradictory names were left as Conflicting',
            rowIds: conflicting.map((r) => r.id),
          },
        ]
      }
      if (d.conflicts !== 'B') {
        return [
          {
            value: conflicting.length,
            label: 'Contradictory names were marked Draft',
            rowIds: conflicting.map((r) => r.id),
          },
        ]
      }
      const byStatus = new Map<string, string[]>()
      for (const r of conflicting) {
        const status = conflictStatus(r, 'B')
        byStatus.set(status, [...(byStatus.get(status) ?? []), r.id])
      }
      return [...byStatus.entries()].map(([status, ids]) => ({
        value: ids.length,
        label: `${ids.length === 1 ? 'One contradictory name is' : `${ids.length} contradictory names are`} now ${status}`,
        rowIds: ids,
      }))
    }
    case 'noStatus': {
      if (d.noStatus === 'undefined' || !d.noStatus) {
        const blank = allRows.filter((r) => r.status === 'Unlabelled')
        return [{ value: blank.length, label: 'Files with no status in the name are marked Undefined', rowIds: ids(blank) }]
      }
      const { applied, rest } = statusRuleSplit(d.statusRules, d.statusMarks)
      const byStatus = new Map<string, { labels: string[]; rowIds: string[] }>()
      for (const group of applied) {
        const current = byStatus.get(group.status) ?? { labels: [], rowIds: [] }
        current.labels.push(group.label)
        current.rowIds.push(...group.files.map((file) => file.id))
        byStatus.set(group.status, current)
      }
      return [
        ...[...byStatus.entries()].map(([status, { labels, rowIds }]) => ({
          value: rowIds.length,
          label: `Names that are ${englishList(labels)} are ${status}`,
          rowIds,
        })),
        ...(rest.length
          ? [
              {
                value: rest.length,
                label:
                  d.noStatus === 'set'
                    ? 'The remaining files were opened so a status could be set'
                    : 'Names that don’t say a status are Undefined',
                rowIds: ids(rest),
              },
            ]
          : []),
      ]
    }
    case 'unidentified': {
      const files = unidentifiedFiles(d)
      const placed = files.filter((r) => d.placements[r.id])
      const left = files.filter((r) => !d.placements[r.id])
      return [
        ...(placed.length
          ? [{ value: placed.length, label: 'Unidentified files were given a company', rowIds: placed.map((r) => r.id) }]
          : []),
        ...(left.length
          ? [{ value: left.length, label: 'Files stay in _Unidentified', rowIds: left.map((r) => r.id) }]
          : []),
      ]
    }
    case 'vantage':
      return d.vantage === 'skip'
        ? [
            {
              value: 2,
              label: 'Vantage licences were left as they are',
              rowIds: [cases.vantage.first, cases.vantage.second],
            },
          ]
        : d.vantage === 'A'
        ? [
            {
              value: 2,
              label: 'Licences kept, each sheet shows its file ID',
              rowIds: [cases.vantage.first, cases.vantage.second],
            },
          ]
        : [
            { value: 1, label: 'First licence stays current', rowIds: [cases.vantage.first] },
            { value: 1, label: 'Second licence archived as a duplicate', rowIds: [cases.vantage.second] },
          ]
    case 'applied': {
      const top = d.convention ? topFacet[d.convention] : 'the agreed'
      const second = d.secondLevel ? `, each split by ${d.secondLevel}` : ''
      const employment =
        d.employment === 'B'
          ? 'Employment files were filed under the company named in each one'
          : 'Employment files were filed in one Employment folder and flagged to HR'
      const archived = groupsNow().flatMap((g) => g.rows.filter((r) => r.version === 'Archived'))
      return [
        { value: stats.files, label: `Files were moved into ${top} folders${second}`, rowIds: ids(sampleRows()) },
        { value: archived.length, label: 'Superseded versions were moved to _Archive', rowIds: ids(archived) },
        { value: people.length, label: employment, rowIds: ids(people) },
        {
          value: templates.length,
          label:
            d.templates === 'A'
              ? 'Templates were moved to a Templates folder'
              : 'Templates were marked with status Template and left in their folders',
          rowIds: ids(templates),
        },
        ...(d.naming === 'keep'
          ? []
          : [{ value: stats.files, label: `Files were renamed to ${namingLabels[d.naming ?? 'ctd']}`, rowIds: ids(sampleRows()) }]),
      ]
    }
    default:
      return undefined
  }
}

function outcomeMessage(step: Step, d: Decisions): Message[] {
  const text = outcome(step, d)
  const playback = playbackFor(step, d)
  if (!text && !playback) return []
  return [
    {
      role: 'assistant',
      text: text ?? '',
      playback,
    },
  ]
}

// What the assistant visibly works through while it refiles the preview
function refiling(d: Decisions, level: 'convention' | 'secondLevel', next: Message[], done = false): Message {
  const by = topFacet[d.convention ?? 'A']
  const folders = buildGroups(d).length
  const steps =
    level === 'convention'
      ? [
          `Reading the ${by} of each of the ${stats.files} files`,
          `Grouping them into ${folders} top folders`,
          'Rewriting the folders in the preview',
          'Checking every file landed in a folder',
        ]
      : [
          `Reading the ${d.secondLevel} of every file`,
          `Splitting each of the ${folders} folders by ${d.secondLevel}`,
          'Rewriting the tables in the preview',
          'Checking every file landed in a subfolder',
        ]
  const doneLabel =
    level === 'convention' ? `Reorganised the preview by ${by}` : `Split each folder by ${d.secondLevel}`
  const label = level === 'convention' ? 'Reorganising the preview' : `Splitting folders by ${d.secondLevel}`
  // The preview swaps on the third step. That step stays up while the new folders
  // fade in under the loader shader, then the shader drops as the step ends.
  const durations = level === 'convention' ? [900, 900, 2600, 900] : [900, 900, 1400, 900]
  return { role: 'assistant', text: '', working: { steps, label, doneLabel, next, done, durations, rewriteAt: 2 } }
}

// The whole conversation up to the end state, for ?state=end
function fullTranscript(): Message[] {
  const m: Message[] = [{ role: 'user', text: 'Organise my documents' }]
  for (const step of order) {
    m.push(stepMessage(step, endState))
    const echo = step === 'report' ? 'Let’s organise' : step === 'playback' ? 'Accept changes' : echoes[step]?.(endState)
    if (echo) m.push({ role: 'user', text: echo })
    if (step === 'report') m.push(reading([], true))
    if (step === 'convention' || step === 'secondLevel') m.push(refiling(endState, step, [], true))
    m.push(...outcomeMessage(step, endState))
  }
  return [...m, closing(endState)].map((msg) => (msg.role === 'assistant' ? { ...msg, stream: false } : msg))
}

const startAtEnd = new URLSearchParams(location.search).get('state') === 'end'

export default function App() {
  const [d, setD] = useState<Decisions>(startAtEnd ? endState : noDecisions)
  const [messages, setMessages] = useState<Message[]>(startAtEnd ? fullTranscript() : [])
  const [thinking, setThinking] = useState(false)
  const [selected, setSelected] = useState('Acme Corp')
  // Files the user moved or removed by hand, on top of whatever the conversation decided
  const [placed, setPlaced] = useState<Record<string, string>>({})
  const [fieldEdits, setFieldEdits] = useState<Record<string, FieldEdit>>({})
  const [removedIds, setRemovedIds] = useState<string[]>([])
  // The file the next question is about, picked from a register row
  const [about, setAbout] = useState<ViewRow | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const writeTimer = useRef<number | undefined>(undefined)
  // The folder list and register shimmer, then fade their new text, while the assistant rewrites them
  const [writing, setWriting] = useState(false)

  function holdWriting() {
    clearTimeout(writeTimer.current)
    setWriting(true)
  }
  function stopWriting() {
    clearTimeout(writeTimer.current)
    setWriting(false)
  }
  function pulseWriting(ms = 1600) {
    holdWriting()
    writeTimer.current = window.setTimeout(() => setWriting(false), ms)
  }

  // While the assistant works through a folder level, the preview keeps showing the
  // decisions from before until it reaches its "rewriting" step
  const [held, setHeld] = useState<Decisions | null>(null)
  const shown = held ?? d
  const groups = useMemo(
    () => applyManualEdits(buildGroups(shown, fieldEdits), placed, removedIds),
    [shown, placed, removedIds, fieldEdits],
  )
  // The preview the rewrite is heading towards. During a folder refile, `groups` stays on the
  // previous decisions until the assistant reaches its rewriting step.
  const liveGroups = useMemo(
    () => (held ? applyManualEdits(buildGroups(d, fieldEdits), placed, removedIds) : groups),
    [held, d, fieldEdits, placed, removedIds, groups],
  )
  const quiet = useRef<RewriteSide | null>(null)
  const rewrite = useMemo(() => {
    if (!writing || !quiet.current) return null
    return diffRewrite(quiet.current, {
      groups: liveGroups,
      by: d.convention ? d.secondLevel : null,
      heading: d.applied ? folderHeadings.applied : d.convention ? folderHeadings.preview : folderHeadings.before,
      dateLabel: d.dateSource === 'modified' ? 'Last modified' : 'Date',
    })
  }, [writing, liveGroups, d])
  useEffect(() => {
    if (writing) return
    const modeNow = !shown.convention ? 'before' : shown.applied ? 'applied' : 'preview'
    quiet.current = {
      groups,
      by: modeNow === 'before' ? null : shown.secondLevel,
      heading: folderHeadings[modeNow],
      dateLabel: shown.dateSource === 'modified' ? 'Last modified' : 'Date',
    }
  }, [writing, groups, shown])
  const preferred = shown.convention ? sampleFolderName(shown.convention) : 'Acme Corp'
  const current = groups.find((g) => g.name === selected) ?? groups.find((g) => g.name === preferred) ?? groups[0]
  const reached = (step: Step) => messages.some((m) => m.card === step)

  // Echo the user's choice, then the assistant replies after a beat.
  function reply(userText: string | null, next: Message[]) {
    if (userText) setMessages((m) => [...m, { role: 'user', text: userText }])
    setThinking(true)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setThinking(false)
      setMessages((m) => [...m, ...next])
    }, 700)
  }

  function advance(from: Step, echo: string | null, said: Message[] = [], decisions: Decisions = d) {
    const next = nextStep(from, decisions)
    // After the opening report, read the repository in view before asking how to file
    if (from === 'report' && !reached(next)) {
      setMessages((m) => [...m, ...(echo ? [{ role: 'user' as const, text: echo }] : []), reading([stepMessage(next, decisions)])])
      return
    }
    // Re-answering a card after Undo says what changed but doesn't replay the steps after it
    reply(echo, [...said, ...(reached(next) ? [] : [stepMessage(next, decisions)])])
  }

  // echo null: the user's own words are already in the thread, so don't add the card's label too
  function decide(step: Step, patch: Partial<Decisions>, echo?: string | null) {
    const nd = { ...d, ...patch }
    // A second level can't repeat the top level
    if (nd.convention && nd.secondLevel === topFacet[nd.convention]) nd.secondLevel = null
    setD(nd)
    if (nd.convention && (step === 'convention' || step === 'secondLevel')) setSelected(sampleFolderName(nd.convention))
    const line = echo === undefined ? echoes[step]!(nd) : echo
    if (step !== 'convention' && step !== 'secondLevel') {
      pulseWriting()
      return advance(step, line, outcomeMessage(step, nd), nd)
    }
    setHeld(d)
    holdWriting()
    // Folder levels redraw the preview, so the assistant works through it in view
    const following = order[order.indexOf(step) + 1]
    const next = [...outcomeMessage(step, nd), ...(reached(following) ? [] : [stepMessage(following, nd)])]
    setMessages((m) => [...m, ...(line ? [{ role: 'user' as const, text: line }] : []), refiling(nd, step, next)])
  }

  function workingStep(index: number, step: number) {
    const w = messages[index]?.working
    if (!w || w.rewriteAt == null) return
    if (step >= w.rewriteAt) setHeld(null)
    if (step > w.rewriteAt) stopWriting()
  }

  function workingDone(index: number) {
    setHeld(null)
    stopWriting()
    setMessages((m) => {
      const w = m[index]?.working
      if (!w || w.done) return m
      const copy = [...m]
      copy[index] = { ...m[index], working: { ...w, done: true } }
      return [...copy, ...w.next]
    })
  }

  function undo(patch: Partial<Decisions>) {
    setD((prev) => ({ ...prev, ...patch }))
    pulseWriting()
  }

  function undoRun() {
    setD((prev) => ({ ...prev, applied: false }))
    pulseWriting()
    setMessages((m) => m.filter((x) => x.card !== 'applied' && !x.closing))
    reply(null, [{ role: 'assistant', text: 'Undone. Every file is back where it was; your decisions are kept.' }])
  }

  function restart() {
    clearTimeout(timer.current)
    clearTimeout(highlightTimer.current)
    heldPointer.current = false
    stopWriting()
    setThinking(false)
    setHeld(null)
    setAbout(null)
    setHighlightIds([])
    setHighlightHeld(false)
    setPlaced({})
    setRemovedIds([])
    setFieldEdits({})
    setD(noDecisions)
    setMessages([])
    history.replaceState(null, '', location.pathname)
    void fetch('/api/ask/reset', { method: 'POST' })
  }

  // A typed choice on the open card updates the preview through the same path as the button.
  function applyLiveDecision(step: Step, value: string) {
    if (step === 'playback' && value === 'apply') {
      holdWriting()
      setMessages((m) => [...m, { role: 'assistant', text: '', card: 'applied' }])
      return
    }
    if (step === 'convention' && (value === 'A' || value === 'B' || value === 'C')) return decide(step, { convention: value }, null)
    if (step === 'secondLevel' && (value === 'counterparty' || value === 'type' || value === 'status' || value === 'year'))
      return decide(step, { secondLevel: value }, null)
    if (step === 'dates' && (value === 'filename' || value === 'modified')) {
      if (value === 'modified') clearSuppliedDates()
      return decide(step, { dateSource: value, undated: value === 'filename' ? d.undated : null }, null)
    }
    if (step === 'undated' && value === 'skip') return decide(step, { undated: 'skip' }, null)
    if (step === 'undated' && value === 'modified') return applyLastEditedToUndated(null)
    if (step === 'undated' && value === 'review') return setD((prev) => ({ ...prev, undated: 'review' }))
    if (step === 'templates' && (value === 'A' || value === 'B')) return decide(step, { templates: value }, null)
    if (step === 'easyWins' && value === 'skip') return decide(step, { easyWins: true, currentRule: 'skip' }, null)
    if (step === 'easyWins' && (value === 'signed' || value === 'final' || value === 'latest'))
      return decide(step, { easyWins: true, currentRule: value }, null)
    if ((step === 'chains' || step === 'conflicts' || step === 'solara' || step === 'vantage') && value === 'skip')
      return decide(step, { [step]: 'skip' }, null)
    if ((step === 'chains' || step === 'conflicts' || step === 'employment' || step === 'solara' || step === 'vantage') && (value === 'A' || value === 'B'))
      return decide(step, { [step]: value }, null)
    if (step === 'noStatus' && value === 'undefined') return decide(step, { noStatus: 'undefined', statusRules: null }, null)
    if (step === 'noStatus' && value === 'rules') return decide(step, { noStatus: 'rules' }, null)
    if (step === 'noStatus' && value === 'review') return setD((prev) => ({ ...prev, noStatus: 'review' }))
    if (step === 'naming' && (value === 'ctd' || value === 'tcd' || value === 'dct' || value === 'keep'))
      return decide(step, { naming: value }, null)
    if (step === 'unidentified' && value === 'left') return decide(step, { unidentified: 'left', placements: {} }, null)
    if (step === 'unidentified' && value === 'review') return setD((prev) => ({ ...prev, unidentified: 'review' }))
  }

  function showGroup(name?: string | null) {
    if (!name) return
    const n = name.trim().toLowerCase()
    const found = groups.find((g) => g.name.toLowerCase() === n || g.name.replace(/^_/, '').toLowerCase() === n)
    if (found) setSelected(found.name)
  }

  // Anything typed, once the walk has started, goes to the Cursor agent with the preview as it stands.
  async function askLive(text: string, file: ViewRow | null) {
    const history = messages.filter((m) => m.text.trim()).slice(-12).map((m) => ({ role: m.role, text: m.text }))
    const open = openChoice(messages, d)
    const mode = !d.convention ? 'before' : d.applied ? 'applied' : 'preview'
    setMessages((m) => [...m, { role: 'user', text, ...(file ? { about: file.display } : {}) }])
    setThinking(true)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          mode,
          decisions: d,
          open,
          about: file && {
            id: file.id,
            name: file.display,
            folder: file.folder,
            type: file.type,
            status: file.status,
            handling: file.handling,
            version: file.versionLabel,
            date: file.date,
            path: file.original,
            note: file.note,
            excerpt: file.excerpt,
          },
          history,
          view: groups.map((g) => ({
            folder: g.name,
            summary: g.summary,
            files: g.rows.map((r) => ({
              id: r.id,
              name: r.display,
              type: r.type,
              status: r.status,
              handling: r.handling,
              version: r.versionLabel,
              date: r.date,
              path: r.original,
              note: r.note,
              excerpt: r.excerpt,
            })),
          })),
        }),
      })
      const answer = (await res.json()) as { text?: string; group?: string | null; decision?: { step: Step; value: string } | null; message?: string }
      setThinking(false)
      if (!res.ok || !answer.text) {
        setMessages((m) => [...m, { role: 'assistant', text: answer.message || 'I couldn’t reach Cursor just then. Ask again in a moment.' }])
        return
      }
      showGroup(answer.group)
      setMessages((m) => [...m, { role: 'assistant', text: answer.text! }])
      if (answer.decision && open && answer.decision.step === open.step) applyLiveDecision(open.step, answer.decision.value)
    } catch {
      setThinking(false)
      setMessages((m) => [...m, { role: 'assistant', text: 'I couldn’t reach Cursor just then. Ask again in a moment.' }])
    }
  }

  function send(text: string) {
    if (about && text !== 'Organise my documents') return void askLive(text, about)
    if (!messages.some((m) => m.card)) return reply(text, [{ role: 'assistant', text: spoken('report', noDecisions), card: 'report' }])
    void askLive(text, null)
  }

  function moveFiles(ids: string[], folder: string) {
    setPlaced((prev) => {
      const next = { ...prev }
      for (const id of ids) next[id] = folder
      return next
    })
  }

  function editField(id: string, patch: FieldEdit) {
    setFieldEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  // Dates typed in the undated pass. Undo and “use last edited for every file” both drop them.
  function clearSuppliedDates() {
    setFieldEdits((prev) => {
      const next = { ...prev }
      for (const r of allRows) {
        if (r.date != null || !next[r.id] || next[r.id].date === undefined) continue
        const rest = { ...next[r.id] }
        delete rest.date
        if (Object.keys(rest).length === 0) delete next[r.id]
        else next[r.id] = rest
      }
      return next
    })
  }

  function applyLastEditedToUndated(echo?: string | null) {
    const blank = allRows.filter((r) => r.date == null)
    setFieldEdits((prev) => {
      const next = { ...prev }
      for (const r of blank) next[r.id] = { ...next[r.id], date: r.modified }
      return next
    })
    decide('undated', { undated: 'modified' }, echo)
  }

  function clearSuppliedStatuses() {
    setFieldEdits((prev) => {
      const next = { ...prev }
      for (const r of allRows) {
        if (r.status !== 'Unlabelled' || !next[r.id] || next[r.id].status === undefined) continue
        const rest = { ...next[r.id] }
        delete rest.status
        if (Object.keys(rest).length === 0) delete next[r.id]
        else next[r.id] = rest
      }
      return next
    })
  }

  function finishNoStatus(set: string[], skipped: string[]) {
    const nd: Decisions = { ...d, noStatus: set.length ? 'set' : 'rules' }
    setD(nd)
    const echo = set.length
      ? `Set ${set.length}${skipped.length ? `, marked ${skipped.length} Undefined` : ''}`
      : 'Mark them Undefined'
    const text = set.length
      ? `${set.length} of ${set.length + skipped.length} files now have a status you set.${skipped.length ? ` ${skipped.length} are marked Undefined.` : ''}`
      : `All ${skipped.length} files are marked Undefined.`
    const playback = [
      ...(set.length ? [{ value: set.length, label: 'Files were given a status', rowIds: set }] : []),
      ...(skipped.length ? [{ value: skipped.length, label: 'Files are marked Undefined', rowIds: skipped }] : []),
    ]
    pulseWriting()
    advance('noStatus', echo, [{ role: 'assistant', text, playback }], nd)
  }

  function placeUnidentified(id: string, folder: string) {
    setD((prev) => ({ ...prev, placements: { ...prev.placements, [id]: folder } }))
  }

  function finishUnidentified(placed: Record<string, string>, skipped: string[]) {
    const nd: Decisions = { ...d, placements: placed, unidentified: Object.keys(placed).length ? 'placed' : 'left' }
    setD(nd)
    const echo = Object.keys(placed).length
      ? `Place ${Object.keys(placed).length}${skipped.length ? `, leave ${skipped.length}` : ''}`
      : 'Leave them in _Unidentified'
    pulseWriting()
    advance('unidentified', echo, [{ role: 'assistant', text: unidentifiedOutcome(nd), playback: playbackFor('unidentified', nd) }], nd)
  }

  function finishUndated(dated: string[], skipped: string[]) {
    const nd: Decisions = { ...d, undated: dated.length ? 'dated' : 'skip' }
    setD(nd)
    const echo = dated.length
      ? `Dated ${dated.length}${skipped.length ? `, left ${skipped.length} undated` : ''}`
      : 'Leave them undated'
    const text = dated.length
      ? `${dated.length} of ${dated.length + skipped.length} files now have a date in the Date column.${skipped.length ? ` ${skipped.length} stay without a date.` : ''}`
      : `All ${skipped.length} files stay without a date. Last edited stays on the file.`
    const playback = [
      ...(dated.length ? [{ value: dated.length, label: 'Files were given a date', rowIds: dated }] : []),
      ...(skipped.length ? [{ value: skipped.length, label: 'Files stay without a date', rowIds: skipped }] : []),
    ]
    pulseWriting()
    advance('undated', echo, [{ role: 'assistant', text, playback }], nd)
  }

  function deleteFiles(ids: string[]) {
    setRemovedIds((prev) => [...new Set([...prev, ...ids])])
    setPlaced((prev) => {
      const next = { ...prev }
      for (const id of ids) delete next[id]
      return next
    })
  }

  const locked = d.applied
  const [highlightIds, setHighlightIds] = useState<string[]>([])
  const [highlightHeld, setHighlightHeld] = useState(false)
  const highlightTimer = useRef<number | undefined>(undefined)
  // True while the pointer is on a "show in table" arrow, so the blue stays put.
  const heldPointer = useRef(false)

  function show(group: string, rowIds?: string[], mode?: 'hold' | 'release') {
    if (mode === 'release') {
      heldPointer.current = false
      clearTimeout(highlightTimer.current)
      setHighlightHeld(false)
      setHighlightIds([])
      return
    }
    if (mode === 'hold') heldPointer.current = true
    const persist = heldPointer.current
    setSelected(group)
    clearTimeout(highlightTimer.current)
    setHighlightHeld(persist)
    if (!rowIds?.length) {
      setHighlightIds([])
      return
    }
    setHighlightIds(rowIds)
    if (!persist) highlightTimer.current = window.setTimeout(() => setHighlightIds([]), 1800)
  }

  function renderCard(step: Step) {
    switch (step) {
      case 'report':
        return (
          <OpeningReportCard
            started={messages.some((m) => m.text === 'Let’s organise')}
            onStart={() => advance('report', 'Let’s organise')}
          />
        )
      case 'convention':
        return (
          <ConventionCard
            value={d.convention}
            locked={locked}
            onConfirm={(c) => decide('convention', { convention: c })}
            onUndo={() => undo({ convention: null })}
          />
        )
      case 'secondLevel':
        return (
          <SecondLevelCard
            top={d.convention ?? 'A'}
            value={d.secondLevel}
            locked={locked}
            onConfirm={(f) => decide('secondLevel', { secondLevel: f })}
            onUndo={() => undo({ secondLevel: null })}
          />
        )
      case 'dates':
        return (
          <DatesCard
            d={d}
            value={d.dateSource}
            locked={locked}
            onShow={show}
            onConfirm={(source) => {
              if (source === 'modified') clearSuppliedDates()
              decide('dates', { dateSource: source, undated: source === 'filename' ? d.undated : null })
            }}
            onUndo={() => undo({ dateSource: null })}
          />
        )
      case 'undated':
        return (
          <UndatedCard
            d={d}
            value={d.undated}
            locked={locked}
            onShow={show}
            onReview={() => setD((prev) => ({ ...prev, undated: 'review' }))}
            onUseModified={() => applyLastEditedToUndated()}
            onSkip={() => decide('undated', { undated: 'skip' })}
            onDate={(id, date) => editField(id, { date })}
            onBack={() => {
              clearSuppliedDates()
              setD((prev) => ({ ...prev, undated: null }))
            }}
            onFinish={finishUndated}
            onUndo={() => {
              clearSuppliedDates()
              undo({ undated: null })
            }}
          />
        )
      case 'templates':
        return (
          <TemplatesCard
            d={d}
            value={d.templates}
            locked={locked}
            onShow={show}
            onConfirm={(c) => decide('templates', { templates: c })}
            onUndo={() => undo({ templates: null })}
          />
        )
      case 'easyWins':
        return (
          <CurrentRuleCard
            value={d.currentRule ?? null}
            dateSource={d.dateSource}
            locked={locked}
            onConfirm={(rule) => decide('easyWins', { easyWins: true, currentRule: rule })}
            onSkip={() => decide('easyWins', { easyWins: true, currentRule: 'skip' }, 'Skip versions')}
            onUndo={() => undo({ easyWins: false, currentRule: null })}
          />
        )
      case 'chains':
        return (
          <ChainsCard
            d={d}
            value={d.chains}
            locked={locked}
            onShow={show}
            onConfirm={(c) => decide('chains', { chains: c })}
            onSkip={() => decide('chains', { chains: 'skip' }, 'Skip these versions')}
            onUndo={() => undo({ chains: null })}
          />
        )
      case 'conflicts':
        return (
          <ConflictsCard
            d={d}
            value={d.conflicts}
            locked={locked}
            onShow={show}
            onConfirm={(c) => decide('conflicts', { conflicts: c })}
            onSkip={() => decide('conflicts', { conflicts: 'skip' }, 'Skip conflicting names')}
            onUndo={() => undo({ conflicts: null })}
          />
        )
      case 'noStatus':
        return (
          <NoStatusCard
            d={d}
            value={d.noStatus}
            locked={locked}
            onShow={show}
            onBulk={(ids, marks) => {
              const patch = { statusRules: ids, statusMarks: marks }
              if (statusRuleSplit(ids, marks).rest.length === 0) decide('noStatus', { noStatus: 'rules', ...patch })
              else setD((prev) => ({ ...prev, noStatus: 'bulk', ...patch }))
            }}
            onReview={() => setD((prev) => ({ ...prev, noStatus: 'review' }))}
            onRules={() => decide('noStatus', { noStatus: 'rules' })}
            onUndefined={() => decide('noStatus', { noStatus: 'undefined', statusRules: null, statusMarks: null })}
            onStatus={(id, status) => editField(id, { status })}
            onBack={() => {
              clearSuppliedStatuses()
              setD((prev) => ({ ...prev, noStatus: prev.noStatus === 'review' ? 'bulk' : null }))
            }}
            onFinish={finishNoStatus}
            onUndo={() => {
              clearSuppliedStatuses()
              undo({ noStatus: null, statusRules: null, statusMarks: null })
            }}
          />
        )
      case 'employment':
        return (
          <EmploymentCard
            d={d}
            value={d.employment}
            locked={locked}
            onShow={show}
            onConfirm={(c) => decide('employment', { employment: c })}
            onUndo={() => undo({ employment: null })}
          />
        )
      case 'solara':
        return (
          <SolaraCard
            d={d}
            value={d.solara}
            locked={locked}
            onShow={show}
            onConfirm={(c) => decide('solara', { solara: c })}
            onSkip={() => decide('solara', { solara: 'skip' }, 'Skip the Solara NDA')}
            onUndo={() => undo({ solara: null })}
          />
        )
      case 'vantage':
        return (
          <VantageCard
            d={d}
            value={d.vantage}
            locked={locked}
            onShow={show}
            onConfirm={(c) => decide('vantage', { vantage: c })}
            onSkip={() => decide('vantage', { vantage: 'skip' }, 'Skip the Vantage licences')}
            onUndo={() => undo({ vantage: null })}
          />
        )
      case 'unidentified':
        return (
          <UnidentifiedCard
            d={d}
            value={d.unidentified}
            locked={locked}
            onShow={show}
            onReview={() => setD((prev) => ({ ...prev, unidentified: 'review' }))}
            onLeave={() => decide('unidentified', { unidentified: 'left', placements: {} })}
            onPlace={placeUnidentified}
            onBack={() => setD((prev) => ({ ...prev, unidentified: null, placements: {} }))}
            onFinish={finishUnidentified}
            onUndo={() => undo({ unidentified: null, placements: {} })}
          />
        )
      case 'naming':
        return (
          <NamingCard
            d={d}
            value={d.naming}
            locked={locked}
            onShow={show}
            onConfirm={(c) => decide('naming', { naming: c })}
            onUndo={() => undo({ naming: null })}
          />
        )
      case 'playback':
        return (
          <PlaybackCard
            d={d}
            applied={d.applied || reached('applied')}
            canApply={!!d.convention && !!d.naming}
            onApply={() => {
              holdWriting()
              reply('Accept changes', [{ role: 'assistant', text: '', card: 'applied' }])
            }}
          />
        )
      case 'applied':
        return (
          <ApplyCard
            done={d.applied}
            onUndo={undoRun}
            onDone={() => {
              setD((prev) => ({ ...prev, applied: true }))
              setMessages((m) => [...m, closing(d)])
              pulseWriting()
            }}
          />
        )
    }
  }

  const mode = !shown.convention ? 'before' : shown.applied ? 'applied' : 'preview'

  return (
    <div className="flex h-full gap-2 p-2 pl-0">
      <Rail />
      <main className="flex min-w-0 flex-1 overflow-hidden rounded-2xl border border-border-subtle bg-body shadow-[0_3px_8px_#1717170d]">
        <Chat messages={messages} onSend={send} renderCard={renderCard} thinking={thinking} filing={shown}
          onRestart={restart}
          onWorkingDone={workingDone}
          onWorkingStep={workingStep}
          about={about && { name: about.original, display: about.display }}
          onClearAbout={() => setAbout(null)}
          onShow={show}
        />
        <Sidebar groups={groups} selected={current.name} onSelect={setSelected} mode={mode} rewrite={rewrite} />
        <Register
          onAsk={setAbout}
          key={`${mode}-${shown.secondLevel}-${current.name}`}
          group={current}
          mode={mode}
          rewrite={rewrite}
          dateSource={shown.dateSource}
          top={mode === 'before' || !shown.convention ? null : topFacet[shown.convention]}
          by={mode === 'before' ? null : shown.secondLevel}
          highlightIds={highlightIds}
          highlightHeld={highlightHeld}
          folders={groups.map((g) => g.name)}
          onMove={moveFiles}
          onDelete={deleteFiles}
          onEdit={editField}
        />
      </main>
    </div>
  )
}

function Rail() {
  const items = [BookOpen, MessageSquare, LineChart, FileText, SquareCheck]
  return (
    <nav className="flex w-12 shrink-0 flex-col items-center gap-3 py-2">
      <div className="mb-3 grid size-8 place-items-center rounded-lg bg-white text-[15px] font-semibold tracking-tighter shadow-[0_2px_3px_#64646414]">
        W/
      </div>
      {items.map((Icon, i) => (
        <button
          key={i}
          className={`grid size-8 place-items-center rounded-lg ${i === 0 ? 'bg-surface-selected text-text-base' : 'text-text-subtle hover:bg-surface-hover'}`}
        >
          <Icon size={15} strokeWidth={2.25} />
        </button>
      ))}
      <div className="mt-auto size-6 rounded-full bg-text-subtle/60" />
    </nav>
  )
}
