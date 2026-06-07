import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type {
  AnchorOverride,
  Card,
  CardGroup,
  ConnectingFrom,
  Edge,
  PortPosition,
  Position,
  Viewport,
} from '../types'
import {
  DEFAULT_CARD_CONTENT,
  DEFAULT_CARD_SIZE,
  DEFAULT_TITLE_HUE,
} from '../types/constants'
import type { ThemeMode } from '../lib/theme'
import { alignCards, type AlignMode } from '../lib/align'
import { documentFingerprint } from '../lib/documentHash'
import {
  cloneSnapshot,
  popFuture,
  popPast,
  pushFuture,
  pushPast,
  type HistorySnapshot,
} from '../lib/history'
import {
  edgesForCard,
  filterPortsForCard,
  isValidConnection,
  portKey,
  pruneAnchorOverrides,
  pruneOrphanEdges,
} from '../lib/graph'
import { cardFromPreset } from '../lib/cardPresets'
import {
  detachCardsFromGroups,
  moveCardsByDelta,
  removeCardsFromGroups,
  sanitizeGroups,
} from '../lib/groups'
import { createEmptyDocument, exportDocument, importDocument } from '../lib/persistence'
import { loadRecentFiles, pushRecentFile, type RecentFileEntry } from '../lib/recentFiles'
import { clearAllPorts, unregisterCardPorts } from '../lib/portRegistry'
import { parseSegments, remapAnchorOverrides } from '../lib/segments'
import { panToCard, viewportToFitContent, zoomAroundCenter } from '../lib/viewportUtils'

let contentHistoryTimer: ReturnType<typeof setTimeout> | null = null

interface DocumentSlice {
  cards: Card[]
  edges: Edge[]
  groups: CardGroup[]
  viewport: Viewport
  theme: ThemeMode
  documentName: string
  savedFingerprint: string | null
}

interface UISlice {
  selectedCardId: string | null
  selectedCardIds: string[]
  selectedEdgeId: string | null
  ports: Record<string, PortPosition>
  connectingFrom: ConnectingFrom | null
  connectPointer: { x: number; y: number } | null
  selectionAnchorId: string | null
}

interface MetaSlice {
  recentFiles: RecentFileEntry[]
  historyPast: HistorySnapshot[]
  historyFuture: HistorySnapshot[]
  isRestoringHistory: boolean
  dragSnapshotTaken: boolean
  contentHistoryArmed: boolean
  sidebarOpen: boolean
  searchOpen: boolean
  searchQuery: string
  shortcutsOpen: boolean
  clipboardCards: Card[] | null
}

interface EditorActions {
  addCard: (position?: { x: number; y: number }) => string
  addCardFromPreset: (presetId: string, position?: { x: number; y: number }) => string | null
  applyPresetToCard: (cardId: string, presetId: string) => void
  duplicateCard: (cardId: string, offset?: { x: number; y: number }) => string | null
  updateCard: (id: string, patch: Partial<Card>) => void
  updateCardContent: (id: string, content: string) => void
  removeCard: (id: string) => void
  selectCard: (id: string | null) => void
  selectCards: (ids: string[]) => void
  toggleCardSelection: (cardId: string) => void
  rangeSelectCard: (cardId: string) => void
  selectEdge: (id: string | null) => void
  createGroupFromCards: (cardIds: string[], title?: string) => string | null
  removeGroup: (groupId: string) => void
  updateGroup: (groupId: string, patch: Partial<Pick<CardGroup, 'title' | 'cardIds'>>) => void
  moveGroupCards: (groupId: string, delta: Position) => void
  setViewport: (patch: Partial<Viewport>) => void
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  zoomIn: (containerWidth: number, containerHeight: number) => void
  zoomOut: (containerWidth: number, containerHeight: number) => void
  zoomReset: (containerWidth: number, containerHeight: number) => void
  zoomToFit: (containerWidth: number, containerHeight: number) => void
  setAnchorOverride: (cardId: string, anchorId: string, patch: Partial<AnchorOverride>) => void
  resetAnchorOverride: (cardId: string, anchorId: string) => void
  setPort: (port: PortPosition) => void
  removeCardPorts: (cardId: string) => void
  addEdge: (edge: Omit<Edge, 'id'>) => void
  removeEdge: (id: string) => void
  removeSelectedEdge: () => void
  deleteSelected: () => void
  startConnecting: (from: ConnectingFrom) => void
  setConnectPointer: (pointer: { x: number; y: number } | null) => void
  cancelConnecting: () => void
  completeConnecting: (target: Omit<PortPosition, 'kind'> & { kind: 'prev' }) => void
  pushHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  beginDragSnapshot: () => void
  endDragSnapshot: () => void
  clearDragSnapshot: () => void
  moveSelectedCardsByDelta: (delta: Position, draggedCardId: string) => void
  alignSelectedCards: (mode: AlignMode) => void
  copySelectedCards: () => void
  pasteCards: () => void
  focusCard: (cardId: string, containerWidth?: number, containerHeight?: number) => void
  setDocumentName: (name: string) => void
  markSaved: (name?: string) => void
  toggleSidebar: () => void
  setSearchOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  toggleShortcuts: () => void
  setShortcutsOpen: (open: boolean) => void
  loadDocument: (json: string, fileName?: string) => void
  exportDocumentJson: () => string
  clearCanvas: () => void
  resetDocument: () => void
}

