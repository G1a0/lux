// scripts/pack.js — 构建并打包为可分发的压缩包
// 用法: node scripts/pack.js （会自动先执行 npm run build）
// 产物结构（兼容「双击安装」与「手动拖拽」两种方式）:
//   lux-v<version>.zip
//   ├── install.cmd / uninstall.cmd / how-to-use.txt
//   ├── lux-install.ps1 / lux-uninstall.ps1
//   └── lux/  (index.js, index.css)
// Windows 输出 .zip，Linux/Mac 优先 zip，没装则 fallback 到 tar.gz

import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const distDir = resolve('dist')
const releaseDir = resolve('release')
const installerDir = resolve('scripts/installer')

const INSTALLER_FILES = [
  'install.cmd',
  'uninstall.cmd',
  'lux-install.ps1',
  'lux-uninstall.ps1',
  'how-to-use.txt',
]

// Step 1: build
console.log('Building...')
execSync('npm run build', { stdio: 'inherit', shell: true })

if (!existsSync(distDir)) {
  console.error('Build failed — dist/ not found')
  process.exit(1)
}

// Step 2: stage — release/lux-v<version>/{安装脚本 + lux/}
mkdirSync(releaseDir, { recursive: true })
const stageDir = join(releaseDir, `lux-v${pkg.version}`)
rmSync(stageDir, { recursive: true, force: true })
mkdirSync(stageDir, { recursive: true })

cpSync(distDir, join(stageDir, 'lux'), { recursive: true })
for (const file of INSTALLER_FILES) {
  cpSync(join(installerDir, file), join(stageDir, file))
}

// Step 3: archive
const isWin = process.platform === 'win32'
const zipPath = join(releaseDir, `lux-v${pkg.version}.zip`)
const tarPath = join(releaseDir, `lux-v${pkg.version}.tar.gz`)

let outFile = null

if (isWin) {
  rmSync(zipPath, { force: true })
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipPath}' -Force"`,
    { stdio: 'pipe' },
  )
  outFile = zipPath
} else {
  try {
    rmSync(zipPath, { force: true })
    execSync(`zip -r "${zipPath}" .`, { cwd: stageDir, stdio: 'pipe' })
    outFile = zipPath
  } catch {
    execSync(`tar -czf "${tarPath}" -C "${stageDir}" .`, { stdio: 'pipe' })
    outFile = tarPath
    console.log('(zip not found, using tar.gz instead)')
  }
}

rmSync(stageDir, { recursive: true, force: true })

const size = (statSync(outFile).size / 1024).toFixed(1)
console.log(`\nPackaged: ${basename(outFile)} (${size} KB)`)
console.log(`Location: ${outFile}`)
console.log('\n用户安装方式：')
console.log('  1. 解压后双击 install.cmd（自动定位路径并安装）')
console.log('  2. 或手动把 lux 文件夹拖入 Pengu Loader 插件目录')
