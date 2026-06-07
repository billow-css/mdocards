import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const releaseDir = path.join(root, 'release')
const tempReleaseDir = path.join(process.env.LOCALAPPDATA ?? root, 'mdocards-release')
const runBuilder = path.join(__dirname, 'run-electron-builder.mjs')

const result = spawnSync(
  process.execPath,
  [runBuilder, '--win', `--config.directories.output=${tempReleaseDir}`],
  { cwd: root, stdio: 'inherit' },
)

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

await fs.rm(releaseDir, { recursive: true, force: true })
await fs.mkdir(releaseDir, { recursive: true })

for (const entry of await fs.readdir(tempReleaseDir)) {
  await fs.cp(path.join(tempReleaseDir, entry), path.join(releaseDir, entry), { recursive: true })
}

console.log(`\nRelease artifacts copied to ${releaseDir}`)
