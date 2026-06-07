import type { PortPosition } from '../types'

function portKey(cardId: string, anchorId: string, kind: 'prev' | 'next'): string {
  return `${cardId}:${anchorId}:${kind}`
}

type Listener = () => void

const ports = new Map<string, PortPosition>()
const listeners = new Set<Listener>()

/** 必须保持引用稳定，否则 useSyncExternalStore 会无限重渲染 */
let cachedSnapshot: Record<string, PortPosition> = {}

function rebuildSnapshot(): void {
  cachedSnapshot = Object.fromEntries(ports)
}

export function registerPort(port: PortPosition): void {
  ports.set(portKey(port.cardId, port.anchorId, port.kind), port)
}

export function unregisterPort(cardId: string, anchorId: string, kind: 'prev' | 'next'): void {
  ports.delete(portKey(cardId, anchorId, kind))
}

export function unregisterCardPorts(cardId: string): void {
  for (const key of ports.keys()) {
    if (key.startsWith(`${cardId}:`)) ports.delete(key)
  }
  emit()
}

export function clearAllPorts(): void {
  ports.clear()
  emit()
}

export function getPortSnapshot(): Record<string, PortPosition> {
  return cachedSnapshot
}

export function subscribePorts(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

let emitScheduled = false

export function emitPorts(): void {
  if (emitScheduled) return
  emitScheduled = true
  requestAnimationFrame(() => {
    emitScheduled = false
    emit()
  })
}

function emit(): void {
  rebuildSnapshot()
  listeners.forEach((listener) => listener())
}
