// Local, operator-authenticated control. Never deploy this script or its credential.
const fs=require('fs'),crypto=require('crypto');
(async()=>{const credential=fs.readFileSync(0,'utf8').trim();if(!/^[A-Za-z0-9_-]{43,128}$/.test(credential))throw Error('Operator unavailable');const action=process.argv[2];if(!['status','start','stop','halt'].includes(action))throw Error('Choose status/start/stop/halt');const call=async(route,body={})=>{const r=await fetch('http://127.0.0.1:8798',{method:'POST',headers:{authorization:'Bearer '+credential},body:JSON.stringify({route,body}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Operator operation rejected: '+route+' '+r.status);return r.json();};
if(action==='start'){
 if(!process.argv.includes('--pricing-reviewed')||!process.argv.includes('--billing-approved'))throw Error('Current pricing and public billing approval required');
 let state=await call('/status');if(state.capMicroUsd!==25000000||state.heldMicroUsd!==0||state.dailyRemaining<1||state.attempts>=100)throw Error('Financial preflight blocked');
 const audit=await call('/operator-audit');if(audit.records.some(r=>r.state!=='settled'))throw Error('Unresolved reservation');
 if(state.halted){if(state.haltReason!=='controlled-test-complete')throw Error('Unreviewed halt cause');await call('/recover',{id:crypto.randomUUID(),expectedRevision:state.revision,reason:'reviewed-controlled-test-complete',evidence:'PUBLIC_AI_RELEASE_REVIEW'});state=await call('/status');}
 const enabled=await call('/public-start',{expectedRevision:state.revision,billingApproved:true,approvalRecord:'OWNER_PUBLIC_BILLING_20261113',pricingUntil:Date.now()+23*3600000});console.log(JSON.stringify({publicActive:enabled.active,expires:new Date(enabled.expires).toISOString()}));
}else if(action==='stop')await call('/public-stop');else if(action==='halt')await call('/halt');
const state=await call('/status');console.log(JSON.stringify({cap:state.capMicroUsd/1e6,spent:state.spentMicroUsd/1e6,reserved:state.heldMicroUsd/1e6,available:(state.capMicroUsd-state.spentMicroUsd-state.heldMicroUsd)/1e6,attempts:state.attempts,dailyRemaining:state.dailyRemaining,halted:state.halted}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
