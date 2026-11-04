<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Contract, formatUnits, JsonRpcProvider } from 'ethers'
import {
  ADDRESSES,
  BSC_CHAIN_ID,
  MINT_ABI,
  PUBLIC_BSC_RPC,
  ROUND_SPECS,
  ROUND1_START_UNIX,
  ROUND_DURATION_SEC,
} from '../config.js'
import { CARDS_V2, CARDS_FEATURED_FOUR, cardsForMint, formatBpkmAmount } from '../cards.js'
import { buildAgentPrompt } from '../agentPrompt.js'
import { formatCardBpkm, lookupCardsByAddress } from '../lookupCards.js'
import { useI18n, cardLocalizedName } from '../i18n/index.js'

const { t, locale } = useI18n()

const siteOrigin =
  import.meta.env.VITE_SITE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')
const agentPromptText = computed(() => buildAgentPrompt(siteOrigin, locale.value))
const copyOk = ref(false)
const showContracts = ref(false)

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(agentPromptText.value)
  } catch {
    const ta = document.getElementById('hidden-prompt')
    if (ta) {
      ta.select()
      document.execCommand('copy')
    }
  }
  copyOk.value = true
  setTimeout(() => {
    copyOk.value = false
  }, 2600)
}

const error = ref('')
const loading = ref(false)
const tokensPerMint = ref(90_000_000000000000000000n)
const totalMintCount = ref(0n)
const roundRows = ref([])
const mintRoundIndex = ref(-1)
const mintRoundActive = ref(false)
const chainNowSec = ref(0)

const contractsReady = computed(() => Boolean(ADDRESSES.mint))

const staticRoundRows = computed(() =>
  ROUND_SPECS.map((spec, index) => {
    const startSec = ROUND1_START_UNIX + index * ROUND_DURATION_SEC
    return {
      index,
      spec,
      startSec,
      endSec: startSec + ROUND_DURATION_SEC,
      raisedWei: 0n,
      finalized: false,
      inWindow: false,
      canMint: false,
    }
  }),
)

const roundsDisplay = computed(() => (roundRows.value.length ? roundRows.value : staticRoundRows.value))
const allCards = computed(() => CARDS_V2)
const phaseCards = computed(() => CARDS_FEATURED_FOUR)
const numberLocale = computed(() => (locale.value === 'zh' ? 'zh-CN' : locale.value === 'ja' ? 'ja-JP' : 'en-US'))

const currentRoundRow = computed(() =>
  roundRows.value.find((r) => r.index === mintRoundIndex.value && r.inWindow),
)
const progressPct = computed(() => {
  const row = currentRoundRow.value
  if (!row || row.capWei === 0n) return 0
  return Number((row.raisedWei * 10000n) / row.capWei) / 100
})
const progressLabel = computed(() => {
  const row = currentRoundRow.value
  if (!row) return '—'
  return `${Number(formatUnits(row.raisedWei, 18)).toLocaleString(numberLocale.value)} / ${Number(formatUnits(row.capWei, 18)).toLocaleString(numberLocale.value)} BNB`
})
const statusText = computed(() => {
  if (mintRoundActive.value) return t('home.roundActive')
  const row = currentRoundRow.value
  if (row?.inWindow && !row.canMint) return t('home.roundFull')
  if (mintRoundIndex.value >= 0 && chainNowSec.value < roundRows.value[mintRoundIndex.value]?.startSec) {
    return t('home.roundWaiting')
  }
  return t('home.roundWaiting')
})
function fmtTime(sec) {
  if (!sec) return '—'
  return new Date(sec * 1000).toLocaleString(numberLocale.value, { hour12: false })
}
function roundStatus(row) {
  const now = contractsReady.value ? chainNowSec.value : Math.floor(Date.now() / 1000)
  if (row.finalized) return t('home.roundDone')
  if (now < row.startSec) return t('home.roundWaiting')
  if (now >= row.endSec) return t('home.roundDone')
  if (contractsReady.value && row.inWindow && !row.canMint) return t('home.roundFull')
  if (now >= row.startSec && now < row.endSec) return t('home.roundActive')
  return t('home.roundWaiting')
}

function phaseStepState(row, index) {
  const status = roundStatus(row)
  if (status === t('home.roundActive')) return 'active'
  if (status === t('home.roundDone')) return 'done'
  if (index > 0 && roundStatus(roundsDisplay.value[index - 1]) === t('home.roundDone')) return 'next'
  return 'pending'
}
const tokensPerMintHuman = computed(() => {
  if (!tokensPerMint.value) return '—'
  return Number(formatUnits(tokensPerMint.value, 18)).toLocaleString(numberLocale.value)
})
const mintContractLink = computed(() =>
  ADDRESSES.mint ? `https://bscscan.com/address/${ADDRESSES.mint}` : '',
)
const tokenContractLink = computed(() =>
  ADDRESSES.token ? `https://bscscan.com/address/${ADDRESSES.token}` : '',
)

