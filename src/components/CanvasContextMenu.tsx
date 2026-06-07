import { ContextMenu, ContextMenuDivider, ContextMenuItem, ContextMenuSubmenu } from './ContextMenu'
import { PresetMenuItems } from './PresetMenuItems'

interface CanvasContextMenuProps {
  x: number
  y: number
  selectedCount: number
  onClose: () => void
  onCreateFromPreset: (presetId: string) => void
  onCreateGroup: () => void
}

export function CanvasContextMenu({
  x,
  y,
  selectedCount,
  onClose,
  onCreateFromPreset,
  onCreateGroup,
}: CanvasContextMenuProps) {
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
    </ContextMenu>
  )
}
