import { cspConnectSourcesForEnv } from './src/security/rpc.js'

function buildCsp(env, isDev) {
  const connect = ["'self'", ...cspConnectSourcesForEnv(env.VITE_BSC_RPC)]
  const parts = [
    "default-src 'self'",
    isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connect.join(' ')}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ]
  if (!isDev) parts.push('upgrade-insecure-requests')
  return parts.join('; ')
}

const SHARED_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site',
}

/** @param {import('vite').Plugin} */
export function securityHeadersPlugin(mode, env) {
  const isDev = mode === 'development'
  const csp = buildCsp(env, isDev)

  return {
    name: 'security-headers',
    transformIndexHtml(html) {
      const meta = [
        `<meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, '&quot;')}" />`,
        '<meta name="referrer" content="strict-origin-when-cross-origin" />',
      ].join('\n    ')
      return html.replace('</head>', `    ${meta}\n  </head>`)
    },
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        for (const [k, v] of Object.entries(SHARED_HEADERS)) res.setHeader(k, v)
        res.setHeader('Content-Security-Policy', csp)
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        for (const [k, v] of Object.entries(SHARED_HEADERS)) res.setHeader(k, v)
        res.setHeader('Content-Security-Policy', csp)
        next()
      })
    },
  }
}

export function staticHeadersFileContent(env) {
  const csp = buildCsp(env, false)
  const lines = ['/*']
  for (const [k, v] of Object.entries(SHARED_HEADERS)) {
    lines.push(`  ${k}: ${v}`)
  }
  lines.push(`  Content-Security-Policy: ${csp}`)
  lines.push('')
  return lines.join('\n')
}
