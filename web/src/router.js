import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import PlayGuideView from './views/PlayGuideView.vue'
import CryptoNotesView from './views/CryptoNotesView.vue'
import { locale } from './i18n/index.js'
import en from './i18n/messages/en.js'
import zh from './i18n/messages/zh.js'
import ja from './i18n/messages/ja.js'

const titles = { en, zh, ja }

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { titleKey: 'meta.home' } },
    { path: '/guide', name: 'guide', component: PlayGuideView, meta: { titleKey: 'meta.guide' } },
    {
      path: '/crypto-notes',
      name: 'crypto-notes',
      component: CryptoNotesView,
      meta: { titleKey: 'meta.crypto' },
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

function titleForKey(key) {
  const cat = titles[locale.value] || en
  const parts = key.split('.')
  let v = cat
  for (const p of parts) v = v?.[p]
  return v || en.meta?.home
}

router.afterEach((to) => {
  document.title = to.meta.titleKey ? titleForKey(String(to.meta.titleKey)) : titleForKey('meta.site')
})

export default router
