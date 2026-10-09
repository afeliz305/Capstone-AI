<?php
if (!defined('CAPSTONE_API')) { http_response_code(404); exit; }
function normalized($value) {
    if (is_array($value)) $value = implode(' ', $value);
    $value = mb_strtolower((string)$value, 'UTF-8');
    // Ocelot has mbstring/iconv, but not intl. Fold Latin accents for keyword lookup.
    $value = strtr($value, ['à'=>'a','á'=>'a','â'=>'a','ã'=>'a','ä'=>'a','å'=>'a','ç'=>'c','è'=>'e','é'=>'e','ê'=>'e','ë'=>'e','ì'=>'i','í'=>'i','î'=>'i','ï'=>'i','ñ'=>'n','ò'=>'o','ó'=>'o','ô'=>'o','õ'=>'o','ö'=>'o','ù'=>'u','ú'=>'u','û'=>'u','ü'=>'u','ý'=>'y','ÿ'=>'y']);
    $value = preg_replace('/[\x{0300}-\x{036f}]/u', '', $value);
    return trim(preg_replace('/[^a-z0-9#-]+/', ' ', $value));
}
function search_tokens($value) {
    $aliases = ['retro'=>'retrospective','standup'=>'scrum','stand-up'=>'scrum','proof'=>'evidence','assignee'=>'owner','blocker'=>'blocked','deck'=>'slides','colour'=>'color','colours'=>'colors','begin'=>'start','starting'=>'start','teacher'=>'instructor','prof'=>'professor'];
    $stop = explode(' ', 'a about an and are can do for from how i in is it me my of on our please the this to we what where which with');
    $out = [];
    foreach (preg_split('/\s+/', normalized($value), -1, PREG_SPLIT_NO_EMPTY) as $token) {
        $token = $aliases[$token] ?? $token;
        if (!in_array($token, $stop, true)) $out[] = $token;
    }
    return array_values(array_unique($out));
}
function link_tokens($value) {
    $aliases = ['tutorials'=>'tutorial','templates'=>'template','minutes'=>'minute','projects'=>'project','posters'=>'poster','slides'=>'slide','logos'=>'logo','fonts'=>'font','colors'=>'color','colour'=>'color','colours'=>'color','assignments'=>'assignment','grades'=>'grade','retrospectives'=>'retrospective'];
    preg_match_all('/[a-z0-9]+/', normalized($value), $matches);
    return array_map(function ($token) use ($aliases) { return $aliases[$token] ?? $token; }, $matches[0]);
}
function keyword_links($entries, $question) {
    $query = link_tokens($question); $candidates = [];
    foreach ($entries as $order => $entry) {
        if (isset($entry['navigationUrl'])) { $entry['url'] = $entry['navigationUrl']; $entry['sourceTitle'] = $entry['navigationSourceTitle']; $entry['access'] = $entry['navigationAccess']; }
        $url = parse_url($entry['url']);
        if (!$url || ($url['scheme'] ?? '') !== 'https' || ($url['host'] ?? '') !== 'capstone.cs.fiu.edu' || isset($url['user']) || isset($url['pass']) || (isset($url['port']) && $url['port'] !== 443)) continue;
        foreach ($entry['linkKeywords'] ?? [] as $keyword) {
            $phrase = link_tokens($keyword); $length = count($phrase);
            if (!$length) continue;
            for ($start = 0; $start <= count($query) - $length; $start++) if (array_slice($query, $start, $length) === $phrase) $candidates[] = compact('entry', 'keyword', 'start', 'length', 'order');
        }
    }
    usort($candidates, function ($a, $b) { return ($b['length'] <=> $a['length']) ?: (($a['start'] <=> $b['start']) ?: ($a['order'] <=> $b['order'])); });
    $occupied = []; $selected = [];
    foreach ($candidates as $candidate) {
        $positions = range($candidate['start'], $candidate['start'] + $candidate['length'] - 1);
        if (array_intersect($positions, $occupied)) continue;
        $occupied = array_merge($occupied, $positions); $selected[] = $candidate;
    }
    usort($selected, function ($a, $b) { return $a['start'] <=> $b['start']; });
    $links = [];
    foreach ($selected as $candidate) {
        $entry = $candidate['entry']; $id = $entry['id']; $keyword = $candidate['keyword'];
        if (!isset($links[$id])) $links[$id] = array_merge(array_intersect_key($entry, array_flip(['id','title','sourceTitle','url','section','access'])), ['keywords'=>[]]);
        if (!in_array($keyword, $links[$id]['keywords'], true) && count($links[$id]['keywords']) < 3) $links[$id]['keywords'][] = $keyword;
    }
    return array_slice(array_values($links), 0, 4);
}
function public_knowledge_entry($entry, $score) {
    return array_merge(array_intersect_key($entry, array_flip([
        'id','title','sourceTitle','url','section','access','answer','sourceKind','sourcePages','portalSection','liveDataConnected',
        'provenance','canonicalQuestion','category','faroSourceTitle','faroSourceUrl','underlyingOfficialSource',
        'authorityLevel','term','applicability','aliases','navigationTarget','reviewedAt'
    ])), ['followUps'=>array_slice($entry['followUps'] ?? [], 0, 5), 'score'=>round($score, 3)]);
}
function mira_find($entries, $id) {
    foreach ($entries as $entry) if ($entry['id'] === $id) return $entry;
    return null;
}
function mira_result($entries, $spec) {
    $selected = [];
    foreach ($spec['ids'] as $id) { $entry = mira_find($entries, $id); if ($entry) $selected[] = $entry; }
    if (!$selected) return null;
    $matches = [];
    foreach ($selected as $index => $entry) {
        if ($index === 0 && isset($spec['answer'])) $entry['answer'] = call_user_func($spec['answer'], $entry);
        $matches[] = public_knowledge_entry($entry, 1);
    }
    return [
        'status'=>$spec['status'] === 'clarification_needed' ? 'choices' : 'matched',
        'answerStatus'=>$spec['status'], 'responseStatus'=>$spec['status'], 'matches'=>$matches, 'links'=>[],
        'supportingSourceIds'=>array_column($matches, 'id'),
        'courseContext'=>$spec['context'] ?? ['course'=>'CIS 4951','section'=>'RVC','term'=>'Fall 2026'],
        'missingEvidence'=>$spec['missingEvidence'] ?? '', 'accessScope'=>$spec['accessScope'] ?? 'course',
        'navigationRequested'=>false
    ];
}
function mira_navigation($entries, $question, $contextId) {
    $text = normalized($question);
    if (!preg_match('/^(?:take me there|open it|open that|open this section|show me (?:the )?instructions|show me that section|where does it say that|where does that say that|open the (first|second|third) source)$/', $text, $request)) return null;
    $selected = [];
    foreach (array_slice(array_filter(explode(',', (string)$contextId), function($id) { return preg_match('/^[a-z0-9-]+$/', $id); }), 0, 5) as $id) {
        $entry = mira_find($entries, $id);
        if ($entry && ($entry['sourceKind'] ?? '') !== 'prototype') $selected[] = $entry;
    }
    if (!$selected) return null;
    if (!empty($request[1])) {
        $positions = ['first'=>0,'second'=>1,'third'=>2]; $position = $positions[$request[1]];
        if (!isset($selected[$position])) return mira_result($entries, ['status'=>'clarification_needed','ids'=>array_column($selected,'id'),'missingEvidence'=>'The requested source number was not part of the previous answer.']);
        $match = public_knowledge_entry($selected[$position], 1);
    } elseif (count($selected) !== 1) {
        return mira_result($entries, ['status'=>'clarification_needed','ids'=>array_column($selected,'id'),'missingEvidence'=>'The previous answer had more than one verified destination.']);
    } else $match = public_knowledge_entry($selected[0], 1);
    return ['status'=>'matched','answerStatus'=>'answered','responseStatus'=>'answered','matches'=>[$match],'links'=>[],
        'supportingSourceIds'=>[$match['id']],'navigationRequested'=>true,'missingEvidence'=>'','accessScope'=>$match['access']];
}
function route_mira($entries, $question, $contextId) {
    $text = normalized($question); $navigation = mira_navigation($entries, $question, $contextId);
    if ($navigation) return $navigation;
    if (preg_match('/(?:another|other) student|classmate/', $text) && preg_match('/card|work|task|board|project/', $text)) return mira_result($entries, [
        'status'=>'privacy_restricted','ids'=>['grades-privacy','contact-help'],'accessScope'=>'public-course-policy',
        'missingEvidence'=>"Another student's private work is never searched or indexed.",
        'answer'=>function($entry) { return "I cannot retrieve, list, compare, or infer another student's cards, work, project records, or private status. ".$entry['answer']; }
    ]);
    if (preg_match('/(?:another|other) student|classmate/', $text) && preg_match('/grade|score|feedback/', $text)) return mira_result($entries, [
        'status'=>'privacy_restricted','ids'=>['syllabus-grading','contact-help'],'accessScope'=>'public-course-policy',
        'missingEvidence'=>"Another student's grading record is private and is never searched.",
        'answer'=>function($entry) { return "I cannot retrieve, compare, infer, or explain another student's private grade or circumstances. ".$entry['answer']." Discuss only your own feedback with the instructor through the verified course contact route."; }
    ]);
    if (preg_match('/(?:read|show|list|give me).*(?:all )?(?:inbox )?(?:messages?|conversations?|threads?)|open all.*(?:messages?|conversations?|threads?)|message bodies/', $text)) return mira_result($entries, [
        'status'=>'privacy_restricted','ids'=>['portal-messages'],'accessScope'=>'authenticated-navigation-only',
        'missingEvidence'=>'Inbox access is metadata-only; message bodies and bulk conversation history are excluded.',
        'answer'=>function($entry) { return 'MIRA cannot read, list, or retain Inbox message bodies or conversation history. '.$entry['answer']; }
    ]);
    if (preg_match('/(?:show|read|list|open|give me).*(?:faro )?(?:history|conversations?|private prompts?)/', $text)) return mira_result($entries, [
        'status'=>'privacy_restricted','ids'=>['grades-privacy'],'accessScope'=>'public-course-policy',
        'missingEvidence'=>'Private FARO history and generated conversations are excluded from MIRA.',
        'answer'=>function($entry) { return 'MIRA cannot retrieve or expose private FARO history, prompts, or generated conversations. '.$entry['answer']; }
    ]);
    if (preg_match('/(?:everyone|all (?:students?|people)|class roster|student directory).*(?:class|course|portal)?|(?:give|show|list).*(?:everyone|class roster|student directory)/', $text)) return mira_result($entries, [
        'status'=>'privacy_restricted','ids'=>['portal-classmates','grades-privacy'],'accessScope'=>'authenticated-navigation-only',
        'missingEvidence'=>'Broad student directories and unrelated people are excluded.',
        'answer'=>function($entry) { return 'MIRA cannot compile or expose a class roster or broad student directory. '.$entry['answer']; }
    ]);
    if (preg_match('/(?:save|store|remember|retain|keep|use).*(?:portal|private|personal).*(?:permanent|forever|future users?|other users?|shared|later)|(?:future users?|other users?).*(?:private|personal|portal) data/', $text)) return mira_result($entries, [
        'status'=>'privacy_restricted','ids'=>['syllabus-data-policy','grades-privacy'],'accessScope'=>'public-course-policy',
        'missingEvidence'=>'Personal portal context is session-scoped and cannot be added to shared knowledge or retained for future users.',
        'answer'=>function($entry) { return 'MIRA will not save personal portal context permanently or reuse it for future users. '.$entry['answer']; }
    ]);
    $context = mira_find($entries, (string)$contextId);
    if (($context['provenance'] ?? '') === 'FARO_CURATED' && preg_match('/^(?:tell me more|what does that mean|how do i use that)$/', $text)) return mira_result($entries, [
        'status'=>'answered','ids'=>[$context['id']],'accessScope'=>'authenticated-portal-guidance'
    ]);
    if (($context['id'] ?? '') === 'faro-board-acceptance-criteria' && preg_match('/who decides (?:that|whether it is accepted)|who approves (?:that|it)$/', $text)) return mira_result($entries, [
        'status'=>'answered','ids'=>['faro-board-review-decision'],'accessScope'=>'authenticated-portal-guidance'
    ]);
    if (($context['id'] ?? '') === 'faro-board-evidence' && preg_match('/(?:does|would) (?:that|it) mean (?:the card is )?done|does (?:that|it) prove (?:approval|acceptance)/', $text)) return mira_result($entries, [
        'status'=>'answered','ids'=>['faro-board-evidence'],'accessScope'=>'authenticated-portal-guidance'
    ]);
    if (($context['id'] ?? '') === 'faro-board-verify' && preg_match('/what happens after (?:verify|verification)|who decides (?:after that|next)/', $text)) return mira_result($entries, [
        'status'=>'answered','ids'=>['faro-board-review-decision'],'accessScope'=>'authenticated-portal-guidance'
    ]);
    if (preg_match('/(?:approve|mark|move).*(?:card)?.*done|approve my card/', $text)) return mira_result($entries, [
        'status'=>'escalation','ids'=>['faro-board-review-decision','contact-help'],'accessScope'=>'authenticated-portal-guidance',
        'missingEvidence'=>'MIRA cannot inspect enough private state to decide that a card is accepted or Done, and it cannot perform a Product Owner action.',
        'answer'=>function($entry) { return $entry['answer']." Ask the Product Owner or course staff if an official decision is still needed."; }
    ]);
    if (preg_match('/(?:move|switch|transfer|change).*(?:another|different|new).*(?:team)|(?:another|different|new).*team/', $text)) return mira_result($entries, [
        'status'=>'escalation','ids'=>['contact-help'],'missingEvidence'=>'No reviewed source documents a team-change procedure or promises approval.',
        'answer'=>function($entry) { return "MIRA is read-only and cannot change team membership. I could not verify a published team-change procedure. ".$entry['answer']; }
    ]);
    if (preg_match('/what grade will i receive|predict (?:my )?grade|guess (?:my )?grade|just guess.*grade|future grade/', $text)) return mira_result($entries, [
        'status'=>'partial','ids'=>['syllabus-grading','portal-grade'],'missingEvidence'=>'A future or unofficial personal grade cannot be verified or predicted; Grade is outside the approved Overview-only connector scope.',
        'answer'=>function($entry) { return "I cannot predict or promise your sprint grade. ".$entry['answer']." For a posted official result, open the portal Grade section or contact the instructor about your own feedback."; }
    ]);
    if (preg_match('/extension|extra time|extend.*assignment/', $text)) return mira_result($entries, [
        'status'=>'partial','ids'=>['syllabus-late-work','contact-help'],'missingEvidence'=>'Only the instructor can decide an individual request; MIRA cannot grant or submit one.',
        'answer'=>function($entry) { return $entry['answer']." MIRA cannot grant, promise, or send an extension request. Use the verified instructor contact route if the documented grace period is not enough."; }
    ]);
    if (preg_match('/\b(?:evidence|proof)\b/', $text) && !preg_match('/what still needs evidence/', $text)) return mira_result($entries, [
        'status'=>'answered','ids'=>['faro-board-evidence'],'accessScope'=>'authenticated-portal-guidance'
    ]);
    if (preg_match('/acceptance criteria|success conditions|\bac\b|criteria.*(?:satisfy|complete)|(?:satisfy|complete).*criteria/', $text)) return mira_result($entries, [
        'status'=>'answered','ids'=>['faro-board-acceptance-criteria'],'accessScope'=>'authenticated-portal-guidance'
    ]);
    if (preg_match('/definition of done|what does done mean|card.*\bdone\b|\bdone\b.*card/', $text)) return mira_result($entries, [
        'status'=>'partial','ids'=>['faro-board-review-decision','faro-board-acceptance-criteria','faro-board-evidence'],'accessScope'=>'authenticated-portal-guidance',
        'missingEvidence'=>'The reviewed FARO vocabulary distinguishes criteria, evidence, verification and Product Owner decisions, but it does not define a complete official course Definition of Done.',
        'answer'=>function() { return "MIRA did not find a complete official course Definition of Done. Acceptance criteria, evidence, teammate verification, and Product Owner acceptance are separate steps; none alone proves that the card is Done. MIRA cannot approve or move the card."; }
    ]);
    if (preg_match('/(?:move|enter|ready).*(?:to )?verify|verification now|before.*verif(?:y|ication)|(?:missing|required|need).*before.*verif(?:y|ication)|verify requirements/', $text)) return mira_result($entries, [
        'status'=>'partial','ids'=>['faro-board-verify','faro-board-acceptance-criteria','faro-board-evidence'],'accessScope'=>'authenticated-portal-guidance',
        'missingEvidence'=>'FARO provides reviewed terminology but not a complete course-wide checklist for entering Verify.',
        'answer'=>function($entry) { return $entry['answer']." Review the criteria and evidence recorded on your own card, then ask course staff if the transition requirement remains unclear."; }
    ]);
    if (preg_match('/^(?:verify|how (?:do|can|should) i verify|what does verify mean|who can verify a card|can the card owner verify their own work)$/', $text)) return mira_result($entries, [
        'status'=>'answered','ids'=>['faro-board-verify'],'accessScope'=>'authenticated-portal-guidance'
    ]);
    if (preg_match('/who decides whether (?:this|it|a card) is accepted|what can (?:the )?(?:product owner|po) do in rev(?:iew|eiw)|can (?:the )?(?:product owner|po) (?:ask for|request) changes/', $text)) return mira_result($entries, [
        'status'=>'answered','ids'=>['faro-board-review-decision'],'accessScope'=>'authenticated-portal-guidance'
    ]);
    if (preg_match('/can (?:mira|you) approve (?:it|this)|is (?:this|my|the) (?:card )?accepted|has (?:this|my|the) card been accepted/', $text)) return mira_result($entries, [
        'status'=>'partial','ids'=>['faro-board-review-decision','portal-board'],'accessScope'=>'authenticated-navigation-only',
        'missingEvidence'=>'MIRA cannot see or decide the current official acceptance state of a private card.',
        'answer'=>function($entry) { return $entry['answer']." Open your Board to review the current card state."; }
    ]);
    if (preg_match('/what is (?:a )?(?:sprint )?card|what does card mean/', $text)) return mira_result($entries, [
        'status'=>'answered','ids'=>['faro-board-card'],'accessScope'=>'authenticated-portal-guidance'
    ]);
    if (preg_match('/what (?:do|does) (?:s m and l|s m l) mean|what is (?:a )?(?:card|story) size|how are cards sized/', $text)) return mira_result($entries, [
        'status'=>'answered','ids'=>['faro-board-size'],'accessScope'=>'authenticated-portal-guidance'
    ]);
    if (preg_match('/who owns a card|what is a card owner|who is the assignee/', $text)) return mira_result($entries, [
        'status'=>'answered','ids'=>['faro-board-owner'],'accessScope'=>'authenticated-portal-guidance'
    ]);
    if (preg_match('/what does blocked mean|what is a blocker|why is a card blocked/', $text)) return mira_result($entries, [
        'status'=>'answered','ids'=>['faro-board-blocked'],'accessScope'=>'authenticated-portal-guidance'
    ]);
    if (preg_match('/what information.*stand ?up|what.*(?:put|include|write|go(?:es)?|belong(?:s)?).*(?:stand ?up|daily scrum|daily update|status update)|stand ?up (?:fields|template|content)/', $text)) return mira_result($entries, [
        'status'=>'answered','ids'=>['daily-scrum','minutes-usage-guide'],'accessScope'=>'authenticated-linked-documents'
    ]);
    if (preg_match('/how often.*(?:stand ?up|status update)|(?:stand ?up|status update).*frequency|finish.*stand ?up/', $text)) return mira_result($entries, [
        'status'=>'partial','ids'=>['syllabus-attendance'],'missingEvidence'=>"The syllabus states the team's meeting frequency and individual participation basis, but not an exact per-member posting frequency.",
        'answer'=>function($entry) { return $entry['answer']." This source does not establish that every member must post a separate update at that same cadence. Use the current course instructions or ask the instructor if posting frequency is distinct from meeting participation."; }
    ]);
    if (preg_match('/sprint retrospective|\bretro\b|process improvement/', $text)) return mira_result($entries, [
        'status'=>'partial','ids'=>['syllabus-sprint-retrospective','portal-resources'],'accessScope'=>'public-summary-plus-authenticated-navigation',
        'missingEvidence'=>'The syllabus establishes the ceremony but does not provide its detailed checklist in the reviewed text. The portal destination is a navigation lead, not verified policy evidence.'
    ]);
    if (preg_match('/sprint review|review meeting|sprint demo/', $text) && !preg_match('/showcase/', $text)) return mira_result($entries, [
        'status'=>'partial','ids'=>['syllabus-sprint-review','portal-resources'],'accessScope'=>'public-summary-plus-authenticated-navigation',
        'missingEvidence'=>'The syllabus establishes the ceremony but does not provide its detailed checklist in the reviewed text. The portal destination is a navigation lead, not verified policy evidence.'
    ]);
    if (preg_match('/where.*(?:sprint work|work).*(?:submit|document|upload)|where.*(?:submit|document|upload).*(?:sprint work|work)|upload our sprint work/', $text)) return mira_result($entries, ['status'=>'answered','ids'=>['canvas-assignments'],'answer'=>function($entry) { return $entry['answer']; }]);
    if (preg_match('/(?:mira|you).*(?:cannot|can t|don t|doesn t|do not).*(?:answer|know)|who should i ask.*(?:don t|do not|cannot|can t) know|question.*(?:cannot|can t).*(?:answer|find)/', $text)) return mira_result($entries, [
        'status'=>'escalation','ids'=>['contact-help'],'answer'=>function($entry) { return $entry['answer']." Include the course/term, sprint or assignment, the page/section you checked, and the specific point that remains unclear. No message or support request is sent automatically."; }
    ]);
    if (preg_match('/current sprint|this sprint/', $text) && preg_match('/due|deadline|finish|end/', $text) && !preg_match('/sprint\s+[1-5]/', $text)) {
        $context = mira_find($entries, (string)$contextId);
        if ($context && preg_match('/^syllabus-sprint-[1-5]$/', $context['id'])) return mira_result($entries, ['status'=>'answered','ids'=>[$context['id']],'answer'=>function($entry) { return $entry['answer']; }]);
        return mira_result($entries, ['status'=>'clarification_needed','ids'=>['syllabus-sprint-1','syllabus-sprint-2','syllabus-sprint-3','syllabus-sprint-4','syllabus-sprint-5'],'missingEvidence'=>"The public course sources do not identify the student's active sprint. Connect an authorized current Overview or specify Sprint 1-5."]);
    }
    return null;
}
function portal_matches($entries, $question, $contextId) {
    $text = preg_replace('/\berror messages?\b/', '', normalized($question));
    $navigation = array_values(array_filter($entries, function($entry) { return ($entry['sourceKind'] ?? '') === 'portal-navigation'; }));
    if (preg_match('/\b(?:grade|grades|grading|graded)\b/', $text) && preg_match('/\b(?:calculated|calculation|weight|weights|policy|rules|scale)\b/', $text)) return [];
    if (preg_match('/\bcanvas\b/', $text) && preg_match('/\b(?:messages?|inbox|unread|notifications?|open|view)\b/', $text)) return array_values(array_filter($navigation, function($entry) { return $entry['id'] === 'portal-canvas'; }));
    $matches = [];
    foreach ($navigation as $entry) {
        $match = $text === normalized('open '.$entry['portalSection']) || $text === normalized('go to '.$entry['portalSection']);
        foreach ($entry['intents'] as $intent) if (normalized($intent) === $text) $match = true;
        foreach ($entry['navigationPatterns'] as $pattern) if (preg_match('~'.$pattern.'~', $text)) $match = true;
        if ($match) $matches[] = $entry;
    }
    if ($matches) {
        $contacts = in_array('portal-team-contacts', array_column($matches, 'id'), true);
        return array_values(array_filter($matches, function($entry) use ($contacts) { return !($contacts && $entry['id'] === 'portal-team'); }));
    }
    if (preg_match('/^(?:open it|open that|take me there|where do i click|how do i open it|check again|any updates|anything new|any new ones|read them|tell me more)$/', $text)) return array_values(array_filter($navigation, function($entry) use ($contextId) { return $entry['id'] === $contextId; }));
    return [];
}
function course_matches($entries, $question, $contextId) {
    $text = normalized($question); $byId = [];
    foreach ($entries as $entry) $byId[$entry['id']] = $entry;
    $topics = ['attendance'=>'syllabus-attendance','syllabus'=>'syllabus-overview','deadlines'=>'syllabus-deadlines','grades'=>'syllabus-grading','grading'=>'syllabus-grading','grade scale'=>'syllabus-grade-scale','late work'=>'syllabus-late-work','my dashboard'=>'dashboard-personal','my project'=>'dashboard-personal'];
    if (isset($topics[$text], $byId[$topics[$text]])) return [$byId[$topics[$text]]];
    if (preg_match('/\bwho (?:is|are) (?:my|our) (?:product owner|team|teammates)\b|\b(?:what are|show|check) my (?:deadlines|assignments)\b|^what should i do next$/', $text) && isset($byId['dashboard-personal'])) return [$byId['dashboard-personal']];
    if (preg_match('/\b(?:grade|grades|grading)\b/', $text) && preg_match('/\b(?:calculated|calculation|weight|weights|policy)\b/', $text) && isset($byId['syllabus-grading'])) return [$byId['syllabus-grading']];
    $personal = '/\b(?:my|our) (?:current |actual |recorded |personal )?(?:grade|grades|attendance|progress|tasks|task list|project status|assigned project|completion|team members)\b|\b(?:what is|show|check) (?:on )?my (?:dashboard|project)\b|\bwho is on my team\b|\bwhat is due for me\b|\bhow (?:am i|is my team) doing\b|\bhow many .* (?:have i|did i) (?:miss|missed|attend|attended|complete|completed)\b/';
    if (preg_match($personal, $text) && isset($byId['dashboard-personal'])) return [$byId['dashboard-personal']];
    $exact = [];
    foreach ($entries as $entry) if (isset($entry['sourceKind'])) foreach ($entry['intents'] ?? [] as $intent) if (normalized($intent) === $text) { $exact[] = $entry; break; }
    if ($exact) return $exact;
    preg_match_all('/\bsprint\s+([1-5])\b/', $text, $numbers);
    $numbered = [];
    foreach (array_unique($numbers[1]) as $number) if (isset($byId['syllabus-sprint-'.$number])) $numbered[] = $byId['syllabus-sprint-'.$number];
    if ($numbered) return $numbered;
    if (preg_match('/^(?:and |also )?(?:when is (?:it|that|this) due|when is the deadline|what is the deadline|how many points(?: is (?:it|that|this))?|what is (?:it|that) worth|tell me more|what does that mean|what should i do|what do i need to do)$/', $text) && isset($byId[$contextId]) && ($byId[$contextId]['sourceKind'] ?? '') !== 'portal-navigation') return [$byId[$contextId]];
    if ($contextId && preg_match('/^(?:and |also )?(?:where (?:do i |should i )?(?:submit|post|upload)(?: (?:it|that|this))?|how (?:is it|is that|am i) graded)$/', $text)) {
        $target = strpos($text, 'graded') !== false ? 'syllabus-grading' : 'canvas-assignments';
        if (isset($byId[$target])) return [$byId[$target]];
    }
    return [];
}
function search_knowledge($question, $contextId = '') {
    $entries = require __DIR__ . '/knowledge.php';
    $policy = route_mira($entries, $question, $contextId);
    if ($policy) return array_merge(['question'=>$question], $policy);
    $portal = portal_matches($entries, $question, $contextId);
    if ($portal) return ['question'=>$question,'status'=>count($portal) > 1 ? 'choices' : 'matched','matches'=>array_map(function($entry) { return public_knowledge_entry($entry, 1); }, array_slice($portal, 0, 3)),'links'=>[]];
    if (preg_match('/\b(?:spring|summer)\s+20\d\d\b|\b(?:fall\s+)?(?:202[0-5]|202[7-9]|20[3-9]\d)\b/i', $question)) return ['question'=>$question,'status'=>'unmatched','matches'=>[],'links'=>[],'scopeNote'=>"The imported syllabus covers CIS 4951 RVC, Fall 2026 only. Ask the instructor for the other term's requirements."];
    $direct = course_matches($entries, $question, $contextId);
    if ($direct) return ['question'=>$question, 'status'=>count($direct) > 1 ? 'choices' : 'matched', 'matches'=>array_map(function ($entry) { return public_knowledge_entry($entry, 1); }, array_slice($direct, 0, 3)), 'links'=>$direct[0]['id'] === 'dashboard-personal' ? [] : keyword_links($entries, $question)];
    if (preg_match('/^(?:when is (?:it|that|this) due|when is the deadline|what is the deadline|how many points(?: is (?:it|that|this))?|what is (?:it|that) worth|tell me more|what does that mean)$/', normalized($question))) return ['question'=>$question, 'status'=>'unmatched','matches'=>[],'links'=>[],'scopeNote'=>"Which assignment or sprint do you mean? Try 'Sprint 2' or 'Final deliverables', then ask your follow-up."];
    $query = search_tokens($question); $ranked = []; $normal = normalized($question);
    foreach ($entries as $order => $entry) {
        if (!$query) break;
        if (($entry['sourceKind'] ?? '') === 'portal-navigation') continue;
        $fields = [search_tokens($entry['keywords']), search_tokens($entry['title']), search_tokens($entry['intents']), search_tokens($entry['answer'].' '.$entry['content'].' '.$entry['section'])];
        $weights = [4.5,3.5,2.5,1.25]; $weighted = 0; $coverage = [];
        foreach ($fields as $i => $tokens) { $weighted += count(array_intersect($query, $tokens)) * $weights[$i]; $coverage = array_merge($coverage, $tokens); }
        $bonus = 0;
        foreach ($entry['intents'] ?? [] as $intent) {
            $tokens = search_tokens($intent);
            if ($tokens && !array_diff($tokens, $query)) $bonus = max($bonus, .35);
            if (strpos($normal, normalized($intent)) !== false || strpos(normalized($intent), $normal) !== false) $bonus = max($bonus, .45);
        }
        $score = min(1, count(array_intersect($query, $coverage)) / count($query) * .42 + $weighted / (count($query) * 7) * .58 + $bonus);
        if ($score > 0) $ranked[] = compact('entry', 'score', 'order');
    }
    usort($ranked, function ($a, $b) { return ($b['score'] <=> $a['score']) ?: ($a['order'] <=> $b['order']); });
    $links = keyword_links($entries, $question);
    if (!$ranked || $ranked[0]['score'] < .4) return ['question'=>$question, 'status'=>'unmatched','matches'=>[],'links'=>$links];
    $choices = $ranked[0]['score'] < .43 || (isset($ranked[1]) && $ranked[1]['score'] >= .24 && $ranked[0]['score'] - $ranked[1]['score'] < .11);
    $matches = [];
    foreach (array_slice($ranked, 0, $choices ? 3 : 1) as $item) $matches[] = public_knowledge_entry($item['entry'], $item['score']);
    return ['question'=>$question,'status'=>$choices ? 'choices' : 'matched','matches'=>$matches,'links'=>$links];
}
