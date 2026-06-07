const STORAGE_KEY = 'md-card-editor-recent'
const MAX_RECENT = 8

export interface RecentFileEntry {
  name: string
  openedAt: number
}

export function loadRecentFiles(): RecentFileEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentFileEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function pushRecentFile(name: string): RecentFileEntry[] {
  const existing = loadRecentFiles().filter((item) => item.name !== name)
  const next = [{ name, openedAt: Date.now() }, ...existing].slice(0, MAX_RECENT)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}
