import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { APP_NAME } from '../src/lib/appInfo'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
const APP_ICON = path.join(
  process.env.APP_ROOT,
  'build',
  process.platform === 'darwin' ? 'icon.icns' : 'icon.ico',
)
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let mainWindow: BrowserWindow | null = null
let isQuitting = false
let documentDirty = false

function getWindow(): BrowserWindow {
  if (!mainWindow) throw new Error('Main window is not ready')
  return mainWindow
}

function confirmQuit(win: BrowserWindow) {
  void dialog
    .showMessageBox(win, {
      type: 'warning',
      title: APP_NAME,
      buttons: ['退出', '取消'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
      message: '未保存的更改',
      detail: '当前文档有未保存的修改，确定要退出吗？',
    })
    .then(({ response }) => {
      if (response !== 0 || !mainWindow) return
      isQuitting = true
      mainWindow.close()
    })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: APP_NAME,
    icon: APP_ICON,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(MAIN_DIST, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  mainWindow.webContents.on('will-prevent-unload', (event) => {
    if (isQuitting) event.preventDefault()
  })

  mainWindow.on('close', (event) => {
    if (isQuitting) return

    if (!documentDirty) {
      isQuitting = true
      return
    }

    event.preventDefault()
    confirmQuit(mainWindow!)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    isQuitting = false
    documentDirty = false
  })
}

function registerIpcHandlers() {
  ipcMain.on('app:set-document-dirty', (_event, dirty: unknown) => {
    documentDirty = Boolean(dirty)
  })

  ipcMain.handle('dialog:openDocument', async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      title: '打开文档',
      filters: [{ name: `${APP_NAME} 文档`, extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const content = await fs.readFile(filePath, 'utf-8')
    const fileName = path.basename(filePath, path.extname(filePath))
    return { content, filePath, fileName }
  })

  ipcMain.handle('dialog:saveDocument', async (_event, json: string, suggestedName: string) => {
    const result = await dialog.showSaveDialog(getWindow(), {
      title: '保存文档',
      defaultPath: suggestedName,
      filters: [{ name: `${APP_NAME} 文档`, extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return { saved: false as const }

    let filePath = result.filePath
    if (!filePath.toLowerCase().endsWith('.json')) {
      filePath = `${filePath}.json`
    }
    await fs.writeFile(filePath, json, 'utf-8')
    const fileName = path.basename(filePath, path.extname(filePath))
    return { saved: true as const, filePath, fileName }
  })

  ipcMain.handle(
    'dialog:exportFile',
    async (_event, payload: { data: ArrayBuffer; suggestedName: string }) => {
      const result = await dialog.showSaveDialog(getWindow(), {
        title: '导出',
        defaultPath: payload.suggestedName,
      })
      if (result.canceled || !result.filePath) return { saved: false as const }

      await fs.writeFile(result.filePath, Buffer.from(payload.data))
      return { saved: true as const, filePath: result.filePath }
    },
  )
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
