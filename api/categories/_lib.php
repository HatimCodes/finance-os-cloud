<?php
declare(strict_types=1);

require_once __DIR__ . '/../_lib/bootstrap.php';

function cat_normalize_name(string $name): string {
  $name = trim(preg_replace('/\s+/', ' ', $name));
  return $name;
}

function cat_require_valid_name(string $name): string {
  $name = cat_normalize_name($name);
  $len = strlen($name);
  if ($len < 1 || $len > 40) {
    send_json(['error' => 'Name must be 1..40 characters'], 400);
  }
  return $name;
}

function cat_kind(string $kind): string {
  $kind = trim(strtolower($kind));
  // Currently we only use expense categories in the UI, but we keep the field future-proof.
  $allowed = ['expense', 'bucket', 'debt', 'system'];
  if (!in_array($kind, $allowed, true)) $kind = 'expense';
  return $kind;
}

function cat_get_other_id(PDO $pdo, string $userId): int {
  $stmt = $pdo->prepare('SELECT id FROM categories WHERE user_id = ? AND name = ? LIMIT 1');
  $stmt->execute([$userId, 'Other']);
  $row = $stmt->fetch();
  if ($row && isset($row['id'])) return (int)$row['id'];

  // Create fallback "Other" if missing
  $stmt2 = $pdo->prepare('INSERT INTO categories (user_id, name, kind, sort_order) VALUES (?, ?, ?, ?)');
  $stmt2->execute([$userId, 'Other', 'expense', 9999]);
  return (int)$pdo->lastInsertId();
}

// Reassign any snapshot transactions that reference a category id.
// This app is snapshot-synced; finance records live inside user_state.state_json.
function cat_reassign_in_snapshot(PDO $pdo, string $userId, int $fromId, int $toId): void {
  $stmt = $pdo->prepare('SELECT state_json, version FROM user_state WHERE user_id = ? LIMIT 1');
  $stmt->execute([$userId]);
  $row = $stmt->fetch();
  if (!$row) return;

  $state = json_decode($row['state_json'] ?? '', true);
  if (!is_array($state)) return;

  $changed = false;
  if (isset($state['transactions']) && is_array($state['transactions'])) {
    foreach ($state['transactions'] as &$t) {
      if (!is_array($t)) continue;
      if (($t['type'] ?? '') === 'expense') {
        if (isset($t['categoryId']) && (int)$t['categoryId'] === $fromId) {
          $t['categoryId'] = $toId;
          // keep a safe fallback label for older UI paths
          $changed = true;
        }
      }
    }
    unset($t);
  }

  if ($changed) {
    $newJson = json_encode($state);
    $newVersion = (int)$row['version'] + 1;
    $stmtU = $pdo->prepare('UPDATE user_state SET state_json = ?, version = ? WHERE user_id = ?');
    $stmtU->execute([$newJson, $newVersion, $userId]);
  }
}
