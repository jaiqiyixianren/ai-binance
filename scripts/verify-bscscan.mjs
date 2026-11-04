/**
 * 在 BscScan 验证已部署源码（Standard JSON，与 deploy.mjs 相同 solc 设置）
 * 需要: BSCSCAN_API_KEY（https://bscscan.com/myapikey）
 * 用法: node verify-bscscan.mjs [token|mint|both]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import solc from 'solc'
import { ethers, getAddress } from 'ethers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcRoot = path.join(root, 'contracts', 'src')
const dep = JSON.parse(fs.readFileSync(path.join(root, 'deployments-bsc.json'), 'utf8'))
const API_KEY = process.env.BSCSCAN_API_KEY || process.env.ETHERSCAN_API_KEY
const target = process.argv[2] || 'both'

const REGISTRY = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F'
const ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
const DEAD = '0x000000000000000000000000000000000000dEaD'
const OWNER = getAddress(dep.owner)

function findImports(importPath) {
  const ozNpm = path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts')
  const ozLib = path.join(root, 'contracts', 'lib', 'openzeppelin-contracts', 'contracts')
  let p
  if (importPath.startsWith('@openzeppelin/contracts/')) {
    const rel = importPath.slice('@openzeppelin/contracts/'.length)
    p = fs.existsSync(path.join(ozNpm, rel)) ? path.join(ozNpm, rel) : path.join(ozLib, rel)
  } else if (importPath.startsWith('./interfaces/')) {
    p = path.join(srcRoot, importPath.slice(2))
  } else if (importPath === './BinancePokemon.sol') {
    p = path.join(srcRoot, 'BinancePokemon.sol')
  } else {
    return { error: 'File not found: ' + importPath }
  }
  if (!fs.existsSync(p)) return { error: 'File not found: ' + importPath }
  return { contents: fs.readFileSync(p, 'utf8') }
}

function buildStandardJson() {
  const sources = {}

  function resolveImport(fromKey, imp) {
    if (imp.startsWith('@')) return imp
    const base = fromKey.includes('/') ? path.posix.dirname(fromKey) : ''
    return path.posix.normalize(path.posix.join(base, imp))
  }

  function readImport(importPath) {
    if (sources[importPath]) return { contents: sources[importPath].content }
    const ozNpm = path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts')
    const ozLib = path.join(root, 'contracts', 'lib', 'openzeppelin-contracts', 'contracts')
    let filePath
    if (importPath.startsWith('@openzeppelin/contracts/')) {
      const rel = importPath.slice('@openzeppelin/contracts/'.length)
      filePath = fs.existsSync(path.join(ozNpm, rel)) ? path.join(ozNpm, rel) : path.join(ozLib, rel)
    } else if (importPath.startsWith('./interfaces/')) {
      filePath = path.join(srcRoot, importPath.slice(2))
    } else if (importPath === './BinancePokemon.sol') {
      filePath = path.join(srcRoot, 'BinancePokemon.sol')
    } else if (importPath === 'BinancePokemon.sol') {
      filePath = path.join(srcRoot, 'BinancePokemon.sol')
    } else if (importPath === 'BinancePokemonMint.sol') {
      filePath = path.join(srcRoot, 'BinancePokemonMint.sol')
    } else if (importPath === 'interfaces/IAgentRegistry.sol') {
      filePath = path.join(srcRoot, 'interfaces/IAgentRegistry.sol')
    } else {
      return { error: 'File not found: ' + importPath }
    }
    if (!fs.existsSync(filePath)) return { error: 'File not found: ' + importPath }
    const content = fs.readFileSync(filePath, 'utf8')
    sources[importPath] = { content }
    return { contents: content }
  }

  for (const key of ['BinancePokemon.sol', 'BinancePokemonMint.sol', 'interfaces/IAgentRegistry.sol']) {
    readImport(key)
  }
  // 递归拉齐 OpenZeppelin 依赖
  const importRe = /import\s+(?:[\w\s{},*]+\s+from\s+)?"([^"]+)"/g
  let added = true
  while (added) {
    added = false
    for (const key of [...Object.keys(sources)]) {
      const content = sources[key].content
      importRe.lastIndex = 0
      let m
      while ((m = importRe.exec(content))) {
        const imp = resolveImport(key, m[1])
        if (sources[imp]) continue
        const r = readImport(imp)
        if (!r.error) added = true
      }
    }
  }

  const json = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
    },
  }
  if (process.env.DEBUG_VERIFY_SOURCES) {
    console.log('sources', Object.keys(sources).length, 'Context', '@openzeppelin/contracts/utils/Context.sol' in sources)
  }
  return json
}

function compile() {
  const input = buildStandardJson()
  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }))
  const errs = (out.errors || []).filter((e) => e.severity === 'error')
  if (errs.length) throw new Error(errs.map((e) => e.formattedMessage).join('\n'))
  return { input, out }
}

async function fetchBytecode(address) {
  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org', 56)
  const code = await provider.getCode(address)
  return code
}

function localCreationBytecode(out, file, name, ctorArgs) {
  const c = out.contracts[file][name]
  let bytecode = '0x' + c.evm.bytecode.object
  if (ctorArgs.length) {
    const ctor = c.abi.find((x) => x.type === 'constructor')
    const types = ctor?.inputs?.map((i) => i.type) ?? []
    if (types.length) {
      bytecode = ethers.concat([bytecode, ethers.AbiCoder.defaultAbiCoder().encode(types, ctorArgs)])
    }
  }
  return bytecode.toLowerCase()
}

const API_BASE = 'https://api.etherscan.io/v2/api?chainid=56'

function compilerVersionForApi() {
  const v = solc.version().split('.Emscripten')[0]
  return v.startsWith('v') ? v : `v${v}`
}

async function submitVerify({ address, contractName, sourceJson, constructorArgs }) {
  const body = new URLSearchParams({
    apikey: API_KEY,
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: address,
    codeformat: 'solidity-standard-json-input',
    sourceCode: JSON.stringify(sourceJson),
    contractname: contractName,
    compilerversion: compilerVersionForApi(),
    optimizationUsed: '1',
    runs: '200',
    constructorArguements: constructorArgs.replace(/^0x/, ''),
    evmversion: 'default',
    licenseType: '3',
  })
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`API non-JSON (${res.status}): ${text.slice(0, 200)}`)
  }
}

async function pollGuid(guid) {
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const u = new URL(API_BASE)
    u.searchParams.set('apikey', API_KEY)
    u.searchParams.set('module', 'contract')
    u.searchParams.set('action', 'checkverifystatus')
    u.searchParams.set('guid', guid)
    const json = await fetch(u).then((r) => r.json())
    console.log('status', json.result || json.message)
    if (json.status === '1' && String(json.result).toLowerCase().includes('pass')) return true
    if (String(json.result).toLowerCase().includes('fail')) throw new Error(json.result)
  }
  return false
}

async function verifyToken() {
  const { input, out } = compile()
  const addr = dep.token
  const ctorArgs = [OWNER]
  const deployed = await fetchBytecode(addr)
  const local = localCreationBytecode(out, 'BinancePokemon.sol', 'BinancePokemon', ctorArgs)
  if (deployed.toLowerCase() !== local) {
    console.warn('WARN: local bytecode != chain (token). Still trying verify…')
  }
  const enc = ethers.AbiCoder.defaultAbiCoder().encode(['address'], ctorArgs).slice(2)
  const json = await submitVerify({
    address: addr,
    contractName: 'BinancePokemon.sol:BinancePokemon',
    sourceJson: input,
    constructorArgs: enc,
  })
  console.log('token submit', json)
  if (json.status !== '1') throw new Error(JSON.stringify(json))
  await pollGuid(json.result)
  console.log('Token verified:', `https://bscscan.com/address/${addr}#code`)
}

async function verifyMint() {
  const { input, out } = compile()
  const addr = dep.mint
  const ctorArgs = [OWNER, getAddress(dep.token), getAddress(REGISTRY), getAddress(ROUTER), getAddress(DEAD)]
  const deployed = await fetchBytecode(addr)
  const local = localCreationBytecode(out, 'BinancePokemonMint.sol', 'BinancePokemonMint', ctorArgs)
  if (deployed.toLowerCase() !== local) {
    console.warn('WARN: local bytecode != chain (mint). Still trying verify…')
  }
  const enc = ethers
    .AbiCoder.defaultAbiCoder()
    .encode(['address', 'address', 'address', 'address', 'address'], ctorArgs)
    .slice(2)
  const json = await submitVerify({
    address: addr,
    contractName: 'BinancePokemonMint.sol:BinancePokemonMint',
    sourceJson: input,
    constructorArgs: enc,
  })
  console.log('mint submit', json)
  if (json.status !== '1') throw new Error(JSON.stringify(json))
  await pollGuid(json.result)
  console.log('Mint verified:', `https://bscscan.com/address/${addr}#code`)
}

async function main() {
  if (!API_KEY) {
    throw new Error('请设置环境变量 BSCSCAN_API_KEY（https://bscscan.com/myapikey）')
  }
  if (target === 'token' || target === 'both') await verifyToken()
  if (target === 'mint' || target === 'both') await verifyMint()
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
