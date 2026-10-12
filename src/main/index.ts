import { app, shell, BrowserWindow, ipcMain, safeStorage } from 'electron'
import { join } from 'node:path'
const iconPath = app.isPackaged
  ? join(process.resourcesPath, 'icon.ico')
  : join(app.getAppPath(), 'resources', 'icon.ico')
import { readFile, writeFile, unlink, readdir, rm, stat } from 'node:fs/promises'
import { totalmem, homedir } from 'node:os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupUpdater } from './updater'
import { Launcher, MicrosoftAuth, CrackAuth } from 'eml-lib'
//import { applyOdysseyPack } from './odysseyPack'

type Account = Awaited<ReturnType<MicrosoftAuth['auth']>>
type Profile = { username: string }
type ProfileType = 'microsoft' | 'local'
type LoaderType = 'vanilla' | 'fabric' | 'quilt' | 'forge' | 'neoforge'

const LOADERS: LoaderType[] = ['vanilla', 'fabric', 'quilt', 'forge', 'neoforge']
const USERNAME_REGEX = /^[A-Za-z0-9_]{3,16}$/
const MC_VERSION_REGEX = /^\d+\.\d+(?:\.\d+)?$/
const LOADER_VERSION_REGEX = /^[A-Za-z0-9._+-]{1,64}$/

let mainWindow: BrowserWindow | null = null
let account: Account | null = null
let selectedVersion = 'latest_release'
let selectedLoader: LoaderType = 'vanilla'
let selectedLoaderVersion = ''
let memoryMb = 4096
let odysseyPack = true
let launching = false

const GAME_ID = 'odyssey'

const accountFile = () => join(app.getPath('userData'), 'account.dat')
const profileFile = () => join(app.getPath('userData'), 'local-profile.json')
const settingsFile = () => join(app.getPath('userData'), 'settings.json')

function gameRoot() {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA ?? app.getPath('appData'), `.${GAME_ID}`)
  }

  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', GAME_ID)
  }

  return join(homedir(), `.${GAME_ID}`)
}

function memoryLimits() {
  const totalMb = Math.floor(totalmem() / 1048576)
  const minMb = 1024
  const maxMb = Math.max(minMb, Math.floor((totalMb - 512) / 256) * 256)
  const recommendedMb = Math.max(minMb, Math.min(8192, Math.floor((totalMb * 0.5) / 256) * 256))
  const limitMb = Math.max(recommendedMb, Math.floor((totalMb * 0.75) / 256) * 256)
  const lowMb = Math.min(2048, recommendedMb)

  return { totalMb, minMb, maxMb, lowMb, recommendedMb, limitMb }
}

async function loadMemorySetting(): Promise<number> {
  const limits = memoryLimits()
  const fallback = Math.min(4096, limits.recommendedMb)

  try {
    const parsed = JSON.parse(await readFile(settingsFile(), 'utf8'))
    const value = parsed?.memoryMb

    if (Number.isInteger(value) && value >= limits.minMb && value <= limits.maxMb) {
      return value
    }
  } catch {
  }

  return fallback
}

async function loadPackSetting(): Promise<boolean> {
  try {
    const parsed = JSON.parse(await readFile(settingsFile(), 'utf8'))
    return parsed?.odysseyPack !== false
  } catch {
    return true
  }
}

async function persistSettings() {
  await writeFile(settingsFile(), JSON.stringify({ memoryMb, odysseyPack }), 'utf8')
}

async function dirSize(dir: string): Promise<number> {
  let total = 0

  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    total += entry.isDirectory() ? await dirSize(full) : (await stat(full)).size
  }

  return total
}

async function listInstalledVersions() {
  const dir = join(gameRoot(), 'versions')
  let entries

  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }

  const result: { id: string; sizeMb: number }[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    result.push({ id: entry.name, sizeMb: Math.round((await dirSize(join(dir, entry.name))) / 1048576) })
  }

  return result.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }))
}

async function removeFolders(names: string[]) {
  for (const name of names) {
    await rm(join(gameRoot(), name), { recursive: true, force: true })
  }
}

function report(data: Record<string, unknown>) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('launcher:progress', data)
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return 'Erreur inconnue'
  }
}

async function saveAccount(value: Account) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Le stockage sécurisé est indisponible.')
  }

  const encrypted = safeStorage.encryptString(JSON.stringify(value))
  await writeFile(accountFile(), encrypted)
}

