<?php
require __DIR__ . '/_lib.php';

$user = require_auth_user();
$data = json_input();

$id = (int)($data['id'] ?? 0);
if ($id <= 0) send_json(['error' => 'Invalid id'], 400);

$pdo = db();

// Ensure category belongs to user
$stmt0 = $pdo->prepare('SELECT id FROM categories WHERE id = ? AND user_id = ? LIMIT 1');
$stmt0->execute([$id, $user['userId']]);
if (!$stmt0->fetch()) send_json(['error' => 'Not found'], 404);

$fields = [];
$values = [];

if (array_key_exists('name', $data)) {
  $name = cat_require_valid_name((string)$data['name']);
  $fields[] = 'name = ?';
  $values[] = $name;
}

if (array_key_exists('sort_order', $data)) {
  $fields[] = 'sort_order = ?';
  $values[] = (int)$data['sort_order'];
}

if (array_key_exists('kind', $data)) {
  $fields[] = 'kind = ?';
  $values[] = cat_kind((string)$data['kind']);
}

if (count($fields) === 0) {
  send_json(['error' => 'No fields to update'], 400);
}

try {
  $sql = 'UPDATE categories SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?';
  $values[] = $id;
  $values[] = $user['userId'];
  $stmt = $pdo->prepare($sql);
  $stmt->execute($values);
} catch (PDOException $e) {
  if ((int)($e->errorInfo[1] ?? 0) === 1062) {
    send_json(['error' => 'Category name already exists'], 409);
  }
  send_json(['error' => 'Server error'], 500);
}

$stmt2 = $pdo->prepare('SELECT id, name, kind, sort_order, created_at, updated_at FROM categories WHERE id = ? AND user_id = ? LIMIT 1');
$stmt2->execute([$id, $user['userId']]);
$row = $stmt2->fetch();

send_json(['category' => $row]);
