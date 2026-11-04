/** Long-form copy for /guide and /crypto-notes */
export const guideDocs = {
  en: {
    whatList: [
      'Chain: BNB Smart Chain (mainnet, chain ID 56)',
      'Eligibility: Binance Agent ID (xxx.ai) registered and owned by your signing wallet',
      'Four rounds: each lasts 24 hours; up to 10 mints per wallet per round',
      'Payment: native BNB only (exact price per round); random card species + BPKM on-chain',
      'Round 1: cap 10 BNB · 0.002 BNB/mint · Round 2: 36 BNB · 0.004 · Round 3: 54 BNB · 0.006 · Round 4: 81 BNB · 0.009',
    ],
    prepSteps: [
      'Register Agent ID and bind the handle to the wallet you will use with baw.',
      'Install binance-agentic-wallet Skill; run baw auth signin and scan with Binance App.',
      'Hold enough BNB for the round price plus gas (no USDT or token approve for mint).',
      'Copy the mint prompt on Home and paste into Cursor / Hark.',
    ],
    flowSteps: [
      {
        tag: 'Check',
        text: 'Read-only: mintingRound / activeRound, allowanceOf(wallet), agentOf.ok, BNB balance ≥ round price + gas.',
      },
      {
        tag: 'Mint',
        text: 'Call Mint.mint() with msg.value equal to the current round priceWei (e.g. 0.0002 BNB in round 1). Preview in App → confirm → wait for receipt.',
      },
      {
        tag: 'Result',
        text: 'Read Minted event: round, species, multiplier, amountBPKM. Verify on BscScan.',
      },
    ],
    flowNote:
      'Mint is an on-chain transaction — confirm the App preview before you send.',
    footer: 'Next: read Safety notes, then copy the prompt on Home.',
  },
  zh: {
    whatList: [
      '链：BNB Smart Chain 主网（chain ID 56）',
      '资格：Binance Agent ID（xxx.ai）已注册且归属你的签名钱包',
      '四轮铸造：每轮开放 24 小时；每轮每钱包最多 10 次',
      '支付：仅原生 BNB（须与链上单价完全一致）；随机 species 卡牌 + BPKM',
      '第1轮 上限10 BNB·0.002/次 · 第2轮 36·0.004 · 第3轮 54·0.006 · 第4轮 81·0.009',
    ],
    prepSteps: [
      '完成 Agent ID 注册，handle 绑定到将与 baw 签名的钱包。',
      '安装 binance-agentic-wallet Skill，baw auth signin，Binance App 扫码。',
      '准备足量 BNB（本轮 mint 单价 + gas）；mint 不需要 USDT 或 approve。',
      '在首页复制铸造提示词，粘贴给 Cursor / Hark。',
    ],
    flowSteps: [
      {
        tag: '检查',
        text: '只读：mintingRound / activeRound、allowanceOf(钱包)、agentOf.ok、BNB 余额 ≥ 本轮单价 + gas。',
      },
      {
        tag: '铸造',
        text: '调用 Mint.mint()，msg.value 等于当前轮 priceWei（如第1轮 0.0002 BNB）。App 预览 → 确认 → 等 receipt。',
      },
      {
        tag: '结果',
        text: '从 Minted 事件读取 round、species、multiplier、amountBPKM，在 BscScan 核对。',
      },
    ],
    flowNote: 'mint 为链上交易；请在 Binance App 预览无误后再确认发送。',
    footer: '建议阅读币圈注意事项，回首页复制提示词。',
  },
  ja: {
    whatList: [
      'チェーン: BNB Smart Chain メインネット（56）',
      '資格: Binance Agent ID（xxx.ai）が署名ウォレットに紐付いていること',
      '4 ラウンド各 24h、ラウンドごとウォレット最大 10 回',
      '支払い: ネイティブ BNB のみ（priceWei と完全一致）· カード species + BPKM',
      'R1: 10 BNB·0.002 / R2: 36·0.004 / R3: 54·0.006 / R4: 81·0.009',
    ],
    prepSteps: [
      'Agent ID 登録、handle を baw ウォレットに紐付け。',
      'binance-agentic-wallet Skill、baw auth signin、App で QR。',
      'BNB（単価 + gas）を用意。USDT approve は不要。',
      'ホームからプロンプトをコピー。',
    ],
    flowSteps: [
      { tag: '確認', text: 'mintingRound、allowanceOf、agentOf、BNB 残高を読取。' },
      { tag: 'Mint', text: 'mint() に正確な priceWei を msg.value で。App で確認。' },
      { tag: '結果', text: 'Minted イベントを BscScan で確認。' },
    ],
    flowNote: 'mint はオンチェーン取引。App プレビューを確認してから送信。',
    footer: '安全の注意を読み、ホームでプロンプトをコピー。',
  },
}