export type EditorState = DocumentSlice & UISlice & MetaSlice & EditorActions

function makeCard(patch: Partial<Card> = {}): Card {
  return {
    id: nanoid(),
    title: '',
    titleHue: DEFAULT_TITLE_HUE,
    position: { x: 120, y: 80 },
    size: { ...DEFAULT_CARD_SIZE },
    content: DEFAULT_CARD_CONTENT,
    anchorOverrides: {},
    ...patch,
  }
}

const initialCards: Card[] = [
  makeCard({ id: 'card-1', position: { x: 120, y: 80 } }),
  makeCard({
    id: 'card-2',
    title: '第二张卡片',
    titleHue: 214,
    position: { x: 620, y: 160 },
    content: `## 结构关系

把 **next** 连到另一张卡片的 **prev**。

1. 第一项
2. 第二项
3. 第三项
`,
  }),
]

const initialDocument: DocumentSlice = {
  cards: initialCards,
  edges: [],
  groups: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  theme: 'dark',
  documentName: '未命名文档',
  savedFingerprint: null,
}

const initialUI: UISlice = {
  selectedCardId: initialCards[0]?.id ?? null,
  selectedCardIds: initialCards[0] ? [initialCards[0].id] : [],
  selectedEdgeId: null,
  ports: {},
  connectingFrom: null,
  connectPointer: null,
  selectionAnchorId: initialCards[0]?.id ?? null,
}

