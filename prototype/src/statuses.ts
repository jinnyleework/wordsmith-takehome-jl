// Statuses the user adds from any status menu. They join every menu for the rest of the session.
import { useSyncExternalStore } from 'react'
import type { BuiltInStatus, Status } from './data'

let added: string[] = []
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAddedStatuses(): readonly string[] {
  return useSyncExternalStore(subscribe, () => added)
}

// Returns the status to select: the existing one when the name only differs in case, otherwise the new one.
export function addStatus(name: string, existing: readonly Status[]): Status | null {
  const clean = name.trim().replace(/\s+/g, ' ')
  if (!clean) return null
  const match = [...existing, ...added].find((s) => s.toLowerCase() === clean.toLowerCase())
  if (match) return match
  added = [...added, clean]
  listeners.forEach((listener) => listener())
  return clean
}

const builtInStyles: Record<BuiltInStatus, string> = {
  Signed: 'bg-[#e7f6f1] text-[#1a7a62]',
  Final: 'bg-brand-subtle text-brand',
  Draft: 'bg-amber-50 text-amber-800',
  Pending: 'bg-[#fff1ea] text-[#c2410c]',
  Template: 'bg-[#f3f6e4] text-[#5c6b12]',
  Unlabelled: 'bg-surface-subtle text-text-subtle',
  Undefined: 'bg-surface-subtle text-text-subtle',
  Conflicting: 'bg-red-50 text-red-700',
}

export function statusStyle(status: Status) {
  return builtInStyles[status as BuiltInStatus] ?? 'bg-[#eef3f4] text-viz-midnight'
}
