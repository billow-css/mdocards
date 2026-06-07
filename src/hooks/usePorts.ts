import { useSyncExternalStore } from 'react'
import { getPortSnapshot, subscribePorts } from '../lib/portRegistry'

export function usePorts(): Record<string, import('../types').PortPosition> {
  return useSyncExternalStore(subscribePorts, getPortSnapshot, getPortSnapshot)
}
