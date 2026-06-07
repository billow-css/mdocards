import { useLayoutEffect, useMemo } from 'react'
import { emitPorts, registerPort, unregisterPort } from '../lib/portRegistry'
import { titlePortGrooveFromHue, type ThemeMode } from '../lib/theme'
import { useEditorStore } from '../store/useEditorStore'

interface AnchorPortProps {
  cardId: string
  anchorId: string
  kind: 'prev' | 'next'
  y: number
  cardX: number
  cardY: number
  cardWidth: number
  titleHue: number
  theme: ThemeMode
  /** 标题栏内嵌：嵌在标题左右；默认贴在卡片左右外缘 */
  placement?: 'card' | 'titlebar'
}

export function AnchorPort({
  cardId,
  anchorId,
  kind,
  y,
  cardX,
  cardY,
  cardWidth,
  titleHue,
  theme,
  placement = 'card',
}: AnchorPortProps) {
  const connectingFrom = useEditorStore((s) => s.connectingFrom)
  const startConnecting = useEditorStore((s) => s.startConnecting)
  const completeConnecting = useEditorStore((s) => s.completeConnecting)

  const groove = useMemo(() => titlePortGrooveFromHue(titleHue, theme), [theme, titleHue])

  const x = kind === 'prev' ? cardX : cardX + cardWidth
  const worldY = cardY + y

  useLayoutEffect(() => {
    registerPort({ cardId, anchorId, kind, x, y: worldY })
    emitPorts()
    return () => {
      unregisterPort(cardId, anchorId, kind)
      emitPorts()
    }
  }, [anchorId, cardId, kind, worldY, x])

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()

    const armed = useEditorStore.getState().connectingFrom

    if (kind === 'prev' && armed) {
      completeConnecting({
        cardId,
        anchorId,
        kind: 'prev',
        x,
        y: worldY,
      })
      return
    }

    if (kind === 'next' && !armed) {
      startConnecting({ cardId, anchorId, x, y: worldY })
    }
  }

  const isDropTarget = Boolean(connectingFrom && kind === 'prev')
  const inTitlebar = placement === 'titlebar'

  return (
    <button
      type="button"
      className={[
        'anchor-port',
        `anchor-port--${kind}`,
        inTitlebar ? 'anchor-port--titlebar' : '',
        isDropTarget ? 'anchor-port--drop-target' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        top: y,
        '--card-port-bg': groove.bg,
        '--card-port-edge': groove.edge,
        '--card-port-highlight': groove.highlight,
      } as React.CSSProperties}
      data-anchor-port={kind}
      data-card-id={cardId}
      data-anchor-id={anchorId}
      title={
        kind === 'prev'
          ? connectingFrom
            ? '点击完成连接'
            : 'prev 前驱端口'
          : 'next 后继端口（点击开始连接）'
      }
      onPointerDown={onPointerDown}
    />
  )
}
