<?php
declare(strict_types=1);
require_once __DIR__ . '/connect.php';

/** Shared sessions survive cold starts and requests handled by other instances. */
final class BookngoDatabaseSession implements SessionHandlerInterface
{
    private ?string $lock = null;

    public function __construct(private PDO $pdo) {}

    public function open(string $path, string $name): bool { return true; }

    public function close(): bool
    {
        if ($this->lock !== null) {
            $q = $this->pdo->prepare('SELECT RELEASE_LOCK(?)');
            $q->execute([$this->lock]);
            $this->lock = null;
        }
        return true;
    }

    public function read(string $id): string|false
    {
        // Match PHP's file-session locking, including concurrent login requests.
        $this->close();
        $key = 'bookngo:' . substr(hash('sha256', $id), 0, 56);
        $q = $this->pdo->prepare('SELECT GET_LOCK(?, 10)');
        $q->execute([$key]);
        if ((int)$q->fetchColumn() !== 1) {
            throw new RuntimeException('Unable to lock session.');
        }
        $this->lock = $key;
        $q = $this->pdo->prepare('SELECT data FROM bookngo_sessions WHERE id=? AND expires_at>UNIX_TIMESTAMP()');
        $q->execute([hash('sha256', $id)]);
        $data = $q->fetchColumn();
        return $data === false ? '' : (string)$data;
    }

    public function write(string $id, string $data): bool
    {
        $q = $this->pdo->prepare('INSERT INTO bookngo_sessions (id,data,expires_at) VALUES (?,?,UNIX_TIMESTAMP()+?) ON DUPLICATE KEY UPDATE data=VALUES(data),expires_at=VALUES(expires_at)');
        return $q->execute([hash('sha256', $id), $data, (int)ini_get('session.gc_maxlifetime')]);
    }

    public function destroy(string $id): bool
    {
        $q = $this->pdo->prepare('DELETE FROM bookngo_sessions WHERE id=?');
        return $q->execute([hash('sha256', $id)]);
    }

    public function gc(int $max_lifetime): int|false
    {
        $q = $this->pdo->prepare('DELETE FROM bookngo_sessions WHERE expires_at<=UNIX_TIMESTAMP()');
        $q->execute();
        return $q->rowCount();
    }
}

function bookngo_start_session(): void
{
    if (getenv('VERCEL') === '1' || getenv('BOOKNGO_SESSION_DRIVER') === 'mysql') {
        $pdo = bookngo_pdo(require __DIR__ . '/database.php');
        session_set_save_handler(new BookngoDatabaseSession($pdo), true);
    }
    session_name('bookngo_session');
    session_set_cookie_params([
        'httponly' => true,
        'secure' => getenv('VERCEL') === '1' || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'samesite' => 'Lax',
        'path' => bookngo_cookie_path(),
    ]);
    if (!session_start()) {
        throw new RuntimeException('Unable to start session.');
    }
}
