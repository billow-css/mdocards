import type { Card } from '../types'
import { ContextMenu, ContextMenuDivider, ContextMenuItem, ContextMenuSubmenu } from './ContextMenu'
import { PresetMenuItems } from './PresetMenuItems'

interface CardContextMenuProps {
  x: number
  y: number
  card: Card
  selectedCount: number
  onClose: () => void
  onCreateFromPreset: (presetId: string) => void
  onApplyPreset: (presetId: string) => void
  onCreateGroup: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function CardContextMenu({
  x,
  y,
  card,
  selectedCount,
  onClose,
  onCreateFromPreset,
  onApplyPreset,
  onCreateGroup,
  onDuplicate,
  onDelete,
}: CardContextMenuProps) {
  return (
    <ContextMenu x={x} y={y} onClose={onClose}>
      <ContextMenuSubmenu label="新建卡片">
        <PresetMenuItems
          onSelect={(presetId) => {
            onCreateFromPreset(presetId)
            onClose()
          }}
        />
      </ContextMenuSubmenu>
      <ContextMenuDivider />
      <ContextMenuSubmenu label="应用模板">
        <PresetMenuItems
          onSelect={(presetId) => {
            onApplyPreset(presetId)
            onClose()
          }}
        />
      </ContextMenuSubmenu>
      <ContextMenuItem
        label="复制卡片"
        hint={card.title || '无标题'}
        onClick={() => {
          onDuplicate()
          onClose()
        }}
      />
      {selectedCount >= 2 && (
        <>
          <ContextMenuDivider />
          <ContextMenuItem
            label="新建组合"
            hint={`${selectedCount} 张卡片`}
            onClick={() => {
              onCreateGroup()
              onClose()
            }}
          />
        </>
      )}
      <ContextMenuDivider />
      <ContextMenuItem
        label="删除卡片"
        danger
        onClick={() => {
          onDelete()
          onClose()
        }}
      />
    </ContextMenu>
  )
}
