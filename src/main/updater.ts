import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'

export type UpdaterState = {
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'none' | 'error'
  version?: string
  percent?: number
  message?: string
}

const CHECK_EVERY_MS = 30 * 60 * 1000

let current: UpdaterState = { state: 'idle' }
let getWindow: () => BrowserWindow | null = () => null
let initialized = false

function emit(next: UpdaterState) {
  current = next
  getWindow()?.webContents.send('updater:state', next)
}

function check() {
  if (!app.isPackaged) {
    emit({ state: 'error', message: 'dev' })
    return Promise.resolve(false)
  }

  if (current.state === 'downloading' || current.state === 'ready') return Promise.resolve(true)

  return autoUpdater
    .checkForUpdates()
    .then(() => true)
    .catch(() => false)
}

export function setupUpdater(windowGetter: () => BrowserWindow | null) {
  getWindow = windowGetter
  if (initialized) return
  initialized = true

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => emit({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => emit({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => emit({ state: 'none' }))
  autoUpdater.on('download-progress', (progress) =>
    emit({ state: 'downloading', percent: Math.round(progress.percent), version: current.version })
  )
  autoUpdater.on('update-downloaded', (info) => emit({ state: 'ready', version: info.version }))
  autoUpdater.on('error', (error) => emit({ state: 'error', message: error.message }))

  ipcMain.handle('updater:get-state', () => current)
  ipcMain.handle('updater:get-version', () => app.getVersion())
  ipcMain.handle('updater:check', () => check())
  ipcMain.handle('updater:install', () => {
    if (current.state === 'ready') autoUpdater.quitAndInstall(true, true)
  })

  if (!app.isPackaged) return

  setTimeout(() => void check(), 3000)
  setInterval(() => void check(), CHECK_EVERY_MS)
}