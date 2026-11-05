import { createPersistedStore } from '@/lib/persisted-store'
import { en } from './en'
import type { Dict, TKey } from './types'
import { vi } from './vi'
import { zhHans } from './zh-Hans'
import { zhHant } from './zh-Hant'

export type { TKey }

export const LOCALES = {
  vi: { label: 'Tiếng Việt', short: 'VI', intl: 'vi-VN', dict: vi as Dict },
  en: { label: 'English', short: 'EN', intl: 'en-US', dict: en },
  'zh-Hant': { label: '繁體中文', short: '繁', intl: 'zh-Hant-TW', dict: zhHant },
  'zh-Hans': { label: '简体中文', short: '简', intl: 'zh-Hans-CN', dict: zhHans },
} as const

export type Locale = keyof typeof LOCALES

const localeStore = createPersistedStore<Locale>('debugs.locale', 'vi', (v): v is Locale => v in LOCALES)
const syncHtmlLang = () => (document.documentElement.lang = localeStore.get())
syncHtmlLang()
localeStore.subscribe(syncHtmlLang)

export const setLocale = localeStore.set

type Params = Record<string, string | number>

function makeI18n(locale: Locale) {
  const { dict, intl } = LOCALES[locale]
  const dateFmt = new Intl.DateTimeFormat(intl, { dateStyle: 'medium' })
  const dateTimeFmt = new Intl.DateTimeFormat(intl, { dateStyle: 'medium', timeStyle: 'short' })
  const rtf = new Intl.RelativeTimeFormat(intl, { numeric: 'auto' })

  const t = (key: TKey, params?: Params) => {
    const text = (params?.n === 1 && dict[`${key}_one`]) || dict[key]
    return params ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : text
  }

  const formatRelative = (iso: string) => {
    const seconds = (Date.parse(iso) - Date.now()) / 1000
    const abs = Math.abs(seconds)
    if (abs < 60) return rtf.format(0, 'second')
    if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
    if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
    if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), 'day')
    return dateFmt.format(new Date(iso))
  }

  return {
    locale,
    t,
    formatDate: (iso: string) => dateFmt.format(new Date(iso)),
    formatDateTime: (iso: string) => dateTimeFmt.format(new Date(iso)),
    formatRelative,
  }
}

export type I18n = ReturnType<typeof makeI18n>

const cache = new Map<Locale, I18n>()

function i18nFor(locale: Locale) {
  let i18n = cache.get(locale)
  if (!i18n) cache.set(locale, (i18n = makeI18n(locale)))
  return i18n
}

/** Dùng ngoài React (toast lỗi toàn cục) */
export const getI18n = () => i18nFor(localeStore.get())

export const useI18n = (): I18n => i18nFor(localeStore.use())
