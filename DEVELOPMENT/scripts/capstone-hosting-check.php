<?php
// Temporary, read-only web-runtime check. Delete the uploaded copy after use.
// No application files, credentials, cookies, environment variables, or paths
// are read. No session/database is opened and nothing is written to disk.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

echo json_encode(array(
    'check' => 'capstone-php-check-v1',
    'phpExecuted' => true,
    'phpVersion' => PHP_VERSION,
    'extensions' => array(
        'json' => extension_loaded('json'),
        'pdo_sqlite' => extension_loaded('pdo_sqlite'),
        'session' => extension_loaded('session'),
        'fileinfo' => extension_loaded('fileinfo'),
        'mbstring' => extension_loaded('mbstring'),
        'zip' => extension_loaded('zip')
    ),
    'privateStorageTested' => false,
    'ticketBackendInstalled' => false
), JSON_PRETTY_PRINT) . "\n";
