export type ThemeId = 'jungle' | 'lagon' | 'volcan' | 'aube'

export type Theme = {
  id: ThemeId
  name: string
  desc: string
  bg: string
  surface: string
  mid: string
  accent: string
  contrast: string
  warm: string
  text: string
  onAccent: string
  danger: string
  scheme: 'dark' | 'light'
}

export const THEMES: Theme[] = [
  {
    id: 'jungle',
    name: 'Jungle',
    desc: 'Le biome d’origine. Forêt dense, parties de tous les jours.',
    bg: '#07211B',
    surface: '#0E3B2E',
    mid: '#1F7A4D',
    accent: '#B8F13B',
    contrast: '#FF5C39',
    warm: '#FFB52E',
    text: '#F5ECD3',
    onAccent: '#07211B',
    danger: '#FF5C39',
    scheme: 'dark'
  },
  {
    id: 'lagon',
    name: 'Lagon',
    desc: 'Eaux calmes. Sessions longues, mondes aquatiques.',
    bg: '#041E2A',
    surface: '#0A4156',
    mid: '#14899A',
    accent: '#2DF0D2',
    contrast: '#FFC83D',
    warm: '#FF7A59',
    text: '#E6FBF7',
    onAccent: '#041E2A',
    danger: '#FF7A59',
    scheme: 'dark'
  },
  {
    id: 'volcan',
    name: 'Volcan',
    desc: 'Crépuscule chaud. Saisons, événements, grosses mises à jour.',
    bg: '#1C0B12',
    surface: '#4A1426',
    mid: '#B3283D',
    accent: '#FF6A2B',
    contrast: '#FF3D9A',
    warm: '#FFC247',
    text: '#F8E8DD',
    onAccent: '#1C0B12',
    danger: '#FF3D9A',
    scheme: 'dark'
  },
  {
    id: 'aube',
    name: 'Aube',
    desc: 'Thème clair. Lisibilité maximale, mode jour.',
    bg: '#F4EFDC',
    surface: '#E5E9CC',
    mid: '#5E8F3E',
    accent: '#0E3B2E',
    contrast: '#FF5C39',
    warm: '#F2A31B',
    text: '#07211B',
    onAccent: '#F4EFDC',
    danger: '#FF5C39',
    scheme: 'light'
  }
]

const KEY = 'odyssey:theme'

export function loadTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(KEY)
    if (THEMES.some((theme) => theme.id === saved)) return saved as ThemeId
  } catch {
    /* stockage indisponible */
  }
  return 'jungle'
}

export function applyTheme(id: ThemeId, persist = false) {
  const theme = THEMES.find((item) => item.id === id) ?? THEMES[0]
  const root = document.documentElement
  const vars: Record<string, string> = {
    '--bg': theme.bg,
    '--surface': theme.surface,
    '--mid': theme.mid,
    '--accent': theme.accent,
    '--contrast': theme.contrast,
    '--warm': theme.warm,
    '--text': theme.text,
    '--on-accent': theme.onAccent,
    '--danger': theme.danger
  }

  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value)
  root.style.colorScheme = theme.scheme
  root.dataset.theme = theme.id

  if (persist) {
    try {
      localStorage.setItem(KEY, theme.id)
    } catch {
      /* stockage indisponible */
    }
  }
}

applyTheme(loadTheme())
