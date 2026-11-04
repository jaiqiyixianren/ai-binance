# BPKM 创世铸造 · 朋友离线包（测试用）

没有项目网页也能 mint。把**整个 `friend-kit` 文件夹**（或压缩成 zip）发给朋友即可。

## 朋友需要先具备

| 项 | 说明 |
|----|------|
| **网络** | BNB Chain **主网**（chainId **56**） |
| **Binance Agent ID** | 已注册 `xxx.ai`，且绑定到将要签名的钱包 |
| **余额** | ≥ **1 USDT**（BEP-20）+ 少量 **BNB** 作 Gas |
| **工具** | Cursor / Hark 等 + **binance-agentic-wallet（baw）** Skill |
| **次数** | 每个 Agent ID **终身 1 次**；全局 10,000 次 |

非 Binance 官方 · 粉丝向 · 自行 DYOR。

---

## 推荐操作（3 步）

### 1. 安装 baw 并登录

在 Agent 环境里（或终端）：

```bash
npx skills add binance/binance-skills-hub --skill binance-agentic-wallet
baw auth signin
```

用 Binance App 扫码，确保钱包在 **BSC 主网**。

### 2. 把文件交给 AI

在**新对话**里：

1. 上传或 @ 引用本文件夹里的 **`contracts-bsc.json`** 和 **`mint-read-write.abi.json`**（可选但强烈建议，避免 AI 搞错合约）。
2. **整段复制** **`给AI的提示词.txt`** 粘贴发送。

若 AI 说「工作目录为空」，告诉它：**不需要仓库**，以 `contracts-bsc.json` 里的 **`mint`** 地址为准调用 `mint()`，**不要**对 `agentRegistry` 调用 mint。

### 3. 在 App 里逐笔确认

AI 应分两步链上操作（每步都要你在 Binance App 确认）：

1. `USDT.approve(Mint, 1 USDT)` — **只授权 1 USDT**，不要无限授权  
2. `Mint.mint()` — 无参数  

成功后 AI 应告知：卡牌档位（鲤鱼王/皮卡丘/超梦）、BPKM 数量、BscScan 交易链接。

---

## 文件说明

| 文件 | 用途 |
|------|------|
| `给AI的提示词.txt` | 复制给 Cursor/Hark 的主指令 |
| `contracts-bsc.json` | 所有主网地址（机器可读） |
| `mint-read-write.abi.json` | Mint / USDT 最小 ABI，供 AI 读链与发交易 |
| `人类速查.md` | 不用 AI 时的手动核对清单 |

---

## 常见问题

**Q：只有 Registry 地址能买吗？**  
不能。必须对 **`BinancePokemonMint`**（`0x4a144D1A5Ca9C8e60A93C9836DD8740eB216FF5C`）调用 `mint()`。Registry 只查 Agent ID 资格。

**Q：没有 Agent ID 怎么办？**  
先在 Binance 侧完成 Agent ID（`.ai`）注册并绑定钱包，否则合约会 revert。

**Q：如何确认链上进度？**  
BscScan 打开 Mint 合约 → Read Contract / Events `Minted`。

---

## 合约速查（BSC 主网）

- **Mint（买卡用这个）**：`0x4a144D1A5Ca9C8e60A93C9836DD8740eB216FF5C`
- **BPKM 代币**：`0xc551f27Ba30012DB696Cffe2d2bA128401Ed8D67`
- **USDT**：`0x55d398326f99059fF775485246999027B3197955`
- **Agent Registry（仅资格）**：`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`
