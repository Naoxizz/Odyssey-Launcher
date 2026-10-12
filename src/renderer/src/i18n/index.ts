import { fr, type Dict, type TKey } from './fr'
import { en } from './en'

export const LANGUAGES = [
  { id: 'fr', label: 'Français', dict: fr as Dict },
  { id: 'en', label: 'English', dict: en }
] as const

export type LangId = (typeof LANGUAGES)[number]['id']
export type { TKey }
export type TParams = Record<string, string | number>
export type TFn = (key: TKey, params?: TParams) => string

const KEY = 'odyssey:lang'

export function loadLang(): LangId {
  try {
    const saved = localStorage.getItem(KEY)
    if (LANGUAGES.some((lang) => lang.id === saved)) return saved as LangId
  } catch {
    /* stockage indisponible */
  }
  return 'fr'
}

export function saveLang(id: LangId) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* stockage indisponible */
  }
}

export function makeT(id: LangId): TFn {
  const dict = LANGUAGES.find((lang) => lang.id === id)?.dict ?? fr

  return (key, params) => {
    const text = dict[key] ?? fr[key] ?? key
    if (!params) return text
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match
    )
  }
}
