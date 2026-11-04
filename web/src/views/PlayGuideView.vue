<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from '../i18n/index.js'
import { guideDocs } from '../i18n/guideDocs.js'

const { t, locale } = useI18n()
const doc = computed(() => guideDocs[locale.value] || guideDocs.en)
</script>

<template>
  <header class="hero hero--compact">
    <span class="hero__badge">{{ t('guide.badge') }}</span>
    <h1 class="hero__title hero__title--sm">{{ t('guide.title') }}</h1>
    <p class="hero__sub">{{ t('guide.sub') }}</p>
  </header>

  <div class="layout layout--doc">
    <section class="card doc">
      <h2>{{ t('guide.whatTitle') }}</h2>
      <p>{{ t('guide.whatP1') }}</p>
      <ul class="doc-list">
        <li v-for="(line, i) in doc.whatList" :key="'w' + i">{{ line }}</li>
      </ul>
    </section>

    <section class="card doc">
      <h2>{{ t('guide.prepTitle') }}</h2>
      <ol class="doc-steps">
        <li v-for="(line, i) in doc.prepSteps" :key="'p' + i">{{ line }}</li>
      </ol>
    </section>

    <section class="card doc">
      <h2>{{ t('guide.flowTitle') }}</h2>
      <ol class="doc-steps doc-steps--numbered">
        <li v-for="(step, i) in doc.flowSteps" :key="'f' + i">
          <span class="step-tag">{{ step.tag }}</span>
          {{ step.text }}
        </li>
      </ol>
      <p class="muted fine-print">{{ doc.flowNote }}</p>
    </section>

    <section class="card doc">
      <h2>{{ t('guide.afterTitle') }}</h2>
      <p>{{ t('guide.afterP1') }}</p>
    </section>

    <section class="card doc doc--cta-bottom">
      <p>
        {{ doc.footer }}
        <RouterLink to="/crypto-notes">{{ t('nav.crypto') }}</RouterLink>
        ·
        <RouterLink to="/">{{ t('guide.backHome') }}</RouterLink>
      </p>
    </section>
  </div>
</template>
