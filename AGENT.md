# 币安宝可梦 (BPKM) — Agent 操作说明

> 给用户复制到 Cursor / Hark 的整段话见 **`web/public/agent-prompt.txt`** 或网页「Agent 提示词」区块。  
> 机器可读摘要：**`llms.txt`**

---

## 用户可直接粘贴的提示词（MOAT 风格）

```
帮我用币安 Agentic Wallet 在 BNB Chain 主网铸造币安宝可梦（BPKM）创世卡。

资格：仅限已在 SPACE ID Agent ID Registry（0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F）注册、且 handle 归属调用钱包的 Binance Agent ID（xxx.ai）。每个 Agent ID 终身 1 次；全局 10,000 次。无 Agent ID 不要发起 mint。

活动页：（你的 web 部署 URL，如 https://example.com/）
合约：BinancePokemonMint 0x4a144D1A5Ca9C8e60A93C9836DD8740eB216FF5C / BPKM 0xc551f27Ba30012DB696Cffe2d2bA128401Ed8D67 / USDT 0x55d398326f99059fF775485246999027B3197955

价格与卡牌：每次固定 1 USDT；mint 后链上随机（mint 前不得承诺）。**v2 Mint（新部署）** 十种 species 0–9：第一档 48.8% 四均分（鲤鱼王/杰尼龟/妙蛙种子/绿毛虫，1×）；第二档 28.8% 三均分（皮卡丘/喵喵/穿山鼠，2×）；第三档 16.8% 二均分（爆肌蚊/阿柏蛇，3×）；第四档 5.6% 超梦（5×）。**当前主网 Mint** 仍为 v1 三卡 94% / 5% / 1%。结果以 `Minted` 的 species（或旧 tier）/ multiplier / amountBPKM 为准。

步骤（优先 baw；personal_sign 不适用 mint，mint 为链上交易）：
1) 安装 Skill：npx skills add binance/binance-skills-hub --skill binance-agentic-wallet；baw auth signin（App 扫码）。
2) 确认 Agent ID：baw wallet agent-id --json → claimed=true，记录 xxx.ai。
3) 只读检查（必须）：finalized()/soldOut()、remaining()、agentOf(钱包).ok、allowanceOf(钱包) 须为 1、MINT_PRICE()=1e18、USDT 余额≥1、BNB 够 gas；allowance(USDT→Mint)≥1 USDT。
4) 若 allowance 不足：USDT.approve(Mint, 1 USDT) **精确额度**，单独预览 → 用户确认 → 等 receipt。
5) Mint.mint() 无参数，单独预览 → 用户确认 → 等 receipt。
6) 用中文直接告诉用户结果（不要贴原始 JSON）：实付 1 USDT、卡牌（鲤鱼王/皮卡丘/超梦）、实得 BPKM、BscScan tx 链接；tier 0/1/2。若 allowanceOf=0 说明已铸过，如实停止。
7) 不要无限 approve、不要自动 finalize/withdraw、不要改次数；满 10,000 次后的 finalize 除非用户明确要求。
```

---

## 合约（BSC 主网 56）

| 角色 | 地址 |
|------|------|
| BinancePokemonMint | `0x4a144D1A5Ca9C8e60A93C9836DD8740eB216FF5C` |
| BPKM | `0xc551f27Ba30012DB696Cffe2d2bA128401Ed8D67` |
| USDT | `0x55d398326f99059fF775485246999027B3197955` |
| Agent ID Registry | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` |
| Pancake Router V2 | `0x10ED43C718714eb63d5aA57B78B54704E256024E` |

## 卡牌（mint 后读链上）

**v1（主网 `0x4a144…`）**

| species | 名称 | 概率 | 倍数 |
|---------|------|------|------|
| 0 | 鲤鱼王 | 94% | 1× |
| 1 | 皮卡丘 | 5% | 2× |
| 2 | 超梦 | 1% | 5× |

**v2（新部署后）** — 见 `web/src/cards.js` `CARDS_V2`；`cardTierByAgent` 返回 species 0–9。

只读：`cardTierByAgent(agentId)`、`multiplierByAgent(agentId)`、`tierRules()`；事件 `Minted(...)`。

## baw 原则

与 Ptah 相同：每步模拟 → 展示网络/地址/金额/风险 → **用户确认一次** → receipt → 再下一步。

## 加池（通常不由用户 Agent 触发）

满 10,000 次后 `finalize()`：USDT 余额 90% 加池 + 1 亿 BPKM；约 10% USDT 留合约，owner `withdrawUsdt`。

---

非 Binance 官方 · DYOR · 粉丝向主题
