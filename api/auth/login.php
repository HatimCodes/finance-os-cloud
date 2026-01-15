<?php
require __DIR__ . '/../_lib/bootstrap.php';
rate_limit('auth_login');

$data = json_input();
$email = strtolower(trim((string)($data['email'] ?? '')));
$password = (string)($data['password'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
  send_json(['error' => 'Invalid credentials'], 400);
}

$pdo = db();
$stmt = $pdo->prepare('SELECT id, email, password_hash, display_name FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();
if (!$user || !safe_password_verify($password, $user['password_hash'])) {
  send_json(['error' => 'Invalid credentials'], 401);
}

$token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
$tokenHash = hash_token($token);
$sessionId = uuid_v4();
$days = (int)($config['session_days'] ?? 30);
$expiresAt = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->modify('+' . $days . ' days')->format('Y-m-d H:i:s');

$stmt = $pdo->prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)');
$stmt->execute([$sessionId, $user['id'], $tokenHash, $expiresAt]);

send_json([
  'token' => $token,
  'user' => [
    'id' => $user['id'],
    'email' => $user['email'],
    'displayName' => $user['display_name'],
  ]
]);
