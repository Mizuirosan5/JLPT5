@echo off
cd /d "%~dp0.."
set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\nodejs"
"C:\Program Files\nodejs\node.exe" scripts\serve-dist-local.mjs > serve-dist-local.log 2>&1
