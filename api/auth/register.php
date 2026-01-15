<?php
require __DIR__ . '/../_lib/bootstrap.php';
rate_limit('auth_register');

$data = json_input();
$email = strtolower(trim((string)($data['email'] ?? '')));
$password = (string)($data['password'] ?? '');
$displayName = trim((string)($data['displayName'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  send_json(['error' => 'Invalid email'], 400);
}
if (strlen($password) < 8) {
  send_json(['error' => 'Password must be at least 8 characters'], 400);
}
if ($displayName !== '' && strlen($displayName) > 80) {
  send_json(['error' => 'Display name too long'], 400);
}

$pdo = db();
$userId = uuid_v4();
$hash = safe_password_hash($password);

try {
  $stmt = $pdo->prepare('INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)');
  $stmt->execute([$userId, $email, $hash, $displayName !== '' ? $displayName : null]);
} catch (PDOException $e) {
  // Duplicate email
  if ((int)($e->errorInfo[1] ?? 0) === 1062) {
    send_json(['error' => 'Email already registered'], 409);
  }
  send_json(['error' => 'Server error'], 500);
}

send_json([
  'user' => [
    'id' => $userId,
    'email' => $email,
    'displayName' => $displayName !== '' ? $displayName : null,
  ]
], 201);
