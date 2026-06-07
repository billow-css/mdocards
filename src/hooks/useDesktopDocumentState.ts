import { useEffect, useMemo } from 'react'
import { documentFingerprint, isDocumentDirty } from '../lib/documentHash'
import { setDocumentDirty } from '../lib/electronApi'
import { useEditorStore } from '../store/useEditorStore'

export function useDesktopDocumentState() {
  const cards = useEditorStore((s) => s.cards)
  const edges = useEditorStore((s) => s.edges)
  const groups = useEditorStore((s) => s.groups)
  const savedFingerprint = useEditorStore((s) => s.savedFingerprint)

  const isDirty = useMemo(
    () => isDocumentDirty(documentFingerprint({ cards, edges, groups }), savedFingerprint),
    [cards, edges, groups, savedFingerprint],
  )

  useEffect(() => {
    setDocumentDirty(isDirty)
    return () => setDocumentDirty(false)
  }, [isDirty])

  return isDirty
}
