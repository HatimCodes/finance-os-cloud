<?php
declare(strict_types=1);

// Never leak PHP warnings/notices to the client
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

$config = require __DIR__ . '/config.php';

// Strict CORS (no wildcards)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === $config['allowed_origin']) {
  header('Access-Control-Allow-Origin: ' . $origin);
  header('Vary: Origin');
  header('Access-Control-Allow-Credentials: false');
  header('Access-Control-Allow-Headers: Authorization, Content-Type');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
  http_response_code(200);
  echo json_encode(['ok' => true]);
  exit;
}

function json_input(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function send_json($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data);
  exit;
}

function uuid_v4(): string {
  $data = random_bytes(16);
  $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
  $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
  $hex = bin2hex($data);
  return sprintf('%s-%s-%s-%s-%s',
    substr($hex, 0, 8),
    substr($hex, 8, 4),
    substr($hex, 12, 4),
    substr($hex, 16, 4),
    substr($hex, 20, 12)
  );
}

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  global $config;
  $db = $config['db'];
  $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $db['host'], $db['name'], $db['charset']);
  $pdo = new PDO($dsn, $db['user'], $db['pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ]);
  return $pdo;
}

function bearer_token(): ?string {
  $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!$hdr) return null;
  if (preg_match('/^Bearer\s+(.+)$/i', $hdr, $m)) {
    return trim($m[1]);
  }
  return null;
}

function hash_token(string $token): string {
  global $config;
  return hash_hmac('sha256', $token, $config['token_secret']);
}

function rate_limit(string $key): void {
  global $config;
  $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
  $window = (int)($config['rate_limit']['window_seconds'] ?? 60);
  $max = (int)($config['rate_limit']['max_requests'] ?? 12);
  $bucket = (int)(time() / max(1, $window));
  $fname = sys_get_temp_dir() . '/finos_rl_' . sha1($ip . '|' . $key) . '_' . $bucket;

  $count = 0;
  if (file_exists($fname)) {
    $count = (int)@file_get_contents($fname);
  }
  $count++;
  @file_put_contents($fname, (string)$count);
  if ($count > $max) {
    send_json(['error' => 'Too many requests. Try again shortly.'], 429);
  }
}

function require_auth_user(): array {
  $token = bearer_token();
  if (!$token) send_json(['error' => 'Unauthorized'], 401);

  $tokenHash = hash_token($token);
  $pdo = db();
  $stmt = $pdo->prepare('SELECT s.id as session_id, s.user_id, s.expires_at, s.revoked_at, u.email, u.display_name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? LIMIT 1');
  $stmt->execute([$tokenHash]);
  $row = $stmt->fetch();
  if (!$row) send_json(['error' => 'Unauthorized'], 401);
  if ($row['revoked_at'] !== null) send_json(['error' => 'Unauthorized'], 401);
  if (strtotime($row['expires_at']) < time()) send_json(['error' => 'Unauthorized'], 401);

  return [
    'sessionId' => $row['session_id'],
    'userId' => $row['user_id'],
    'email' => $row['email'],
    'displayName' => $row['display_name'],
  ];
}

function safe_password_hash(string $password): string {
  if (defined('PASSWORD_ARGON2ID')) {
    return password_hash($password, PASSWORD_ARGON2ID);
  }
  return password_hash($password, PASSWORD_BCRYPT);
}

function safe_password_verify(string $password, string $hash): bool {
  return password_verify($password, $hash);
}

