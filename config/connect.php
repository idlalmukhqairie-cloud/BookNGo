<?php
declare(strict_types=1);

/**
 * Build the shared PDO connection.
 *
 * Aiven for MySQL (and most managed MySQL providers) require TLS. Set
 * BOOKNGO_DB_SSL=true and point BOOKNGO_DB_SSL_CA at the downloaded CA
 * certificate, or paste the PEM contents directly into that variable.
 */
function bookngo_pdo(array $config): PDO
{
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['port'],
        $config['name']
    );

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    if (!empty($config['ssl'])) {
        $ca = trim((string)($config['ssl_ca'] ?? ''));

        // Allow the CA certificate to be supplied as PEM text as well as a path.
        if ($ca !== '' && str_contains($ca, '-----BEGIN CERTIFICATE-----')) {
            $caFile = tempnam(sys_get_temp_dir(), 'bookngo-ca-');
            if ($caFile === false) {
                throw new RuntimeException('Unable to create a temporary CA certificate file.');
            }
            file_put_contents($caFile, $ca);
            register_shutdown_function(static function () use ($caFile): void {
                @unlink($caFile);
            });
            $ca = $caFile;
        }

        if ($ca !== '') {
            $options[PDO::MYSQL_ATTR_SSL_CA] = $ca;
        }
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = (bool)($config['ssl_verify'] ?? true);
    }

    return new PDO($dsn, $config['user'], $config['password'], $options);
}

/**
 * Cookie path that works both under http://localhost/BookNGo/ and at a
 * deployment root such as https://bookngo.example.com/.
 */
function bookngo_cookie_path(): string
{
    $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '/index.php');
    $base = str_replace('\\', '/', dirname(dirname($script)));
    return rtrim($base, '/') . '/';
}
