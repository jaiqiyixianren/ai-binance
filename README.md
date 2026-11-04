# 币安宝可梦 (Binance Pokemon / BPKM)

BSC 上的 Agent ID 专属创世铸造项目，网页布局参照 [珍珠币 · 创世挖矿](https://xn--ai-bk6esc.net/mining)，主题为宝可梦风格。

## 机制

| 项 | 值 |
|----|-----|
| 链 | BNB Smart Chain (56) |
| 资格 | SPACE ID Agent ID registry 已注册且 soulbound 归属 `msg.sender` |
| 价格 | 每次 **1 USDT**（与档位无关） |
| 产出 | 底额 90,000 BPKM；随机卡牌 **鲤鱼王 94% / 皮卡丘 5% / 超梦 1%**（1× / 2× / 5×） |
| 全局上限 | 10,000 次 mint |
| 每 Agent 上限 | **1 份**（链上 `maxMintPerAgent = 1`） |
| 满额 | 满 10,000 次后调用 `finalize()`：USDT **90%** + **1 亿 BPKM** → Pancake V2（LP 默认 dead） |
| USDT 去向 | 每笔 **1 USDT 全进 Mint 合约**；owner 用 `withdrawUsdt(任意地址, 数量)` 自提（如 10% 收益，一笔 Gas） |
| 加池 | 满 10,000 次后 `finalize()`：合约 USDT 的 **90%** 加池（满额且未提前提 ≈ **9,000**），**10%** 留合约由 owner `withdrawUsdt` |
| 开发者 | owner：`withdrawUsdt` / `withdrawBpkm`（中心化，需对外说明） |

## 仓库结构

- `contracts/` — Foundry + OpenZeppelin
- `web/` — 只读进度页 + Agent 指引（不提供网页一键铸造）
- `AGENT.md` — Cursor / Hark / baw 铸造说明
- `DEPLOY.md` — 2 个合约 + Remix / Foundry 部署步骤

## 开发

### 合约

```bash
cd contracts
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts --no-commit
forge build
```

部署（需 `DEPLOYER_PRIVATE_KEY` 与 BSC RPC）：

```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url bsc --broadcast
```

### 前端

```bash
cd web
cp .env.example .env
# 填入 VITE_MINT_ADDRESS / VITE_TOKEN_ADDRESS
npm install
npm run dev
```

## 免责声明

独立社区项目，非 Binance 官方。自行审计合约并 DYOR。
