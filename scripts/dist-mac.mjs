import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const releaseDir = path.join(root, 'release')
const tempReleaseDir = path.join(os.tmpdir(), 'mdocards-release-mac')
const runBuilder = path.join(__dirname, 'run-electron-builder.mjs')

const result = spawnSync(
  process.execPath,
  [runBuilder, '--mac', 'dmg', `--config.directories.output=${tempReleaseDir}`],
  { cwd: root, stdio: 'inherit' },
)

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

await fs.mkdir(releaseDir, { recursive: true })

for (const entry of await fs.readdir(tempReleaseDir)) {
  const source = path.join(tempReleaseDir, entry)
  const target = path.join(releaseDir, entry)
  await fs.rm(target, { recursive: true, force: true })
  await fs.cp(source, target, { recursive: true })
}

console.log(`\nmacOS release artifacts copied to ${releaseDir}`)
