# Lux 推荐插件 - 卸载脚本
# 由 uninstall.cmd 调用；删除插件目录里的 lux 文件夹

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

function Write-Head($text) { Write-Host ''; Write-Host "== $text ==" -ForegroundColor Cyan }
function Write-Ok($text)   { Write-Host $text -ForegroundColor Green }
function Write-Note($text) { Write-Host $text -ForegroundColor Yellow }
function Write-Fail($text) { Write-Host $text -ForegroundColor Red }

function Find-LeaguePath {
    $candidates = New-Object System.Collections.Generic.List[string]

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
    Write-Host '请在弹出的窗口中选择“英雄联盟”文件夹。'
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = '请选择英雄联盟安装文件夹'
    $dialog.ShowNewFolderButton = $false
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        return $dialog.SelectedPath
    }
    return $null
}

Write-Head 'Lux 推荐插件 卸载程序'

$leaguePath = Find-LeaguePath
if (-not $leaguePath) { $leaguePath = Select-LeaguePath }
if (-not $leaguePath) { Write-Fail '已取消。'; exit 1 }

$targetDir = Join-Path (Join-Path $leaguePath 'plugins') 'lux'
if (-not (Test-Path $targetDir)) {
    Write-Host '未找到已安装的 Lux 插件（可能已卸载）。'
    exit 0
}

$answer = Read-Host "确认删除 $targetDir ？(y/N)"
if ($answer -notmatch '^[Yy]') { Write-Host '已取消。'; exit 0 }

try {
    Remove-Item $targetDir -Recurse -Force
} catch {
    Write-Fail "删除失败：$($_.Exception.Message)"
    Write-Fail '请关闭英雄联盟客户端后重试；若仍失败，右键 uninstall.cmd 选择“以管理员身份运行”。'
    exit 1
}

Write-Ok '✔ 已卸载 Lux，重启客户端后生效。'
