# 部署说明

## 一共要部署几个合约？

**2 个**（都要部署到 BSC 主网）：

| 顺序 | 合约 | 作用 |
|------|------|------|
| 1 | `BinancePokemon` | BPKM 代币（ERC20） |
| 2 | `BinancePokemonMint` | 收 USDT、校验 Agent ID、铸币、满 10,000 份加池 |

部署脚本还会执行一步链上配置：**把 Token 的 minter 设为 Mint 合约**（`token.setMinter(mint地址)`）。  
USDT、Agent Registry、Pancake Router 是链上已有合约，**不用**你部署。

---

## 方式 A：Foundry（推荐）

```powershell
cd C:\Users\72666\Desktop\ai_binance
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts --no-commit
$env:DEPLOYER_PRIVATE_KEY = "0x你的私钥"
forge script contracts/script/Deploy.s.sol:DeployScript --rpc-url https://bsc-dataseed.binance.org --broadcast
```

- `--rpc-url` = 节点 URL（**不是**私钥）
- 私钥 = 环境变量 `DEPLOYER_PRIVATE_KEY`
- 部署钱包需有 BNB

控制台会打印 **Token 地址** 和 **Mint 地址**，写入 `web/.env`。

---

## 方式 B：网页部署（Remix + MetaMask）

可以，适合不想装 Foundry 的情况；仍是 **2 个合约 + 1 次 setMinter**。

### 1. 准备

- 浏览器 [Remix](https://remix.ethereum.org)
- MetaMask 切到 **BNB Smart Chain**
- 部署钱包有 BNB
- 在 Remix 加载本仓库 `contracts/src` 与 OpenZeppelin（或用 Remix 的 GitHub import）

### 2. 编译

- Solidity **0.8.24**
- 开启 optimizer（200 runs）

### 3. 部署 `BinancePokemon`

- Constructor 参数：`owner_` = 你的管理员地址（常用部署者自己）

### 4. 部署 `BinancePokemonMint`

Constructor 参数（BSC 主网固定值）：

| 参数 | 值 |
|------|-----|
| `owner_` | 管理员地址 |
| `usdt_` | `0x55d398326f99059fF775485246999027B3197955` |
| `token_` | 上一步 **BinancePokemon** 地址 |
| `agentRegistry_` | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` |
| `router_` | `0x10ED43C718714eb63d5aA57B78B54704E256024E` |
| `lpRecipient_` | `0x000000000000000000000000000000000000dEaD` |
### 5. 绑定 minter

在 **BinancePokemon** 合约上调用（仅 owner）：

- `setMinter(<BinancePokemonMint 地址>)`

### 6. 验证（可选但建议）

在 [BscScan](https://bscscan.com/verifyContract) 上传源码验证两个合约，方便用户与 Agent 读 ABI。

### 7. 前端

```env
VITE_MINT_ADDRESS=0x...
VITE_TOKEN_ADDRESS=0x...
```

---

## 部署后检查

```text
cast call <MINT> "maxMintPerAgent()(uint256)" --rpc-url https://bsc-dataseed.binance.org
→ 应返回 1

cast call <TOKEN> "minter()(address)" ...
→ 应等于 Mint 地址
```

---

## 常见误区

- 把私钥填进 RPC URL ❌  
- 只部署 Token、忘记 Mint 或忘记 `setMinter` ❌  
- 在测试网部署但 Agent/用户按主网 USDT 地址操作 ❌  
