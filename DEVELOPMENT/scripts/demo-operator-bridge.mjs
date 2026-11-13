// Local Wrangler remote-binding bridge only. Never deployed as a public Worker.
export default { async fetch(request, env) {
  if (request.method !== 'POST' || request.headers.has('origin')) return new Response('Denied',{status:403});
  const value=await request.json();
  if (!['/status','/operator-audit','/recover','/demo-start','/demo-stop','/reserve'].includes(value.route)) return new Response('Denied',{status:403});
  return env.MIRA_AI_BUDGET.get(env.MIRA_AI_BUDGET.idFromName('mira-usd25-lifetime-v1')).fetch('https://budget.internal'+value.route,{
    method:'POST',headers:{authorization:request.headers.get('authorization')||''},body:JSON.stringify(value.body||{})});
} };
