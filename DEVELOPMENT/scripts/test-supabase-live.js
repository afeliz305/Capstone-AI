// Explicit, one-ticket cloud test. Never seeds, resets, migrates or deletes a queue.
const fs=require("node:fs/promises"),path=require("node:path"),assert=require("node:assert/strict");
const {createClient}=require("@supabase/supabase-js");
const {checkSupabase,validateConfig}=require("./check-supabase");
const {createSupabaseApi}=require("../js/shared/supabase-api");
async function main() {
  if (!process.argv.includes("--create-test")) throw new Error("This command creates one fictional online ticket and a small TXT attachment. Run with --create-test only when intended. It does not delete them afterward.");
  const config=validateConfig(JSON.parse(await fs.readFile(path.resolve(__dirname,"../server/supabase.local.json"),"utf8")));
  const readiness=await checkSupabase(config);
  if(!readiness.readyForLiveTest) throw new Error("Hosted setup is incomplete. Run the SQL setup and enable Anonymous Sign-Ins first. No account or ticket was created by this test.");
  const make=()=>createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const guest=make(),staff=make();
  const api=createSupabaseApi({baseUrl:"http://127.0.0.1:3004/Capstone%20-%20AI/",guestClient:guest,staffClient:staff,knowledge:{}});
  const timestamp=new Date().toISOString();
  const text="Fictional Capstone Supabase persistence test. No student data.\n";
  const response=await api.fetch("/api/tickets",{method:"POST",body:JSON.stringify({name:"Fictional Cloud Tester",email:"fictional@example.test",
    identityContext:"supabase-requester-v1",category:"Testing and updates",question:"TEST Supabase persistence "+timestamp,
    details:"Automated fictional save/read-back check. Created by the project owner's test workflow.",
    attachments:[{name:"fictional-persistence-test.txt",size:Buffer.byteLength(text),data:Buffer.from(text).toString("base64")}]})});
  const receipt=await response.json();
  if(!response.ok) throw new Error(receipt.error+" Check the staff queue/dashboard before retrying; a private draft or committed ticket may exist.");
  console.log("Created fictional ticket: "+receipt.id);
  const {data:{session}}=await guest.auth.getSession();
  const fresh=make();
  const signed=await fresh.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
  if(signed.error) throw new Error("Ticket was created, but fresh-client receipt verification failed. Check "+receipt.id+" in the dashboard.");
  const reread=await fresh.rpc("capstone_finalize",{ticket_id:receipt.id});
  assert.equal(reread.error,null,"Saved receipt could not be read back");
  assert.equal(reread.data.id,receipt.id);
  console.log("PASS: saved ticket + attachment finalization; a fresh client read the durable receipt from Supabase.");
  console.log("Ticket and attachment retained for staff inspection. This does not verify staff login, a second user, download bytes, or backup/restore. Complete the guide's staff/browser checks before upload.");
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
