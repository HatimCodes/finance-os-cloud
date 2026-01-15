<?php
require __DIR__ . '/../_lib/bootstrap.php';
$user = require_auth_user();

send_json([
  'user' => [
    'id' => $user['userId'],
    'email' => $user['email'],
    'displayName' => $user['displayName'],
  ]
]);
