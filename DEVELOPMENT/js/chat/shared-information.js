(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CapstoneSharedInformation = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  const TTL_MS = 5 * 60 * 1000;
  const MAX_SOURCES = 10;
  const MAX_TEXT = 20000;
  const MAX_TOTAL_TEXT = 50000;
  const categories = Object.freeze(["Task", "Sprint", "Grade", "Team", "Course instructions", "Other"]);
  const stopWords = new Set("a an and are as at be been by can did do does for from had has have how i in is it me my of on or our that the their there this to was were what when where which who will with you your".split(" "));
  const aliases = Object.freeze({
    deadline:["due","date","ends","ending","submit","submission"], due:["deadline","date","submit"],
    require:["requires","required","requirement","requirements","must","criteria"], criteria:["acceptance","requirement","requires","testing","test","verify"],
    testing:["test","tests","verification","verify","validated","validation"], component:["components","item","items","part","parts"],
    score:["points","grade","graded","result"], task:["card","work","assignment"], sprint:["iteration"], team:["member","members","teammate","teammates"]
  });
  const credentialPattern = /\b(?:password|passcode|verification code|one[- ]time (?:code|password)|otp|session cookie|access token|refresh token|bearer token|authorization token)\b/i;
  const navigationPattern = /^(?:where does it say that|take me there|open it|open that|show me the source)[.!?]*$/i;

  function normalize(value) {
    return String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function tokens(value) {
    const found = normalize(value).split(/\s+/).filter(token => token.length > 1 && !stopWords.has(token));
    const expanded = new Set(found);
    for (const token of found) for (const alias of aliases[token] || []) expanded.add(alias);
    return [...expanded];
  }

  function passages(text) {
    return String(text).split(/(?:\r?\n){2,}|(?<=[.!?])\s+|\r?\n/).map(value => value.trim()).filter(Boolean).slice(0, 240);
  }

  function randomSourceId(cryptoLike) {
    if (cryptoLike && typeof cryptoLike.randomUUID === "function") return "shared-" + cryptoLike.randomUUID();
    if (cryptoLike && typeof cryptoLike.getRandomValues === "function") {
      const bytes = new Uint8Array(16); cryptoLike.getRandomValues(bytes);
      return "shared-" + [...bytes].map(byte => byte.toString(16).padStart(2,"0")).join("");
    }
    throw new Error("Secure random IDs are unavailable in this browser.");
  }

  function looksAmbiguousTable(text, question) {
    if (!/\b(?:score|grade|component|points?|total|which number|posted)\b/i.test(question)) return false;
    const lines = String(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const numeric = lines.filter(line => (line.match(/\b\d+(?:\.\d+)?(?:%|\/\d+)?\b/g) || []).length >= 2);
    return numeric.some(line => {
      const words=line.match(/[A-Za-z]+/g)||[];
      return !/[|,:;=\t]/.test(line)&&words.length<=2;
    });
  }

  function categoryDestination(category, resolver) {
    const id = ({ Task:"team", Sprint:"team", Grade:"grade", Team:"team", "Course instructions":"resources", Other:"overview" })[category] || "overview";
    const destination = typeof resolver === "function" ? resolver(id) : null;
    if (!destination || !/^https:\/\/capstone\.cs\.fiu\.edu\/portal(?:[?#]|$)/.test(destination.url || "")) return null;
    return {
      id:destination.id,
      label:destination.label,
      url:destination.url,
      navigationCapability:destination.navigationCapability,
      signedInVerified:Boolean(destination.signedInVerified),
      currentContentsChecked:false
    };
  }

  function createSharedInformationStore({ now=Date.now, cryptoLike=(typeof crypto !== "undefined" ? crypto : null), resolvePortalDestination } = {}) {
    let generation = 1;
    let activeMode = null;
    let shared = [];
    let sample = [];
    let lastEvidence = [];

    function copySource(source, includeText=false) {
      const result = { id:source.id, mode:source.mode, category:source.category, title:source.title, term:source.term, sprint:source.sprint, addedAt:source.addedAt, expiresAt:source.expiresAt, label:source.label };
      if (includeText) result.text = source.text;
      return result;
    }

    function enforceExpiry() {
      const time = now();
      const beforeShared = shared.length, beforeSample = sample.length;
      shared = shared.filter(source => source.expiresAt > time);
      sample = sample.filter(source => source.expiresAt > time);
      const expiredCount = beforeShared - shared.length + beforeSample - sample.length;
      if (expiredCount) {
        generation++;
        lastEvidence = [];
        if (activeMode === "shared" && !shared.length) activeMode = null;
        if (activeMode === "sample" && !sample.length) activeMode = null;
      }
      return expiredCount;
    }

    function activeSources() {
      enforceExpiry();
      return activeMode === "shared" ? shared : activeMode === "sample" ? sample : [];
    }

    function validateInput(input) {
      const category = categories.includes(input?.category) ? input.category : null;
      const title = String(input?.title || "").trim().slice(0,120);
      const text = String(input?.text || "").trim();
      const term = String(input?.term || "").trim().slice(0,80);
      const sprint = String(input?.sprint || "").trim().slice(0,80);
      if (!category) throw new Error("Choose a source category.");
      if (!title) throw new Error("Add a short source title.");
      if (text.length < 10) throw new Error("Paste at least 10 characters of selected text.");
      if (text.length > MAX_TEXT) throw new Error("One source can contain at most 20,000 characters.");
      if (credentialPattern.test(text)) throw new Error("Remove login codes, passwords, cookies, and tokens before using this information.");
      if (shared.length >= MAX_SOURCES) throw new Error("Remove a source before adding another one.");
      if (shared.reduce((sum,source)=>sum+source.text.length,0)+text.length > MAX_TOTAL_TEXT) throw new Error("Shared text is limited to 50,000 characters per demo session.");
      return { category,title,text,term,sprint };
    }

    function add(input) {
      enforceExpiry();
      const clean = validateInput(input);
      const added = now();
      const source = { ...clean, id:randomSourceId(cryptoLike), mode:"shared", addedAt:new Date(added).toISOString(), expiresAt:added+TTL_MS, label:"User-provided, unverified text" };
      shared.push(source); activeMode="shared"; generation++; lastEvidence=[];
      return copySource(source);
    }

    function loadSample() {
      enforceExpiry();
      const added = now();
      sample = [
        {category:"Task",title:"Fictional validation task",term:"Fall 2026",sprint:"Demo sprint",text:"Fictional task CAP-DEMO-17 requires client and server validation. Acceptance criteria mention automated testing for invalid input and a short evidence note. This sample is not an official task.",label:"Sample data — not your account"},
        {category:"Sprint",title:"Fictional demo sprint",term:"Fall 2026",sprint:"Demo sprint",text:"The fictional demo sprint deadline is October 2 at 5:00 PM. The sample review lists a working demonstration and test evidence. This is not a course deadline.",label:"Sample data — not your account"},
        {category:"Grade",title:"Fictional component scores",term:"Fall 2026",sprint:"",text:"Fictional component scores: Prototype demonstration 18/20. Documentation 40/50. A course total and final grade are not provided and must not be inferred.",label:"Sample data — not your account"}
      ].map(item=>({ ...item,id:randomSourceId(cryptoLike),mode:"sample",addedAt:new Date(added).toISOString(),expiresAt:added+TTL_MS }));
      activeMode="sample"; generation++; lastEvidence=[];
      return sample.map(source=>copySource(source));
    }

    function activate(mode) {
      enforceExpiry();
      if (mode === "shared" && shared.length) activeMode="shared";
      else if (mode === "sample" && sample.length) activeMode="sample";
      else throw new Error("That temporary source set is not available.");
      generation++; lastEvidence=[];
      return status();
    }

    function remove(id) {
      enforceExpiry();
      const before = shared.length;
      shared = shared.filter(source => source.id !== id);
      if (shared.length === before) return false;
      if (activeMode === "shared" && !shared.length) activeMode=null;
      generation++; lastEvidence=[];
      return true;
    }

    function clearShared() {
      const changed = shared.length || activeMode === "shared";
      shared=[]; if (activeMode === "shared") activeMode=null;
      if (changed) { generation++; lastEvidence=[]; }
    }

    function newSession() {
      shared=[];sample=[];activeMode=null;lastEvidence=[];generation++;
      return status();
    }

    function status() {
      const expiredCount = enforceExpiry();
      const all=[...shared,...sample];
      return { generation, activeMode, expiredCount, shared:shared.map(source=>copySource(source)), sample:sample.map(source=>copySource(source)), nextExpiry:all.length?Math.min(...all.map(source=>source.expiresAt)):null };
    }

    function missingAnswer(question, sources) {
      const destination = categoryDestination(sources[0]?.category || "Other", resolvePortalDestination);
      return {
        status:"not_found", mode:activeMode, privateLocal:true, answer:"The information you shared does not support an answer to that question. Share an updated, relevant excerpt or check the suggested portal section; this does not mean the information is absent from your real account.",
        sources:[], destination, missing:"No matching statement was found in the temporary snippets.", generation
      };
    }

    function ask(question) {
      const expiredCount=enforceExpiry();
      const sources=activeSources();
      if (!sources.length) return { status:expiredCount?"expired":"inactive", mode:null, privateLocal:true, answer:expiredCount?"Your shared information expired after five minutes. Share an updated copy to continue.":"No shared or sample information is active.", sources:[], generation };
      const q=String(question||"").trim().slice(0,500);
      if (!q) return missingAnswer(q,sources);
      if (navigationPattern.test(q) && lastEvidence.length) {
        const evidence=lastEvidence.filter(item=>sources.some(source=>source.id===item.sourceId));
        if (!evidence.length) return missingAnswer(q,sources);
        return { status:"matched",mode:activeMode,privateLocal:true,navigationRequested:/take me there|open/i.test(q),answer:"Based on the information you shared, the supporting text is shown below.",sources:evidence.map(item=>({...item})),destination:evidence[0].destination,generation };
      }
      const queryTokens=tokens(q);
      const ranked=[];
      for (const source of sources) {
        if (looksAmbiguousTable(source.text,q)) {
          const destination=categoryDestination(source.category,resolvePortalDestination);
          const evidence={sourceId:source.id,title:source.title,category:source.category,label:source.label,excerpt:source.text.slice(0,500),addedAt:source.addedAt,expiresAt:source.expiresAt,term:source.term,sprint:source.sprint,destination};
          lastEvidence=[evidence];
          return {status:"ambiguous",mode:activeMode,privateLocal:true,answer:"Based on the information you shared, the copied text appears to contain table-like values whose columns are unclear. Please clarify which number belongs to which label; I will not guess.",sources:[evidence],destination,generation};
        }
        for (const passage of passages(source.text)) {
          const passageTokens=new Set(tokens(passage));
          let score=queryTokens.reduce((sum,token)=>sum+(passageTokens.has(token)?2:0),0);
          if (/\b(?:deadline|due|when|date)\b/i.test(q)&&/\b(?:deadline|due|ends?|submit|\d{1,2}[:/]\d{1,2}|(?:january|february|march|april|may|june|july|august|september|october|november|december))\b/i.test(passage))score+=6;
          if (/\b(?:acceptance criteria|require|must|testing|test|verify)\b/i.test(q)&&/\b(?:acceptance|criteria|requires?|must|testing|test|verify|validation)\b/i.test(passage))score+=5;
          if (/\b(?:grade|score|points?|component)\b/i.test(q)&&/\b(?:grade|score|points?|\d+\s*\/\s*\d+|%)\b/i.test(passage))score+=5;
          if (normalize(source.title+" "+source.category+" "+source.term+" "+source.sprint).split(" ").some(token=>queryTokens.includes(token)))score+=2;
          ranked.push({source,passage,score});
        }
      }
      ranked.sort((a,b)=>b.score-a.score);
      if (!ranked.length || ranked[0].score < 2) { lastEvidence=[]; return missingAnswer(q,sources); }
      const chosen=[];
      for (const candidate of ranked) {
        if (candidate.score < Math.max(2,ranked[0].score-3) || chosen.some(item=>item.source.id===candidate.source.id)) continue;
        chosen.push(candidate); if (chosen.length===3) break;
      }
      const evidence=chosen.map(({source,passage})=>({sourceId:source.id,title:source.title,category:source.category,label:source.label,excerpt:passage.slice(0,700),addedAt:source.addedAt,expiresAt:source.expiresAt,term:source.term,sprint:source.sprint,destination:categoryDestination(source.category,resolvePortalDestination)}));
      lastEvidence=evidence.map(item=>({...item}));
      const joined=evidence.map(item=>`“${item.excerpt}”`).join(" ");
      return {status:"matched",mode:activeMode,privateLocal:true,answer:"Based on the information you shared: "+joined,sources:evidence,destination:evidence[0]?.destination||null,generation};
    }

    return { add,loadSample,activate,remove,clearShared,newSession,status,ask,TTL_MS,categories };
  }

  return { TTL_MS, categories, createSharedInformationStore, looksAmbiguousTable };
});
