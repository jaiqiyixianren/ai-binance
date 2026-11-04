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
    throw new Error('Set DEPLOYER_KEY_FILE or DEPLOYER_PRIVATE_KEY')
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

function compileContract(contractFileName, contractName) {
  const sources = {
    'BinancePokemon.sol': { content: fs.readFileSync(path.join(srcRoot, 'BinancePokemon.sol'), 'utf8') },
    'BinancePokemonMint.sol': { content: fs.readFileSync(path.join(srcRoot, 'BinancePokemonMint.sol'), 'utf8') },
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
  const file = contractFileName
  const c = out.contracts[file][contractName]
  return { abi: c.abi, bytecode: '0x' + c.evm.bytecode.object, contractName }
}

function encodeConstructorData(abi, bytecode, args) {
  const ctor = abi.find((x) => x.type === 'constructor')
  if (!ctor || !args.length) return bytecode
  const types = ctor.inputs.map((i) => i.type)
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(types, args)
  return ethers.concat([bytecode, encoded])
}

async function deploy(wallet, artifact, args) {
  const gasLimit = artifact.contractName === 'BinancePokemonMint' ? 4_000_000n : 2_500_000n
  const fee = await wallet.provider.getFeeData()
  const gasPrice = fee.gasPrice ?? 1_000_000_000n
  const data = encodeConstructorData(artifact.abi, artifact.bytecode, args)
  const nonce = await wallet.getNonce('pending')
  console.log(
    `Deploying ${artifact.contractName} nonce=${nonce} gasLimit=${gasLimit} initBytes=${(data.length - 2) / 2}`,
  )
  const tx = await wallet.sendTransaction({
    data,
    gasLimit,
    gasPrice,
    type: 0,
  })
  console.log('tx', tx.hash)
  const receipt = await tx.wait()
  const addr = receipt.contractAddress ?? ethers.getCreateAddress({ from: wallet.address, nonce })
  console.log(artifact.contractName, addr, 'block', receipt.blockNumber)
  return { address: addr, blockNumber: receipt.blockNumber }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC, 56)
  const wallet = loadDeployWallet(provider)
  const bal = await provider.getBalance(wallet.address)
  console.log('Deployer', wallet.address)
  console.log('BNB balance', ethers.formatEther(bal))
  if (bal < ethers.parseEther('0.0004')) {
    throw new Error('BNB too low for deploy')
  }
  if (bal < ethers.parseEther('0.004')) {
    console.warn('WARN: BNB may be insufficient for two contract deploys; recommend >= 0.004 BNB')
  }

  const tokenArt = compileContract('BinancePokemon.sol', 'BinancePokemon')
  const mintArt = compileContract('BinancePokemonMint.sol', 'BinancePokemonMint')

  let token = process.env.TOKEN_ADDRESS
  let tokenDeployBlock = null
  if (token) {
    console.log('Using existing Token', token)
  } else {
    const t = await deploy(wallet, tokenArt, [wallet.address])
    token = t.address
    tokenDeployBlock = t.blockNumber
  }
  const mintDeploy = await deploy(wallet, mintArt, [
    wallet.address,
    ethers.getAddress(token),
    ethers.getAddress(REGISTRY),
    ethers.getAddress(ROUTER),
    ethers.getAddress(DEAD),
  ])
  const mint = mintDeploy.address

  const tokenContract = new ethers.Contract(token, tokenArt.abi, wallet)
  const tx = await tokenContract.setMinter(mint)
  await tx.wait()
  console.log('setMinter', tx.hash)

  const out = {
    chainId: 56,
    deployer: wallet.address,
    owner: wallet.address,
    token,
    mint,
    mintFromBlock: mintDeploy.blockNumber,
    setMinterTx: tx.hash,
  }
  if (tokenDeployBlock != null) out.tokenFromBlock = tokenDeployBlock
  fs.writeFileSync(path.join(root, 'deployments-bsc.json'), JSON.stringify(out, null, 2))
  console.log('Saved deployments-bsc.json')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
