"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("active user-facing surfaces and production paths use MIRA branding",()=>{
  const active=[
    "index.html","pages/staff.html","pages/recover.html","pages/syllabus.html",
    "js/chat/capstone-chat.js","js/local/portal-client.js","portal-extension/manifest.json","portal-extension/popup.html",
    "server/portal-local/extension-bridge.js","server/portal-local/service.js"
  ];
  for(const file of active) {
    const content=read(file);
    assert.doesNotMatch(content,/Capstone-AI|Capstone - AI|Capstone AI Chat/i,file);
    assert.match(content,/MIRA/,file);
  }
  assert.match(read("index.html"),/MIRA \| Messaging, Information &amp; Resolution Assistant/);
  assert.match(read("pages/staff.html"),/MIRA Staff Queue/);
  assert.match(read("pages/recover.html"),/Reset your MIRA staff password/);
  assert.match(read("js/shared/supabase-api.js"),/\/MIRA\/pages\/recover\.html/);
  assert.match(read("scripts/package-ocelot.js"),/path\.join\(workspace, "MIRA"\)/);
});

test("active production files contain no old hosted path or localhost recovery link",()=>{
  const active=[
    "index.html","pages/staff.html","pages/recover.html","js/shared/supabase-api.js",
    "scripts/package-ocelot.js","scripts/start-supabase-demo.js",
    "scripts/smoke-supabase-ui.js","scripts/test-supabase-live.js"
  ];
  for(const file of active) {
    const content=read(file);
    assert.doesNotMatch(content,/\/Capstone%20-%20AI\/|\/Capstone - AI\/|localhost:3000/,file);
  }
  const recovery=read("js/shared/supabase-api.js");
  assert.match(recovery,/https:\/\/ocelot\.aul\.fiu\.edu\/~afeli016\/MIRA\/pages\/recover\.html/);
  assert.doesNotMatch(recovery,/localhost|Capstone%20-%20AI/);
});

test("current page metadata consistently names MIRA",()=>{
  for(const file of ["index.html","pages/staff.html","pages/recover.html","pages/syllabus.html"]) {
    const html=read(file);
    assert.match(html,/<title>[^<]*MIRA[^<]*<\/title>/,file);
    if(file!=="pages/syllabus.html") assert.match(html,/<meta name="application-name" content="MIRA">/,file);
  }
});

test("password recovery browser code contains no privileged key, credential logging, or password persistence",()=>{
  const sources=[read("js/staff/password-recovery.js"),read("js/staff/staff.js"),read("js/shared/supabase-api.js")].join("\n");
  assert.doesNotMatch(sources,/service[_-]?role|sb_secret_/i);
  assert.doesNotMatch(read("js/staff/password-recovery.js"),/localStorage|sessionStorage|indexedDB|console\./);
  assert.doesNotMatch(read("js/shared/supabase-api.js"),/console\.|recoveryToken|access_token|refresh_token/);
});
