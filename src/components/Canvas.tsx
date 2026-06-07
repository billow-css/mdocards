import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCardPreset } from '../lib/cardPresets'
import { documentFingerprint, isDocumentDirty } from '../lib/documentHash'
import { isElectron, openDocumentWithDialog } from '../lib/electronApi'
import { readDocumentFromFile, saveDocumentToFile } from '../lib/fileDocument'
import {
  exportCanvasPng,
  exportMarkdownBundle,
  exportStaticHtml,
  saveBlob,
} from '../lib/exportFormats'
import { cardsInMarquee, computeTrayBounds, normalizeRect, type WorldRect } from '../lib/groups'
import { useCanvasShortcuts } from '../hooks/useCanvasShortcuts'
import { useEditorStore } from '../store/useEditorStore'
import { Card } from './Card'
import { CardTray } from './CardTray'
import { CanvasContextMenu } from './CanvasContextMenu'
import { ConnectionLayer } from './ConnectionLayer'
import { EditorToolbar } from './EditorToolbar'
import { EmptyCanvasGuide } from './EmptyCanvasGuide'
import { SearchPanel } from './SearchPanel'
import { ShortcutsModal } from './ShortcutsModal'
import { SidebarPanel } from './SidebarPanel'
import { StatusBar } from './StatusBar'
import { DEFAULT_CARD_SIZE } from '../types/constants'
import './Canvas.css'

const MARQUEE_THRESHOLD = 4

