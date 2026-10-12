import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import '@fontsource-variable/big-shoulders-display'
import '@fontsource-variable/manrope'
import '@fontsource-variable/jetbrains-mono'
import Logo from './components/Logo'
import { IconBiomes, IconPlay, IconProfil, IconReglages, Racine } from './components/icons'
import { THEMES, applyTheme, loadTheme, type ThemeId } from './lib/themes'
import { LANGUAGES, loadLang, makeT, saveLang, type LangId, type TFn, type TKey } from './i18n'

type ProfileType = 'microsoft' | 'local'
type LoaderType = 'vanilla' | 'fabric' | 'quilt' | 'forge' | 'neoforge'
type StorageAction = 'versions' | 'cache'
type View = 'jouer' | 'profil' | 'reglages' | 'biomes'

type MemoryInfo = {
  totalMb: number
  minMb: number
  maxMb: number
  lowMb: number
  recommendedMb: number
  limitMb: number
  memoryMb: number
}

type InstalledVersion = { id: string; sizeMb: number }
type UpdaterState = Awaited<ReturnType<typeof window.api.getUpdaterState>>

const LOADERS: LoaderType[] = ['vanilla', 'fabric', 'quilt', 'forge', 'neoforge']

// Texte envoyé tel quel par le processus principal (src/main) : sert à détecter la déconnexion
const MAIN_LOGGED_OUT = 'Déconnecté'

const NAV: { id: View; key: TKey; icon: ReactNode }[] = [
  { id: 'jouer', key: 'nav.play', icon: <IconPlay /> },
  { id: 'profil', key: 'nav.profile', icon: <IconProfil /> },
  { id: 'reglages', key: 'nav.settings', icon: <IconReglages /> },
  { id: 'biomes', key: 'nav.biomes', icon: <IconBiomes /> }
]

const ZONES: { key: TKey; color: string }[] = [
  { key: 'zone.low', color: 'var(--muted)' },
  { key: 'zone.recommended', color: 'var(--accent)' },
  { key: 'zone.limit', color: 'var(--warm)' },
  { key: 'zone.high', color: 'var(--danger)' }
]

function formatGb(mb: number, t: TFn) {
  const gb = mb / 1024
  const value = Number.isInteger(gb) ? String(gb) : gb.toFixed(1).replace('.', t('meta.decimal'))
  return t('unit.gb', { value })
}

function formatMo(mb: number, t: TFn) {
  return t('unit.mb', { value: mb.toLocaleString(t('meta.locale')) })
}

function zoneIndex(value: number, memory: MemoryInfo) {
  if (value < memory.lowMb) return 0
  if (value <= memory.recommendedMb) return 1
  if (value <= memory.limitMb) return 2
  return 3
}

