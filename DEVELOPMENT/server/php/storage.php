<?php
// PHP 7.2-compatible, fictional-data testing only. Never a public data directory.
if (!defined('CAPSTONE_API')) { http_response_code(404); exit; }

class CapstoneError extends RuntimeException {}
function fail($message, $status = 400) { throw new CapstoneError($message, $status); }
function stamp() { return gmdate('Y-m-d\TH:i:s') . '.000Z'; }
function uuid() {
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 15) | 64);
    $b[8] = chr((ord($b[8]) & 63) | 128);
    $h = bin2hex($b);
    return substr($h, 0, 8).'-'.substr($h, 8, 4).'-'.substr($h, 12, 4).'-'.substr($h, 16, 4).'-'.substr($h, 20);
}
function private_dir($path) {
    if (is_link($path)) fail('Private storage must not be a symbolic link.', 503);
    if (!is_dir($path) && !@mkdir($path, 0700) && !is_dir($path)) {
        fail('Ocelot cannot create private ticket storage outside public_html. Ask the account owner to follow the upload guide. Do not use permissions 777.', 503);
    }
    if (!@chmod($path, 0700) || !is_writable($path)) fail('Private ticket storage is not writable by PHP. Ask the account owner to check permissions.', 503);
    if (DIRECTORY_SEPARATOR === '/' && (fileperms($path) & 0077) !== 0) fail('Private storage permissions could not be secured.', 503);
    return realpath($path);
}
function storage_path() {
    $app = realpath(dirname(__DIR__)); // Packaged api/ is directly below the app root.
    $web = $app;
    while (basename($web) !== 'public_html' && dirname($web) !== $web) $web = dirname($web);
    if (basename($web) !== 'public_html') fail('Upload the application folder inside public_html so private storage can be located safely.', 503);
    $home = realpath(dirname($web));
    $private = private_dir($home . DIRECTORY_SEPARATOR . '.capstone-chat-private');
    if (dirname($private) !== $home) fail('Private storage location is invalid.', 503);
    // Stable across code uploads, isolated between differently named deployments.
    $dir = private_dir($private . DIRECTORY_SEPARATOR . substr(hash('sha256', $app), 0, 20));
    private_dir($dir . DIRECTORY_SEPARATOR . 'attachments');
    return $dir;
}
function safe_file($path) {
    if (is_link($path) || (file_exists($path) && !is_file($path))) fail('Private storage contains an invalid file. Ask the project owner to inspect it.', 503);
}
function atomic_state($dir, $state) {
    $json = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false || strlen($json) > 24 * 1024 * 1024) fail('The testing queue is full. Ask the project owner to archive it.', 503);
    $tmp = $dir . '/state-' . bin2hex(random_bytes(12)) . '.tmp';
    $handle = @fopen($tmp, 'x+b');
    if (!$handle) fail('Tickets could not be saved. Private storage is unavailable.', 503);
    try {
        if (!@chmod($tmp, 0600)) fail('Could not secure the ticket file.', 503);
        $offset = 0;
        while ($offset < strlen($json)) {
            $written = fwrite($handle, substr($json, $offset));
            if (!$written) fail('Ticket write failed. Check available storage.', 503);
            $offset += $written;
        }
        if (!fflush($handle)) fail('Could not finish saving tickets.', 503);
        fclose($handle); $handle = null;
        safe_file($dir . '/state.json');
        if (!@rename($tmp, $dir . '/state.json')) fail('Could not commit tickets. No success was confirmed.', 503);
    } finally {
        if (is_resource($handle)) fclose($handle);
        if (is_file($tmp)) @unlink($tmp); // Only this request's new temporary file.
    }
}
function transact($callback) {
    $dir = storage_path();
    safe_file($dir . '/state.lock');
    $lock = @fopen($dir . '/state.lock', 'c+b');
    if (!$lock || !@chmod($dir . '/state.lock', 0600)) fail('Cannot open the ticket storage lock.', 503);
    $deadline = microtime(true) + 5;
    do {
        $locked = flock($lock, LOCK_EX | LOCK_NB);
        if (!$locked) usleep(20000);
    } while (!$locked && microtime(true) < $deadline);
    if (!$locked) { fclose($lock); fail('The shared queue is busy. Try again shortly.', 503); }
    $newFiles = [];
    try {
        safe_file($dir . '/state.json');
        if (is_file($dir . '/state.json')) {
            if (filesize($dir . '/state.json') > 24 * 1024 * 1024) fail('The testing queue needs archiving.', 503);
            $state = json_decode(file_get_contents($dir . '/state.json'), true);
            if (!is_array($state) || ($state['version'] ?? null) !== 1 || !is_array($state['tickets'] ?? null) || !is_array($state['sessions'] ?? null) || !is_array($state['rates'] ?? null) || !is_string($state['secret'] ?? null)) {
                fail('Ticket storage could not be read. Existing data was preserved; contact the project owner.', 503);
            }
        } else $state = ['version'=>1, 'secret'=>bin2hex(random_bytes(32)), 'tickets'=>[], 'sessions'=>[], 'rates'=>[]];
        $before = json_encode($state);
        foreach ($state['sessions'] as $key => $session) if ($session['expiresAt'] <= time() * 1000) unset($state['sessions'][$key]);
        foreach ($state['rates'] as $key => $rate) if ($rate['until'] <= time()) unset($state['rates'][$key]);
        $error = null;
        try { $result = $callback($state, $dir, $newFiles); }
        catch (CapstoneError $e) { $error = $e; $result = null; }
        if ($error && $newFiles) { foreach ($newFiles as $file) @unlink($file); $newFiles = []; }
        if ($before !== json_encode($state) || !is_file($dir . '/state.json')) atomic_state($dir, $state);
        $newFiles = []; // Acknowledgment is sent only after durable file commit.
        if ($error) throw $error;
        return $result;
    } finally {
        foreach ($newFiles as $file) @unlink($file);
        flock($lock, LOCK_UN); fclose($lock);
    }
}
function rate_limit(&$state, $scope, $limit, $seconds) {
    $key = hash_hmac('sha256', $scope . ':' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), $state['secret']);
    $rate = $state['rates'][$key] ?? ['count'=>0, 'until'=>time() + $seconds];
    if ($rate['count'] >= $limit || count($state['rates']) >= 2000) fail('Too many requests. Please wait and try again later.', 429);
    $rate['count']++;
    $state['rates'][$key] = $rate;
    return $key;
}
