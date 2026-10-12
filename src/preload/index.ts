import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getLauncherInfo: () => ipcRenderer.invoke('launcher:get-info'),
  getAuthState: () => ipcRenderer.invoke('launcher:get-auth-state'),
  loginMicrosoft: () => ipcRenderer.invoke('launcher:login'),
  logout: () => ipcRenderer.invoke('launcher:logout'),
  getMinecraftVersions: () => ipcRenderer.invoke('launcher:get-versions'),
  setMinecraftVersion: (version: string) =>
    ipcRenderer.invoke('launcher:set-version', version),
  getMemory: () => ipcRenderer.invoke('settings:get-memory'),
  setMemory: (value: number) => ipcRenderer.invoke('settings:set-memory', value),
  getOdysseyPack: () => ipcRenderer.invoke('settings:get-pack'),
  setOdysseyPack: (enabled: boolean) => ipcRenderer.invoke('settings:set-pack', enabled),
  getInstalledVersions: () => ipcRenderer.invoke('storage:list-versions'),
  deleteInstalledVersions: () => ipcRenderer.invoke('storage:delete-versions'),
  clearCache: () => ipcRenderer.invoke('storage:clear-cache'),
  getLoaderVersions: (loader: string, mcVersion: string) =>
    ipcRenderer.invoke('launcher:get-loader-versions', loader, mcVersion),
  setLoader: (loader: string, version: string) =>
    ipcRenderer.invoke('launcher:set-loader', loader, version),
  launchGame: (profile: 'microsoft' | 'local') =>
    ipcRenderer.invoke('launcher:launch', profile),
  getLocalProfile: () => ipcRenderer.invoke('profile:get-local'),
  saveLocalProfile: (username: string) =>
    ipcRenderer.invoke('profile:save-local', username),
  getUpdaterState: () => ipcRenderer.invoke('updater:get-state'),
  getAppVersion: () => ipcRenderer.invoke('updater:get-version'),
  checkUpdate: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdaterState: (callback: (data: any) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('updater:state', listener)
    return () => ipcRenderer.removeListener('updater:state', listener)
  },
  onLauncherProgress: (callback: (data: any) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('launcher:progress', listener)
    return () => ipcRenderer.removeListener('launcher:progress', listener)
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}