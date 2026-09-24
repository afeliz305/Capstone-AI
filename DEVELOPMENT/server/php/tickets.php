<?php
if (!defined('CAPSTONE_API')) { http_response_code(404); exit; }
function text_field($input, $key, $limit, $required = false) {
    $value = $input[$key] ?? '';
    if (!is_string($value) || mb_strlen($value, 'UTF-8') > $limit || ($required && trim($value) === '')) fail($key . ' must ' . ($required ? 'contain text and ' : '') . 'be no longer than ' . $limit . ' characters.');
    return trim($value);
}
function contact($input, $email) {
    $parts = explode('@', $email);
    if (strlen($email) > 254 || count($parts) !== 2 || strlen($parts[0]) > 64 || !preg_match('/^[A-Z0-9.!#$%&\x27*+\/=?^_`{|}~-]+$/iD', $parts[0]) || $parts[0][0] === '.' || substr($parts[0], -1) === '.' || strpos($parts[0], '..') !== false || !preg_match('/^(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/iD', $parts[1])) fail('Enter a valid requester email, such as name@example.edu.');
    $method = $input['preferredContactMethod'] ?? 'email';
    if (!in_array($method, ['email', 'phone'], true)) fail('Choose Email or Phone as your preferred contact method.');
    if ($method === 'email') return ['method'=>'email', 'value'=>$email];
    $phone = text_field($input, 'contactPhone', 40, true);
    $digits = preg_replace('/\D/', '', $phone);
    $error = 'Enter a valid phone format: (305) 555-0123 or +44 20 7946 0958. Include the country code outside the U.S./Canada; no extensions.';
    if (preg_match('/[^0-9+(). -]/', $phone)) fail($error);
    if ($phone[0] !== '+' || substr($phone, 0, 2) === '+1') {
        if (!preg_match('/^(?:\+?1[ .-]?)?(?:\([2-9]\d{2}\)|[2-9]\d{2})[ .-]?[2-9]\d{2}[ .-]?\d{4}$/D', $phone)) fail($error);
        $national = strlen($digits) === 11 ? substr($digits, 1) : $digits;
        if (preg_match('/^(\d)\1{9}$/D', $national)) fail($error);
        return ['method'=>'phone', 'value'=>'+1'.$national];
    }
    if (!preg_match('/^\+[1-9]\d*(?:[ .-]\d+)*$/D', $phone) || strlen($digits) < 8 || strlen($digits) > 15 || preg_match('/^(\d)\1+$/D', $digits)) fail($error);
    return ['method'=>'phone', 'value'=>'+'.$digits];
}
function prepare_documents($input) {
    $files = $input['attachments'] ?? [];
    if (!is_array($files) || count($files) > 3 || array_values($files) !== $files) fail('Attach up to 3 documents per ticket.');
    $types = ['pdf'=>'application/pdf', 'docx'=>'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'txt'=>'text/plain'];
    $total = 0; $documents = [];
    foreach ($files as $file) {
        if (!is_array($file)) fail('Invalid attachment.');
        $name = text_field($file, 'name', 180, true);
        if (preg_match('/[\\\\\/\x00-\x1f\x7f<>:"|?*]/', $name)) fail('Rename the document without special characters or path separators.');
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if (!isset($types[$ext])) fail('Only PDF, Word (.docx), and text (.txt) documents are supported.');
        $size = $file['size'] ?? 0;
        if (!is_int($size) || $size < 1 || $size > 5 * 1024 * 1024) fail('Each document must contain data and be 5 MB or smaller.');
        $total += $size;
        if ($total > 10 * 1024 * 1024) fail('Documents must total 10 MB or less per ticket.');
        $encoded = $file['data'] ?? null;
        if (!is_string($encoded) || strlen($encoded) !== (int)(4 * ceil($size / 3))) fail('Invalid document encoding.');
        $bytes = base64_decode($encoded, true);
        if ($bytes === false || strlen($bytes) !== $size || base64_encode($bytes) !== $encoded) fail('Document size or encoding does not match.');
        if ($ext === 'pdf' && substr($bytes, 0, 5) !== '%PDF-') fail('The PDF file contents are invalid.');
        if ($ext === 'docx' && (substr($bytes, 0, 4) !== "PK\x03\x04" || strpos($bytes, '[Content_Types].xml') === false || strpos($bytes, 'word/document.xml') === false)) fail('The Word document contents are invalid.');
        if ($ext === 'txt' && (strpos($bytes, "\0") !== false || !mb_check_encoding($bytes, 'UTF-8'))) fail('Text documents must use valid UTF-8 text without null bytes.');
        $documents[] = ['id'=>uuid(), 'name'=>$name, 'size'=>$size, 'type'=>$types[$ext], 'bytes'=>$bytes];
    }
    return $documents;
}
function save_documents($documents, $dir, &$newFiles, $tickets) {
    $used = 0;
    foreach ($tickets as $ticket) foreach ($ticket['attachments'] ?? [] as $file) $used += $file['size'];
    foreach ($documents as $document) $used += $document['size'];
    if ($used > 100 * 1024 * 1024) fail('The test site has reached its 100 MB document allowance. Ask the project owner to archive test data.', 507);
    $saved = [];
    foreach ($documents as $document) {
        $path = $dir . '/attachments/' . $document['id'];
        $handle = @fopen($path, 'x+b');
        if (!$handle) fail('Could not save the attachment.', 503);
        $newFiles[] = $path;
        try {
            if (!@chmod($path, 0600) || fwrite($handle, $document['bytes']) !== $document['size'] || !fflush($handle)) fail('Could not finish saving the attachment.', 503);
        } finally { fclose($handle); }
        unset($document['bytes']); $saved[] = $document;
    }
    return $saved;
}
function create_ticket($input, &$state, $staff, $dir, &$newFiles) {
    if (count($state['tickets']) >= 1000) fail('The test queue has reached 1,000 tickets. Ask the project owner to archive it.', 507);
    if ($staff) {
        if (!in_array($input['category'] ?? '', TOPICS, true)) fail('Choose a ticket topic from the list.');
        if (isset($input['projectOwnerTicket']) && !is_bool($input['projectOwnerTicket'])) fail('Project-owner classification must be true or false.');
    }
    $name = $staff ? $staff['name'] : text_field($input, 'name', 120, true);
    $email = $staff ? $staff['email'] : strtolower(text_field($input, 'email', 254, true));
    $assignee = $staff ? assignee($input['assignedTo'] ?? null) : null;
    $highest = 1000;
    foreach ($state['tickets'] as $ticket) $highest = max($highest, (int)substr($ticket['id'], 4));
    $ticket = ['id'=>'CAP-'.($highest + 1), 'name'=>$name, 'email'=>$email, 'contact'=>contact($input, $email), 'accountId'=>null,
        'identitySource'=>$staff ? 'staff-email-demo' : 'manual', 'category'=>text_field($input, 'category', 80) ?: 'Other',
        'question'=>text_field($input, 'question', 500, true), 'details'=>text_field($input, 'details', 3000, true),
        'transcript'=>!$staff && !empty($input['includeTranscript']) ? text_field($input, 'transcript', 5000) : '',
        'privateToInstructor'=>!$staff && !empty($input['privateToInstructor']), 'status'=>'open', 'assignedTo'=>$assignee,
        'source'=>$staff ? 'Capstone staff queue' : 'Capstone - AI prototype', 'createdAt'=>stamp()];
    if ($staff) {
        $ticket['createdBy'] = $staff['email'];
        if ($assignee) { $ticket['assignedBy'] = $staff['email']; $ticket['assignedAt'] = $ticket['createdAt']; }
        if (!empty($input['projectOwnerTicket'])) { $ticket['projectOwnerTicket'] = true; $ticket['projectOwnerMarkedBy'] = $staff['email']; $ticket['projectOwnerMarkedAt'] = $ticket['createdAt']; }
    }
    $ticket['attachments'] = save_documents(prepare_documents($input), $dir, $newFiles, $state['tickets']);
    array_unshift($state['tickets'], $ticket);
    return $ticket;
}
function assignee($value) {
    if ($value === null) return null;
    $email = is_string($value) ? strtolower(trim($value)) : '';
    if (!member($email)) fail('Choose a staff member from the approved list.');
    return $email;
}
function work_ticket($ticket, $input, $staff) {
    if (!is_int($input['expectedRevision'] ?? null) || $input['expectedRevision'] < 0) fail('Reload the ticket before saving.');
    if (!is_string($input['requestId'] ?? null) || !preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iD', $input['requestId'])) fail('A valid save identifier is required.');
    $fingerprint = hash('sha256', json_encode($input));
    foreach ($ticket['workSaves'] ?? [] as $save) if ($save['requestId'] === $input['requestId']) {
        if ($save['author'] !== $staff['email'] || $save['fingerprint'] !== $fingerprint) fail('This save identifier has already been used. Reload the ticket.', 409);
        return $ticket;
    }
    if (($ticket['revision'] ?? 0) !== $input['expectedRevision']) fail('This ticket changed while you were working. Reload the latest ticket before saving; your unsaved draft has not been applied.', 409);
    if (!in_array($input['status'] ?? '', STATUSES, true)) fail('Choose a valid status.');
    if (!in_array($input['priority'] ?? '', ['low','normal','high','urgent'], true)) fail('Choose a valid priority.');
    if (!in_array($input['category'] ?? '', TOPICS, true) && ($input['category'] ?? '') !== $ticket['category']) fail('Choose a category from the list.');
    if (!array_key_exists('assignedTo', $input)) fail('Choose an approved staff member or Unassigned.');
    $fields = ['status'=>$input['status'], 'priority'=>$input['priority'], 'category'=>$input['category'], 'assignedTo'=>assignee($input['assignedTo']),
        'question'=>text_field($input, 'question', 500, true), 'details'=>text_field($input, 'details', 3000, true), 'resolution'=>text_field($input, 'resolution', 3000)];
    if (array_key_exists('projectOwnerTicket', $input)) {
        if (!is_bool($input['projectOwnerTicket'])) fail('Project-owner classification must be true or false.');
        $fields['projectOwnerTicket'] = $input['projectOwnerTicket'];
    }
    $note = text_field($input, 'workNote', 4000); $comment = text_field($input, 'additionalComment', 4000);
    $changed = [];
    $defaults = ['priority'=>'normal', 'assignedTo'=>null, 'projectOwnerTicket'=>false];
    foreach ($fields as $key => $value) if ($value !== ($ticket[$key] ?? (array_key_exists($key, $defaults) ? $defaults[$key] : ''))) $changed[] = $key;
    if (!$changed && !$note && !$comment) fail('Change a field or enter a note before saving.');
    $now = stamp(); $activity = $ticket['activity'] ?? [];
    $add = function ($type, $body) use (&$activity, $staff, $now) { $activity[] = ['id'=>uuid(), 'type'=>$type, 'body'=>$body, 'author'=>$staff, 'createdAt'=>$now]; };
    if ($changed) $add('update', 'Updated: '.implode(', ', array_map(function ($k) { return ['question'=>'title','assignedTo'=>'assignee','projectOwnerTicket'=>'project-owner tag'][$k] ?? $k; }, $changed)).'.');
    if ($note) $add('work-note', $note);
    if ($comment) $add('additional-comment', $comment);
    if ($fields['assignedTo'] !== ($ticket['assignedTo'] ?? null)) { $ticket['assignedBy'] = $staff['email']; $ticket['assignedAt'] = $now; }
    if ($fields['status'] === 'resolved' && $ticket['status'] !== 'resolved') { $ticket['resolvedBy'] = $staff['email']; $ticket['resolvedAt'] = $now; }
    if (in_array('projectOwnerTicket', $changed, true)) { $ticket['projectOwnerMarkedBy'] = $staff['email']; $ticket['projectOwnerMarkedAt'] = $now; }
    $saves = $ticket['workSaves'] ?? []; $saves[] = ['requestId'=>$input['requestId'], 'fingerprint'=>$fingerprint, 'author'=>$staff['email']];
    return array_merge($ticket, $fields, ['activity'=>$activity, 'updatedAt'=>$now, 'updatedBy'=>$staff['email'], 'revision'=>($ticket['revision'] ?? 0)+1, 'workSaves'=>array_slice($saves, -50)]);
}
function requester_view($ticket) {
    $view = array_intersect_key($ticket, array_flip(['id','category','status','question','details','createdAt']));
    $view['updatedAt'] = $ticket['updatedAt'] ?? $ticket['createdAt']; $view['comments'] = [];
    foreach ($ticket['activity'] ?? [] as $entry) if ($entry['type'] === 'additional-comment') $view['comments'][] = ['id'=>$entry['id'], 'body'=>$entry['body'], 'authorName'=>$entry['author']['name'], 'createdAt'=>$entry['createdAt']];
    return $view;
}
