<#
.SYNOPSIS
    Imports the BookNGo schema and demo data into a remote MySQL service such as Aiven.

.DESCRIPTION
    Prompts for anything you do not pass in. The password is read securely and is
    only exported to the PHP importer through a temporary environment variable, so it never
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

if ($Database -notmatch '^[a-zA-Z0-9_]+$') { throw 'Database name must contain only letters, numbers and underscores.' }
if (-not $CaPath) { $CaPath = Read-Host 'Full path to the downloaded Aiven ca.pem certificate' }
$CaPath = $CaPath.Trim()
# Windows "Copy as path" includes quotes; Read-Host keeps those literally.
if ($CaPath.Length -ge 2 -and (
    ($CaPath.StartsWith('"') -and $CaPath.EndsWith('"')) -or
    ($CaPath.StartsWith("'") -and $CaPath.EndsWith("'"))
)) {
    $CaPath = $CaPath.Substring(1, $CaPath.Length - 2).Trim()
}
$CaPath = (Resolve-Path -LiteralPath $CaPath -ErrorAction Stop).Path

# PHP 8.2's mysqlnd supports Aiven authentication; XAMPP's MariaDB CLI may not.
$php = 'C:\xampp\php\php.exe'
if (-not (Test-Path -LiteralPath $php)) { $php = (Get-Command php -ErrorAction Stop).Source }
$temporaryEnv = @{
    BOOKNGO_DB_HOST = $Server
    BOOKNGO_DB_PORT = $Port
    BOOKNGO_DB_NAME = $Database
    BOOKNGO_DB_USER = $User
    BOOKNGO_DB_SSL = 'true'
    BOOKNGO_DB_SSL_CA = $CaPath
    BOOKNGO_DB_SSL_VERIFY = 'true'
    BOOKNGO_IMPORT_SKIP_CREATE = ([int][bool]$SkipCreateDatabase).ToString()
    BOOKNGO_DB_PASSWORD = ''
}
$previousEnv = @{}
foreach ($key in $temporaryEnv.Keys) { $previousEnv[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }

try {
    foreach ($key in $temporaryEnv.Keys) { [Environment]::SetEnvironmentVariable($key, $temporaryEnv[$key], 'Process') }
    $secure = Read-Host "Password for $User" -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $env:BOOKNGO_DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
    & $php (Join-Path $PSScriptRoot 'import-aiven.php')
    if ($LASTEXITCODE -ne 0) { throw "Aiven import failed (exit code $LASTEXITCODE)." }
}
finally {
    foreach ($key in $temporaryEnv.Keys) { [Environment]::SetEnvironmentVariable($key, $previousEnv[$key], 'Process') }
}
