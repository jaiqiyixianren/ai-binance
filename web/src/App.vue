<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useI18n } from './i18n/index.js'
import { SITE_VARIANT } from './config.js'

const isTest10m = SITE_VARIANT === 'test-10m'

const route = useRoute()
const { t, locale, setLocale } = useI18n()

const nav = computed(() => [
  { to: '/', label: t('nav.home') },
  { to: '/guide', label: t('nav.guide') },
  { to: '/crypto-notes', label: t('nav.crypto') },
])

function linkActive(to) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

function navLinkClass(to) {
  return linkActive(to) ? 'site-nav__link is-active' : 'site-nav__link'
}
</script>

<template>
  <div class="page-bg" aria-hidden="true">
    <div class="page-bg__orb page-bg__orb--1" />
    <div class="page-bg__orb page-bg__orb--2" />
    <div class="page-bg__orb page-bg__orb--3" />
    <div class="page-bg__balls" />
    <div class="page-bg__spark" />
  </div>

  <p v-if="isTest10m" class="site-test-banner">TEST · 10 min/round · not production</p>
  <nav class="site-nav" aria-label="Site">
    <RouterLink to="/" class="site-nav__brand">BPKM</RouterLink>
    <div class="site-nav__right">
      <div class="site-nav__links">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          :class="navLinkClass(item.to)"
        >
          {{ item.label }}
        </RouterLink>
      </div>
      <label class="lang-switch">
        <span class="sr-only">{{ t('lang.label') }}</span>
        <select class="lang-switch__select" :value="locale" @change="setLocale($event.target.value)">
          <option value="en">EN</option>
          <option value="zh">中文</option>
          <option value="ja">日本語</option>
        </select>
      </label>
    </div>
  </nav>

  <main class="site-main">
    <RouterView />
  </main>
</template>
