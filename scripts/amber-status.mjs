import { Contract, JsonRpcProvider, id } from 'ethers'

const cfg = {
  rpc: 'https://bsc-rpc.publicnode.com',
  token: '0x4008a353d3476884DC8Cd8fBf314970C8409FB22',
  registry: '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F',
}
const p = new Contract(
  cfg.token,
  [
    'function isLive() view returns (bool)',
    'function startsAt() view returns (uint256)',
    'function dailyRemaining() view returns (uint256)',
    'function miningDay() view returns (uint256)',
    'function currentReward() view returns (uint256)',
    'function currentTarget() view returns (uint256)',
    'function successfulProofs() view returns (uint256)',
    'function seedIndex() view returns (uint256)',
    'function challenge(address wallet, uint256 id) view returns (bytes32 seed, uint256 target, uint256 reward, bool eligible, bool live, uint256 claims, uint256 day, uint256 index)',
  ],
  new JsonRpcProvider(cfg.rpc, 56, { staticNetwork: true }),
)
const reg = new Contract(cfg.registry, ['function handleOf(address) view returns (string)'], p.runner)

const block = await p.runner.getBlock('latest')
const live = await p.isLive()
const startsAt = await p.startsAt()
const dailyRem = await p.dailyRemaining()
const curReward = await p.currentReward()
const proofs = await p.successfulProofs()
const seedIdx = await p.seedIndex()

console.log(
  JSON.stringify(
    {
      isLive: live,
      blockTime: block.timestamp,
      blockTimeISO: new Date(block.timestamp * 1000).toISOString(),
      afterStart: block.timestamp >= Number(startsAt),
      startsAt: Number(startsAt),
      startsAtISO: new Date(Number(startsAt) * 1000).toISOString(),
      miningDay: (await p.miningDay()).toString(),
      dailyRemainingHuman: (Number(dailyRem) / 1e8).toFixed(2),
      currentRewardHuman: (Number(curReward) / 1e8).toFixed(4),
      successfulProofs: proofs.toString(),
      seedIndex: seedIdx.toString(),
    },
    null,
    2,
  ),
)

// sample: yuxi wallet if has handle
const sample = '0xf3F005BC1136d6Cc8eBb85cd939A304b70e0c8AC'
try {
  const handle = await reg.handleOf(sample)
  if (handle) {
    const agentId = BigInt(id(handle))
    const ch = await p.challenge(sample, agentId)
    console.log(
      'sampleWallet',
      sample,
      'handle',
      handle,
      JSON.stringify({
        eligible: ch.eligible,
        live: ch.live,
        reward: (Number(ch.reward) / 1e8).toFixed(4),
        index: ch.index.toString(),
      }),
    )
  }
} catch (e) {
  console.log('sample check skip', e.message)
}
