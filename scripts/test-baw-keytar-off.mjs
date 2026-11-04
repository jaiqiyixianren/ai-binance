import keytar from '@github/keytar'
try {
  await keytar.getPassword('baw', 'agentSessionId')
  console.log('FAIL: keytar not stubbed')
  process.exit(1)
} catch {
  console.log('OK: keytar stubbed, baw will use session.json per BINANCE_BAW_DIR')
}