export function Canvas() {
  const cards = useEditorStore((s) => s.cards)
  const edges = useEditorStore((s) => s.edges)
  const groups = useEditorStore((s) => s.groups)
  const savedFingerprint = useEditorStore((s) => s.savedFingerprint)
  const documentName = useEditorStore((s) => s.documentName)
  const selectedCardIds = useEditorStore((s) => s.selectedCardIds)
  const viewport = useEditorStore((s) => s.viewport)
  const shortcutsOpen = useEditorStore((s) => s.shortcutsOpen)
  const setShortcutsOpen = useEditorStore((s) => s.setShortcutsOpen)
  const setViewport = useEditorStore((s) => s.setViewport)
  const selectCards = useEditorStore((s) => s.selectCards)
  const createGroupFromCards = useEditorStore((s) => s.createGroupFromCards)
  const addCard = useEditorStore((s) => s.addCard)
  const addCardFromPreset = useEditorStore((s) => s.addCardFromPreset)
  const connectingFrom = useEditorStore((s) => s.connectingFrom)
  const setConnectPointer = useEditorStore((s) => s.setConnectPointer)
  const cancelConnecting = useEditorStore((s) => s.cancelConnecting)
  const selectEdge = useEditorStore((s) => s.selectEdge)
  const exportDocumentJson = useEditorStore((s) => s.exportDocumentJson)
  const loadDocument = useEditorStore((s) => s.loadDocument)
  const clearCanvas = useEditorStore((s) => s.clearCanvas)
  const markSaved = useEditorStore((s) => s.markSaved)
  const theme = useEditorStore((s) => s.theme)
  const toggleTheme = useEditorStore((s) => s.toggleTheme)

  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const panRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const marqueeRef = useRef<{ startWorldX: number; startWorldY: number } | null>(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [canvasMenu, setCanvasMenu] = useState<{ x: number; y: number } | null>(null)
  const [marquee, setMarquee] = useState<WorldRect | null>(null)
  const [isMarqueeActive, setIsMarqueeActive] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  const isDirty = useMemo(
    () => isDocumentDirty(documentFingerprint({ cards, edges, groups }), savedFingerprint),
    [cards, edges, groups, savedFingerprint],
  )

  const confirmIfDirty = useCallback(
    (message: string) => !isDirty || window.confirm(message),
    [isDirty],
  )

  const clientToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return {
        x: (clientX - rect.left - viewport.x) / viewport.zoom,
        y: (clientY - rect.top - viewport.y) / viewport.zoom,
      }
    },
    [viewport.x, viewport.y, viewport.zoom],
  )

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const p = panRef.current
      if (p) {
        setViewport({
          x: p.origX + (e.clientX - p.startX),
          y: p.origY + (e.clientY - p.startY),
        })
      }
    },
    [setViewport],
  )

  const onPointerUp = useCallback(() => {
    panRef.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }, [onPointerMove])

  const onMarqueeMove = useCallback(
    (e: PointerEvent) => {
      const start = marqueeRef.current
      if (!start) return
      const world = clientToWorld(e.clientX, e.clientY)
      setMarquee(normalizeRect(start.startWorldX, start.startWorldY, world.x, world.y))
    },
    [clientToWorld],
  )

  const clearNativeSelection = () => {
    window.getSelection()?.removeAllRanges()
  }

  const onMarqueeUp = useCallback(
    (e: PointerEvent) => {
      const start = marqueeRef.current
      marqueeRef.current = null
      setIsMarqueeActive(false)
      window.removeEventListener('pointermove', onMarqueeMove)
      window.removeEventListener('pointerup', onMarqueeUp)

      if (!start) {
        setMarquee(null)
        return
      }

      const world = clientToWorld(e.clientX, e.clientY)
      const rect = normalizeRect(start.startWorldX, start.startWorldY, world.x, world.y)
      setMarquee(null)
      clearNativeSelection()

      if (rect.width >= MARQUEE_THRESHOLD || rect.height >= MARQUEE_THRESHOLD) {
        selectCards(cardsInMarquee(useEditorStore.getState().cards, rect))
      } else {
        useEditorStore.getState().selectCard(null)
      }
    },
    [clientToWorld, onMarqueeMove, selectCards],
  )

  const startPan = (e: React.PointerEvent) => {
    if (e.button !== 1 && !spaceHeld) return
    e.preventDefault()
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: viewport.x,
      origY: viewport.y,
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const startMarquee = (e: React.PointerEvent) => {
    if (e.button !== 0 || spaceHeld) return
    e.preventDefault()
    clearNativeSelection()
    const world = clientToWorld(e.clientX, e.clientY)
    marqueeRef.current = { startWorldX: world.x, startWorldY: world.y }
    setIsMarqueeActive(true)
    setMarquee({ x: world.x, y: world.y, width: 0, height: 0 })
    window.addEventListener('pointermove', onMarqueeMove)
    window.addEventListener('pointerup', onMarqueeUp)
  }

  const zoomAtPointer = useCallback(
    (clientX: number, clientY: number, deltaY: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const { viewport: vp } = useEditorStore.getState()
      const mouseX = clientX - rect.left
      const mouseY = clientY - rect.top
      const factor = deltaY < 0 ? 1.1 : 1 / 1.1
      const newZoom = Math.min(3, Math.max(0.2, vp.zoom * factor))
      const wx = (mouseX - vp.x) / vp.zoom
      const wy = (mouseY - vp.y) / vp.zoom
      setViewport({ zoom: newZoom, x: mouseX - wx * newZoom, y: mouseY - wy * newZoom })
    },
    [setViewport],
  )

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) return
    const target = e.target as HTMLElement
    if (target.closest('.card')) return
    e.preventDefault()
    zoomAtPointer(e.clientX, e.clientY, e.deltaY)
  }

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const onCtrlWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      event.stopPropagation()
      zoomAtPointer(event.clientX, event.clientY, event.deltaY)
    }
    root.addEventListener('wheel', onCtrlWheel, { passive: false, capture: true })
    return () => root.removeEventListener('wheel', onCtrlWheel, { capture: true })
  }, [zoomAtPointer])

  const handleKeyDownSpace = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    const isTyping =
      target?.tagName === 'TEXTAREA' ||
      target?.tagName === 'INPUT' ||
      target?.isContentEditable
    if (e.code === 'Space' && !e.repeat && !isTyping) {
      e.preventDefault()
      setSpaceHeld(true)
    }
  }, [])

  const handleKeyUpSpace = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') setSpaceHeld(false)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDownSpace)
    window.addEventListener('keyup', handleKeyUpSpace)
    return () => {
      window.removeEventListener('keydown', handleKeyDownSpace)
      window.removeEventListener('keyup', handleKeyUpSpace)
    }
  }, [handleKeyDownSpace, handleKeyUpSpace])

  useEffect(() => {
    if (!connectingFrom) return
    const handleMove = (event: PointerEvent) => {
      setConnectPointer(clientToWorld(event.clientX, event.clientY))
    }
    window.addEventListener('pointermove', handleMove)
    return () => window.removeEventListener('pointermove', handleMove)
  }, [clientToWorld, connectingFrom, setConnectPointer])

  useEffect(
    () => () => {
      window.removeEventListener('pointermove', onMarqueeMove)
      window.removeEventListener('pointerup', onMarqueeUp)
    },
    [onMarqueeMove, onMarqueeUp],
  )

  const handleSave = async () => {
    try {
      const result = await saveDocumentToFile(exportDocumentJson(), `${documentName}.json`)
      if (!result.saved) return
      markSaved(result.fileName)
    } catch {
      window.alert('保存失败，请重试。')
    }
  }

  const handleOpenClick = async () => {
    if (!confirmIfDirty('当前文档有未保存的修改，确定要打开新文件吗？')) return
    if (isElectron()) {
      try {
        const result = await openDocumentWithDialog()
        if (!result) return
        loadDocument(result.content, result.fileName)
      } catch {
        window.alert('无法打开该文件，请选择有效的 JSON 文档。')
      }
      return
    }
    fileInputRef.current?.click()
  }

  const handleOpenFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const json = await readDocumentFromFile(file)
      loadDocument(json, file.name.replace(/\.json$/i, ''))
    } catch {
      window.alert('无法打开该文件，请选择有效的 JSON 文档。')
    }
  }

  const handleClearCanvas = () => {
    if (!confirmIfDirty('当前文档有未保存的修改，确定要清空画布吗？')) return
    if (!window.confirm('确定清空画布？所有卡片、连线与组合将被删除。')) return
    clearCanvas()
  }

  const handleExportMarkdown = async () => {
    const blob = new Blob([exportMarkdownBundle(cards)], { type: 'text/markdown;charset=utf-8' })
    await saveBlob(blob, `${documentName}.md`)
  }

  const handleExportPng = async () => {
    try {
      const blob = await exportCanvasPng(cards, groups, theme)
      await saveBlob(blob, `${documentName}.png`)
    } catch {
      window.alert('导出 PNG 失败')
    }
  }

  const handleExportHtml = async () => {
    const blob = new Blob([exportStaticHtml(cards, edges)], { type: 'text/html;charset=utf-8' })
    await saveBlob(blob, `${documentName}.html`)
  }

  const handleAddCard = () => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) {
      addCard()
      return
    }
    const cx = (rect.width / 2 - viewport.x) / viewport.zoom
    const cy = (rect.height / 2 - viewport.y) / viewport.zoom
    addCard({ x: cx - 190, y: cy - 240 })
  }

  const worldSize = useMemo(() => {
    const pad = 400
    let width = containerSize.width
    let height = containerSize.height
    for (const card of cards) {
      width = Math.max(width, card.position.x + card.size.width + pad)
      height = Math.max(height, card.position.y + card.size.height + pad)
    }
    for (const group of groups) {
      const bounds = computeTrayBounds(cards, group.cardIds)
      if (!bounds) continue
      width = Math.max(width, bounds.x + bounds.width + pad)
      height = Math.max(height, bounds.y + bounds.height + pad)
    }
    return { width, height }
  }, [cards, groups, containerSize.width, containerSize.height])

  const isBlankCanvasTarget = (target: HTMLElement) => {
    if (target.closest('.anchor-port')) return false
    if (target.closest('.context-menu')) return false
    if (target.closest('.anchor-menu')) return false
    if (target.closest('.card')) return false
    if (target.closest('.card-tray')) return false
    if (target.closest('.editor-toolbar')) return false
    if (target.closest('.status-bar')) return false
    if (target.closest('.sidebar-panel')) return false
    if (target.closest('.search-panel')) return false
    if (target.closest('.empty-canvas')) return false
    if (target.closest('.shortcuts-modal')) return false
    return true
  }

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (!isBlankCanvasTarget(target)) return
    setCanvasMenu(null)
    selectEdge(null)
    if (connectingFrom) cancelConnecting()
    if (e.button === 1 || spaceHeld) {
      startPan(e)
      return
    }
    if (e.button === 0) startMarquee(e)
  }

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (!isBlankCanvasTarget(target)) return
    e.preventDefault()
    setCanvasMenu({ x: e.clientX, y: e.clientY })
  }

  const handleCreateFromPreset = (presetId: string, clientX: number, clientY: number) => {
    const world = clientToWorld(clientX, clientY)
    const preset = getCardPreset(presetId)
    const width = preset?.size?.width ?? DEFAULT_CARD_SIZE.width
    const height = preset?.size?.height ?? DEFAULT_CARD_SIZE.height
    addCardFromPreset(presetId, {
      x: world.x - width / 2,
      y: world.y - height / 2,
    })
  }

  useCanvasShortcuts({
    onSave: handleSave,
    onOpen: handleOpenClick,
    containerRef,
  })

  useEffect(() => {
    if (isElectron()) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  return (
    <div
      ref={containerRef}
      className={[
        'canvas',
        spaceHeld ? 'canvas--pan-ready' : '',
        connectingFrom ? 'canvas--connecting' : '',
        isMarqueeActive ? 'canvas--marqueuing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onWheel={onWheel}
      onPointerDown={handleCanvasPointerDown}
      onContextMenu={handleCanvasContextMenu}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="canvas__file-input"
        accept=".json,application/json"
        onChange={handleOpenFile}
      />

      <EditorToolbar
        theme={theme}
        zoom={viewport.zoom}
        containerWidth={containerSize.width}
        containerHeight={containerSize.height}
        documentName={documentName}
        onAddCard={handleAddCard}
        onSave={handleSave}
        onOpen={handleOpenClick}
        onClearCanvas={handleClearCanvas}
        onToggleTheme={toggleTheme}
        onExportMarkdown={handleExportMarkdown}
        onExportPng={handleExportPng}
        onExportHtml={handleExportHtml}
      />

      <SidebarPanel />
      <SearchPanel />
      <StatusBar />

      {cards.length === 0 && (
        <EmptyCanvasGuide
          onAddBlank={handleAddCard}
          onAddPreset={(presetId) => {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) {
              addCardFromPreset(presetId)
              return
            }
            const cx = (rect.width / 2 - viewport.x) / viewport.zoom
            const cy = (rect.height / 2 - viewport.y) / viewport.zoom
            const preset = getCardPreset(presetId)
            const width = preset?.size?.width ?? DEFAULT_CARD_SIZE.width
            const height = preset?.size?.height ?? DEFAULT_CARD_SIZE.height
            addCardFromPreset(presetId, { x: cx - width / 2, y: cy - height / 2 })
          }}
        />
      )}

      <div
        className="canvas__world"
        style={{
          width: worldSize.width,
          height: worldSize.height,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
        onPointerDown={(e) => {
          if (e.button === 1 || spaceHeld) startPan(e)
        }}
      >
        <ConnectionLayer />
        {groups.map((group) => (
          <CardTray key={group.id} group={group} viewportZoom={viewport.zoom} />
        ))}
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
        {marquee && marquee.width + marquee.height > 0 && (
          <div
            className="canvas__marquee"
            style={{
              left: marquee.x,
              top: marquee.y,
              width: marquee.width,
              height: marquee.height,
            }}
          />
        )}
      </div>

      {canvasMenu && (
        <CanvasContextMenu
          x={canvasMenu.x}
          y={canvasMenu.y}
          selectedCount={selectedCardIds.length}
          onClose={() => setCanvasMenu(null)}
          onCreateFromPreset={(presetId) =>
            handleCreateFromPreset(presetId, canvasMenu.x, canvasMenu.y)
          }
          onCreateGroup={() => createGroupFromCards(selectedCardIds)}
        />
      )}

      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
    </div>
  )
}
