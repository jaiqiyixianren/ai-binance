import { JsonRpcProvider } from 'ethers'
const pad = (a) => a.toLowerCase().replace('0x', '').padStart(64, '0')
const addr = process.argv[2]
const M = '0x6288DFe86f22B53eEB6886aE2D78941de7483743'
const p = new JsonRpcProvider('https://bsc-dataseed.bnbchain.org', 56)
const raw = await p.call({
  to: M,
  data: '0xe58f661c' + pad(addr) + '0000000000000000000000000000000000000000000000000000000000000001',
})
const word = (i) => BigInt('0x' + raw.slice(2 + 64 * i, 66 + 64 * i))
console.log(JSON.stringify({ aLeft: word(3).toString(), bLeft: word(6).toString(), aUsed: word(2).toString(), bUsed: word(5).toString() }))
