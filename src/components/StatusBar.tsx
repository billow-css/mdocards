import { useMemo } from 'react'
import { documentFingerprint, isDocumentDirty } from '../lib/documentHash'
import { useEditorStore } from '../store/useEditorStore'
import './StatusBar.css'

export function StatusBar() {
  const documentName = useEditorStore((s) => s.documentName)
  const savedFingerprint = useEditorStore((s) => s.savedFingerprint)
  const cards = useEditorStore((s) => s.cards)
  const edges = useEditorStore((s) => s.edges)
  const groups = useEditorStore((s) => s.groups)
  const isDirty = useMemo(
    () => isDocumentDirty(documentFingerprint({ cards, edges, groups }), savedFingerprint),
    [cards, edges, groups, savedFingerprint],
  )
  const selectedCardIds = useEditorStore((s) => s.selectedCardIds)
  const viewport = useEditorStore((s) => s.viewport)
  return (
    <footer className="status-bar">
      <div className="status-bar__section">
        <span className="status-bar__doc" title={documentName}>
          {documentName}
        </span>
        <span className={`status-bar__pill ${isDirty ? 'status-bar__pill--dirty' : 'status-bar__pill--saved'}`}>
          {isDirty ? '未保存' : '已保存'}
        </span>
      </div>
      <div className="status-bar__section status-bar__metrics">
        <span>{cards.length} 卡片</span>
        <span>{edges.length} 连线</span>
        <span>{groups.length} 组合</span>
        <span>{selectedCardIds.length} 选中</span>
        <span>{Math.round(viewport.zoom * 100)}%</span>
      </div>
    </footer>
  )
}
