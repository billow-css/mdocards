import { contextBridge, ipcRenderer } from 'electron'

export type OpenDocumentResult = {
  content: string
  filePath: string
  fileName: string
}

export type SaveDocumentResult =
  | { saved: false }
  | { saved: true; filePath: string; fileName: string }

export type ExportFileResult = { saved: false } | { saved: true; filePath: string }

const desktopApi = {
  isDesktop: true as const,
  setDocumentDirty: (dirty: boolean) => {
    ipcRenderer.send('app:set-document-dirty', Boolean(dirty))
  },
  openDocument: (): Promise<OpenDocumentResult | null> => ipcRenderer.invoke('dialog:openDocument'),
  saveDocument: (json: string, suggestedName: string): Promise<SaveDocumentResult> =>
    ipcRenderer.invoke('dialog:saveDocument', json, suggestedName),
  exportFile: (data: ArrayBuffer, suggestedName: string): Promise<ExportFileResult> =>
    ipcRenderer.invoke('dialog:exportFile', { data, suggestedName }),
}

contextBridge.exposeInMainWorld('mdocards', desktopApi)
