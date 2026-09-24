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
function search_knowledge($question) {
    $entries = require __DIR__ . '/knowledge.php';
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
    foreach (array_slice($ranked, 0, $choices ? 3 : 1) as $item) $matches[] = array_merge(array_intersect_key($item['entry'], array_flip(['id','title','sourceTitle','url','section','access','answer'])), ['score'=>round($item['score'], 3)]);
    return ['question'=>$question,'status'=>$choices ? 'choices' : 'matched','matches'=>$matches,'links'=>$links];
}
