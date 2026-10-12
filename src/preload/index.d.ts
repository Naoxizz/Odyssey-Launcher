import { ElectronAPI } from '@electron-toolkit/preload'

interface LauncherInfo {
  name: string
  version: string
  platform: string
}

interface AuthState {
  connected: boolean
  username: string
}

interface LoginResult {
  success: boolean
  username?: string
  error?: string
}

interface ActionResult {
  success: boolean
  error?: string
}

interface MemoryInfo {
  totalMb: number
  minMb: number
  maxMb: number
  lowMb: number
  recommendedMb: number
  limitMb: number
  memoryMb: number
}

interface InstalledVersion {
  id: string
  sizeMb: number
}

interface LauncherProgress {
  status: string
  progress?: number
  username?: string
  error?: boolean
}

interface UpdaterState {
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'none' | 'error'
  version?: string
  percent?: number
  message?: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getLauncherInfo: () => Promise<LauncherInfo>
      getAuthState: () => Promise<AuthState>
      loginMicrosoft: () => Promise<LoginResult>
      logout: () => Promise<ActionResult>
      getMinecraftVersions: () => Promise<string[]>
      setMinecraftVersion: (version: string) => Promise<ActionResult & { version: string }>
      getMemory: () => Promise<MemoryInfo>
      setMemory: (value: number) => Promise<ActionResult & { memoryMb: number }>
      getOdysseyPack: () => Promise<boolean>
      setOdysseyPack: (enabled: boolean) => Promise<ActionResult>
      getInstalledVersions: () => Promise<InstalledVersion[]>
      deleteInstalledVersions: () => Promise<ActionResult>
      clearCache: () => Promise<ActionResult>
      getLoaderVersions: (loader: string, mcVersion: string) => Promise<string[]>
      setLoader: (loader: string, version: string) => Promise<ActionResult>
      launchGame: (profile: 'microsoft' | 'local') => Promise<ActionResult>
      getLocalProfile: () => Promise<{ username: string }>
      saveLocalProfile: (username: string) => Promise<ActionResult & { username: string }>
      getUpdaterState: () => Promise<UpdaterState>
      getAppVersion: () => Promise<string>
      checkUpdate: () => Promise<boolean>
      installUpdate: () => Promise<void>
      onUpdaterState: (callback: (data: UpdaterState) => void) => () => void
      onLauncherProgress: (callback: (data: LauncherProgress) => void) => () => void
    }
  }
}