export default function App() {
  const [view, setView] = useState<View>('jouer')
  const [lang, setLang] = useState<LangId>(loadLang)
  const t = useMemo(() => makeT(lang), [lang])
  const tRef = useRef(t)
  tRef.current = t
  const [theme, setTheme] = useState<ThemeId>(loadTheme)
  const [profileType, setProfileType] = useState<ProfileType>('microsoft')
  const [microsoftName, setMicrosoftName] = useState('')
  const [localName, setLocalName] = useState('')
  const [versions, setVersions] = useState<string[]>([])
  const [version, setVersion] = useState('latest_release')
  const [versionsLoading, setVersionsLoading] = useState(true)
  const [loader, setLoader] = useState<LoaderType>('vanilla')
  const [loaderVersions, setLoaderVersions] = useState<string[]>([])
  const [loaderVersion, setLoaderVersion] = useState('')
  const [loaderLoading, setLoaderLoading] = useState(false)
  const [memory, setMemory] = useState<MemoryInfo | null>(null)
  const [memoryMb, setMemoryMb] = useState(0)
  const savedMemory = useRef(0)
  const [packEnabled, setPackEnabled] = useState(true)
  const [installed, setInstalled] = useState<InstalledVersion[] | null>(null)
  const [confirm, setConfirm] = useState<StorageAction | null>(null)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string | null>(null)
  const [storageDone, setStorageDone] = useState(false)
  const [update, setUpdate] = useState<UpdaterState>({ state: 'idle' })
  const [appVersion, setAppVersion] = useState('')
  const [error, setError] = useState(false)
  const [connected, setConnected] = useState(false)

  const statusText = status ?? t('status.ready')
  const effectiveVersion = version === 'latest_release' ? (versions[0] ?? '') : version

  useEffect(() => {
    const unsubscribe = window.api.onLauncherProgress((data) => {
      setStatus(data.status)
      setError(Boolean(data.error))

      if (typeof data.progress === 'number') {
        setProgress(data.progress)
      }

      if (data.username) {
        setMicrosoftName(data.username)
        setConnected(true)
      }

      if (data.status === MAIN_LOGGED_OUT) {
        setMicrosoftName('')
        setConnected(false)
      }
    })

    window.api.getAuthState()
      .then((state) => {
        setConnected(state.connected)
        setMicrosoftName(state.username ?? '')
      })
      .catch(() => {})

    window.api.getLocalProfile()
      .then((profile) => setLocalName(profile.username))
      .catch(() => {})

    window.api.getOdysseyPack()
      .then(setPackEnabled)
      .catch(() => {})

    window.api.getMemory()
      .then((info) => {
        savedMemory.current = info.memoryMb
        setMemory(info)
        setMemoryMb(info.memoryMb)
      })
      .catch(() => {})

    window.api.getMinecraftVersions()
      .then(setVersions)
      .catch((err) => {
        setError(true)
        setStatus(err instanceof Error ? err.message : tRef.current('status.versionsError'))
      })
      .finally(() => setVersionsLoading(false))

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!memory || memoryMb === savedMemory.current) return

    const timer = setTimeout(() => {
      window.api.setMemory(memoryMb)
        .then(() => {
          savedMemory.current = memoryMb
        })
        .catch(() => {})
    }, 300)

    return () => clearTimeout(timer)
  }, [memoryMb, memory])

  useEffect(() => {
    setLoaderVersions([])
    setLoaderVersion('')

    if (loader === 'vanilla' || !effectiveVersion) return

    let cancelled = false
    setLoaderLoading(true)

    window.api.getLoaderVersions(loader, effectiveVersion)
      .then((list) => {
        if (cancelled) return
        setLoaderVersions(list)
        setLoaderVersion(list[0] ?? '')
      })
      .catch((err) => {
        if (cancelled) return
        setError(true)
        setStatus(err instanceof Error ? err.message : tRef.current('status.loaderVersionsError'))
      })
      .finally(() => {
        if (!cancelled) setLoaderLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [loader, effectiveVersion])

  useEffect(() => {
    if (view !== 'reglages') return

    let cancelled = false

    window.api.getInstalledVersions()
      .then((list) => {
        if (!cancelled) setInstalled(list)
      })
      .catch(() => {
        if (!cancelled) setInstalled([])
      })

    return () => {
      cancelled = true
    }
  }, [view])

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = window.api.onUpdaterState(setUpdate)
    window.api.getUpdaterState().then(setUpdate).catch(() => {})
    window.api.getAppVersion().then(setAppVersion).catch(() => {})
    return unsubscribe
  }, [])

  useEffect(() => {
    document.title = t('meta.documentTitle')
    document.documentElement.lang = lang
  }, [t, lang])

  useEffect(() => {
    setStorageDone(false)
  }, [view])

  function chooseLang(id: LangId) {
    setLang(id)
    saveLang(id)
  }

  function chooseTheme(id: ThemeId) {
    setTheme(id)
    applyTheme(id, true)
  }

  async function login() {
    if (busy) return

    setBusy(true)
    setError(false)
    setStatus(t('status.connecting'))

    try {
      const result = await window.api.loginMicrosoft()

      if (!result.success) {
        setError(true)
        setStatus(result.error ?? t('status.loginFailed'))
        return
      }

      setConnected(true)
      setMicrosoftName(result.username ?? t('status.microsoftDefaultName'))
      setStatus(t('status.connected'))
    } catch (err) {
      setError(true)
      setStatus(err instanceof Error ? err.message : t('status.microsoftError'))
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    if (busy) return

    setBusy(true)

    try {
      await window.api.logout()
      setConnected(false)
      setMicrosoftName('')
      setStatus(t('status.loggedOut'))
      setError(false)
    } catch (err) {
      setError(true)
      setStatus(err instanceof Error ? err.message : t('status.logoutFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function saveLocal() {
    if (busy) return

    setBusy(true)
    setError(false)

    try {
      const result = await window.api.saveLocalProfile(localName)
      setLocalName(result.username)
      setStatus(t('status.profileSaved', { name: result.username }))
    } catch (err) {
      setError(true)
      setStatus(err instanceof Error ? err.message : t('status.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function togglePack(value: boolean) {
    setPackEnabled(value)

    try {
      await window.api.setOdysseyPack(value)
    } catch {
      setPackEnabled(!value)
    }
  }

  async function runStorage(action: StorageAction) {
    if (busy) return

    setBusy(true)
    setError(false)
    setStorageDone(false)
    setConfirm(null)

    try {
      const result =
        action === 'cache'
          ? await window.api.clearCache()
          : await window.api.deleteInstalledVersions()

      if (!result.success) {
        setError(true)
        setStatus(result.error ?? t('status.operationFailed'))
        return
      }

      setStatus(action === 'cache' ? t('status.cacheCleared') : t('status.versionsDeleted'))
      setStorageDone(true)
      setInstalled(await window.api.getInstalledVersions())
    } catch (err) {
      setError(true)
      setStatus(err instanceof Error ? err.message : t('status.operationFailed'))
    } finally {
      setBusy(false)
    }
  }

  function askStorage(action: StorageAction) {
    if (confirm === action) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      void runStorage(action)
      return
    }

    setConfirm(action)
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    confirmTimer.current = setTimeout(() => setConfirm(null), 4000)
  }

  async function launch() {
    if (busy) return

    setError(false)
    setProgress(0)

    if (profileType === 'microsoft' && !connected) {
      setError(true)
      setStatus(t('status.needMicrosoft'))
      setView('profil')
      return
    }

    if (profileType === 'local' && !localName.trim()) {
      setError(true)
      setStatus(t('status.needNickname'))
      setView('profil')
      return
    }

    if (loader !== 'vanilla' && !loaderVersion) {
      setError(true)
      setStatus(
        loaderLoading
          ? t('status.loadingVersions')
          : t('status.noLoaderVersion', { loader: t(`loader.${loader}` as TKey), version: effectiveVersion })
      )
      return
    }

    setBusy(true)
    setStatus(t('status.preparing'))

    try {
      if (profileType === 'local') {
        const saved = await window.api.saveLocalProfile(localName)
        setLocalName(saved.username)
      }

      if (memory && memoryMb !== savedMemory.current) {
        await window.api.setMemory(memoryMb)
        savedMemory.current = memoryMb
      }

      await window.api.setMinecraftVersion(loader === 'vanilla' ? version : effectiveVersion)
      await window.api.setLoader(loader, loaderVersion)

      const result = await window.api.launchGame(profileType)

      if (!result.success) {
        setError(true)
        setStatus(result.error ?? t('status.launchFailed'))
      }
    } catch (err) {
      setError(true)
      setStatus(err instanceof Error ? err.message : t('status.launchError'))
    } finally {
      setBusy(false)
    }
  }

  const bounds = memory
    ? [memory.minMb, memory.lowMb, memory.recommendedMb, memory.limitMb, memory.maxMb].reduce<number[]>(
        (list, value) => {
          const clamped = Math.min(memory.maxMb, Math.max(list[list.length - 1] ?? memory.minMb, value))
          return [...list, clamped]
        },
        []
      )
    : []

  const span = memory ? memory.maxMb - memory.minMb : 0
  const currentZone = memory ? ZONES[zoneIndex(memoryMb, memory)] : ZONES[1]
  const playerName = profileType === 'microsoft' ? (connected ? microsoftName : '') : localName.trim()
  const installedTotal = installed?.reduce((sum, item) => sum + item.sizeMb, 0) ?? 0

  return (
    <div className="shell">
      <nav className="rail" aria-label={t('nav.aria')}>
        <Logo className="rail-logo" title={t('brand.logoAlt')} />

        {NAV.map((item) => (
          <button
            key={item.id}
            className="tab"
            aria-current={view === item.id ? 'page' : undefined}
            onClick={() => setView(item.id)}
          >
            {item.icon}
            <span>{t(item.key)}</span>
          </button>
        ))}
      </nav>

      <main className="stage">
        <Logo className="canopee" />

        {(update.state === 'downloading' || update.state === 'ready') && (
          <div className="banner cut" role="status" aria-live="polite">
            <span className="banner-text">
              {update.state === 'ready'
                ? t('update.bannerReady', { version: update.version ?? '' })
                : t('update.bannerDownloading', {
                    version: update.version ?? '',
                    percent: update.percent ?? 0
                  })}
            </span>

            {update.state === 'ready' && (
              <button className="btn" onClick={() => void window.api.installUpdate()}>
                {t('update.install')}
              </button>
            )}
          </div>
        )}

        <div className="view" key={view}>
          {view === 'jouer' && (
            <>
              <header className="hero">
                <h1 className="display-xxl">
                  {t('brand.name')}
                  <span className="launcher-word">{t('brand.launcher')}</span>
                </h1>
                <p className="lead">{t('brand.tagline')}</p>
              </header>

              <section className="panel cut" aria-label={t('play.panelAria')}>
                <div className="fields">
                  <div className="stack">
                    <label className="label" htmlFor="minecraft-version">
                      {t('play.version')}
                    </label>
                    <div className="select">
                      <select
                        id="minecraft-version"
                        className="field"
                        value={version}
                        disabled={busy || versionsLoading}
                        onChange={(event) => setVersion(event.target.value)}
                      >
                        <option value="latest_release">{t('play.latest')}</option>
                        {versions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="stack">
                    <label className="label" htmlFor="loader-type">
                      {t('play.type')}
                    </label>
                    <div className="select">
                      <select
                        id="loader-type"
                        className="field"
                        value={loader}
                        disabled={busy}
                        onChange={(event) => setLoader(event.target.value as LoaderType)}
                      >
                        {LOADERS.map((item) => (
                          <option key={item} value={item}>
                            {t(`loader.${item}` as TKey)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {loader !== 'vanilla' && (
                    <div className="stack">
                      <label className="label" htmlFor="loader-version">
                        {t('play.loaderVersion', { loader: t(`loader.${loader}` as TKey) })}
                      </label>
                      <div className="select">
                        <select
                          id="loader-version"
                          className="field"
                          value={loaderVersion}
                          disabled={busy || loaderLoading || loaderVersions.length === 0}
                          onChange={(event) => setLoaderVersion(event.target.value)}
                        >
                          {loaderVersions.length === 0 && (
                            <option value="">
                              {loaderLoading ? t('common.loading') : t('play.noVersion')}
                            </option>
                          )}
                          {loaderVersions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <label className="check">
                  <input
                    type="checkbox"
                    checked={packEnabled}
                    disabled={busy}
                    onChange={(event) => void togglePack(event.target.checked)}
                  />
                  <span className="check-box" />
                  {t('play.pack')}
                </label>
              </section>

              <div className="launch">
                <div className="player">
                  <span className="label">{t('play.player')}</span>
                  <strong>{playerName || t('play.noProfile')}</strong>
                  <button className="link" onClick={() => setView('profil')}>
                    {playerName ? t('play.changeProfile') : t('play.chooseProfile')}
                  </button>
                </div>

                <button
                  className="btn btn-play"
                  onClick={launch}
                  disabled={busy || versionsLoading}
                >
                  <IconPlay />
                  {busy ? t('common.loading') : t('play.button')}
                </button>
              </div>

              <div className={error ? 'status is-error' : 'status'} role="status" aria-live="polite">
                <Racine active={busy} />
                <p>{statusText}</p>
                {progress > 0 && <span className="data">{progress} %</span>}
              </div>

              {progress > 0 && (
                <div
                  className="progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              )}
            </>
          )}

          {view === 'profil' && (
            <>
              <h1 className="display-h1">{t('profile.title')}</h1>

              <section className="panel cut" style={{ maxWidth: 520 }}>
                <div className="segmented" role="group" aria-label={t('profile.accountType')}>
                  <button
                    className="seg"
                    aria-pressed={profileType === 'microsoft'}
                    disabled={busy}
                    onClick={() => setProfileType('microsoft')}
                  >
                    {t('profile.microsoft')}
                  </button>
                  <button
                    className="seg"
                    aria-pressed={profileType === 'local'}
                    disabled={busy}
                    onClick={() => setProfileType('local')}
                  >
                    {t('profile.local')}
                  </button>
                </div>

                {profileType === 'microsoft' ? (
                  <>
                    <div className="stack">
                      <span className="label">{connected ? t('profile.connectedAccount') : t('profile.account')}</span>
                      <p className="display-h2" style={{ overflowWrap: 'anywhere' }}>
                        {connected ? microsoftName : t('profile.noAccount')}
                      </p>
                    </div>

                    <div className="row">
                      <button className="btn" onClick={login} disabled={busy}>
                        {connected ? t('profile.switchAccount') : t('profile.loginMicrosoft')}
                      </button>

                      {connected && (
                        <button className="btn btn-quiet" onClick={logout} disabled={busy}>
                          {t('profile.logout')}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="stack">
                      <label className="label" htmlFor="local-name">
                        {t('profile.nickname')}
                      </label>
                      <input
                        id="local-name"
                        className="field"
                        value={localName}
                        maxLength={16}
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) => setLocalName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void saveLocal()
                        }}
                        placeholder={t('profile.nicknamePlaceholder')}
                      />
                      <span className="micro">{t('profile.counter', { count: localName.length })}</span>
                    </div>

                    <div className="row">
                      <button className="btn" onClick={saveLocal} disabled={busy}>
                        {t('profile.save')}
                      </button>
                    </div>
                  </>
                )}
              </section>

              {error && (
                <div className="status is-error" role="status" aria-live="polite">
                  <Racine active={false} />
                  <p>{status}</p>
                </div>
              )}
            </>
          )}

          {view === 'reglages' && (
            <>
              <h1 className="display-h1">{t('settings.title')}</h1>

              <div className="columns">
                <section className="panel cut" aria-label={t('memory.title')}>
                  <div className="panel-head">
                    <h2 className="label">{t('memory.title')}</h2>
                    {memory && <span className="micro">{t('memory.total', { value: formatGb(memory.totalMb, t) })}</span>}
                  </div>

                  {memory ? (
                    <>
                      <div className="mem-value">
                        <span className="display-h1">{formatGb(memoryMb, t)}</span>
                        <span className="label" style={{ color: currentZone.color }}>
                          {t(currentZone.key)}
                        </span>
                      </div>

                      <div className="mem-track">
                        {span > 0 && (
                          <div className="mem-zones">
                            {ZONES.map((zone, index) => {
                              const width = ((bounds[index + 1] - bounds[index]) / span) * 100
                              if (width <= 0) return null

                              return (
                                <div
                                  key={zone.key}
                                  style={{ width: `${width}%`, background: zone.color }}
                                />
                              )
                            })}
                          </div>
                        )}

                        <input
                          type="range"
                          className="mem-range"
                          aria-label={t('memory.aria')}
                          min={memory.minMb}
                          max={memory.maxMb}
                          step={256}
                          value={memoryMb}
                          disabled={busy}
                          onChange={(event) => setMemoryMb(Number(event.target.value))}
                        />
                      </div>

                      <div className="legend micro">
                        {ZONES.map((zone) => (
                          <span key={zone.key}>
                            <i style={{ background: zone.color }} />
                            {t(zone.key)}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="small">{t('memory.reading')}</p>
                  )}
                </section>

                <section className="panel cut" aria-label={t('storage.title')}>
                  <div className="panel-head">
                    <h2 className="label">{t('storage.title')}</h2>
                    {installed !== null && installed.length > 0 && (
                      <span className="micro">
                        {t(installed.length > 1 ? 'storage.countMany' : 'storage.countOne', {
                          count: installed.length,
                          size: formatMo(installedTotal, t)
                        })}
                      </span>
                    )}
                  </div>

                  {installed === null ? (
                    <p className="small">{t('storage.reading')}</p>
                  ) : installed.length === 0 ? (
                    <p className="small">{t('storage.empty')}</p>
                  ) : (
                    <ul className="versions">
                      {installed.map((item) => (
                        <li key={item.id}>
                          <span className="data" style={{ overflowWrap: 'anywhere' }}>
                            {item.id}
                          </span>
                          <span className="data" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                            {formatMo(item.sizeMb, t)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="row">
                    <button
                      className={confirm === 'cache' ? 'btn btn-danger' : 'btn btn-quiet'}
                      onClick={() => askStorage('cache')}
                      disabled={busy}
                    >
                      {confirm === 'cache' ? t('storage.confirm') : t('storage.clearCache')}
                    </button>

                    <button
                      className={confirm === 'versions' ? 'btn btn-danger' : 'btn btn-quiet'}
                      onClick={() => askStorage('versions')}
                      disabled={busy}
                    >
                      {confirm === 'versions' ? t('storage.confirm') : t('storage.deleteVersions')}
                    </button>
                  </div>

                  {confirm && (
                    <p className="small">
                      {confirm === 'cache' ? t('storage.confirmCache') : t('storage.confirmVersions')}
                    </p>
                  )}
                </section>

                <section className="panel cut" aria-label={t('language.title')}>
                  <h2 className="label">{t('language.title')}</h2>

                  <div className="stack">
                    <label className="label" htmlFor="language">
                      {t('language.label')}
                    </label>
                    <div className="select">
                      <select
                        id="language"
                        className="field"
                        value={lang}
                        onChange={(event) => chooseLang(event.target.value as LangId)}
                      >
                        {LANGUAGES.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="micro">{t('language.hint')}</span>
                  </div>
                </section>

                <section className="panel cut" aria-label={t('update.title')}>
                  <div className="panel-head">
                    <h2 className="label">{t('update.title')}</h2>
                    {appVersion && <span className="micro">{t('update.version', { version: appVersion })}</span>}
                  </div>

                  <p className="small">
                    {update.state === 'checking' && t('update.checking')}
                    {update.state === 'none' && t('update.upToDate')}
                    {update.state === 'available' && t('update.available', { version: update.version ?? '' })}
                    {update.state === 'downloading' &&
                      t('update.downloading', { percent: update.percent ?? 0 })}
                    {update.state === 'ready' && t('update.ready', { version: update.version ?? '' })}
                    {update.state === 'error' &&
                      (update.message === 'dev' ? t('update.devMode') : t('update.error'))}
                  </p>

                  <div className="row">
                    {update.state === 'ready' ? (
                      <button className="btn" onClick={() => void window.api.installUpdate()}>
                        {t('update.install')}
                      </button>
                    ) : (
                      <button
                        className="btn btn-quiet"
                        onClick={() => void window.api.checkUpdate()}
                        disabled={['checking', 'available', 'downloading'].includes(update.state)}
                      >
                        {t('update.check')}
                      </button>
                    )}
                  </div>
                </section>
              </div>

              {(error || storageDone) && (
                <div className={error ? 'status is-error' : 'status'} role="status" aria-live="polite">
                  <Racine active={busy} />
                  <p>{status}</p>
                </div>
              )}
            </>
          )}

          {view === 'biomes' && (
            <>
              <header>
                <h1 className="display-h1">{t('biomes.title')}</h1>
                <p className="lead" style={{ fontSize: 16, maxWidth: '52ch' }}>
                  {t('biomes.intro')}
                </p>
              </header>

              <div className="themes">
                {THEMES.map((item) => {
                  const active = item.id === theme

                  return (
                    <button
                      key={item.id}
                      className="theme-card"
                      aria-pressed={active}
                      onClick={() => chooseTheme(item.id)}
                      style={{
                        background: item.bg,
                        color: item.text,
                        boxShadow: active ? `inset 0 0 0 3px ${item.accent}` : `inset 0 0 0 1px ${item.mid}`
                      }}
                    >
                      <div className="swatches" aria-hidden="true">
                        {[item.surface, item.mid, item.accent, item.contrast, item.warm].map((color) => (
                          <i key={color} style={{ background: color }} />
                        ))}
                      </div>

                      <span className="display-h2">{t(`theme.${item.id}.name` as TKey)}</span>
                      <p>{t(`theme.${item.id}.desc` as TKey)}</p>

                      <span
                        className="theme-state"
                        style={
                          active
                            ? { background: item.accent, color: item.onAccent }
                            : { background: item.surface, color: item.text }
                        }
                      >
                        {active ? t('biomes.active') : t('biomes.choose')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <footer className="coords micro">
          <span>{t('footer.coords')}</span>
          <span>{t('footer.credits')}</span>
          <span>{t('footer.slogan')}</span>
        </footer>
      </main>
    </div>
  )
}