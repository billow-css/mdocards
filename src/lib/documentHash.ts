import type { Card, CardGroup, Edge } from '../types'
import { exportDocument } from './persistence'

export function documentFingerprint(input: {
  cards: Card[]
  edges: Edge[]
  groups: CardGroup[]
  viewport?: { x: number; y: number; zoom: number }
}): string {
  const doc = exportDocument({
    cards: input.cards,
    edges: input.edges,
    groups: input.groups,
    viewport: input.viewport ?? { x: 0, y: 0, zoom: 1 },
  })
  return JSON.stringify(doc)
}

export function isDocumentDirty(current: string, saved: string | null): boolean {
  if (!saved) return true
  return current !== saved
}
