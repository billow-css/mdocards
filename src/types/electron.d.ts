export type OpenDocumentResult = {
  content: string
  filePath: string
  fileName: string
}

export type SaveDocumentResult =
  | { saved: false }
  | { saved: true; filePath: string; fileName: string }

export type ExportFileResult = { saved: false } | { saved: true; filePath: string }

export type MDoCardsDesktopApi = {
  isDesktop: true
  setDocumentDirty: (dirty: boolean) => void
  openDocument: () => Promise<OpenDocumentResult | null>
  saveDocument: (json: string, suggestedName: string) => Promise<SaveDocumentResult>
  exportFile: (data: ArrayBuffer, suggestedName: string) => Promise<ExportFileResult>
}

declare global {
  interface Window {
    mdocards?: MDoCardsDesktopApi
  }
}

export {}
