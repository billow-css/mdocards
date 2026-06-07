import { useCallback, useEffect } from 'react'
import { useEditorStore } from '../store/useEditorStore'

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return (
    el?.tagName === 'TEXTAREA' ||
    el?.tagName === 'INPUT' ||
    el?.tagName === 'SELECT' ||
    !!el?.isContentEditable
  )
}

interface UseCanvasShortcutsOptions {
  onSave: () => void
  onOpen: () => void
  containerRef: React.RefObject<HTMLElement | null>
}

export function useCanvasShortcuts({ onSave, onOpen, containerRef }: UseCanvasShortcutsOptions) {
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const copySelectedCards = useEditorStore((s) => s.copySelectedCards)
  const pasteCards = useEditorStore((s) => s.pasteCards)
  const deleteSelected = useEditorStore((s) => s.deleteSelected)
  const selectCard = useEditorStore((s) => s.selectCard)
  const selectEdge = useEditorStore((s) => s.selectEdge)
  const cancelConnecting = useEditorStore((s) => s.cancelConnecting)
  const setSearchOpen = useEditorStore((s) => s.setSearchOpen)
  const toggleShortcuts = useEditorStore((s) => s.toggleShortcuts)
  const zoomIn = useEditorStore((s) => s.zoomIn)
  const zoomOut = useEditorStore((s) => s.zoomOut)
  const zoomReset = useEditorStore((s) => s.zoomReset)
  const zoomToFit = useEditorStore((s) => s.zoomToFit)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target)
      const mod = e.ctrlKey || e.metaKey

      if (e.key === '?' && !typing) {
        e.preventDefault()
        toggleShortcuts()
        return
      }

      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }

      if (mod && e.key.toLowerCase() === 'c' && !typing) {
        e.preventDefault()
        copySelectedCards()
        return
      }

      if (mod && e.key.toLowerCase() === 'v' && !typing) {
        e.preventDefault()
        pasteCards()
        return
      }

      if (mod && e.key.toLowerCase() === 'f' && !typing) {
        e.preventDefault()
        setSearchOpen(true)
        return
      }

      if (mod && e.key.toLowerCase() === 's' && !typing) {
        e.preventDefault()
        onSave()
        return
      }

      if (mod && e.key.toLowerCase() === 'o' && !typing) {
        e.preventDefault()
        onOpen()
        return
      }

      if (mod && (e.key === '=' || e.key === '+') && !typing) {
        e.preventDefault()
        zoomIn(containerRef.current?.clientWidth ?? 0, containerRef.current?.clientHeight ?? 0)
        return
      }

      if (mod && e.key === '-' && !typing) {
        e.preventDefault()
        zoomOut(containerRef.current?.clientWidth ?? 0, containerRef.current?.clientHeight ?? 0)
        return
      }

      if (mod && e.key === '0' && !typing) {
        e.preventDefault()
        zoomReset(containerRef.current?.clientWidth ?? 0, containerRef.current?.clientHeight ?? 0)
        return
      }

      if (mod && e.key === '1' && !typing) {
        e.preventDefault()
        zoomToFit(containerRef.current?.clientWidth ?? 0, containerRef.current?.clientHeight ?? 0)
        return
      }

      if (e.key === 'Escape') {
        const state = useEditorStore.getState()
        if (state.shortcutsOpen) {
          useEditorStore.getState().setShortcutsOpen(false)
          return
        }
        if (state.searchOpen) {
          setSearchOpen(false)
          return
        }
        if (state.connectingFrom) cancelConnecting()
        else if (state.selectedEdgeId) selectEdge(null)
        else selectCard(null)
        return
      }

      if ((e.code === 'Delete' || e.code === 'Backspace') && !typing) {
        deleteSelected()
      }
    },
    [
      cancelConnecting,
      containerRef,
      copySelectedCards,
      deleteSelected,
      onOpen,
      onSave,
      pasteCards,
      redo,
      selectCard,
      selectEdge,
      setSearchOpen,
      toggleShortcuts,
      undo,
      zoomIn,
      zoomOut,
      zoomReset,
      zoomToFit,
    ],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
