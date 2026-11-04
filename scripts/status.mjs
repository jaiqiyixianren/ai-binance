import { ethers } from 'ethers'

const p = new ethers.JsonRpcProvider(process.env.BSC_RPC || 'https://bsc.publicnode.com', 56)
const mint = new ethers.Contract(
  '0x4a144D1A5Ca9C8e60A93C9836DD8740eB216FF5C',
  [
    'function finalized() view returns (bool)',
    'function soldOut() view returns (bool)',
    'function totalMinted() view returns (uint256)',
    'function remaining() view returns (uint256)',
    'function maxMintPerAgent() view returns (uint256)',
    'function MINT_PRICE() view returns (uint256)',
  ],
  p,
)
const token = new ethers.Contract('0xc551f27Ba30012DB696Cffe2d2bA128401Ed8D67', ['function minter() view returns (address)'], p)

const [fin, sold, tm, rem, maxA, price, minter] = await Promise.all([
  mint.finalized(),
  mint.soldOut(),
  mint.totalMinted(),
  mint.remaining(),
  mint.maxMintPerAgent(),
  mint.MINT_PRICE(),
  token.minter(),
])
console.log(
  JSON.stringify(
    {
      open: !fin && !sold && rem > 0n,
      finalized: fin,
      soldOut: sold,
      totalMinted: tm.toString(),
      remaining: rem.toString(),
      maxMintPerAgent: maxA.toString(),
      mintPriceUsdt: ethers.formatUnits(price, 18),
      minterOk: minter.toLowerCase() === '0x4a144D1A5Ca9C8e60A93C9836DD8740eB216FF5C'.toLowerCase(),
    },
    null,
    2,
  ),
)