async function refreshOnchain() {
  error.value = ''
  if (!contractsReady.value) {
    return
  }
  loading.value = true
  try {
    const provider = new JsonRpcProvider(PUBLIC_BSC_RPC, BSC_CHAIN_ID)
    const mint = new Contract(ADDRESSES.mint, MINT_ABI, provider)
    const block = await provider.getBlock('latest')
    chainNowSec.value = Number(block.timestamp)
    const [tpm, tmc, mr, ma] = await Promise.all([
      mint.tokensPerMint(),
      mint.totalMintCount(),
      mint.mintingRound(),
      mint.activeRound(),
    ])
    tokensPerMint.value = tpm
    totalMintCount.value = tmc
    mintRoundIndex.value = Number(mr[0])
    mintRoundActive.value = ma[1]
    const n = Number(await mint.NUM_ROUNDS())
    const rows = []
    for (let i = 0; i < n; i++) {
      const [capWei, priceWei, maxPerWallet] = await mint.rounds(i)
      const [startSec, endSec, raisedWei, fin] = await Promise.all([
        mint.roundStart(i),
        mint.roundEnd(i),
        mint.raisedBnb(i),
        mint.roundFinalized(i),
      ])
      const inWindow = chainNowSec.value >= Number(startSec) && chainNowSec.value < Number(endSec) && !fin
      const canMint = inWindow && raisedWei + priceWei <= capWei
      rows.push({
        index: i,
        capWei,
        priceWei,
        maxPerWallet,
        startSec: Number(startSec),
        endSec: Number(endSec),
        raisedWei,
        finalized: fin,
        inWindow,
        canMint,
        spec: ROUND_SPECS[i] ?? { capBnb: 0, priceBnb: 0, maxPerWallet: 10 },
      })
    }
    roundRows.value = rows
  } catch (e) {
    error.value = e.shortMessage || e.message || String(e)
  } finally {
    loading.value = false
  }
}

let pollTimer
onMounted(() => {
  refreshOnchain()
  pollTimer = setInterval(refreshOnchain, 60_000)
})
onUnmounted(() => clearInterval(pollTimer))

const lookupAddress = ref('')
const lookupLoading = ref(false)
const lookupError = ref('')
const lookupDone = ref(false)
const lookupCards = ref([])
const lookupInfoKey = ref(null)
const lookupRoundDisplay = ref(null)

async function queryWalletCards() {
  lookupError.value = ''
  lookupDone.value = false
  lookupCards.value = []
  lookupInfoKey.value = null
  lookupRoundDisplay.value = null
  if (!contractsReady.value) {
    lookupError.value = t('home.errNoMint')
    return
  }
  lookupLoading.value = true
  try {
    const provider = new JsonRpcProvider(PUBLIC_BSC_RPC, BSC_CHAIN_ID)
    const result = await lookupCardsByAddress(provider, lookupAddress.value)
    lookupCards.value = result.cards
    lookupInfoKey.value = result.messageKey
    if (result.inWindow) {
      lookupRoundDisplay.value = result.roundIndex + 1
    }
    lookupDone.value = true
  } catch (e) {
    lookupError.value = e.shortMessage || e.message || String(e)
  } finally {
    lookupLoading.value = false
  }
}

function bpkmLabel(row) {
  if (row.amountBPKM != null) return `${formatCardBpkm(row.amountBPKM)} BPKM`
  return `${formatBpkmAmount(tokensPerMint.value, row.multiplier)} BPKM`
}

function cardTitle(row) {
  const meta = cardsForMint(ADDRESSES.mint).find((c) => c.species === row.species) || row
  return cardLocalizedName(meta, locale.value) || row.nameZh
}
</script>

