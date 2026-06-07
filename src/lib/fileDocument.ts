import { APP_NAME } from './appInfo'
import { isElectron, saveDocumentWithDialog } from './electronApi'

const DEFAULT_FILENAME = 'mdocards.json'

export type SaveDocumentResult =
  | { saved: false }
  | { saved: true; fileName?: string }

export async function saveDocumentToFile(
  json: string,
  suggestedName = DEFAULT_FILENAME,
): Promise<SaveDocumentResult> {
  if (isElectron()) {
    return saveDocumentWithDialog(json, suggestedName)
  }

  const blob = new Blob([json], { type: 'application/json' })

  const picker = (window as Window & {
    showSaveFilePicker?: (options: unknown) => Promise<FileSystemFileHandle>
  }).showSaveFilePicker

  if (picker) {
    try {
      const handle = await picker({
        suggestedName,
        types: [
          {
            description: `${APP_NAME} 文档`,
            accept: { 'application/json': ['.json'] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return { saved: true, fileName: suggestedName.replace(/\.json$/i, '') }
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return { saved: false }
    }
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = suggestedName
  anchor.click()
  URL.revokeObjectURL(url)
  return { saved: true, fileName: suggestedName.replace(/\.json$/i, '') }
}

export function readDocumentFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('无法读取文件'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('无法读取文件'))
    reader.readAsText(file)
  })
}
