import fs from 'fs'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { securityHeadersPlugin, staticHeadersFileContent } from './vite-security-headers.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      vue(),
      securityHeadersPlugin(mode, env),
      {
        name: 'write-static-security-headers',
        closeBundle() {
          const out = path.join(process.cwd(), 'dist', '_headers')
          fs.mkdirSync(path.dirname(out), { recursive: true })
          fs.writeFileSync(out, staticHeadersFileContent(env))
        },
      },
    ],
    server: { port: 5173, host: true },
  }
})
