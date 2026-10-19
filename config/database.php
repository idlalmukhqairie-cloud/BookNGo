<?php
declare(strict_types=1);
// Local XAMPP defaults. Override using environment variables when deploying.
return [
    'host' => getenv('BOOKNGO_DB_HOST') ?: '127.0.0.1',
    'port' => getenv('BOOKNGO_DB_PORT') ?: '3306',
    'name' => getenv('BOOKNGO_DB_NAME') ?: 'bookngo',
    'user' => getenv('BOOKNGO_DB_USER') ?: 'root',
    'password' => getenv('BOOKNGO_DB_PASSWORD') ?: '',
];
