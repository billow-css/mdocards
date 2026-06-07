import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const cli = path.join(root, 'node_modules', 'electron-builder', 'cli.js')

const env = { ...process.env }
if (!env.ELECTRON_MIRROR) {
  env.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
}
if (env.NODE_TLS_REJECT_UNAUTHORIZED == null) {
  env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env,
})

process.exit(result.status ?? 1)
