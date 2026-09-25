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
    $aliases = ['retro'=>'retrospective','standup'=>'scrum','stand-up'=>'scrum','deck'=>'slides','colour'=>'color','colours'=>'colors','begin'=>'start','starting'=>'start','teacher'=>'instructor','prof'=>'professor'];
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
    return array_merge(array_intersect_key($entry, array_flip(['id','title','sourceTitle','url','section','access','answer','sourceKind','sourcePages'])), ['followUps'=>array_slice($entry['followUps'] ?? [], 0, 5), 'score'=>round($score, 3)]);
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
    if (preg_match('/^(?:and |also )?(?:when is (?:it|that|this) due|when is the deadline|what is the deadline|how many points(?: is (?:it|that|this))?|what is (?:it|that) worth|tell me more|what does that mean|what should i do|what do i need to do)$/', $text) && isset($byId[$contextId])) return [$byId[$contextId]];
    if ($contextId && preg_match('/^(?:and |also )?(?:where (?:do i |should i )?(?:submit|post|upload)(?: (?:it|that|this))?|how (?:is it|is that|am i) graded)$/', $text)) {
        $target = strpos($text, 'graded') !== false ? 'syllabus-grading' : 'canvas-assignments';
        if (isset($byId[$target])) return [$byId[$target]];
    }
    return [];
}
function search_knowledge($question, $contextId = '') {
    $entries = require __DIR__ . '/knowledge.php';
    if (preg_match('/\b(?:spring|summer)\s+20\d\d\b|\b(?:fall\s+)?(?:202[0-5]|202[7-9]|20[3-9]\d)\b/i', $question)) return ['question'=>$question,'status'=>'unmatched','matches'=>[],'links'=>[],'scopeNote'=>"The imported syllabus covers CIS 4951 RVC, Fall 2026 only. Ask the instructor for the other term's requirements."];
    $direct = course_matches($entries, $question, $contextId);
    if ($direct) return ['question'=>$question, 'status'=>count($direct) > 1 ? 'choices' : 'matched', 'matches'=>array_map(function ($entry) { return public_knowledge_entry($entry, 1); }, array_slice($direct, 0, 3)), 'links'=>$direct[0]['id'] === 'dashboard-personal' ? [] : keyword_links($entries, $question)];
    if (preg_match('/^(?:when is (?:it|that|this) due|when is the deadline|what is the deadline|how many points(?: is (?:it|that|this))?|what is (?:it|that) worth|tell me more|what does that mean)$/', normalized($question))) return ['question'=>$question, 'status'=>'unmatched','matches'=>[],'links'=>[],'scopeNote'=>"Which assignment or sprint do you mean? Try 'Sprint 2' or 'Final deliverables', then ask your follow-up."];
    $query = search_tokens($question); $ranked = []; $normal = normalized($question);
    foreach ($entries as $order => $entry) {
        if (!$query) break;
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
