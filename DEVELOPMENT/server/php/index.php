<?php
// Ocelot fictional-data demo. No credentials or runtime data belong in this folder.
define('CAPSTONE_API', true);
ini_set('display_errors', '0');
umask(0077);
require __DIR__.'/storage.php';
require __DIR__.'/tickets.php';
require __DIR__.'/search.php';
define('STAFF', [
    ['name'=>'Zavier Richardson','email'=>'zrich010@fiu.edu'],
    ['name'=>'Christopher Hernandez','email'=>'chern563@fiu.edu'],
    ['name'=>'Michael Alvarez','email'=>'malva517@fiu.edu'],
    ['name'=>'Romelin Charnel','email'=>'rchar044@fiu.edu'],
    ['name'=>'Anthony Feliz','email'=>'afeli016@fiu.edu']
]);
define('TOPICS', ['Workflow and improvements','Testing and updates','Implementation and testing','Website navigation','Coursework','Attendance','Scrum and sprints','Showcase','Templates and branding','Other']);
define('STATUSES', ['open','in-review','resolved']);

function member($email) { foreach (STAFF as $staff) if ($staff['email'] === $email) return $staff; return null; }
function cookie_name() { return 'capstone_staff_' . substr(hash('sha256', __DIR__), 0, 12); }
function session_key() {
    $token = $_COOKIE[cookie_name()] ?? '';
    return is_string($token) && preg_match('/^[a-f0-9]{64}$/D', $token) ? hash('sha256', $token) : '';
}
function staff_cookie($token, $maxAge) {
    $path = dirname($_SERVER['SCRIPT_NAME']);
    // Encode path consistently when CGI exposes a decoded SCRIPT_NAME.
    $path = implode('/', array_map(function ($part) { return rawurlencode(rawurldecode($part)); }, explode('/', $path))) . '/';
    header('Set-Cookie: '.cookie_name().'='.$token.'; Max-Age='.$maxAge.'; Path='.$path.'; HttpOnly; SameSite=Strict'.(secure_request() ? '; Secure' : ''));
}
function secure_request() { return (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') || ($_SERVER['SERVER_PORT'] ?? '') == 443; }
function staff_current($state) {
    $session = $state['sessions'][session_key()] ?? null;
    if (!$session || $session['expiresAt'] <= time()*1000 || !member($session['email'])) fail('Unauthorized access. Sign in to the staff queue.', 401);
    return ['staff'=>member($session['email']), 'expiresAt'=>$session['expiresAt'], 'members'=>STAFF, 'loginMode'=>'email-demo'];
}
function guest_context($state) { return hash_hmac('sha256', 'guest-no-portal-integration-v1', $state['secret']); }
function input_json($limit) {
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > $limit) fail('Request is too large.', 413);
    $raw = file_get_contents('php://input', false, null, 0, $limit+1);
    if ($raw === false || strlen($raw) > $limit) fail('Request is too large.', 413);
    if (strlen($raw) < (int)($_SERVER['CONTENT_LENGTH'] ?? 0)) fail('Ocelot rejected the upload size. Try smaller documents or ask the project owner to check PHP request limits.', 413);
    $object = json_decode($raw);
    if (!is_object($object)) fail('Request body must be a JSON object.');
    return json_decode($raw, true);
}
function dispatch_api($route, $method, $input, &$state, $dir, &$newFiles) {
    if ($method === 'GET' && $route === '/health') return [200, ['status'=>'ok','mode'=>'zero-token','backend'=>'php','storage'=>'private-files','loginMode'=>'email-demo','testingOnly'=>true]];
    if ($method === 'GET' && $route === '/session') return [200, ['status'=>'guest','account'=>null,'identityContext'=>guest_context($state),'demoAvailable'=>false]];
    if ($method === 'GET' && $route === '/search') {
        $question = text_field($_GET, 'q', 500, true);
        return [200, search_knowledge($question, text_field($_GET, 'context', 100))];
    }
    if ($method === 'POST' && $route === '/staff/login') {
        unset($state['sessions'][session_key()]); staff_cookie('', 0);
        $rateKey = rate_limit($state, 'login', 10, 900);
        $email = strtolower(text_field($input, 'email', 254));
        $staff = member($email);
        if (!$staff) fail('Unauthorized access. This email is not on the approved staff list.', 401);
        if (count($state['sessions']) >= 100) fail('Too many staff sessions. Try again later.', 429);
        unset($state['rates'][$rateKey]);
        $token = bin2hex(random_bytes(32)); $expiresAt = (time()+3600)*1000;
        $state['sessions'][hash('sha256', $token)] = ['email'=>$email, 'expiresAt'=>$expiresAt];
        staff_cookie($token, 3600);
        return [200, ['staff'=>$staff,'expiresAt'=>$expiresAt,'members'=>STAFF,'loginMode'=>'email-demo']];
    }
    if ($method === 'GET' && $route === '/staff/session') return [200, staff_current($state)];
    if ($method === 'POST' && $route === '/staff/logout') { unset($state['sessions'][session_key()]); staff_cookie('', 0); return [200, ['ok'=>true]]; }
    if ($method === 'POST' && ($route === '/tickets' || $route === '/staff/tickets')) {
        $staff = $route === '/staff/tickets' ? staff_current($state)['staff'] : null;
        if (!$staff && (!is_string($input['identityContext'] ?? null) || !hash_equals(guest_context($state), $input['identityContext']))) fail('Your account changed or expired. Review the refreshed details and submit again.', 409);
        rate_limit($state, 'create', 30, 900);
        return [201, create_ticket($input, $state, $staff, $dir, $newFiles)];
    }
    if ($method === 'GET' && $route === '/tickets') { staff_current($state); return [200, $state['tickets']]; }
    if (preg_match('#^/tickets/(CAP-[0-9]+)(?:/(work|requester-preview)|/attachments/([a-f0-9-]{36}))?$#D', $route, $match)) {
        $staff = staff_current($state)['staff']; $index = null;
        foreach ($state['tickets'] as $i => $ticket) if ($ticket['id'] === $match[1]) { $index = $i; break; }
        if ($index === null) fail('Ticket not found.', 404);
        $ticket = $state['tickets'][$index]; $action = $match[2] ?? '';
        if ($method === 'GET' && !empty($match[3])) {
            if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') fail('Download documents from the staff queue.', 403);
            foreach ($ticket['attachments'] ?? [] as $file) if ($file['id'] === $match[3]) {
                $path = $dir.'/attachments/'.$file['id']; safe_file($path);
                $bytes = @file_get_contents($path);
                if ($bytes === false) fail('Attachment file is missing from storage.', 404);
                return [200, ['download'=>$file, 'bytes'=>$bytes]];
            }
            fail('Attachment not found.', 404);
        }
        if ($method === 'GET' && ($action === '' || $action === 'requester-preview')) return [200, $action === 'requester-preview' ? requester_view($ticket) : $ticket];
        if ($method === 'PATCH' && $action === 'work') { $state['tickets'][$index] = work_ticket($ticket, $input, $staff); return [200, $state['tickets'][$index]]; }
        if ($method === 'PATCH' && $action === '' && empty($match[3])) {
            $changingAssignment = array_key_exists('assignedTo', $input);
            $changingStatus = array_key_exists('status', $input);
            if (!$changingAssignment && !$changingStatus) fail('Choose a status or staff assignment to update.');
            if ($changingStatus && !in_array($input['status'], STATUSES, true)) fail('Invalid ticket status.');
            if ($changingAssignment) {
                $newAssignee = assignee($input['assignedTo']);
                if (!array_key_exists('expectedAssignee', $input)) fail('Refresh the ticket before changing its assignment.');
                $expected = $input['expectedAssignee'] === null ? null : (is_string($input['expectedAssignee']) ? strtolower(trim($input['expectedAssignee'])) : '');
                if (($ticket['assignedTo'] ?? null) !== $expected) fail('Another staff member changed this assignment. Refresh the queue and try again.', 409);
                $ticket['assignedTo'] = $newAssignee; $ticket['assignedBy'] = $staff['email']; $ticket['assignedAt'] = stamp();
            }
            if ($changingStatus) {
                if ($input['status'] === 'resolved' && $ticket['status'] !== 'resolved') { $ticket['resolvedBy'] = $staff['email']; $ticket['resolvedAt'] = stamp(); }
                $ticket['status'] = $input['status'];
            }
            $ticket['revision'] = ($ticket['revision'] ?? 0)+1; $ticket['updatedAt'] = stamp(); $ticket['updatedBy'] = $staff['email'];
            $state['tickets'][$index] = $ticket; return [200, $ticket];
        }
    }
    fail('API endpoint not found.', 404);
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Cross-Origin-Resource-Policy: same-origin');
try {
    if (!function_exists('mb_strlen') || !function_exists('mb_check_encoding')) fail('The PHP mbstring extension is required. Ask the host administrator to enable it.', 503);
    $host = strtolower($_SERVER['HTTP_HOST'] ?? '');
    $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1','::1'], true) && preg_match('/^(?:localhost|127\.0\.0\.1)(?::\d+)?$/D', $host);
    if (!$local && ($host !== 'ocelot.aul.fiu.edu' || !secure_request())) fail('Use the HTTPS Ocelot address for this testing package.', 403);
    $route = $_GET['route'] ?? '/health';
    if (!is_string($route) || !preg_match('#^/[a-zA-Z0-9/-]+$#D', $route)) fail('Invalid API route.');
    $method = $_SERVER['REQUEST_METHOD']; $input = [];
    if (in_array($method, ['POST','PATCH','DELETE'], true)) {
        $origin = (secure_request() ? 'https://' : 'http://').$host;
        if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site' || (isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] !== $origin)) fail('Submit this request from the assistant page.', 403);
        if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') fail('Request body must use application/json.', 415);
        $input = input_json(in_array($route, ['/tickets','/staff/tickets'], true) ? 14*1024*1024 : 128*1024);
    }
    $result = transact(function (&$state, $dir, &$files) use ($route, $method, $input) { return dispatch_api($route, $method, $input, $state, $dir, $files); });
    http_response_code($result[0]);
    if (isset($result[1]['download'])) {
        $file = $result[1]['download'];
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="document.'.strtolower(pathinfo($file['name'], PATHINFO_EXTENSION)).'"; filename*=UTF-8\'\''.rawurlencode($file['name']));
        header("Content-Security-Policy: sandbox; default-src 'none'");
        header('Content-Length: '.strlen($result[1]['bytes'])); echo $result[1]['bytes'];
    } else echo json_encode($result[1], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    $known = $error instanceof CapstoneError;
    http_response_code($known ? $error->getCode() : 503);
    if (!$known) error_log('Capstone API internal failure: '.$error->getMessage());
    echo json_encode(['error'=>$known ? $error->getMessage() : 'The Capstone backend is unavailable. Ask the project owner to check the PHP server log. No success was confirmed.', 'loginMode'=>'email-demo']);
}
