<?php
require __DIR__ . '/_lib.php';

$user = require_auth_user();
$data = json_input();

$id = (int)($data['id'] ?? 0);
if ($id <= 0) send_json(['error' => 'Invalid id'], 400);

$pdo = db();

// Ensure category belongs to user
$stmt0 = $pdo->prepare('SELECT id, name FROM categories WHERE id = ? AND user_id = ? LIMIT 1');
$stmt0->execute([$id, $user['userId']]);
$row0 = $stmt0->fetch();
if (!$row0) send_json(['error' => 'Not found'], 404);

// Prevent deleting the fallback "Other"; keep it as stable anchor.
if (strtolower((string)$row0['name']) === 'other') {
  send_json(['error' => 'Cannot delete Other'], 400);
}

// Reassign snapshot references to per-user fallback "Other".
$otherId = cat_get_other_id($pdo, $user['userId']);
if ($otherId !== $id) {
  cat_reassign_in_snapshot($pdo, $user['userId'], $id, $otherId);
}

// Now delete category
$stmt = $pdo->prepare('DELETE FROM categories WHERE id = ? AND user_id = ?');
$stmt->execute([$id, $user['userId']]);

send_json(['ok' => true, 'reassignedTo' => $otherId]);
