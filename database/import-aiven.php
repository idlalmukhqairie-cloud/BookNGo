<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once __DIR__ . '/../config/connect.php';

try {
    $config = require __DIR__ . '/../config/database.php';
    $name = $config['name'];
    if (!preg_match('/^[a-zA-Z0-9_]+$/D', $name)) {
        throw new RuntimeException('Invalid database name.');
    }
    if (!$config['ssl'] || !is_file($config['ssl_ca'])) {
        throw new RuntimeException('Aiven import requires the downloaded CA certificate and TLS.');
    }
    $serverConfig = $config;
    $serverConfig['name'] = '';
    $pdo = bookngo_pdo($serverConfig);
    if (getenv('BOOKNGO_IMPORT_SKIP_CREATE') !== '1') {
        echo "Creating database $name ...\n";
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    }
    $pdo = null;
    $sql = file_get_contents(__DIR__ . '/setup.sql');
    if ($sql === false) {
        throw new RuntimeException('Unable to read setup.sql.');
    }
    // Connect to the requested database; remove the generated default selection.
    $sql = preg_replace('/^CREATE DATABASE IF NOT EXISTS bookngo[^\r\n]*;\r?\n/m', '', $sql);
    $sql = preg_replace('/^USE bookngo;\r?\n/m', '', $sql);
    echo "Importing setup.sql into $name ...\n";
    $pdo = bookngo_pdo($config);
    $pdo->exec($sql);
    // Discard any pending results from the multi-statement import.
    $pdo = null;
    $pdo = bookngo_pdo($config);
    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    $movies = $pdo->query('SELECT COUNT(*) FROM movies')->fetchColumn();
    echo 'Tables: ' . implode(', ', $tables) . "\nMovies: $movies\nDone. The Aiven database is ready.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'Import failed: ' . $error->getMessage() . "\n");
    exit(1);
}
