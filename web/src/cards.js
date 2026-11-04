/** 与链上 CardSpecies enum 顺序一致（v2 合约） */
export const LEGACY_MINT = '0x4a144D1A5Ca9C8e60A93C9836DD8740eB216FF5C'

/** 预览 v2 十卡 UI（Mint 地址仍为旧主网时） */
const FORCE_V2_UI = import.meta.env.VITE_SHOW_CARDS_V2 === 'true'

/** @param {string|undefined|null} mintAddress */
export function cardsForMint(mintAddress) {
  if (FORCE_V2_UI) return CARDS_V2
  if (mintAddress && mintAddress.toLowerCase() === LEGACY_MINT.toLowerCase()) {
    return CARDS_V1
  }
  return CARDS_V2
}

/** 主网已部署 v1：tier 0/1/2 */
export const CARDS_V1 = [
  {
    species: 0,
    slug: 'magikarp',
    nameEn: 'Magikarp',
    nameZh: '鲤鱼王',
    multiplier: 1,
    probabilityPct: 94,
    accent: '#e85d4c',
    glow: 'rgba(232, 93, 76, 0.35)',
    tagline: '常见 · 1× 底额',
    taglineEn: 'Common · 1× base',
    taglineJa: '一般 · 1× ベース',
    nameJa: 'コイキング',
    image: '/pokemon/magikarp.png',
  },
  {
    species: 1,
    slug: 'pikachu',
    nameEn: 'Pikachu',
    nameZh: '皮卡丘',
    multiplier: 2,
    probabilityPct: 5,
    accent: '#ffcb05',
    glow: 'rgba(255, 203, 5, 0.4)',
    tagline: '强力 · 2× 底额',
    taglineEn: 'Strong · 2× base',
    taglineJa: '強力 · 2× ベース',
    nameJa: 'ピカチュウ',
    image: '/pokemon/pikachu.png',
  },
  {
    species: 2,
    slug: 'mewtwo',
    nameEn: 'Mewtwo',
    nameZh: '超梦',
    multiplier: 5,
    probabilityPct: 1,
    accent: '#9b7ed9',
    glow: 'rgba(155, 126, 217, 0.45)',
    tagline: '传说 · 10× 底额',
    taglineEn: 'Legend · 10× base',
    taglineJa: '伝説 · 10× ベース',
    nameJa: 'ミュウツー',
    image: '/pokemon/mewtwo.png',
  },
]

