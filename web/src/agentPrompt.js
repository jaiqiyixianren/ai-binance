import { ADDRESSES } from './config.js'
import { ROUND_SPECS } from './config.js'

const CARD_BLOCK = {
  en: `Each mint: random card species (10 types, tier probabilities on-chain) + BPKM = base × multiplier (1×/2×/3×/10×).`,
  zh: `每次 mint：链上随机 species（10 种卡牌概率）+ BPKM = 底额 × 倍数（1/2/3/10×）。`,
  ja: `各ミント: オンチェーン抽選 species + BPKM（底額×倍率）。`,
}

function roundLines(lang) {
  return ROUND_SPECS.map((r, i) => {
    const n = i + 1
    if (lang === 'zh') return `第${n}轮：总量 ${r.capBnb} BNB，${r.priceBnb} BNB/份，每钱包最多 ${r.maxPerWallet} 份`
    if (lang === 'ja') return `R${n}: 上限 ${r.capBnb} BNB · ${r.priceBnb} BNB/回 · ウォレット ${r.maxPerWallet} 回`
    return `Round ${n}: cap ${r.capBnb} BNB · ${r.priceBnb} BNB each · max ${r.maxPerWallet}/wallet`
  }).join('\n')
}

/** @param {string} siteOrigin @param {'en'|'zh'|'ja'} [lang] */
export function buildAgentPrompt(siteOrigin = '', lang = 'en') {
  const page =
    siteOrigin ?
      `${siteOrigin.replace(/\/$/, '')}/`
    : lang === 'en' ?
      '(genesis site URL)'
    : lang === 'ja' ?
      '（サイト URL）'
    : '（本项目创世页 URL）'
  const mint = ADDRESSES.mint || '(Mint after deploy)'
  const token = ADDRESSES.token || '(BPKM after deploy)'
  const registry = ADDRESSES.agentRegistry
  const cards = CARD_BLOCK[lang] || CARD_BLOCK.en
  const rounds = roundLines(lang)

  const schedule =
    lang === 'zh' ?
      '四轮各 24 小时；第 1 轮北京时间 2026-11-05 19:00 起可 mint（链上 round1StartTimestamp）。未到开始时间 revert。满额或未到期前可 mint；轮次结束后任何人可 finalizeRound(r)：90% BNB 加 Pancake LP，10% 记入 ownerWithdrawableBnb，仅 owner 可调 withdrawOwnerBnb。'
    : lang === 'ja' ?
      '4 ラウンド各 24h。第1ラウンド開始は round1StartTimestamp（2026-11-05 19:00 北京）。終了後 finalizeRound: BNB 90% LP、10% owner 引出可能。'
    : 'Four 24h rounds; round 1 opens at round1StartTimestamp (2026-11-05 19:00 Beijing). After each round ends, call finalizeRound(r): 90% BNB to LP, 10% to ownerWithdrawableBnb (owner withdrawOwnerBnb only).'

  if (lang === 'en') {
    return `Mint BPKM genesis on BNB Chain with Binance Agentic Wallet (native BNB, 4 rounds).

Eligibility: Agent ID on ${registry}, wallet owns handle. No mint without Agent ID.

Site: ${page}
Mint ${mint} / BPKM ${token}

${rounds}

${schedule}

${cards}

Steps: baw sign-in → read mintingRound/activeRound/allowanceOf → mint() payable with exact round priceWei (no excess BNB) → report Minted(round, species, BPKM). Exact 1 tx value per specs. Do not auto finalize unless I ask.`
  }

  if (lang === 'ja') {
    return `BNB 4 ラウンドで BPKM ジェネシスをミント。Agent ID 必須。

${rounds}

${schedule}

${cards}

Mint ${mint} · mint() に正確な priceWei を msg.value で。`
  }

  return `用币安 Agentic Wallet 在 BNB Chain 四轮 BNB 创世 mint BPKM。

资格：Agent Registry ${registry}，xxx.ai 归属调用钱包。

${rounds}

${schedule}

${cards}

合约 Mint ${mint} / BPKM ${token}
步骤：baw 登录 → 读 mintingRound、allowanceOf → mint() 附带精确 priceWei（勿多转 BNB）→ 播报 Minted 事件。轮次结束后可 finalizeRound；owner 10% 用 withdrawOwnerBnb。`
}

export const AGENT_PROMPT_SHORT = `BPKM 四轮 BNB mint · Agent ID · Mint ${ADDRESSES.mint}`
