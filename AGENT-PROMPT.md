# 复制给 Cursor / Hark 的一键提示词

把下面整段（从「资格」到「记录页」）粘贴到 Agent 对话即可。

---

资格：仅限在 BSC 主网 **SPACE ID Agent ID Registry**（`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`）已注册且 soulbound 归属 `msg.sender` 的钱包（Binance **Agent ID / xxx.ai**）。无 Agent ID 不可 mint。活动页见项目 `web/` 部署地址或本地 `npm run dev`；Mint 合约 `0x4a144D1A5Ca9C8e60A93C9836DD8740eB216FF5C` / BPKM `0xc551f27Ba30012DB696Cffe2d2bA128401Ed8D67` / USDT `0x55d398326f99059fF775485246999027B3197955`。

额度：每个 **Agent ID 终身 1 次** mint，每次 **1 USDT**（18 位小数 1e18），全局 **10,000 次** 售罄为止。mint 后随机卡牌档位（链上伪随机，非 VRF）：**鲤鱼王 Magikarp 94%（1× 底额）/ 皮卡丘 Pikachu 5%（2×）/ 超梦 Mewtwo 1%（5×）**；底额默认 90,000 BPKM。满 10,000 次后需有人调用 `finalize()`：合约内 USDT **90%** 加 Pancake V2 池 + 1 亿 BPKM；**10%** 留合约由 owner `withdrawUsdt` 提走。

步骤（优先 **baw** / 币安 Agentic Wallet；网页只读，推荐 Agent 代操作）：

1. 安装 Skill：`npx skills add binance/binance-skills-hub --skill binance-agentic-wallet`；`baw auth signin` 配对，确认 `baw wallet agent-id` 已 Claimed（xxx.ai）。
2. 只读检查（必须全部通过再发交易）：`mint.finalized()`/`soldOut()` 未结束；`agentOf(钱包).ok == true`；`allowanceOf(钱包) == 1`；`remaining() > 0`；USDT 余额 ≥ 1；BNB 够 gas；USDT 对 Mint 的 allowance ≥ 1 USDT。
3. 若 allowance 不足：USDT **精确** `approve(Mint, 1 USDT)`，禁止无限授权；模拟 → 展示网络/金额 → 用户 App 确认一次 → 等 receipt。
4. 调用 `mint()`（无参数，非 payable）；模拟 → 展示将付 1 USDT、随机档位不可预知 → 用户确认 → 等 receipt。
5. 成功后读 `Minted` 事件或 `cardTierByAgent(agentId)` / `multiplierByAgent`：用**中文**告诉用户实付 USDT、卡牌名（鲤鱼王/皮卡丘/超梦）、实得 BPKM、BscScan 交易链接、该 Agent 已用尽 1 次额度、剩余全局 `remaining()`。不要承诺 mint 前开出哪张卡。
6. 禁止静默改金额、无限 approve、跳过预览；失败或中断后刷新状态再重新 approve/mint。
7. 详细合约说明与 cast 示例见仓库 `AGENT.md`；链上进度见活动页 / BscScan Mint 合约 Events。

帮我用已连接的 Agentic Wallet 在 BSC 主网铸造 1 次币安宝可梦（BPKM），严格按上面步骤执行。
