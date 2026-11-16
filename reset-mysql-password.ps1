# Resets the local MySQL root password and writes the new one into backend\.env.
# Must be run from an Administrator PowerShell window.

$ErrorActionPreference = "Stop"

$bin     = "C:\Program Files\MySQL\MySQL Server 8.0\bin"
$myIni   = "C:\ProgramData\MySQL\MySQL Server 8.0\my.ini"
$service = "MySQL80"
$envFile = Join-Path $PSScriptRoot "backend\.env"
$initSql = Join-Path $env:ProgramData "mysql-reset-root.sql"
$cnf     = Join-Path $env:ProgramData "mysql-reset-client.cnf"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "This window is not running as Administrator. Right-click PowerShell > Run as administrator, then run this again." -ForegroundColor Red
  exit 1
}

# New password: upper + lower + digits + symbol, so it passes MySQL's password policy
$random = -join ((1..12) | ForEach-Object { "{0:x}" -f (Get-Random -Maximum 16) })
$newPassword = "Fb" + $random + "@9Z"

function Write-NoBom($path, $lines) {
  [IO.File]::WriteAllLines($path, [string[]]$lines, (New-Object Text.UTF8Encoding($false)))
}

Write-NoBom $initSql @("ALTER USER 'root'@'localhost' IDENTIFIED BY '$newPassword';")
Write-NoBom $cnf @("[client]", "user=root", "password=`"$newPassword`"", "host=127.0.0.1", "port=3306")

$mysqld = $null
$ok = $false

try {
  Write-Host "Stopping $service..."
  Stop-Service $service -Force
  (Get-Service $service).WaitForStatus("Stopped", "00:01:00")

  Write-Host "Starting MySQL temporarily to apply the new password..."
  $mysqld = Start-Process -FilePath "$bin\mysqld.exe" `
    -ArgumentList "--defaults-file=`"$myIni`"", "--init-file=`"$initSql`"" `
    -WindowStyle Hidden -PassThru

  for ($i = 0; $i -lt 60 -and -not $ok; $i++) {
    Start-Sleep -Seconds 2
    if ($mysqld.HasExited) { break }
    cmd /c "`"$bin\mysql.exe`" --defaults-extra-file=`"$cnf`" -e `"SELECT 1`" >nul 2>&1"
    if ($LASTEXITCODE -eq 0) { $ok = $true }
  }

  if ($ok) {
    cmd /c "`"$bin\mysqladmin.exe`" --defaults-extra-file=`"$cnf`" shutdown >nul 2>&1"
    $mysqld.WaitForExit(60000) | Out-Null
  }
}
finally {
  if ($mysqld -and -not $mysqld.HasExited) { Stop-Process -Id $mysqld.Id -Force }
  Remove-Item $initSql, $cnf -Force -ErrorAction SilentlyContinue
  Write-Host "Starting $service again..."
  Start-Service $service
}

if (-not $ok) {
  Write-Host "The password was NOT changed. Nothing in backend\.env was touched." -ForegroundColor Red
  exit 1
}

$lines = Get-Content $envFile | ForEach-Object {
  if ($_ -match '^DB_PASSWORD=') { "DB_PASSWORD=$newPassword" } else { $_ }
}
Write-NoBom $envFile $lines

Write-Host ""
Write-Host "Done. New MySQL root password: $newPassword" -ForegroundColor Green
Write-Host "It has been saved in backend\.env."
