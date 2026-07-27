@echo off
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:8081 > "%~dp0tunnel.log" 2>&1