const initialMeta: MetaSlice = {
  recentFiles: [],
  historyPast: [],
  historyFuture: [],
  isRestoringHistory: false,
  dragSnapshotTaken: false,
  contentHistoryArmed: false,
  sidebarOpen: false,
  searchOpen: false,
  searchQuery: '',
  shortcutsOpen: false,
  clipboardCards: null,
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => {
      const restoreSnapshot = (snapshot: HistorySnapshot) => {
        clearAllPorts()
        set({
          isRestoringHistory: true,
          cards: cloneSnapshot(snapshot).cards,
          edges: cloneSnapshot(snapshot).edges,
          groups: cloneSnapshot(snapshot).groups,
          ports: {},
          connectingFrom: null,
          connectPointer: null,
        })
        set({ isRestoringHistory: false })
      }

      const withHistory = (mutate: () => void) => {
        get().pushHistory()
        mutate()
      }

      return {
        ...initialDocument,
        ...initialUI,
        ...initialMeta,
        savedFingerprint: documentFingerprint({
          cards: initialCards,
          edges: [],
          groups: [],
        }),

        pushHistory: () => {
          const { isRestoringHistory, historyPast, cards, edges, groups } = get()
          if (isRestoringHistory) return
          set({
            historyPast: pushPast(historyPast, { cards, edges, groups }),
            historyFuture: [],
          })
        },

        undo: () => {
          const { historyPast, historyFuture, cards, edges, groups } = get()
          const popped = popPast(historyPast)
          if (!popped) return
          const current = { cards, edges, groups }
          restoreSnapshot(popped.snapshot)
          set({
            historyPast: popped.rest,
            historyFuture: pushFuture(historyFuture, current),
          })
        },

        redo: () => {
          const { historyPast, historyFuture, cards, edges, groups } = get()
          const popped = popFuture(historyFuture)
          if (!popped) return
          const current = { cards, edges, groups }
          restoreSnapshot(popped.snapshot)
          set({
            historyPast: pushPast(historyPast, current),
            historyFuture: popped.rest,
          })
        },

        canUndo: () => get().historyPast.length > 0,
        canRedo: () => get().historyFuture.length > 0,

        beginDragSnapshot: () => {
          if (!get().dragSnapshotTaken) {
            get().pushHistory()
            set({ dragSnapshotTaken: true })
          }
        },

        clearDragSnapshot: () => set({ dragSnapshotTaken: false }),

        endDragSnapshot: () => set({ dragSnapshotTaken: false }),

        moveSelectedCardsByDelta: (delta, draggedCardId) => {
          const { selectedCardIds, cards } = get()
          const ids =
            selectedCardIds.length > 1 && selectedCardIds.includes(draggedCardId)
              ? selectedCardIds
              : [draggedCardId]
          set({ cards: moveCardsByDelta(cards, ids, delta) })
        },

        alignSelectedCards: (mode) => {
          withHistory(() => {
            const { cards, selectedCardIds } = get()
            if (selectedCardIds.length < 2) return
            set({ cards: alignCards(cards, selectedCardIds, mode) })
          })
        },

        copySelectedCards: () => {
          const { cards, selectedCardIds } = get()
          if (selectedCardIds.length === 0) return
          const picked = cards.filter((card) => selectedCardIds.includes(card.id))
          set({ clipboardCards: structuredClone(picked) })
        },

        pasteCards: () => {
          const { clipboardCards } = get()
          if (!clipboardCards || clipboardCards.length === 0) return
          withHistory(() => {
            const created = clipboardCards.map((source) => ({
              ...source,
              id: nanoid(),
              title: source.title ? `${source.title}（粘贴）` : source.title,
              position: { x: source.position.x + 32, y: source.position.y + 32 },
              anchorOverrides: { ...source.anchorOverrides },
            }))
            set((state) => ({
              cards: [...state.cards, ...created],
              selectedCardIds: created.map((card) => card.id),
              selectedCardId: created[0]?.id ?? null,
              selectedEdgeId: null,
            }))
          })
        },

        focusCard: (cardId, containerWidth = 0, containerHeight = 0) => {
          const card = get().cards.find((c) => c.id === cardId)
          if (!card) return
          set({
            selectedCardId: cardId,
            selectedCardIds: [cardId],
            selectedEdgeId: null,
            selectionAnchorId: cardId,
          })
          if (containerWidth > 0 && containerHeight > 0) {
            set({ viewport: panToCard(card, get().viewport, containerWidth, containerHeight) })
          }
        },

        setDocumentName: (name) => set({ documentName: name.trim() || '未命名文档' }),

        markSaved: (name) => {
          const { cards, edges, groups } = get()
          const fingerprint = documentFingerprint({ cards, edges, groups })
          const documentName = name?.trim() || get().documentName
          const recentFiles = pushRecentFile(documentName)
          set({ savedFingerprint: fingerprint, documentName, recentFiles })
        },

        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSearchOpen: (open) => set({ searchOpen: open, searchQuery: open ? get().searchQuery : '' }),
        setSearchQuery: (query) => set({ searchQuery: query }),
        toggleShortcuts: () => set((state) => ({ shortcutsOpen: !state.shortcutsOpen })),
        setShortcutsOpen: (open) => set({ shortcutsOpen: open }),

        addCard: (position) => get().addCardFromPreset('blank', position)!,

        addCardFromPreset: (presetId, position) => {
          const card = cardFromPreset(presetId, {
            id: nanoid(),
            position: position ?? { x: 200, y: 200 },
          })
          if (!card) return null
          withHistory(() => {
            set({
              cards: [...get().cards, card],
              selectedCardId: card.id,
              selectedCardIds: [card.id],
              selectedEdgeId: null,
              selectionAnchorId: card.id,
            })
          })
          return card.id
        },

        applyPresetToCard: (cardId, presetId) => {
          const presetCard = cardFromPreset(presetId, { id: cardId })
          if (!presetCard) return
          withHistory(() => {
            set((state) => {
              const cards = state.cards.map((c) =>
                c.id === cardId
                  ? {
                      ...c,
                      title: presetCard.title,
                      titleHue: presetCard.titleHue,
                      content: presetCard.content,
                      size: presetCard.size,
                      anchorOverrides: {},
                    }
                  : c,
              )
              return { cards, edges: pruneOrphanEdges(cards, state.edges) }
            })
          })
        },

        duplicateCard: (cardId, offset = { x: 24, y: 24 }) => {
          const source = get().cards.find((c) => c.id === cardId)
          if (!source) return null
          const card: Card = {
            ...source,
            id: nanoid(),
            title: source.title ? `${source.title}（副本）` : source.title,
            position: {
              x: source.position.x + offset.x,
              y: source.position.y + offset.y,
            },
            anchorOverrides: { ...source.anchorOverrides },
          }
          withHistory(() => {
            set({
              cards: [...get().cards, card],
              selectedCardId: card.id,
              selectedCardIds: [card.id],
              selectedEdgeId: null,
              selectionAnchorId: card.id,
            })
          })
          return card.id
        },

        updateCard: (id, patch) => set((state) => ({
          cards: state.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

        updateCardContent: (id, content) => {
          if (!get().contentHistoryArmed) {
            get().pushHistory()
            set({ contentHistoryArmed: true })
            if (contentHistoryTimer) clearTimeout(contentHistoryTimer)
            contentHistoryTimer = setTimeout(() => {
              set({ contentHistoryArmed: false })
              contentHistoryTimer = null
            }, 800)
          }
          set((state) => {
            const card = state.cards.find((c) => c.id === id)
            if (!card) return state
            const prevSegments = parseSegments(id, card.content)
            const nextSegments = parseSegments(id, content)
            const anchorOverrides = remapAnchorOverrides(
              prevSegments,
              nextSegments,
              card.anchorOverrides,
            )
            const prunedOverrides = pruneAnchorOverrides(
              { ...card, content, anchorOverrides },
              nextSegments,
            )
            const cards = state.cards.map((c) =>
              c.id === id ? { ...c, content, anchorOverrides: prunedOverrides } : c,
            )
            return { cards, edges: pruneOrphanEdges(cards, state.edges) }
          })
        },

        removeCard: (id) => {
          unregisterCardPorts(id)
          withHistory(() => {
            const { connectingFrom } = get()
            const cancelConnect =
              connectingFrom?.cardId === id
                ? { connectingFrom: null as ConnectingFrom | null, connectPointer: null as { x: number; y: number } | null }
                : {}
            set((state) => {
              const cards = state.cards.filter((c) => c.id !== id)
              const groups = removeCardsFromGroups(state.groups, [id], cards)
              const selectedCardIds = state.selectedCardIds.filter((cid) => cid !== id)
              return {
                cards,
                groups,
                edges: edgesForCard(state.edges, id),
                ports: filterPortsForCard(state.ports, id) as Record<string, PortPosition>,
                selectedCardIds,
                selectedCardId: selectedCardIds[0] ?? null,
                selectionAnchorId: selectedCardIds[0] ?? null,
                selectedEdgeId: state.edges.some(
                  (e) => e.id === state.selectedEdgeId && (e.sourceCardId === id || e.targetCardId === id),
                )
                  ? null
                  : state.selectedEdgeId,
                ...cancelConnect,
              }
            })
          })
        },

        selectCard: (id) =>
          set({
            selectedCardId: id,
            selectedCardIds: id ? [id] : [],
            selectedEdgeId: null,
            selectionAnchorId: id,
          }),

        selectCards: (ids) => {
          const unique = [...new Set(ids)]
          set({
            selectedCardIds: unique,
            selectedCardId: unique[0] ?? null,
            selectedEdgeId: null,
            selectionAnchorId: unique[0] ?? null,
          })
        },

        toggleCardSelection: (cardId) => {
          const next = new Set(get().selectedCardIds)
          if (next.has(cardId)) next.delete(cardId)
          else next.add(cardId)
          const ids = [...next]
          set({
            selectedCardIds: ids,
            selectedCardId: ids[0] ?? null,
            selectedEdgeId: null,
            selectionAnchorId: cardId,
          })
        },

        rangeSelectCard: (cardId) => {
          const { cards, selectionAnchorId, selectedCardIds } = get()
          const order = cards.map((c) => c.id)
          const anchor = selectionAnchorId ?? selectedCardIds[0]
          if (!anchor) {
            get().selectCard(cardId)
            return
          }
          const a = order.indexOf(anchor)
          const b = order.indexOf(cardId)
          if (a < 0 || b < 0) {
            get().selectCard(cardId)
            return
          }
          const [start, end] = a < b ? [a, b] : [b, a]
          get().selectCards(order.slice(start, end + 1))
        },

        selectEdge: (id) =>
          id === null
            ? set({ selectedEdgeId: null })
            : set({ selectedEdgeId: id, selectedCardId: null, selectedCardIds: [] }),

        createGroupFromCards: (cardIds, title = '组合') => {
          const unique = [...new Set(cardIds)]
          if (unique.length < 2) return null
          const group: CardGroup = { id: nanoid(10), title, cardIds: unique }
          withHistory(() => {
            set((state) => ({
              groups: [...detachCardsFromGroups(state.groups, unique), group],
              selectedCardIds: unique,
              selectedCardId: unique[0] ?? null,
            }))
          })
          return group.id
        },

        removeGroup: (groupId) =>
          withHistory(() => {
            set((state) => ({ groups: state.groups.filter((group) => group.id !== groupId) }))
          }),

        updateGroup: (groupId, patch) =>
          withHistory(() => {
            set((state) => ({
              groups: state.groups.map((group) =>
                group.id === groupId ? { ...group, ...patch } : group,
              ),
            }))
          }),

        moveGroupCards: (groupId, delta) => {
          set((state) => {
            const group = state.groups.find((item) => item.id === groupId)
            if (!group) return state
            return { cards: moveCardsByDelta(state.cards, group.cardIds, delta) }
          })
        },

        setViewport: (patch) => set((state) => ({ viewport: { ...state.viewport, ...patch } })),
        setTheme: (theme) => set({ theme }),
        toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

        zoomIn: (containerWidth, containerHeight) =>
          set((state) => ({
            viewport: zoomAroundCenter(state.viewport, containerWidth, containerHeight, 1.12),
          })),

        zoomOut: (containerWidth, containerHeight) =>
          set((state) => ({
            viewport: zoomAroundCenter(state.viewport, containerWidth, containerHeight, 1 / 1.12),
          })),

        zoomReset: (containerWidth, containerHeight) =>
          set((state) => ({
            viewport: {
              ...zoomAroundCenter(state.viewport, containerWidth, containerHeight, 1 / state.viewport.zoom),
              zoom: 1,
            },
          })),

        zoomToFit: (containerWidth, containerHeight) =>
          set((state) => ({
            viewport: viewportToFitContent(
              state.cards,
              state.groups,
              containerWidth,
              containerHeight,
            ),
          })),

        setAnchorOverride: (cardId, anchorId, patch) =>
          withHistory(() => {
            set((state) => {
              const cards = state.cards.map((card) => {
                if (card.id !== cardId) return card
                const current = { ...card.anchorOverrides }
                const merged = { ...(current[anchorId] ?? {}) }
                if ('isPrev' in patch) {
                  if (patch.isPrev === undefined) delete merged.isPrev
                  else merged.isPrev = patch.isPrev
                }
                if ('isNext' in patch) {
                  if (patch.isNext === undefined) delete merged.isNext
                  else merged.isNext = patch.isNext
                }
                if (Object.keys(merged).length === 0) delete current[anchorId]
                else current[anchorId] = merged
                return { ...card, anchorOverrides: current }
              })
              return { cards, edges: pruneOrphanEdges(cards, state.edges) }
            })
          }),

        resetAnchorOverride: (cardId, anchorId) =>
          withHistory(() => {
            set((state) => {
              const cards = state.cards.map((card) => {
                if (card.id !== cardId) return card
                const next = { ...card.anchorOverrides }
                delete next[anchorId]
                return { ...card, anchorOverrides: next }
              })
              return { cards, edges: pruneOrphanEdges(cards, state.edges) }
            })
          }),

        setPort: (port) =>
          set((state) => ({
            ports: { ...state.ports, [portKey(port.cardId, port.anchorId, port.kind)]: port },
          })),

        removeCardPorts: (cardId) =>
          set((state) => ({
            ports: filterPortsForCard(state.ports, cardId) as Record<string, PortPosition>,
          })),

        addEdge: (edge) => {
          const { cards } = get()
          if (!isValidConnection(cards, edge.sourceCardId, edge.sourceAnchorId, edge.targetCardId, edge.targetAnchorId)) {
            return
          }
          withHistory(() => {
            set((state) => {
              const duplicate = state.edges.some(
                (e) =>
                  e.sourceCardId === edge.sourceCardId &&
                  e.sourceAnchorId === edge.sourceAnchorId &&
                  e.targetCardId === edge.targetCardId &&
                  e.targetAnchorId === edge.targetAnchorId,
              )
              if (duplicate) return state
              return { edges: [...state.edges, { ...edge, id: nanoid(10) }] }
            })
          })
        },

        removeEdge: (id) =>
          withHistory(() => {
            set((state) => ({
              edges: state.edges.filter((e) => e.id !== id),
              selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
            }))
          }),

        removeSelectedEdge: () => {
          const { selectedEdgeId } = get()
          if (selectedEdgeId) get().removeEdge(selectedEdgeId)
        },

        deleteSelected: () => {
          const { selectedEdgeId, selectedCardIds } = get()
          if (selectedEdgeId) {
            get().removeEdge(selectedEdgeId)
            return
          }
          if (selectedCardIds.length === 0) return
          withHistory(() => {
            for (const id of [...selectedCardIds]) {
              unregisterCardPorts(id)
            }
            const { connectingFrom } = get()
            set((state) => {
              const removeSet = new Set(selectedCardIds)
              const cards = state.cards.filter((c) => !removeSet.has(c.id))
              const groups = removeCardsFromGroups(state.groups, selectedCardIds, cards)
              let ports = state.ports
              for (const id of selectedCardIds) {
                ports = filterPortsForCard(ports, id) as Record<string, PortPosition>
              }
              const cancelConnect =
                connectingFrom && removeSet.has(connectingFrom.cardId)
                  ? { connectingFrom: null as ConnectingFrom | null, connectPointer: null as { x: number; y: number } | null }
                  : {}
              return {
                cards,
                groups,
                edges: state.edges.filter(
                  (e) => !removeSet.has(e.sourceCardId) && !removeSet.has(e.targetCardId),
                ),
                ports,
                selectedCardIds: [],
                selectedCardId: null,
                selectionAnchorId: null,
                selectedEdgeId: null,
                ...cancelConnect,
              }
            })
          })
        },

        startConnecting: (from) =>
          set({ connectingFrom: from, connectPointer: { x: from.x, y: from.y } }),
        setConnectPointer: (pointer) => set({ connectPointer: pointer }),
        cancelConnecting: () => set({ connectingFrom: null, connectPointer: null }),

        completeConnecting: (target) => {
          const { connectingFrom: from } = get()
          if (!from || target.kind !== 'prev') {
            set({ connectingFrom: null, connectPointer: null })
            return
          }
          get().addEdge({
            sourceCardId: from.cardId,
            sourceAnchorId: from.anchorId,
            targetCardId: target.cardId,
            targetAnchorId: target.anchorId,
          })
          set({ connectingFrom: null, connectPointer: null })
        },

        loadDocument: (json, fileName) => {
          const doc = importDocument(JSON.parse(json))
          clearAllPorts()
          const fingerprint = documentFingerprint({
            cards: doc.cards,
            edges: doc.edges,
            groups: doc.groups ?? [],
          })
          const documentName = fileName?.trim() || get().documentName
          const recentFiles = fileName ? pushRecentFile(documentName) : get().recentFiles
          set({
            cards: doc.cards,
            edges: doc.edges,
            groups: doc.groups ?? [],
            viewport: doc.viewport,
            selectedCardId: doc.cards[0]?.id ?? null,
            selectedCardIds: doc.cards[0] ? [doc.cards[0].id] : [],
            selectionAnchorId: doc.cards[0]?.id ?? null,
            selectedEdgeId: null,
            ports: {},
            connectingFrom: null,
            connectPointer: null,
            historyPast: [],
            historyFuture: [],
            savedFingerprint: fingerprint,
            documentName,
            recentFiles,
          })
        },

        clearCanvas: () => {
          withHistory(() => {
            const doc = createEmptyDocument()
            clearAllPorts()
            set({
              cards: doc.cards,
              edges: doc.edges,
              groups: doc.groups ?? [],
              viewport: doc.viewport,
              selectedCardId: null,
              selectedCardIds: [],
              selectionAnchorId: null,
              selectedEdgeId: null,
              ports: {},
              connectingFrom: null,
              connectPointer: null,
            })
          })
        },

        exportDocumentJson: () => {
          const { cards, edges, groups, viewport } = get()
          return JSON.stringify(exportDocument({ cards, edges, groups, viewport }), null, 2)
        },

        resetDocument: () => {
          clearAllPorts()
          set({
            ...initialDocument,
            ...initialMeta,
            savedFingerprint: documentFingerprint({
              cards: initialCards,
              edges: [],
              groups: [],
            }),
            selectedCardId: initialCards[0]?.id ?? null,
            selectedCardIds: initialCards[0] ? [initialCards[0].id] : [],
            selectionAnchorId: initialCards[0]?.id ?? null,
            selectedEdgeId: null,
            ports: {},
            connectingFrom: null,
            connectPointer: null,
          })
        },
      }
    },
    {
      name: 'md-card-editor',
      partialize: (state) => ({
        version: 1,
        cards: state.cards,
        edges: state.edges,
        groups: sanitizeGroups(state.groups, state.cards),
        viewport: state.viewport,
        theme: state.theme,
        documentName: state.documentName,
        savedFingerprint: state.savedFingerprint,
      }),
      merge: (persisted, current) => {
        try {
          const raw =
            persisted && typeof persisted === 'object' && 'state' in persisted
              ? (persisted as { state: unknown }).state
              : persisted
          const doc = importDocument(raw)
          const savedTheme = (raw as { theme?: ThemeMode })?.theme
          const documentName = (raw as { documentName?: string })?.documentName
          const savedFingerprint = (raw as { savedFingerprint?: string | null })?.savedFingerprint
          const fingerprint =
            savedFingerprint ??
            documentFingerprint({
              cards: doc.cards,
              edges: doc.edges,
              groups: doc.groups ?? [],
            })
          return {
            ...current,
            cards: doc.cards.length > 0 ? doc.cards : current.cards,
            edges: doc.edges ?? current.edges,
            groups: doc.groups ?? current.groups ?? [],
            viewport: { ...current.viewport, ...doc.viewport },
            theme: savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : current.theme,
            documentName: documentName ?? current.documentName,
            savedFingerprint: fingerprint,
            recentFiles: loadRecentFiles(),
          }
        } catch {
          return current
        }
      },
    },
  ),
)

export { portKey }
