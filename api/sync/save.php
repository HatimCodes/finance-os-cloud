<?php
require __DIR__ . '/../_lib/bootstrap.php';
$user = require_auth_user();

$data = json_input();
$clientVersion = (int)($data['version'] ?? 0);
$state = $data['state'] ?? null;
if (!is_array($state)) {
  send_json(['error' => 'Invalid state'], 400);
}

$pdo = db();
$stmt = $pdo->prepare('SELECT version FROM user_state WHERE user_id = ? LIMIT 1');
$stmt->execute([$user['userId']]);
$row = $stmt->fetch();
$serverVersion = $row ? (int)$row['version'] : 0;

if ($clientVersion < $serverVersion) {
  send_json(['conflict' => true, 'serverVersion' => $serverVersion], 409);
}

$newVersion = $serverVersion + 1;
$stateJson = json_encode($state);
if ($stateJson === false) {
  send_json(['error' => 'Could not encode state'], 400);
}

if ($row) {
  $stmt = $pdo->prepare('UPDATE user_state SET state_json = ?, version = ? WHERE user_id = ?');
  $stmt->execute([$stateJson, $newVersion, $user['userId']]);
} else {
  $stmt = $pdo->prepare('INSERT INTO user_state (user_id, state_json, version) VALUES (?, ?, ?)');
  $stmt->execute([$user['userId'], $stateJson, $newVersion]);
}

send_json([
  'version' => $newVersion,
  'updatedAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ATOM),
]);
