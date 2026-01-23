<?php
require __DIR__ . '/_lib.php';

$user = require_auth_user();
$data = json_input();

$name = cat_require_valid_name((string)($data['name'] ?? ''));
$kind = cat_kind((string)($data['kind'] ?? 'expense'));

$pdo = db();

try {
  $stmt = $pdo->prepare('INSERT INTO categories (user_id, name, kind, sort_order) VALUES (?, ?, ?, ?)');
  $stmt->execute([$user['userId'], $name, $kind, 0]);
  $id = (int)$pdo->lastInsertId();
} catch (PDOException $e) {
  if ((int)($e->errorInfo[1] ?? 0) === 1062) {
    send_json(['error' => 'Category already exists'], 409);
  }
  send_json(['error' => 'Server error'], 500);
}

$stmt2 = $pdo->prepare('SELECT id, name, kind, sort_order, created_at, updated_at FROM categories WHERE id = ? AND user_id = ? LIMIT 1');
$stmt2->execute([$id, $user['userId']]);
$row = $stmt2->fetch();

send_json(['category' => $row], 201);
