import type { Card, CardGroup, Edge } from '../types'

export interface HistorySnapshot {
  cards: Card[]
  edges: Edge[]
  groups: CardGroup[]
}

export const MAX_HISTORY = 50

export function cloneSnapshot(snapshot: HistorySnapshot): HistorySnapshot {
  return structuredClone(snapshot)
}

export function pushPast(past: HistorySnapshot[], snapshot: HistorySnapshot): HistorySnapshot[] {
  const next = [...past, cloneSnapshot(snapshot)]
  if (next.length > MAX_HISTORY) next.shift()
  return next
}

export function popPast(past: HistorySnapshot[]): { snapshot: HistorySnapshot; rest: HistorySnapshot[] } | null {
  if (past.length === 0) return null
  const rest = past.slice(0, -1)
  const snapshot = past[past.length - 1]!
  return { snapshot: cloneSnapshot(snapshot), rest }
}

export function pushFuture(future: HistorySnapshot[], snapshot: HistorySnapshot): HistorySnapshot[] {
  return [cloneSnapshot(snapshot), ...future]
}

export function popFuture(future: HistorySnapshot[]): { snapshot: HistorySnapshot; rest: HistorySnapshot[] } | null {
  if (future.length === 0) return null
  const [head, ...rest] = future
  return { snapshot: cloneSnapshot(head!), rest }
}
