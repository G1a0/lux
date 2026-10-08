# Lux 推荐插件 - 安装/更新脚本
# 由 install.cmd 调用；也可右键“使用 PowerShell 运行”。
# 逻辑：定位英雄联盟安装目录（注册表 → 常见路径 → 手动选择）
#       → 校验 Pengu Loader（plugins 目录）
#       → 复制 lux 插件文件夹（覆盖更新）

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir  = Join-Path $scriptDir 'lux'
$pluginName = 'lux'

function Write-Head($text) { Write-Host ''; Write-Host "== $text ==" -ForegroundColor Cyan }
function Write-Ok($text)   { Write-Host $text -ForegroundColor Green }
function Write-Note($text) { Write-Host $text -ForegroundColor Yellow }
function Write-Fail($text) { Write-Host $text -ForegroundColor Red }

if (-not (Test-Path (Join-Path $sourceDir 'index.js'))) {
    Write-Fail '未找到插件文件 lux\index.js。'
    Write-Fail '请确认已解压整个压缩包（lux 文件夹要与本脚本在同一目录）。'
    exit 1
}

function Get-LuxVersion {
    try {
        $lines = Get-Content (Join-Path $sourceDir 'index.js') -TotalCount 12
        foreach ($line in $lines) {
            if ($line -match '@version\s+([0-9][0-9.]*)') { return $Matches[1] }
        }
    } catch { }
    return '未知'
}

function Find-LeaguePath {
    $candidates = New-Object System.Collections.Generic.List[string]

    # Riot 官方客户端卸载信息
    $uninstallKeys = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Riot Game league_of_legends.live',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Riot Game league_of_legends.live',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Riot Game league_of_legends.live'
    )
    foreach ($key in $uninstallKeys) {
        try {
            $prop = Get-ItemProperty -Path $key -ErrorAction Stop
            if ($prop.InstallLocation) { $candidates.Add($prop.InstallLocation) }
        } catch { }
    }

    # Riot Games 注册表键
    foreach ($key in @(
        'HKLM:\Software\WOW6432Node\Riot Games, Inc\League of Legends',
        'HKLM:\Software\Riot Games, Inc\League of Legends',
        'HKCU:\Software\Riot Games, Inc\League of Legends'
    )) {
        try {
            $prop = Get-ItemProperty -Path $key -ErrorAction Stop
            foreach ($name in @('Location', 'InstallLocation', 'Path')) {
                if ($prop.$name) { $candidates.Add($prop.$name) }
            }
        } catch { }
    }

    # 常见安装路径（含腾讯服常见目录）
    foreach ($drive in @('C', 'D', 'E', 'F')) {
        $candidates.Add("$drive`:\Riot Games\League of Legends")
        $candidates.Add("$drive`:\Program Files\Riot Games\League of Legends")
        $candidates.Add("$drive`:\WeGameApps\英雄联盟")
        $candidates.Add("$drive`:\腾讯游戏\英雄联盟")
    }

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path (Join-Path $candidate 'LeagueClient.exe'))) {
            return $candidate
        }
    }
    return $null
}

function Select-LeaguePath {
    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    Write-Note '未能自动找到英雄联盟安装目录。'
    Write-Host '请在弹出的窗口中选择“英雄联盟”文件夹（目录里应有 LeagueClient.exe）。'
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = '请选择英雄联盟安装文件夹（例如 C:\Riot Games\League of Legends）'
    $dialog.ShowNewFolderButton = $false
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        return $dialog.SelectedPath
    }
    return $null
}

Write-Head "Lux 推荐插件 安装程序（v$(Get-LuxVersion)）"

$leaguePath = Find-LeaguePath
if ($leaguePath) {
    Write-Host "检测到英雄联盟安装目录：$leaguePath"
} else {
    $leaguePath = Select-LeaguePath
}
if (-not $leaguePath) { Write-Fail '已取消安装。'; exit 1 }

if (-not (Test-Path (Join-Path $leaguePath 'LeagueClient.exe'))) {
    Write-Note '所选目录里没有 LeagueClient.exe，可能不是英雄联盟安装目录。'
    $answer = Read-Host '仍要继续吗？(y/N)'
    if ($answer -notmatch '^[Yy]') { exit 1 }
}

$pluginsDir = Join-Path $leaguePath 'plugins'
if (-not (Test-Path $pluginsDir)) {
    Write-Fail '未检测到 Pengu Loader（插件目录不存在）。'
    Write-Host '请先安装 Pengu Loader：https://pengu.lol/'
    Write-Host '安装好之后（状态显示 ready），再运行本安装脚本。'
    $answer = Read-Host '现在打开下载页？(y/N)'
    if ($answer -match '^[Yy]') { Start-Process 'https://pengu.lol/' }
    exit 1
}

$running = Get-Process -Name 'LeagueClient*' -ErrorAction SilentlyContinue
if ($running) {
    Write-Note '检测到英雄联盟客户端正在运行，更新时可能因文件占用失败。'
    $answer = Read-Host '建议先关闭客户端。仍要继续吗？(y/N)'
    if ($answer -notmatch '^[Yy]') { exit 1 }
}

$targetDir = Join-Path $pluginsDir $pluginName
try {
    if (Test-Path $targetDir) { Remove-Item $targetDir -Recurse -Force }
    Copy-Item -Path $sourceDir -Destination $targetDir -Recurse -Force
} catch {
    Write-Fail "复制失败：$($_.Exception.Message)"
    Write-Fail '请关闭英雄联盟客户端后重试；若仍失败，右键 install.cmd 选择“以管理员身份运行”。'
    exit 1
}

Write-Ok "✔ Lux 已安装到：$targetDir"
Write-Host ''
Write-Host '生效方式：重启英雄联盟客户端，或在 Pengu Loader 窗口点击“刷新”。'
Write-Host '使用方法：进入排位/匹配的选人阶段，右侧会自动出现推荐面板（F3 显示/隐藏）。'
