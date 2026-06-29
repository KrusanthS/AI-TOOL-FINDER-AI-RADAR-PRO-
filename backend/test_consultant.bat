@echo off
cd /d "%~dp0"
echo Running import smoke test...
echo.
node test_consultant.mjs
