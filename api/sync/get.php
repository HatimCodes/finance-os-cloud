<?php
require __DIR__ . '/../_lib/bootstrap.php';
$user = require_auth_user();

$pdo = db();
$stmt = $pdo->prepare('SELECT state_json, version, updated_at FROM user_state WHERE user_id = ? LIMIT 1');
$stmt->execute([$user['userId']]);
$row = $stmt->fetch();

if (!$row) {
  send_json([
    'state' => null,
    'version' => 0,
    'updatedAt' => null,
  ]);
}

$state = json_decode($row['state_json'], true);
if (!is_array($state)) $state = null;

send_json([
  'state' => $state,
  'version' => (int)$row['version'],
  'updatedAt' => (new DateTimeImmutable($row['updated_at']))->format(DATE_ATOM),
]);
