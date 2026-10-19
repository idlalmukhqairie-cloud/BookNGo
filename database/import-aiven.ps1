<#
.SYNOPSIS
    Imports the BookNGo schema and demo data into a remote MySQL service such as Aiven.

.DESCRIPTION
    Prompts for anything you do not pass in. The password is read securely and is
    only exported to the mysql client through the MYSQL_PWD variable, so it never
    appears on the command line.

.EXAMPLE
    .\database\import-aiven.ps1 -Server mysql-xxxx.aivencloud.com -Port 12691 -CaPath C:\certs\ca.pem

.EXAMPLE
    .\database\import-aiven.ps1
#>
[CmdletBinding()]
param(
    [string]$Server,
    [string]$Port,
    [string]$User,
    [string]$Database,
    [string]$CaPath,
    [switch]$SkipCreateDatabase
)

$ErrorActionPreference = 'Stop'

if (-not $Server)   { $Server = Read-Host 'Aiven MySQL host' }
if (-not $Port)     { $Port = Read-Host 'Port' }
if (-not $User)     { $User = Read-Host 'User (press Enter for avnadmin)'; if (-not $User) { $User = 'avnadmin' } }
if (-not $Database) { $Database = Read-Host 'Database (press Enter for bookngo)'; if (-not $Database) { $Database = 'bookngo' } }

$mysql = 'C:\xampp\mysql\bin\mysql.exe'
if (-not (Test-Path $mysql)) { $mysql = 'mysql' }

$secure = Read-Host "Password for $User" -AsSecureString
$env:MYSQL_PWD = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

# XAMPP ships the MariaDB client, which uses --ssl instead of --ssl-mode.
$sslArgs = @('--ssl')
if ($CaPath) {
    $sslArgs += "--ssl-ca=$CaPath"
    $sslArgs += '--ssl-verify-server-cert'
}

try {
    if (-not $SkipCreateDatabase) {
        Write-Host "Creating database $Database ..."
        & $mysql --host=$Server --port=$Port --user=$User @sslArgs `
            -e "CREATE DATABASE IF NOT EXISTS $Database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        if ($LASTEXITCODE -ne 0) { throw "Could not create the database (exit code $LASTEXITCODE)." }
    }

    Write-Host 'Importing setup.sql ...'
    Get-Content -Raw (Join-Path $PSScriptRoot 'setup.sql') | & $mysql `
        --host=$Server --port=$Port --user=$User @sslArgs $Database
    if ($LASTEXITCODE -ne 0) { throw "Import failed (exit code $LASTEXITCODE)." }

    Write-Host 'Verifying ...'
    & $mysql --host=$Server --port=$Port --user=$User @sslArgs $Database `
        -e 'SHOW TABLES; SELECT COUNT(*) AS movies FROM movies;'
    if ($LASTEXITCODE -ne 0) { throw "Verification failed (exit code $LASTEXITCODE)." }

    Write-Host 'Done. The Aiven database is ready.'
}
finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}
