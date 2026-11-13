import { openAiDraft, budgetCall } from './ai.js';
import { catalog } from '../_lib/demo-catalog.js';

const COOKIE = '__Host-mira-demo';
const reply = (value, status = 200, cookie) => new Response(JSON.stringify(value), { status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff', ...(cookie ? { 'set-cookie': cookie } : {}) } });
const cookie = (token, age) => `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
async function hash(token) {
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(token || '')) throw Error('Unauthorized');
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))].map(b => b.toString(16).padStart(2,'0')).join('');
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Same-origin request required.' }, 403);
  if (Number(request.headers.get('content-length')) > 1600) return reply({ error: 'Request too large.' }, 413);
  let body;
  try { const text = await request.text(); if (new TextEncoder().encode(text).length > 1600) return reply({ error: 'Request too large.' },413); body=JSON.parse(text); }
  catch { return reply({ error: 'Invalid request.' },400); }
  if (!body || Object.keys(body).some(k=>!['action','question','previous','requestId'].includes(k))) return reply({ error: 'Only approved classroom questions are accepted.' },400);
  if (body.action === 'logout') return reply({ active:false },200,cookie('',0));
  let digest, authorization;
  try {
    const token = body.action === 'login' ? (request.headers.get('authorization') || '').replace(/^Bearer /,'') :
      (request.headers.get('cookie') || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
    digest=await hash(token);
    authorization=await budgetCall(env,'/demo-auth',{demoHash:digest});
    if (!authorization.authorized || !env.OPENAI_API_KEY) throw Error('Unavailable');
    if (body.action === 'login') return reply({active:true,expires:authorization.expires},200,cookie(token,Math.max(0,Math.floor((authorization.expires-Date.now())/1000))));
    if (body.action === 'status') return reply({active:true,expires:authorization.expires});
  } catch { return reply({active:false,error:'The restricted live demo is unavailable or expired. Course search remains available.'},403,cookie('',0)); }
  if (body.action !== 'ask' || !/^[a-f0-9-]{36}$/.test(body.requestId || '')) return reply({error:'Invalid demo request.'},400);
  // Exact reviewed prompts only: never send arbitrary browser text, source excerpts,
  // shared portal context, staff records or conversation history to the provider.
  const normalize = text => typeof text === 'string' ? text.trim().toLowerCase().replace(/[?.!]$/,'') : '';
  const entry = Object.entries(catalog).find(([,v])=>normalize(v.prompt)===normalize(body.question));
  if (!entry || (entry[0] === 'evidence' && body.previous !== 'done')) return reply({fallback:true,reason:'Use reviewed course search for this question.'});
  const [topic, fixture] = entry;
  try {
    const result=await openAiDraft({ ...env, MIRA_OPENAI_MODEL:'gpt-6.1-sol', MIRA_AI_VERIFIED_MODEL:'gpt-6.1-sol',
      // Conservative input rate covers cache writes as well as standard input.
      MIRA_AI_INPUT_USD_PER_MILLION:'5', MIRA_AI_OUTPUT_USD_PER_MILLION:'10',
      MIRA_AI_PRICING_VALID_UNTIL:new Date(authorization.pricingUntil).toISOString(),
      MIRA_AI_CONTROLLED_OUTPUT_TOKENS:'512', MIRA_DEMO_HASH:digest, MIRA_DEMO_REQUEST_ID:body.requestId },
      fixture.task, fixture.prompt, fixture.context, fixture.sources, {maxOutputTokens:512,timeoutMs:30000});
    return reply({...result,topic});
  } catch { return reply({fallback:true,error:'Live generation is unavailable; using reviewed course search.'},503); }
}
export function onRequest() { return reply({error:'Method not allowed.'},405); }
