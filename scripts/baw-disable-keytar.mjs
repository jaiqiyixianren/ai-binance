import { pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@github/keytar') {
    return {
      url: pathToFileURL(join(dir, 'baw-keytar-stub.mjs')).href,
      shortCircuit: true,
    }
  }
  return nextResolve(specifier, context)
}
