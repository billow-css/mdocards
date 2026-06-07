import type { Card, CardGroup, Edge } from '../types'
import { sanitizeGroups } from './groups'
import {
  DOCUMENT_SCHEMA_VERSION,
  type EditorDocument,
  type Viewport,
} from '../types'
import { DEFAULT_CARD_SIZE } from '../types/constants'
import { normalizeTitleHue } from './theme'

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

function normalizeCard(card: Card & { titleColor?: string }): Card {
  return {
    id: card.id,
    title: card.title ?? '',
    titleHue: normalizeTitleHue(card),
    position: card.position ?? { x: 0, y: 0 },
    size: card.size ?? { ...DEFAULT_CARD_SIZE },
    content: card.content ?? '',
    anchorOverrides: card.anchorOverrides ?? {},
  }
}

/** 从 store 状态导出可持久化文档 */
function normalizeGroup(group: CardGroup): CardGroup {
  return {
    id: group.id,
    title: group.title ?? '组合',
    cardIds: group.cardIds ?? [],
  }
}

export function exportDocument(input: {
  cards: Card[]
  edges: Edge[]
  groups?: CardGroup[]
  viewport: Viewport
}): EditorDocument {
  const cards = input.cards.map(normalizeCard)
  return {
    version: DOCUMENT_SCHEMA_VERSION,
    cards,
    edges: input.edges,
    groups: sanitizeGroups((input.groups ?? []).map(normalizeGroup), cards),
    viewport: input.viewport,
  }
}

/** 导入文档并做 schema 迁移 */
export function importDocument(raw: unknown): EditorDocument {
  if (!raw || typeof raw !== 'object') {
    return createEmptyDocument()
  }

  const data = raw as Partial<EditorDocument> & { cards?: Card[]; edges?: Edge[] }

  if (data.version === DOCUMENT_SCHEMA_VERSION) {
    const cards = (data.cards ?? []).map(normalizeCard)
    return {
      version: DOCUMENT_SCHEMA_VERSION,
      cards,
      edges: data.edges ?? [],
      groups: sanitizeGroups((data.groups ?? []).map(normalizeGroup), cards),
      viewport: { ...DEFAULT_VIEWPORT, ...data.viewport },
    }
  }

  // 无 version 字段：兼容旧版 localStorage 直存 cards/edges/viewport
  if (Array.isArray(data.cards)) {
    const cards = data.cards.map(normalizeCard)
    return {
      version: DOCUMENT_SCHEMA_VERSION,
      cards,
      edges: data.edges ?? [],
      groups: sanitizeGroups((data.groups ?? []).map(normalizeGroup), cards),
      viewport: { ...DEFAULT_VIEWPORT, ...data.viewport },
    }
  }

  return createEmptyDocument()
}

export function createEmptyDocument(): EditorDocument {
  return {
    version: DOCUMENT_SCHEMA_VERSION,
    cards: [],
    edges: [],
    viewport: { ...DEFAULT_VIEWPORT },
  }
}

export function serializeDocument(doc: EditorDocument): string {
  return JSON.stringify(doc, null, 2)
}

export function parseDocumentJson(json: string): EditorDocument {
  try {
    return importDocument(JSON.parse(json))
  } catch {
    return createEmptyDocument()
  }
}