async function restoreAccount() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return

    const encrypted = await readFile(accountFile())
    const parsed: unknown = JSON.parse(safeStorage.decryptString(encrypted))

    if (!parsed || typeof parsed !== 'object') return

    account = parsed as Account
  } catch {
    account = null
  }
}

async function removeAccount() {
  account = null

  try {
    await unlink(accountFile())
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}

async function readLocalProfile(): Promise<Profile> {
  try {
    const parsed = JSON.parse(await readFile(profileFile(), 'utf8'))
    return {
      username: typeof parsed.username === 'string' ? parsed.username : ''
    }
  } catch {
    return { username: '' }
  }
}

async function fetchOptional(url: string): Promise<string | null> {
  const response = await fetch(url)

  if (response.status === 400 || response.status === 404) return null

  if (!response.ok) {
    throw new Error(`${new URL(url).host} a répondu avec le code HTTP ${response.status}.`)
  }

  return response.text()
}

function compareVersions(a: string, b: string): number {
  const parse = (value: string) => ({
    numbers: value.split('-')[0].split('.').map((part) => parseInt(part, 10) || 0),
    pre: value.includes('-')
  })

  const x = parse(a)
  const y = parse(b)

  for (let i = 0; i < Math.max(x.numbers.length, y.numbers.length); i++) {
    const diff = (x.numbers[i] ?? 0) - (y.numbers[i] ?? 0)
    if (diff !== 0) return diff
  }

  return Number(y.pre) - Number(x.pre)
}

async function listLoaderVersions(loader: LoaderType, mcVersion: string): Promise<string[]> {
  if (loader === 'fabric' || loader === 'quilt') {
    const base = loader === 'fabric' ? 'https://meta.fabricmc.net/v2' : 'https://meta.quiltmc.org/v3'
    const text = await fetchOptional(`${base}/versions/loader/${encodeURIComponent(mcVersion)}`)
    if (!text) return []

    const list = JSON.parse(text) as { loader: { version: string } }[]
    return list.map((entry) => entry.loader.version)
  }

  if (loader === 'forge') {
    const text = await fetchOptional(
      'https://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions_slim.json'
    )
    if (!text) return []

    const { promos } = JSON.parse(text) as { promos: Record<string, string> }
    const versions = new Set<string>()

    for (const [key, build] of Object.entries(promos)) {
      if (key.startsWith(`${mcVersion}-`)) versions.add(`${mcVersion}-${build}`)
    }

    const start = mcVersion.length + 1

    return [...versions].sort((a, b) => compareVersions(b.slice(start), a.slice(start)))
  }

  if (loader === 'neoforge') {
    const text = await fetchOptional(
      'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml'
    )
    if (!text) return []

    const all = [...text.matchAll(/<version>([^<]+)<\/version>/g)].map((match) => match[1])
    const parts = mcVersion.split('.')
    const prefix =
      parts[0] === '1'
        ? `${parts[1]}.${parts[2] ?? '0'}.`
        : `${parts[0]}.${parts[1]}.${parts[2] ?? '0'}.`

    return all
      .filter((version) => version.startsWith(prefix) && !version.includes('alpha'))
      .sort((a, b) => compareVersions(b, a))
  }

  return []
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 760,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.odyssey.launcher')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  createWindow()
  setupUpdater(() => mainWindow)
  await restoreAccount()
  memoryMb = await loadMemorySetting()
  odysseyPack = await loadPackSetting()

  ipcMain.handle('settings:get-memory', () => ({ ...memoryLimits(), memoryMb }))

  ipcMain.handle('settings:set-memory', async (_event, value: unknown) => {
    const limits = memoryLimits()

    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < limits.minMb ||
      value > limits.maxMb
    ) {
      throw new Error('Valeur de mémoire invalide.')
    }

    memoryMb = value
    await persistSettings()
    return { success: true, memoryMb }
  })

  ipcMain.handle('settings:get-pack', () => odysseyPack)

  ipcMain.handle('settings:set-pack', async (_event, value: unknown) => {
    if (typeof value !== 'boolean') {
      throw new Error('Valeur invalide.')
    }

    odysseyPack = value
    await persistSettings()
    return { success: true }
  })

  ipcMain.handle('storage:list-versions', () => listInstalledVersions())

  ipcMain.handle('storage:delete-versions', async () => {
    if (launching) return { success: false, error: 'Un lancement est en cours.' }

    try {
      await removeFolders(['versions', 'bin'])
      return { success: true }
    } catch (error) {
      return { success: false, error: errorMessage(error) }
    }
  })

  ipcMain.handle('storage:clear-cache', async () => {
    if (launching) return { success: false, error: 'Un lancement est en cours.' }

    try {
      await removeFolders(['libraries', 'assets', 'bin'])
      return { success: true }
    } catch (error) {
      return { success: false, error: errorMessage(error) }
    }
  })

  ipcMain.handle('launcher:get-info', () => ({
    name: 'Odyssey Launcher',
    version: app.getVersion(),
    platform: process.platform
  }))

  ipcMain.handle('launcher:get-auth-state', () => ({
    connected: Boolean(account),
    username: typeof account?.name === 'string' ? account.name : ''
  }))

  ipcMain.handle('launcher:login', async () => {
    if (!mainWindow) {
      return { success: false, error: 'Fenêtre du launcher indisponible.' }
    }

    try {
      report({ status: 'Connexion Microsoft...' })

      const auth = new MicrosoftAuth(mainWindow)
      const authenticatedAccount = await auth.auth()

      await saveAccount(authenticatedAccount)
      account = authenticatedAccount

      const username = typeof account.name === 'string' ? account.name : 'Compte Microsoft'
      report({ status: 'Connexion réussie', username })

      return { success: true, username }
    } catch (error) {
      const message = errorMessage(error)
      report({ status: message, error: true })
      return { success: false, error: message }
    }
  })

  ipcMain.handle('launcher:logout', async () => {
    await removeAccount()
    report({ status: 'Déconnecté' })
    return { success: true }
  })

  ipcMain.handle('launcher:get-versions', async () => {
    const response = await fetch(
      'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
    )

    if (!response.ok) {
      throw new Error(`Mojang a répondu avec le code HTTP ${response.status}.`)
    }

    const manifest = (await response.json()) as {
      versions: { id: string; type: string }[]
    }

    return manifest.versions
      .filter((version) => version.type === 'release')
      .map((version) => version.id)
  })

  ipcMain.handle('launcher:set-version', (_event, value: unknown) => {
    if (
      typeof value !== 'string' ||
      (value !== 'latest_release' && !MC_VERSION_REGEX.test(value))
    ) {
      throw new Error('Version Minecraft invalide.')
    }

    selectedVersion = value
    return { success: true, version: value }
  })

  ipcMain.handle('launcher:get-loader-versions', async (_event, loader: unknown, mcVersion: unknown) => {
    if (
      typeof loader !== 'string' ||
      !LOADERS.includes(loader as LoaderType) ||
      typeof mcVersion !== 'string' ||
      !MC_VERSION_REGEX.test(mcVersion)
    ) {
      throw new Error('Paramètres du loader invalides.')
    }

    return listLoaderVersions(loader as LoaderType, mcVersion)
  })

  ipcMain.handle('launcher:set-loader', (_event, loader: unknown, version: unknown) => {
    if (typeof loader !== 'string' || !LOADERS.includes(loader as LoaderType)) {
      throw new Error('Loader invalide.')
    }

    if (loader === 'vanilla') {
      selectedLoader = 'vanilla'
      selectedLoaderVersion = ''
      return { success: true }
    }

    if (typeof version !== 'string' || !LOADER_VERSION_REGEX.test(version)) {
      throw new Error('Version du loader invalide.')
    }

    selectedLoader = loader as LoaderType
    selectedLoaderVersion = version
    return { success: true }
  })

  ipcMain.handle('profile:get-local', async (): Promise<Profile> => readLocalProfile())

  ipcMain.handle('profile:save-local', async (_event, value: unknown) => {
    if (typeof value !== 'string') {
      throw new Error('Pseudo invalide.')
    }

    const username = value.trim()

    if (!USERNAME_REGEX.test(username)) {
      throw new Error('Le pseudo doit contenir 3 à 16 lettres, chiffres ou underscores.')
    }

    await writeFile(profileFile(), JSON.stringify({ username }), 'utf8')
    return { success: true, username }
  })

  ipcMain.handle('launcher:launch', async (_event, profileType: unknown) => {
    if (profileType !== 'microsoft' && profileType !== 'local') {
      return { success: false, error: 'Type de profil invalide.' }
    }

    if (launching) {
      return { success: false, error: 'Un lancement est déjà en cours.' }
    }

    if (
      selectedLoader !== 'vanilla' &&
      (!MC_VERSION_REGEX.test(selectedVersion) || !selectedLoaderVersion)
    ) {
      return {
        success: false,
        error: 'Choisis une version Minecraft précise et une version du loader.'
      }
    }

    if (!mainWindow) {
      return { success: false, error: 'Fenêtre du launcher indisponible.' }
    }

    launching = true

    try {
      let launchAccount: Account

      if ((profileType as ProfileType) === 'local') {
        const { username } = await readLocalProfile()

        if (!USERNAME_REGEX.test(username)) {
          return {
            success: false,
            error: 'Enregistre un pseudo local valide avant de jouer.'
          }
        }

        launchAccount = new CrackAuth().auth(username) as Account
      } else {
        if (!account) {
          return {
            success: false,
            error: 'Connecte-toi avec Microsoft pour lancer Minecraft.'
          }
        }

        const auth = new MicrosoftAuth(mainWindow)
        const valid = await auth.validate(account)

        if (!valid) {
          account = await auth.refresh(account)
          await saveAccount(account)
        }

        launchAccount = account
      }

      const game = new Launcher({
        root: GAME_ID,
        account: launchAccount,
        minecraft:
          selectedLoader === 'vanilla'
            ? { version: selectedVersion }
            : {
                version: selectedVersion,
                loader: { loader: selectedLoader, version: selectedLoaderVersion }
              },
        java: {
          install: 'auto'
        },
        storage: 'isolated',
        cleaning: {
          enabled: true,
          ignored: [
            'saves/',
            'options.txt',
            'servers.dat',
            'usercache.json',
            'resourcepacks/',
            'shaderpacks/',
            'screenshots/',
            'mods/',
            'config/',
            'logs/',
            'crash-reports/'
          ]
        },
        memory: {
          min: 1024,
          max: memoryMb
        }
      })

      game.on('launch_compute_download', () => {
        report({ status: 'Préparation des fichiers...' })
      })

      game.on('launch_download', (data) => {
        const total = data?.total?.amount ?? 0

        report({
          status: total > 0
            ? `Téléchargement de Minecraft (${total} fichiers)...`
            : 'Téléchargement de Minecraft...'
        })
      })

      game.on('launch_data', (message: string) => {
        console.log('[Minecraft]', message)
        report({ status: String(message).trim().slice(-300) })
      })

      game.on('launch_debug', (message: string) => {
        console.log('[EML]', message)
      })

      game.on('java_info', (info) => {
        report({ status: `Java ${info.version} — ${info.arch}` })
      })

      game.on('download_progress', (data) => {
        const total = data.total?.amount ?? 0
        const downloaded = data.downloaded?.amount ?? 0

        report({
          status: 'Téléchargement des fichiers...',
          progress: total > 0 ? Math.round((downloaded / total) * 100) : 0
        })
      })

      game.on('launch_check_java', () => report({ status: 'Vérification de Java...' }))
      game.on('launch_install_loader', () => report({ status: 'Installation du moteur...' }))

      game.on('launch_launch', () => {
        report({
          status: `Minecraft ${selectedVersion} démarre...`,
          progress: 100
        })
      })

      game.on('launch_crash', (data) => {
        report({
          status: `Minecraft s'est arrêté avec le code ${data?.exitCode ?? 'inconnu'}.`,
          error: true
        })
      })

      game.on('launch_close', (code) => {
        report({ status: `Minecraft fermé (code ${code}).` })
      })

      game.on('download_error', (data) => {
        report({
          status: `Téléchargement impossible : ${data?.filename ?? 'fichier inconnu'} — ${data?.message ?? 'erreur inconnue'}`,
          error: true
        })
      })

      report({ status: `Lancement de Minecraft ${selectedVersion}...` })
      await game.launch()

      return { success: true }
    } catch (error) {
      const message = errorMessage(error)
      report({ status: `Erreur de lancement : ${message}`, error: true })
      return { success: false, error: message }
    } finally {
      launching = false
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})