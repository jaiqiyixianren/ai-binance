import keytar from '@github/keytar'
await keytar.deletePassword('baw', 'agentSessionId')
console.log('cleared keytar baw/agentSessionId, now:', await keytar.getPassword('baw', 'agentSessionId'))
