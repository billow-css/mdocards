export function isElectron(): boolean {
  return typeof window !== 'undefined' && window.mdocards?.isDesktop === true
}

export function setDocumentDirty(dirty: boolean) {
  window.mdocards?.setDocumentDirty(dirty)
}

export async function openDocumentWithDialog() {
  if (!window.mdocards) return null
  return window.mdocards.openDocument()
}

export async function saveDocumentWithDialog(json: string, suggestedName: string) {
  if (!window.mdocards) return { saved: false as const }
  return window.mdocards.saveDocument(json, suggestedName)
}

export async function exportFileWithDialog(blob: Blob, suggestedName: string) {
  if (!window.mdocards) return { saved: false as const }
  const data = await blob.arrayBuffer()
  return window.mdocards.exportFile(data, suggestedName)
}
