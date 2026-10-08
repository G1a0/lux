@echo off
chcp 65001 >nul
title Lux 推荐插件 - 卸载
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0lux-uninstall.ps1"
echo.
pause
