import { computed, ref, watch } from 'vue'
import en from './messages/en.js'
import zh from './messages/zh.js'
import ja from './messages/ja.js'

const STORAGE_KEY = 'bpkm-locale'
const catalogs = { en, zh, ja }

function readInitialLocale() {
  if (typeof localStorage === 'undefined') return 'en'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && catalogs[saved]) return saved
  return 'en'
}

export const locale = ref(readInitialLocale())

watch(
  locale,
  (l) => {
    if (typeof document !== 'undefined') document.documentElement.lang = l === 'zh' ? 'zh-CN' : l
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, l)
  },
  { immediate: true },
)

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj)
}

export function useI18n() {
  const t = (key) => {
    const msg = get(catalogs[locale.value], key) ?? get(catalogs.en, key)
    return msg ?? key
  }
  const setLocale = (l) => {
    if (catalogs[l]) locale.value = l
  }
  const localeOptions = computed(() => [
    { value: 'en', label: t('lang.en') },
    { value: 'zh', label: t('lang.zh') },
    { value: 'ja', label: t('lang.ja') },
  ])
  return { locale, setLocale, t, localeOptions }
}

/** @param {'en'|'zh'|'ja'} loc */
export function cardLocalizedName(card, loc) {
  if (!card) return ''
  if (loc === 'zh') return card.nameZh
  if (loc === 'ja') return card.nameJa || card.nameEn
  return card.nameEn
}

const TIER_TAG = {
  en: { 1: 'Tier 1 · 1×', 2: 'Tier 2 · 2×', 3: 'Tier 3 · 3×', 4: 'Tier 4 · 10×' },
  zh: { 1: '第一档 · 1×', 2: '第二档 · 2×', 3: '第三档 · 3×', 4: '第四档 · 10×' },
  ja: { 1: '第1 tier · 1×', 2: '第2 tier · 2×', 3: '第3 tier · 3×', 4: '第4 tier · 10×' },
}

/** @param {'en'|'zh'|'ja'} loc */
export function cardLocalizedTagline(card, loc) {
  if (!card) return ''
  if (card.rarity && TIER_TAG[loc]?.[card.rarity]) return TIER_TAG[loc][card.rarity]
  if (loc === 'zh') return card.tagline
  if (loc === 'ja') return card.taglineJa || card.taglineEn || card.tagline
  return card.taglineEn || card.tagline
}
