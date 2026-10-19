<?php
declare(strict_types=1);
// Local XAMPP defaults. Override using environment variables when deploying.
$sslCa = getenv('BOOKNGO_DB_SSL_CA') ?: '';
if ($sslCa === '' && is_file(__DIR__ . '/ca.pem')) {
    $sslCa = __DIR__ . '/ca.pem';
}
$sslEnv = getenv('BOOKNGO_DB_SSL');
$sslVerifyEnv = getenv('BOOKNGO_DB_SSL_VERIFY');

return [
    'host' => getenv('BOOKNGO_DB_HOST') ?: '127.0.0.1',
    'port' => getenv('BOOKNGO_DB_PORT') ?: '3306',
    'name' => getenv('BOOKNGO_DB_NAME') ?: 'bookngo',
    'user' => getenv('BOOKNGO_DB_USER') ?: 'root',
    'password' => getenv('BOOKNGO_DB_PASSWORD') ?: '',
    // Aiven for MySQL requires TLS. Enabled automatically when a CA is present.
    'ssl' => $sslEnv !== false ? filter_var($sslEnv, FILTER_VALIDATE_BOOL) : ($sslCa !== ''),
    'ssl_ca' => $sslCa,
    'ssl_verify' => $sslVerifyEnv !== false ? filter_var($sslVerifyEnv, FILTER_VALIDATE_BOOL) : true,
];
