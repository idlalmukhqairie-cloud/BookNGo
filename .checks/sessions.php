<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/session.php';

function check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$config = require __DIR__ . '/../config/database.php';
$pdo = bookngo_pdo($config);
$pdo->exec(file_get_contents(__DIR__ . '/../database/sessions.sql'));
$id = bin2hex(random_bytes(24));
$first = new BookngoDatabaseSession($pdo);
$second = new BookngoDatabaseSession(bookngo_pdo($config));
try {
    check($first->read($id) === '', 'New session should be empty.');
    check($first->write($id, 'user_id|i:123;'), 'Session write failed.');
    $first->close();
    check($second->read($id) === 'user_id|i:123;', 'Another connection must read the saved session.');
    $second->close();
    $q = $pdo->prepare('UPDATE bookngo_sessions SET expires_at=0 WHERE id=?');
    $q->execute([hash('sha256', $id)]);
    check($first->read($id) === '', 'Expired sessions must not restore authentication.');
    $first->close();
    $second->destroy($id);
    check($first->read($id) === '', 'Destroyed session should be empty.');
    echo "PASS: sessions persist across database connections; expired and destroyed sessions are empty.\n";
} finally {
    $first->close();
    $second->close();
    $first->destroy($id);
}
