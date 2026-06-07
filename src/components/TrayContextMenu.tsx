import { ContextMenu, ContextMenuItem } from './ContextMenu'

interface TrayContextMenuProps {
  x: number
  y: number
  groupTitle: string
  onClose: () => void
  onDissolve: () => void
}

export function TrayContextMenu({ x, y, groupTitle, onClose, onDissolve }: TrayContextMenuProps) {
  return (
    <ContextMenu x={x} y={y} onClose={onClose}>
      <ContextMenuItem
        label="解散组合"
        hint={groupTitle}
        onClick={() => {
          onDissolve()
          onClose()
        }}
      />
    </ContextMenu>
  )
}