export const cryptoDocs = {
  en: {
    wallet: [
      'Never share seed phrase or private key — anyone asking is a scam.',
      'Use a dedicated wallet with limited BNB for minting if you prefer isolation.',
      'Install Binance App and Skills from official Binance channels only.',
    ],
    approve: [
      'This mint pays native BNB in the transaction — no USDT approve step.',
      'In the App preview, check the Mint contract, method mint(), the BNB amount attached to this tx (must match on-chain price), and BNB Smart Chain.',
      'Reject unknown message signatures; mint is a contract call, not personal_sign.',
      'Revoke old token approvals on BscScan if you no longer use those contracts.',
    ],
    scam: [
      'Fake support, “double BPKM”, or new Mint addresses in DMs are usually phishing.',
      'Trust only addresses published on this site and what you read on BscScan.',
      'Review every transaction your Agent prepares before confirming.',
    ],
    token: [
      'After each round, finalizeRound sends 90% of that round’s BNB to LP.',
      'Follow laws that apply to you.',
    ],
    habits: [
      'Read-only checks first, then one mint tx — confirm each step in the App.',
      'Save tx hashes; verify Minted events and balances on BscScan.',
      'Up to 10 mints per wallet per round — do not follow unknown links under FOMO.',
      'On revert, stop and read the error (wrong time window, wrong BNB amount, quota, etc.).',
    ],
  },
  zh: {
    wallet: [
      '私钥/助记词任何人索要即诈骗；勿截图、勿发给 Agent 或陌生人。',
      '可用单独小额钱包参与 mint，与主资产隔离。',
      'Binance App、Skill 请从官方渠道获取。',
    ],
    approve: [
      '本项目 mint 直接付 BNB，不需要 USDT approve。',
      'App 预览里核对：Mint 合约地址、方法 mint()、本笔交易附带的 BNB 金额（须与链上单价一致）、网络为 BNB Smart Chain。',
      '拒绝不明「签名消息」；mint 是链上合约调用。',
      '不再使用的代币授权可在 BscScan 撤销。',
    ],
    scam: [
      '冒充客服、私信「新 Mint 地址」「双倍 BPKM」等多为钓鱼。',
      '以本站公布地址与你在 BscScan 上查到的为准。',
      'Agent 发起的每笔交易仍需你在 App 内人工确认。',
    ],
    token: [
      '每轮结束可 finalizeRound：该轮 BNB 90% 加池。',
      '请遵守你所在地区适用的法规。',
    ],
    habits: [
      '先只读检查，再发起 mint，分步在 App 确认。',
      '保存交易哈希，在 BscScan 核对 Minted 与余额。',
      '每轮每钱包最多 10 次，勿点未知链接。',
      '交易 revert 时先停，查清原因（未开窗、BNB 数额不对、次数已满等）再试。',
    ],
  },
  ja: {
    wallet: [
      'シード/秘密鍵は共有しない。',
      '必要なら小額専用ウォレットを使う。',
      'App / Skill は公式経路から。',
    ],
    approve: [
      '本 mint は BNB を tx に含める — USDT approve 不要。',
      'プレビューで Mint コントラクト、mint()、本 tx の BNB 額（オンチェーン単価と一致）、BNB Smart Chain を確認。',
      '不明な署名は拒否。',
      '不要な approve は revoke。',
    ],
    scam: [
      '偽サポート、新 Mint アドレス DM はフィッシング。',
      '公開アドレスと BscScan を信頼。',
      'Agent の tx も App で確認。',
    ],
    token: [
      'ラウンド終了後、finalizeRound でそのラウンド BNB の 90% が LP へ。',
      '適用法令を遵守。',
    ],
    habits: [
      '読取 → mint → App 確認。',
      'tx ハッシュを保存。',
      'ラウンド 10 回上限。未知リンク注意。',
      'revert 時は原因を調査。',
    ],
  },
}
