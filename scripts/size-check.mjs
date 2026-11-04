import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import solc from 'solc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcRoot = path.join(root, 'contracts', 'src')

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
  return { contents: readFileSync(p, 'utf8') }
}

const sources = {
  'BinancePokemon.sol': { content: readFileSync(path.join(srcRoot, 'BinancePokemon.sol'), 'utf8') },
  'BinancePokemonMint.sol': { content: readFileSync(path.join(srcRoot, 'BinancePokemonMint.sol'), 'utf8') },
  'interfaces/IAgentRegistry.sol': {
    content: readFileSync(path.join(srcRoot, 'interfaces/IAgentRegistry.sol'), 'utf8'),
  },
}
const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['evm.bytecode'] } },
  },
}
const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }))
for (const f of Object.keys(out.contracts)) {
  for (const n of Object.keys(out.contracts[f])) {
    const len = out.contracts[f][n].evm.bytecode.object.length / 2
    console.log(`${n}: ${len} bytes (limit 24576)`)
  }
}
