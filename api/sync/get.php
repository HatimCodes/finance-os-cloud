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

// --- Snapshot migration: category strings -> categoryId (per-user categories table) ---
// The app previously stored expense category as a string inside the snapshot.
// We now store a stable categoryId and fetch the category list from MySQL.
// This migration is safe and idempotent.
if (is_array($state)) {
  $changed = false;

  // Build map name(lower) -> id for user
  $stmtC = $pdo->prepare('SELECT id, name FROM categories WHERE user_id = ?');
  $stmtC->execute([$user['userId']]);
  $nameToId = [];
  foreach ($stmtC->fetchAll() as $c) {
    $nameToId[strtolower(trim((string)$c['name']))] = (int)$c['id'];
  }

  // Ensure fallback Other exists
  if (!isset($nameToId['other'])) {
    $stmtIns = $pdo->prepare('INSERT INTO categories (user_id, name, kind, sort_order) VALUES (?, ?, ?, ?)');
    $stmtIns->execute([$user['userId'], 'Other', 'expense', 9999]);
    $nameToId['other'] = (int)$pdo->lastInsertId();
    $changed = true;
  }

  if (isset($state['transactions']) && is_array($state['transactions'])) {
    foreach ($state['transactions'] as &$t) {
      if (!is_array($t)) continue;
      if (($t['type'] ?? '') !== 'expense') continue;

      // Already migrated
      if (isset($t['categoryId']) && (int)$t['categoryId'] > 0) continue;

      $catName = trim((string)($t['category'] ?? ''));
      $key = strtolower($catName);
      if ($key === '') $key = 'other';

      if (!isset($nameToId[$key])) {
        // Create category from historical snapshot value (user-owned)
        $safeName = $catName;
        $safeName = preg_replace('/\s+/', ' ', $safeName);
        $safeName = trim($safeName);
        if ($safeName === '') $safeName = 'Other';
        // Enforce max length
        if (strlen($safeName) > 40) $safeName = substr($safeName, 0, 40);
        try {
          $stmtIns = $pdo->prepare('INSERT INTO categories (user_id, name, kind, sort_order) VALUES (?, ?, ?, ?)');
          $stmtIns->execute([$user['userId'], $safeName, 'expense', 0]);
          $newId = (int)$pdo->lastInsertId();
          $nameToId[strtolower($safeName)] = $newId;
        } catch (PDOException $e) {
          // Duplicate (race) - refetch id
          $stmtOne = $pdo->prepare('SELECT id FROM categories WHERE user_id = ? AND name = ? LIMIT 1');
          $stmtOne->execute([$user['userId'], $safeName]);
          $r = $stmtOne->fetch();
          $newId = $r ? (int)$r['id'] : $nameToId['other'];
        }
        $nameToId[$key] = $newId;
      }

      $t['categoryId'] = $nameToId[$key];
      $changed = true;
    }
    unset($t);
  }

  // Stop shipping random hard-coded categories inside the snapshot.
  // Keep the field for backward compatibility, but make it empty.
  if (isset($state['categories']) && is_array($state['categories']) && count($state['categories']) > 0) {
    $state['categories'] = [];
    $changed = true;
  }

  if ($changed) {
    $newJson = json_encode($state);
    $newVersion = (int)$row['version'] + 1;
    $stmtU = $pdo->prepare('UPDATE user_state SET state_json = ?, version = ? WHERE user_id = ?');
    $stmtU->execute([$newJson, $newVersion, $user['userId']]);

    // Reflect updated version in response
    $row['version'] = $newVersion;
    // updated_at auto-updated
    $stmtR = $pdo->prepare('SELECT updated_at FROM user_state WHERE user_id = ? LIMIT 1');
    $stmtR->execute([$user['userId']]);
    $ur = $stmtR->fetch();
    if ($ur && isset($ur['updated_at'])) $row['updated_at'] = $ur['updated_at'];
  }
}

send_json([
  'state' => $state,
  'version' => (int)$row['version'],
  'updatedAt' => (new DateTimeImmutable($row['updated_at']))->format(DATE_ATOM),
]);
