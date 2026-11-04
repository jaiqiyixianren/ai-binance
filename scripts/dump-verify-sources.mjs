import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import solc from 'solc'

// duplicate buildStandardJson from verify-bscscan - import by running compile part
const text = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'verify-bscscan.mjs'), 'utf8')
// eslint-disable-next-line no-eval
const fn = text.slice(text.indexOf('function buildStandardJson'), text.indexOf('function compile()'))
const buildStandardJson = new Function('fs', 'path', 'root', 'srcRoot', '__dirname', fn + '\nreturn buildStandardJson;')(
  fs,
  path,
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'contracts', 'src'),
  path.dirname(fileURLToPath(import.meta.url)),
)
const input = buildStandardJson()
console.log('source files', Object.keys(input.sources).length)
console.log(Object.keys(input.sources).sort().join('\n'))
console.log('has Context', '@openzeppelin/contracts/utils/Context.sol' in input.sources)
