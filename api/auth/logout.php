<?php
require __DIR__ . '/../_lib/bootstrap.php';
$user = require_auth_user();

$pdo = db();
$stmt = $pdo->prepare('UPDATE sessions SET revoked_at = NOW() WHERE id = ?');
$stmt->execute([$user['sessionId']]);

send_json(['ok' => true]);
