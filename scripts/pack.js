// scripts/pack.js — 构建并打包为可分发的压缩包
// 用法: node scripts/pack.js （会自动先执行 npm run build）
// Windows 输出 .zip，Linux/Mac 优先 zip，没装则 fallback 到 tar.gz

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const distDir = resolve('dist')
const releaseDir = resolve('release')

// Step 1: build
console.log('Building...')
execSync('npm run build', { stdio: 'inherit', shell: true })

if (!existsSync(distDir)) {
  console.error('Build failed — dist/ not found')
  process.exit(1)
}

// Step 2: pack
mkdirSync(releaseDir, { recursive: true })

const platform = process.platform
const isWin = platform === 'win32'
const zipName = `lux-v${pkg.version}.zip`
const zipPath = join(releaseDir, zipName)
const tarPath = join(releaseDir, `lux-v${pkg.version}.tar.gz`)

let outFile = null

if (isWin) {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force"`,
    { stdio: 'pipe' },
  )
  outFile = zipPath
} else {
  // Try zip, fallback to tar.gz
  try {
    execSync(`zip -r "${zipPath}" .`, { cwd: distDir, stdio: 'pipe' })
    outFile = zipPath
  } catch {
    execSync(`tar -czf "${tarPath}" -C "${distDir}" .`, { stdio: 'pipe' })
    outFile = tarPath
    console.log('(zip not found, using tar.gz instead)')
  }
}

const size = (statSync(outFile).size / 1024).toFixed(1)
console.log(`\nPackaged: ${basename(outFile)} (${size} KB)`)
console.log(`Location: ${outFile}`)
console.log('\nTo install:')
console.log('  1. Extract to Pengu Loader\\plugins\\lux\\')
console.log('  2. Restart League Client and Pengu Loader')
