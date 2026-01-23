<?php
require __DIR__ . '/../_lib/bootstrap.php';

$user = require_auth_user();
$pdo = db();

$stmt = $pdo->prepare('SELECT id, name, kind, sort_order, created_at, updated_at FROM categories WHERE user_id = ? ORDER BY sort_order ASC, name ASC');
$stmt->execute([$user['userId']]);
$rows = $stmt->fetchAll();

send_json(['categories' => $rows]);
