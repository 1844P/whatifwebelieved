@echo off
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:11434 > "%~dp0tunnel.log" 2>&1
