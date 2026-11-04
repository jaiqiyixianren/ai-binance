import { JsonRpcProvider } from 'ethers'
const pad = (a) => a.toLowerCase().replace('0x', '').padStart(64, '0')
const addr = process.argv[2]
const M = '0x6288DFe86f22B53eEB6886aE2D78941de7483743'
const p = new JsonRpcProvider('https://bsc-dataseed.bnbchain.org', 56)
const fd = await p.call({ to: M, data: '0x1959a002' + pad(addr) })
console.log(BigInt('0x' + fd.slice(2, 66)).toString())