/** v2：10 种 · 档内均分 */
export const CARDS_V2 = [
  {
    species: 0,
    rarity: 1,
    slug: 'magikarp',
    nameEn: 'Magikarp',
    nameZh: '鲤鱼王',
    multiplier: 1,
    probabilityPct: 12.2,
    accent: '#e85d4c',
    glow: 'rgba(232, 93, 76, 0.35)',
    tagline: '第一档 · 1×',
    nameJa: 'コイキング',
    image: '/pokemon/magikarp.png',
  },
  {
    species: 1,
    rarity: 1,
    slug: 'squirtle',
    nameEn: 'Squirtle',
    nameZh: '杰尼龟',
    multiplier: 1,
    probabilityPct: 12.2,
    accent: '#4a9fd8',
    glow: 'rgba(74, 159, 216, 0.35)',
    tagline: '第一档 · 1×',
    nameJa: 'ゼニガメ',
    image: '/pokemon/squirtle.png',
  },
  {
    species: 2,
    rarity: 1,
    slug: 'bulbasaur',
    nameEn: 'Bulbasaur',
    nameZh: '妙蛙种子',
    multiplier: 1,
    probabilityPct: 12.2,
    accent: '#6ab04c',
    glow: 'rgba(106, 176, 76, 0.35)',
    tagline: '第一档 · 1×',
    nameJa: 'フシギダネ',
    image: '/pokemon/bulbasaur.png',
  },
  {
    species: 3,
    rarity: 1,
    slug: 'caterpie',
    nameEn: 'Caterpie',
    nameZh: '绿毛虫',
    multiplier: 1,
    probabilityPct: 12.2,
    accent: '#8bc34a',
    glow: 'rgba(139, 195, 74, 0.35)',
    tagline: '第一档 · 1×',
    nameJa: 'キャタピー',
    image: '/pokemon/caterpie.png',
  },
  {
    species: 4,
    rarity: 2,
    slug: 'pikachu',
    nameEn: 'Pikachu',
    nameZh: '皮卡丘',
    multiplier: 2,
    probabilityPct: 9.6,
    accent: '#ffcb05',
    glow: 'rgba(255, 203, 5, 0.4)',
    tagline: '第二档 · 2×',
    nameJa: 'ピカチュウ',
    image: '/pokemon/pikachu.png',
  },
  {
    species: 5,
    rarity: 2,
    slug: 'meowth',
    nameEn: 'Meowth',
    nameZh: '喵喵',
    multiplier: 2,
    probabilityPct: 9.6,
    accent: '#c9a227',
    glow: 'rgba(201, 162, 39, 0.35)',
    tagline: '第二档 · 2×',
    nameJa: 'ニャース',
    image: '/pokemon/meowth.png',
  },
  {
    species: 6,
    rarity: 2,
    slug: 'sandshrew',
    nameEn: 'Sandshrew',
    nameZh: '穿山甲',
    multiplier: 2,
    probabilityPct: 9.6,
    accent: '#d4a574',
    glow: 'rgba(212, 165, 116, 0.35)',
    tagline: '第二档 · 2×',
    nameJa: 'サンド',
    image: '/pokemon/sandshrew.png',
  },
  {
    species: 7,
    rarity: 3,
    slug: 'buzzwole',
    nameEn: 'Buzzwole',
    nameZh: '爆肌蚊',
    multiplier: 3,
    probabilityPct: 8.4,
    accent: '#e74c3c',
    glow: 'rgba(231, 76, 60, 0.35)',
    tagline: '第三档 · 3×',
    nameJa: 'マッシブーン',
    image: '/pokemon/buzzwole.png',
  },
  {
    species: 8,
    rarity: 3,
    slug: 'ekans',
    nameEn: 'Ekans',
    nameZh: '阿柏蛇',
    multiplier: 3,
    probabilityPct: 8.4,
    accent: '#8e44ad',
    glow: 'rgba(142, 68, 173, 0.35)',
    tagline: '第三档 · 3×',
    nameJa: 'アーボ',
    image: '/pokemon/ekans.png',
  },
  {
    species: 9,
    rarity: 4,
    slug: 'mewtwo',
    nameEn: 'Mewtwo',
    nameZh: '超梦',
    multiplier: 5,
    probabilityPct: 5.6,
    accent: '#9b7ed9',
    glow: 'rgba(155, 126, 217, 0.45)',
    tagline: '第四档 · 10×',
    nameJa: 'ミュウツー',
    image: '/pokemon/mewtwo.png',
  },
]

/** 首页四轮展示顺序：鲤鱼王 → 超梦 → 穿山鼠 → 皮卡丘 */
export const CARDS_FEATURED_FOUR = (() => {
  const order = ['magikarp', 'mewtwo', 'sandshrew', 'pikachu']
  return order.map((slug) => CARDS_V2.find((c) => c.slug === slug)).filter(Boolean)
})()

/** @deprecated 使用 cardsForMint */
export const CARDS = CARDS_V2

export function cardMetaForSpecies(species, mintAddress) {
  const set = cardsForMint(mintAddress)
  return set.find((c) => c.species === species) ?? null
}

export function formatBpkmAmount(baseWei, multiplier, decimals = 18) {
  if (!baseWei) return '—'
  const base = Number(baseWei) / 10 ** decimals
  return (base * multiplier).toLocaleString('zh-CN')
}