<template>
  <header class="hero">
    <span class="hero__badge">{{ t('home.badge') }}</span>
    <h1 class="hero__title">{{ t('home.title') }}</h1>
    <p class="hero__tag">{{ t('home.tag') }}</p>
    <p class="hero__sub">{{ t('home.subTen') }}</p>
  </header>

  <div class="layout">
    <section class="card card--phase">
      <div class="card-head">
        <h2>{{ t('home.phaseTitle') }}</h2>
        <span class="chip">{{ t('home.phaseChip') }}</span>
      </div>
      <p class="muted phase-intro">{{ t('home.phaseIntro') }}</p>
      <div class="phase-track" role="list">
        <div
          v-for="(row, idx) in roundsDisplay"
          :key="'phase-' + row.index"
          class="phase-step"
          :class="'phase-step--' + phaseStepState(row, idx)"
          role="listitem"
        >
          <div v-if="idx < roundsDisplay.length - 1" class="phase-step__connector" aria-hidden="true" />
          <div class="phase-step__marker">
            <span class="phase-step__num">{{ idx + 1 }}</span>
          </div>
          <div class="phase-step__card">
            <img
              v-if="phaseCards[idx]"
              :src="phaseCards[idx].image"
              :alt="cardLocalizedName(phaseCards[idx], locale)"
              width="72"
              height="100"
              loading="lazy"
            />
          </div>
          <p class="phase-step__name">
            {{ phaseCards[idx] ? cardLocalizedName(phaseCards[idx], locale) : '—' }}
          </p>
          <p class="phase-step__meta muted">{{ row.spec.priceBnb }} BNB · {{ row.spec.capBnb }} cap</p>
          <p class="phase-step__status">{{ roundStatus(row) }}</p>
        </div>
      </div>
    </section>

    <section class="card card--cta">
      <div class="cta-inner">
        <div class="cta-text">
          <h2>{{ t('home.ctaTitle') }}</h2>
          <p class="muted">{{ t('home.ctaBody') }}</p>
          <p class="muted doc-inline-link">
            {{ t('home.ctaGuide') }}
            <RouterLink to="/guide">{{ t('home.ctaGuideLink') }}</RouterLink>
            {{ t('home.ctaAnd') }}
            <RouterLink to="/crypto-notes">{{ t('home.ctaSafetyLink') }}</RouterLink>.
          </p>
        </div>
        <button
          type="button"
          class="btn btn-copy"
          :class="{ 'is-ok': copyOk, pulse: !copyOk }"
          @click="copyPrompt"
        >
          <span class="btn-copy__icon">{{ copyOk ? '✓' : '📋' }}</span>
          <span>{{ copyOk ? t('home.copyOk') : t('home.copyBtn') }}</span>
        </button>
        <textarea id="hidden-prompt" class="sr-only" readonly tabindex="-1" aria-hidden="true" :value="agentPromptText" />
        <div class="cta-links">
          <a
            class="btn btn-ghost btn-sm"
            href="https://www.binance.com/en/skills/detail/binance-web3/binance-agentic-wallet"
            target="_blank"
            rel="noopener"
          >
            {{ t('home.installBaw') }}
          </a>
          <button type="button" class="btn btn-ghost btn-sm" :disabled="loading" @click="refreshOnchain">
            {{ loading ? t('home.refreshing') : t('home.refresh') }}
          </button>
        </div>
      </div>
    </section>

    <section class="card card--deck">
      <div class="card-head">
        <h2>{{ t('home.cardsAll') }}</h2>
        <span class="chip">{{ t('home.chipRandom') }}</span>
      </div>
      <div class="card-deck card-deck--four">
        <article
          v-for="c in allCards"
          :key="c.slug"
          class="poke-card poke-card--uniform"
          :style="{ '--accent': c.accent, '--glow': c.glow }"
        >
          <div class="poke-card__img-wrap">
            <img
              class="poke-card__img"
              :src="c.image"
              :alt="cardLocalizedName(c, locale)"
              width="120"
              height="168"
              loading="lazy"
            />
          </div>
          <div class="poke-card__body">
            <h3 class="poke-card__title">{{ cardLocalizedName(c, locale) }}</h3>
            <p class="poke-card__en">{{ c.nameEn }}</p>
            <p class="poke-card__amt">{{ c.multiplier }}× · {{ formatBpkmAmount(tokensPerMint, c.multiplier) }} BPKM</p>
          </div>
        </article>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2>{{ t('home.progress') }}</h2>
        <strong class="status-pill" :data-live="contractsReady && mintRoundActive">{{ contractsReady ? statusText : '—' }}</strong>
      </div>
      <p class="muted deck-hint">{{ t('home.roundFinalize') }}</p>
      <p v-if="!contractsReady" class="muted fine-print">{{ t('home.errNoMint') }}</p>
      <div v-else class="stat-grid stat-grid--compact">
        <div class="stat stat--wide">
          <label>{{ t('home.roundCurrent') }}</label>
          <strong>{{ mintRoundIndex >= 0 ? `${t('home.roundLabel')} ${mintRoundIndex + 1}` : '—' }}</strong>
          <div class="progress"><span :style="{ width: progressPct + '%' }" /></div>
          <p class="muted fine-print">{{ progressLabel }}</p>
        </div>
        <div class="stat"><label>{{ t('home.statMinted') }}</label><strong>{{ totalMintCount.toString() }}</strong></div>
        <div class="stat"><label>{{ t('home.statBase') }}</label><strong>{{ tokensPerMintHuman }}</strong></div>
      </div>
      <h3 class="round-grid__title">{{ t('home.roundsTitle') }}</h3>
      <div class="round-grid">
        <article
          v-for="row in roundsDisplay"
          :key="row.index"
          class="round-panel"
          :data-state="roundStatus(row)"
        >
          <header class="round-panel__head">
            <span class="round-panel__num">{{ t('home.roundLabel') }} {{ row.index + 1 }}</span>
            <span class="round-panel__status">{{ roundStatus(row) }}</span>
          </header>
          <dl class="round-panel__stats">
            <div><dt>{{ t('home.roundCap') }}</dt><dd>{{ row.spec.capBnb }} BNB</dd></div>
            <div><dt>{{ t('home.roundPrice') }}</dt><dd>{{ row.spec.priceBnb }} BNB</dd></div>
            <div><dt>{{ t('home.roundPerWallet') }}</dt><dd>{{ row.spec.maxPerWallet }}</dd></div>
            <div v-if="contractsReady && row.raisedWei != null">
              <dt>{{ t('home.roundRaised') }}</dt>
              <dd>{{ Number(formatUnits(row.raisedWei, 18)).toLocaleString(numberLocale) }} BNB</dd>
            </div>
          </dl>
          <p class="round-panel__time muted">
            {{ fmtTime(row.startSec) }} → {{ fmtTime(row.endSec) }}
          </p>
        </article>
      </div>
      <p v-if="error" class="err">{{ error }}</p>
    </section>

    <section class="card card-lookup">
      <div class="card-head">
        <h2>{{ t('home.lookupTitle') }}</h2>
        <span class="chip">{{ t('home.lookupChip') }}</span>
      </div>
      <p class="muted lookup-intro">{{ t('home.lookupIntro') }}</p>
      <form class="lookup-form" @submit.prevent="queryWalletCards">
        <label class="lookup-form__label" for="lookup-addr">{{ t('home.lookupLabel') }}</label>
        <div class="lookup-form__row">
          <input
            id="lookup-addr"
            v-model.trim="lookupAddress"
            class="lookup-input"
            type="text"
            inputmode="text"
            autocomplete="off"
            spellcheck="false"
            :placeholder="t('home.lookupPlaceholder')"
          />
          <button type="submit" class="btn btn-primary lookup-submit" :disabled="lookupLoading">
            {{ lookupLoading ? t('home.lookupLoading') : t('home.lookupSubmit') }}
          </button>
        </div>
      </form>
      <p v-if="lookupError" class="err">{{ lookupError }}</p>
      <p v-if="lookupRoundDisplay != null && lookupDone" class="lookup-round muted">
        {{ t('home.lookupRoundLabel').replace('{n}', String(lookupRoundDisplay)) }}
      </p>
      <p
        v-if="lookupInfoKey && lookupDone && !lookupError && lookupCards.length === 0"
        class="lookup-empty muted"
      >
        {{ t(`home.${lookupInfoKey}`) }}
      </p>
      <ul v-if="lookupCards.length" class="lookup-list">
        <li
          v-for="(row, idx) in lookupCards"
          :key="row.txHash ?? `${row.slug}-${idx}`"
          class="lookup-item"
          :style="{ '--accent': row.accent }"
        >
          <img v-if="row.image" class="lookup-item__img" :src="row.image" :alt="cardTitle(row)" width="66" height="92" />
          <div class="lookup-item__main">
            <p class="lookup-item__rank">#{{ idx + 1 }}</p>
            <h3 class="lookup-item__title">
              {{ cardTitle(row) }} <span class="lookup-item__en">{{ row.nameEn }}</span>
            </h3>
            <p class="lookup-item__meta">
              <span v-if="row.round != null">R{{ row.round + 1 }} · </span>
              {{ row.multiplier }}× · {{ bpkmLabel(row) }}
              <span v-if="row.handle" class="lookup-item__handle"> · {{ row.handle }}</span>
            </p>
          </div>
          <a
            v-if="row.txHash"
            class="btn btn-ghost btn-sm lookup-item__tx"
            :href="`https://bscscan.com/tx/${row.txHash}`"
            target="_blank"
            rel="noopener"
          >
            {{ t('home.lookupTx') }}
          </a>
        </li>
      </ul>
    </section>

    <section class="card card--flat">
      <button type="button" class="details-toggle" @click="showContracts = !showContracts">
        {{ showContracts ? t('home.contractsHide') : t('home.contractsShow') }}
      </button>
      <div v-show="showContracts" class="details-panel">
        <ul class="contract-list muted">
          <li>Registry：<a :href="`https://bscscan.com/address/${ADDRESSES.agentRegistry}`" target="_blank" rel="noopener">{{ ADDRESSES.agentRegistry }}</a></li>
          <li>Mint：<a :href="mintContractLink" target="_blank" rel="noopener">{{ ADDRESSES.mint }}</a></li>
          <li>BPKM：<a :href="tokenContractLink" target="_blank" rel="noopener">{{ ADDRESSES.token }}</a></li>
        </ul>
      </div>
    </section>
  </div>
</template>
