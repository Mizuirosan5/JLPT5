@echo off
cd /d "%~dp0.."
set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\nodejs"
"C:\Program Files\nodejs\npx.cmd" expo start --host lan --port 8082 --clear > expo-lan.log 2>&1
