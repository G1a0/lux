@echo off
chcp 65001 >nul
title Lux 推荐插件 - 安装
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0lux-install.ps1"
echo.
pause
