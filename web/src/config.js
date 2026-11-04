export const BSC_CHAIN_ID = 56

/** 空 = 正式；test-10m = 每轮 10 分钟测试部署 */
export const SITE_VARIANT = import.meta.env.VITE_SITE_VARIANT || ''

export const PUBLIC_BSC_RPC =
  import.meta.env.VITE_BSC_RPC || 'https://bsc-dataseed.binance.org'

/** 部署后填写 .env；未配置时页面仍展示卡牌与轮次说明，但不拉链 */
export const ADDRESSES = {
  mint: import.meta.env.VITE_MINT_ADDRESS || '',
  token: import.meta.env.VITE_TOKEN_ADDRESS || '',
  usdt: '0x55d398326f99059fF775485246999027B3197955',
  agentRegistry: '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F',
}

export const MINT_ABI = [
  'function NUM_ROUNDS() view returns (uint256)',
  'function ROUND_DURATION() view returns (uint256)',
  'function ROUND1_START_TIMESTAMP() view returns (uint256)',
  'function round1StartTimestamp() view returns (uint256)',
  'function roundStart(uint256 r) view returns (uint256)',
  'function roundEnd(uint256 r) view returns (uint256)',
  'function rounds(uint256) view returns (uint256 capWei, uint256 priceWei, uint256 maxMintPerWallet)',
  'function raisedBnb(uint256) view returns (uint256)',
  'function roundFinalized(uint256) view returns (bool)',
  'function mintingRound() view returns (uint256 r, bool inWindow)',
  'function activeRound() view returns (uint256 r, bool ok)',
  'function ownerWithdrawableBnb() view returns (uint256)',
  'function totalMintCount() view returns (uint256)',
  'function tokensPerMint() view returns (uint256)',
  'function mintedByWallet(uint256 round, address) view returns (uint256)',
  'function allowanceOf(address) view returns (uint256)',
  'function agentOf(address) view returns (uint256 agentId, bool ok)',
  'function cardTierByAgent(uint256) view returns (uint8)',
  'function multiplierByAgent(uint256) view returns (uint8)',
  'function mint() payable',
  'function finalizeRound(uint256 r)',
  'event Minted(address indexed minter, uint256 indexed round, uint256 indexed agentId, string handle, uint8 species, uint8 multiplier, uint256 amountBPKM, uint256 bnbPaid, uint256 raisedInRoundAfter)',
]

export const MINT_LOG_FROM_BLOCK = Number(import.meta.env.VITE_MINT_FROM_BLOCK || 0) || null

/** 与合约 constructor 一致（展示用） */
export const ROUND1_START_UNIX = 1_793_876_400
export const ROUND_DURATION_SEC =
  Number(import.meta.env.VITE_ROUND_DURATION_SEC || 0) || 24 * 60 * 60

export const ROUND_SPECS = [
  { capBnb: 10, priceBnb: 0.002, maxPerWallet: 10 },
  { capBnb: 36, priceBnb: 0.004, maxPerWallet: 10 },
  { capBnb: 54, priceBnb: 0.006, maxPerWallet: 10 },
  { capBnb: 81, priceBnb: 0.009, maxPerWallet: 10 },
]
