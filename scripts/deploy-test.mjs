/**
 * 部署测试 Mint：每轮 10 分钟，第 1 轮 0.0002 BNB，部署即开窗。
 * 输出 deployments-bsc-test.json
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import solc from 'solc'
import { ethers, Mnemonic, HDNodeWallet, Wallet } from 'ethers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcRoot = path.join(root, 'contracts', 'src')
const RPC = process.env.BSC_RPC || 'https://bsc-dataseed.binance.org'
const KEY_FILE = process.env.DEPLOYER_KEY_FILE
const REGISTRY = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F'
const ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
const DEAD = '0x000000000000000000000000000000000000dEaD'

function loadDeployWallet(provider) {
  let raw
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    raw = process.env.DEPLOYER_PRIVATE_KEY.trim()
  } else if (KEY_FILE) {
    raw = fs.readFileSync(KEY_FILE, 'utf8').trim()
  } else {
    const fallback = path.join(process.env.USERPROFILE || '', 'Desktop', '新建 文本文档 (2).txt')
    if (fs.existsSync(fallback)) raw = fs.readFileSync(fallback, 'utf8').trim()
    else throw new Error('Set DEPLOYER_KEY_FILE or DEPLOYER_PRIVATE_KEY')
  }
  const compact = raw.replace(/\s+/g, ' ').trim()
  const words = compact.split(' ').filter(Boolean)
  if (words.length >= 12 && words.length <= 24) {
    const m = Mnemonic.fromPhrase(words.join(' '))
    return HDNodeWallet.fromMnemonic(m, "m/44'/60'/0'/0/0").connect(provider)
  }
  let k = compact.replace(/\s/g, '')
  if (!k.startsWith('0x')) k = '0x' + k
  return new Wallet(k, provider)
}

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

function compileTestMint() {
  const sources = {
    'BinancePokemon.sol': { content: fs.readFileSync(path.join(srcRoot, 'BinancePokemon.sol'), 'utf8') },
    'BinancePokemonMintTest.sol': {
      content: fs.readFileSync(path.join(srcRoot, 'BinancePokemonMintTest.sol'), 'utf8'),
    },
    'interfaces/IAgentRegistry.sol': {
      content: fs.readFileSync(path.join(srcRoot, 'interfaces', 'IAgentRegistry.sol'), 'utf8'),
    },
  }
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
    },
  }
  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }))
  const errs = (out.errors || []).filter((e) => e.severity === 'error')
  if (errs.length) {
    console.error(errs.map((e) => e.formattedMessage).join('\n'))
    throw new Error('Compile failed')
  }
  const c = out.contracts['BinancePokemonMintTest.sol'].BinancePokemonMintTest
  return { abi: c.abi, bytecode: '0x' + c.evm.bytecode.object, contractName: 'BinancePokemonMintTest' }
}

function compileToken() {
  const sources = {
    'BinancePokemon.sol': { content: fs.readFileSync(path.join(srcRoot, 'BinancePokemon.sol'), 'utf8') },
  }
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
    },
  }
  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }))
  const errs = (out.errors || []).filter((e) => e.severity === 'error')
  if (errs.length) throw new Error('Token compile failed')
  const c = out.contracts['BinancePokemon.sol'].BinancePokemon
  return { abi: c.abi, bytecode: '0x' + c.evm.bytecode.object, contractName: 'BinancePokemon' }
}

function encodeConstructorData(abi, bytecode, args) {
  const ctor = abi.find((x) => x.type === 'constructor')
  if (!ctor || !args.length) return bytecode
  const types = ctor.inputs.map((i) => i.type)
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(types, args)
  return ethers.concat([bytecode, encoded])
}

async function deploy(wallet, artifact, args) {
  const gasLimit = artifact.contractName === 'BinancePokemonMintTest' ? 4_000_000n : 2_500_000n
  const fee = await wallet.provider.getFeeData()
  const gasPrice = fee.gasPrice ?? 1_000_000_000n
  const data = encodeConstructorData(artifact.abi, artifact.bytecode, args)
  const nonce = await wallet.getNonce('pending')
  console.log(`Deploying ${artifact.contractName} nonce=${nonce} gasLimit=${gasLimit}`)
  const tx = await wallet.sendTransaction({ data, gasLimit, gasPrice, type: 0 })
  console.log('tx', tx.hash)
  const receipt = await tx.wait()
  const addr = receipt.contractAddress ?? ethers.getCreateAddress({ from: wallet.address, nonce })
  console.log(artifact.contractName, addr, 'block', receipt.blockNumber)
  return { address: addr, blockNumber: receipt.blockNumber }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC, 56)
  const wallet = loadDeployWallet(provider)
  console.log('Deployer', wallet.address)
  console.log('BNB', ethers.formatEther(await provider.getBalance(wallet.address)))

  const tokenArt = compileToken()
  const mintArt = compileTestMint()

  const tokenDeploy = await deploy(wallet, tokenArt, [wallet.address])
  const mintDeploy = await deploy(wallet, mintArt, [
    wallet.address,
    ethers.getAddress(tokenDeploy.address),
    ethers.getAddress(REGISTRY),
    ethers.getAddress(ROUTER),
    ethers.getAddress(DEAD),
  ])

  const tokenContract = new ethers.Contract(tokenDeploy.address, tokenArt.abi, wallet)
  const tx = await tokenContract.setMinter(mintDeploy.address)
  await tx.wait()
  console.log('setMinter', tx.hash)

  const mintRead = new ethers.Contract(mintDeploy.address, mintArt.abi, provider)
  const start = await mintRead.round1StartTimestamp()
  const dur = await mintRead.ROUND_DURATION()
  const mr = await mintRead.mintingRound()
  console.log('round1Start', start.toString(), 'ROUND_DURATION', dur.toString(), 'mintingRound', mr)

  const out = {
    variant: 'test-10m',
    chainId: 56,
    deployer: wallet.address,
    owner: wallet.address,
    token: tokenDeploy.address,
    mint: mintDeploy.address,
    mintFromBlock: mintDeploy.blockNumber,
    roundDurationSec: Number(dur),
    setMinterTx: tx.hash,
    tokenFromBlock: tokenDeploy.blockNumber,
  }
  const outPath = path.join(root, 'deployments-bsc-test.json')
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log('Saved', outPath)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
