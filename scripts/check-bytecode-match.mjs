import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import solc from 'solc'
import { ethers, getAddress } from 'ethers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcRoot = path.join(root, 'contracts', 'src')
const dep = JSON.parse(fs.readFileSync(path.join(root, 'deployments-bsc.json'), 'utf8'))

function findImports(importPath) {
  const ozNpm = path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts')
  let p
  if (importPath.startsWith('@openzeppelin/contracts/')) {
    p = path.join(ozNpm, importPath.slice('@openzeppelin/contracts/'.length))
  } else if (importPath.startsWith('./interfaces/')) {
    p = path.join(srcRoot, importPath.slice(2))
  } else if (importPath === './BinancePokemon.sol') {
    p = path.join(srcRoot, 'BinancePokemon.sol')
  } else return { error: importPath }
  return { contents: fs.readFileSync(p, 'utf8') }
}

const sources = {
  'BinancePokemon.sol': { content: fs.readFileSync(path.join(srcRoot, 'BinancePokemon.sol'), 'utf8') },
  'BinancePokemonMint.sol': { content: fs.readFileSync(path.join(srcRoot, 'BinancePokemonMint.sol'), 'utf8') },
  'interfaces/IAgentRegistry.sol': {
    content: fs.readFileSync(path.join(srcRoot, 'interfaces/IAgentRegistry.sol'), 'utf8'),
  },
}
const input = {
  language: 'Solidity',
  sources,
  settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true, outputSelection: { '*': { '*': ['evm.bytecode'] } } },
}
const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }))
const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org', 56)

function deployedBytecode(file, name, ctorArgs) {
  const c = out.contracts[file][name]
  let b = '0x' + c.evm.bytecode.object
  const ctor = c.abi?.find?.((x) => x.type === 'constructor')
  const types = ctor?.inputs?.map((i) => i.type) ?? []
  if (types.length) b = ethers.concat([b, ethers.AbiCoder.defaultAbiCoder().encode(types, ctorArgs)])
  return b.toLowerCase()
}

const owner = getAddress(dep.owner)
const tokenArgs = [owner]
const mintArgs = [
  owner,
  getAddress(dep.token),
  getAddress('0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F'),
  getAddress('0x10ED43C718714eb63d5aA57B78B54704E256024E'),
  getAddress('0x000000000000000000000000000000000000dEaD'),
]

for (const [label, addr, file, name, args] of [
  ['token', dep.token, 'BinancePokemon.sol', 'BinancePokemon', tokenArgs],
  ['mint', dep.mint, 'BinancePokemonMint.sol', 'BinancePokemonMint', mintArgs],
]) {
  const onChain = (await provider.getCode(addr)).toLowerCase()
  const local = deployedBytecode(file, name, args)
  console.log(label, addr, onChain === local ? 'MATCH' : 'MISMATCH', 'len', onChain.length, local.length)
}
