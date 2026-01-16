<?php
// Finance OS API config
// IMPORTANT: edit these values after upload.

return [
  'db' => [
    'host' => 'localhost',
    'name' => 'YOUR_DB_NAME',
    'user' => 'YOUR_DB_USER',
    'pass' => 'YOUR_DB_PASS',
    'charset' => 'utf8mb4',
  ],

  // Only allow requests from this origin (no wildcards)
  'allowed_origin' => 'https://finance.lolclownbot.com',

  // Used to hash session tokens in DB (keep secret)
  'token_secret' => 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET',

  // Session lifetime in days
  'session_days' => 30,

  // Simple IP-based rate limit for auth endpoints
  'rate_limit' => [
    'window_seconds' => 60,  // 1 minute window
    'max_requests' => 12,     // per IP per endpoint per window
  ],
];
