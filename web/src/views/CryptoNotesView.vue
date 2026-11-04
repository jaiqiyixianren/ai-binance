<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from '../i18n/index.js'
import { cryptoDocs } from '../i18n/guideDocs.js'

const { t, locale } = useI18n()
const doc = computed(() => cryptoDocs[locale.value] || cryptoDocs.en)
</script>

<template>
  <header class="hero hero--compact">
    <span class="hero__badge">{{ t('crypto.badge') }}</span>
    <h1 class="hero__title hero__title--sm">{{ t('crypto.title') }}</h1>
    <p class="hero__sub">{{ t('crypto.sub') }}</p>
  </header>

  <div class="layout layout--doc">
    <section class="card doc doc--warn">
      <h2>{{ t('crypto.disclaimerTitle') }}</h2>
      <p>{{ t('crypto.disclaimerP') }}</p>
    </section>

    <section class="card doc">
      <h2>{{ t('crypto.walletTitle') }}</h2>
      <ul class="doc-list">
        <li v-for="(line, i) in doc.wallet" :key="'w' + i">{{ line }}</li>
      </ul>
    </section>

    <section class="card doc">
      <h2>{{ t('crypto.approveTitle') }}</h2>
      <ul class="doc-list">
        <li v-for="(line, i) in doc.approve" :key="'a' + i">{{ line }}</li>
      </ul>
    </section>

    <section class="card doc">
      <h2>{{ t('crypto.scamTitle') }}</h2>
      <ul class="doc-list">
        <li v-for="(line, i) in doc.scam" :key="'s' + i">{{ line }}</li>
      </ul>
    </section>

    <section class="card doc">
      <h2>{{ t('crypto.tokenTitle') }}</h2>
      <ul class="doc-list">
        <li v-for="(line, i) in doc.token" :key="'t' + i">{{ line }}</li>
      </ul>
    </section>

    <section class="card doc">
      <h2>{{ t('crypto.habitsTitle') }}</h2>
      <ul class="doc-list">
        <li v-for="(line, i) in doc.habits" :key="'h' + i">{{ line }}</li>
      </ul>
    </section>

    <section class="card doc doc--cta-bottom">
      <p>
        <RouterLink to="/guide">{{ t('crypto.footerGuide') }}</RouterLink>
        ·
        <RouterLink to="/">{{ t('crypto.footerHome') }}</RouterLink>
      </p>
    </section>
  </div>
</template>
