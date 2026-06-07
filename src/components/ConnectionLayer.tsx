import { useEditorStore } from '../store/useEditorStore'
import { usePorts } from '../hooks/usePorts'

function curvePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.5
  const c1x = x1 + dx
  const c2x = x2 - dx
  return `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`
}

export function ConnectionLayer() {
  const edges = useEditorStore((s) => s.edges)
  const selectedEdgeId = useEditorStore((s) => s.selectedEdgeId)
  const selectEdge = useEditorStore((s) => s.selectEdge)
  const connectingFrom = useEditorStore((s) => s.connectingFrom)
  const pointer = useEditorStore((s) => s.connectPointer)
  const ports = usePorts()

  const onEdgePointerDown = (edgeId: string, event: React.PointerEvent<SVGPathElement>) => {
    event.stopPropagation()
    selectEdge(edgeId)
  }

  return (
    <svg className="connection-layer" aria-hidden="true">
      {edges.map((edge) => {
        const source = ports[`${edge.sourceCardId}:${edge.sourceAnchorId}:next`]
        const target = ports[`${edge.targetCardId}:${edge.targetAnchorId}:prev`]
        if (!source || !target) return null

        const d = curvePath(source.x, source.y, target.x, target.y)
        const isSelected = selectedEdgeId === edge.id

        return (
          <g key={edge.id} className={isSelected ? 'connection-layer__group--selected' : undefined}>
            <path
              d={d}
              className="connection-layer__edge-hit"
              onPointerDown={onEdgePointerDown.bind(null, edge.id)}
            />
            <path
              d={d}
              className={`connection-layer__edge ${isSelected ? 'connection-layer__edge--selected' : ''}`}
            />
          </g>
        )
      })}

      {connectingFrom && pointer && (
        <path
          d={curvePath(connectingFrom.x, connectingFrom.y, pointer.x, pointer.y)}
          className="connection-layer__edge connection-layer__edge--draft"
        />
      )}
    </svg>
  )
}

