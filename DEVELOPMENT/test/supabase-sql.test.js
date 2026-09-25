const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { PGlite } = require("@electric-sql/pglite");
const { createSupabaseApi } = require("../js/shared/supabase-api");
const root=path.resolve(__dirname,"..");

test("Supabase SQL + app adapter: actual PostgreSQL rules, persistence, attachments and conflicts (isolated, not hosted)", {timeout:120000}, async t => {
  const db=new PGlite();
  t.after(()=>db.close());
  // Only Supabase-owned Auth/Storage structures are simulated; app SQL is unchanged.
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,storage to anon,authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to anon,authenticated;`);
  const sql=await fs.readFile(path.join(root,"server/supabase/001_capstone.sql"),"utf8");
  await db.exec(sql);
  const staff=randomUUID(),staff2=randomUUID(),guest=randomUUID(),other=randomUUID(),unbound=randomUUID();
  await db.query(`insert into auth.users values ($1,'afeli016@fiu.edu',now(),false),($2,'zrich010@fiu.edu',now(),false),
    ($3,null,null,true),($4,null,null,true),($5,'outsider@example.test',now(),false)`,[staff,staff2,guest,other,unbound]);
  await db.exec(await fs.readFile(path.join(root,"server/supabase/002_bind_staff.sql"),"utf8"));
  async function asUser(uid,sql,params=[]) {
    await db.exec(uid ? "set role authenticated" : "set role anon");
    try {await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid||""]); return await db.query(sql,params);}
    finally {await db.exec("reset role");}
  }
  const rpc=async (uid,name,args=[]) => (await asUser(uid,`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as result`,args)).rows[0].result;
  const payload={name:"Fictional Tester",email:"fictional@example.test",category:"Attendance",question:"TEST attendance",details:"Fictional SQL fixture",attachments:[]};
  let id;
  await t.test("schema is ready but an unauthenticated caller cannot create tickets or read the queue",async()=>{
    assert.equal((await rpc(null,"capstone_health")).schemaVersion,1);
    await assert.rejects(()=>rpc(null,"capstone_submit",[payload,randomUUID(),false]));
    await assert.rejects(()=>asUser(null,"select * from public.capstone_tickets"));
    await assert.rejects(()=>rpc(guest,"capstone_staff_session"),/Unauthorized/);
    await assert.rejects(()=>rpc(unbound,"capstone_staff_session"),/Unauthorized/);
    assert.equal((await rpc(staff,"capstone_staff_session")).staff.email,"afeli016@fiu.edu");
  });
  await t.test("guest submit/finalize persists once; guest cannot read even internal fields of their own row",async()=>{
    const requestId=randomUUID();
    const plan=await rpc(guest,"capstone_submit",[{...payload,assignedTo:"afeli016@fiu.edu",projectOwnerTicket:true},requestId,false]);
    id=plan.id;
    assert.deepEqual(await rpc(staff,"capstone_list"),[]);
    const receipt=await rpc(guest,"capstone_finalize",[id]);
    assert.equal(receipt.id,id); assert.equal(receipt.details,undefined);
    const record=await rpc(staff,"capstone_get",[id]);
    assert.equal(record.assignedTo,null); assert.equal(record.projectOwnerTicket,undefined);
    assert.equal((await asUser(guest,"select * from public.capstone_tickets")).rows.length,0);
    assert.equal((await rpc(guest,"capstone_submit",[{...payload,assignedTo:"afeli016@fiu.edu",projectOwnerTicket:true},requestId,false])).id,id);
    await assert.rejects(()=>rpc(guest,"capstone_submit",[payload,requestId,false]),/identifier/);
    await assert.rejects(()=>rpc(other,"capstone_finalize",[id]),/not yours/);
    await assert.rejects(()=>rpc(guest,"capstone_get",[id]),/Unauthorized/);
    await assert.rejects(()=>asUser(guest,"update public.capstone_tickets set ready=true"));
  });
  const file={name:"fixture.txt",size:4,type:"text/plain"};
  let plan;
  await t.test("private files require an owned reservation and exact metadata before confirming the ticket",async()=>{
    plan=await rpc(guest,"capstone_submit",[{...payload,attachments:[file]},randomUUID(),false]);
    const p=plan.attachments[0].path;
    await assert.rejects(()=>rpc(guest,"capstone_finalize",[plan.id]),/not finished/);
    await assert.rejects(()=>asUser(other,"insert into storage.objects(bucket_id,name,metadata) values('capstone-attachments',$1,$2)",[p,{size:4,mimetype:"text/plain"}]));
    await assert.rejects(()=>asUser(guest,"insert into storage.objects(bucket_id,name,metadata) values('capstone-attachments','unreserved',$1)",[{size:4}]));
    await asUser(guest,"insert into storage.objects(bucket_id,name,metadata) values('capstone-attachments',$1,$2)",[p,{size:4,mimetype:"text/plain"}]);
    assert.equal((await asUser(guest,"select * from storage.objects where name=$1",[p])).rows.length,1);
    await rpc(guest,"capstone_finalize",[plan.id]);
    assert.equal((await asUser(guest,"select * from storage.objects where name=$1",[p])).rows.length,0);
    assert.equal((await asUser(staff,"select * from storage.objects where name=$1",[p])).rows.length,1);
    // Even an unrelated permissive policy cannot expose this bucket.
    await db.exec("create policy unrelated_public_read on storage.objects for select to anon,authenticated using(true)");
    assert.equal((await asUser(null,"select * from storage.objects")).rows.length,0);
    assert.equal((await asUser(other,"select * from storage.objects")).rows.length,0);
  });
  await t.test("work saves enforce revisions, idempotency and staff authorization; preview filters private notes",async()=>{
    const input={expectedRevision:0,requestId:randomUUID(),status:"resolved",priority:"high",category:"Attendance",assignedTo:"afeli016@fiu.edu",
      question:"TEST edited",details:"Fictional resolved fixture",resolution:"INTERNAL resolution",workNote:"INTERNAL note",additionalComment:"Public test comment",projectOwnerTicket:true};
    await assert.rejects(()=>rpc(guest,"capstone_work",[id,input,false]),/Unauthorized/);
    const saved=await rpc(staff,"capstone_work",[id,input,false]);
    assert.equal(saved.revision,1); assert.equal(saved.activity.length,3);
    assert.equal((await rpc(staff,"capstone_work",[id,input,false])).activity.length,3);
    await assert.rejects(()=>rpc(staff2,"capstone_work",[id,{...input,requestId:randomUUID()},false]),/changed/);
    const preview=await rpc(staff,"capstone_requester_preview",[id]);
    assert.equal(preview.comments[0].body,"Public test comment"); assert.ok(!JSON.stringify(preview).includes("INTERNAL"));
    const quick={expectedRevision:1,requestId:randomUUID(),assignedTo:null,expectedAssignee:"afeli016@fiu.edu"};
    assert.equal((await rpc(staff2,"capstone_work",[id,quick,true])).assignedTo,null);
    await assert.rejects(()=>rpc(staff,"capstone_work",[id,{...quick,expectedRevision:2,requestId:randomUUID()},true]),/Assignment changed/);
  });
  await t.test("database validation rejects client-tampered fields and file metadata",async()=>{
    for(const patch of [{question:""},{email:"bad"},{category:"Bogus"},{attachments:[{...file,name:"../secret.txt"}]},{attachments:[{...file,size:6000000}]},{preferredContactMethod:"phone",contactPhone:"123"}]) {
      await assert.rejects(()=>rpc(guest,"capstone_submit",[{...payload,...patch},randomUUID(),false]));
    }
    await assert.rejects(()=>rpc(guest,"capstone_submit",[payload,randomUUID(),true]),/Unauthorized/);
    await db.query("update capstone_private.staff_members set user_id=null where email='afeli016@fiu.edu'");
    await assert.rejects(()=>rpc(staff,"capstone_staff_session"),/Unauthorized/);
    await db.exec(await fs.readFile(path.join(root,"server/supabase/002_bind_staff.sql"),"utf8"));
  });
  await t.test("UI API contract saves a staff ticket into PostgreSQL and a fresh adapter reads it back",async()=>{
    const client = uid => ({
      auth:{getSession:async()=>({data:{session:{user:{id:uid}}}})},
      rpc:async(name,args={})=>{
        try {
          const order={capstone_submit:['input','request_id','staff_created'],capstone_finalize:['ticket_id'],capstone_get:['ticket_id'],capstone_requester_preview:['ticket_id'],capstone_work:['ticket_id','input','quick']}[name]||[];
          return {data:await rpc(uid,name,order.map(k=>args[k]))};
        } catch(error) {return {error:{code:error.code,message:error.message}};}
      }
    });
    const settings={baseUrl:"https://example.test/Capstone/",staffClient:client(staff),guestClient:client(guest),knowledge:{}};
    const first=createSupabaseApi(settings);
    const created=await first.fetch("/api/staff/tickets",{method:"POST",body:JSON.stringify({...payload,projectOwnerTicket:true,assignedTo:"afeli016@fiu.edu"})});
    const record=await created.json(); assert.equal(created.status,201,JSON.stringify(record));
    assert.equal(record.projectOwnerTicket,true);
    const reopened=createSupabaseApi(settings);
    const read=await (await reopened.fetch("/api/tickets/"+record.id)).json();
    assert.equal(read.id,record.id); assert.equal(read.question,payload.question);
    assert.equal((await (await reopened.fetch("/api/tickets")).json()).some(row=>row.id===record.id),true);
  });
  await t.test("departed staff lose access and new assignments without deleting Auth, tickets or attachments",async()=>{
    const departed=randomUUID();
    await db.query("insert into auth.users values ($1,'ralva037@fiu.edu',now(),false)",[departed]);
    const binding=await fs.readFile(path.join(root,"server/supabase/002_bind_staff.sql"),"utf8");
    await db.exec(binding);
    assert.equal((await rpc(departed,"capstone_staff_session")).staff.email,"ralva037@fiu.edu");
    const oldPlan=await rpc(departed,"capstone_submit",[{...payload,assignedTo:"ralva037@fiu.edu",attachments:[file]},randomUUID(),true]);
    await asUser(departed,"insert into storage.objects(bucket_id,name,metadata) values('capstone-attachments',$1,$2)",[oldPlan.attachments[0].path,{size:4,mimetype:"text/plain"}]);
    await rpc(departed,"capstone_finalize",[oldPlan.id]);
    const snapshot=async()=>JSON.stringify(await Promise.all([
      db.query("select * from public.capstone_tickets order by id"),
      db.query("select * from public.capstone_attachments order by id"),
      db.query("select * from storage.objects order by id"),
      db.query("select * from auth.users order by id")
    ]));
    const before=await snapshot();
    const retirement=await fs.readFile(path.join(root,"server/supabase/003_retire_raul.sql"),"utf8");
    await db.exec(retirement);
    assert.equal(await snapshot(),before);
    const session=await rpc(staff,"capstone_staff_session");
    assert.equal(session.members.length,5);
    assert.equal(session.members.some(member=>member.email==='ralva037@fiu.edu'),false);
    for(const name of ['capstone_staff_session','capstone_list']) await assert.rejects(()=>rpc(departed,name),/Unauthorized/);
    await assert.rejects(()=>rpc(departed,'capstone_get',[oldPlan.id]),/Unauthorized/);
    await assert.rejects(()=>rpc(departed,'capstone_work',[oldPlan.id,{status:'resolved'},true]),/Unauthorized/);
    assert.equal((await asUser(departed,'select * from public.capstone_tickets')).rows.length,0);
    assert.equal((await asUser(departed,'select * from storage.objects')).rows.length,0);
    await assert.rejects(()=>rpc(staff,'capstone_submit',[{...payload,assignedTo:'ralva037@fiu.edu'},randomUUID(),true]),/active staff/);
    await assert.rejects(()=>asUser(staff,"update capstone_private.staff_members set active=true where email='ralva037@fiu.edu'"));
    await db.exec(binding);
    await db.exec(retirement);
    await assert.rejects(()=>rpc(departed,'capstone_staff_session'),/Unauthorized/);
    assert.equal(await snapshot(),before);
    const preserved=await rpc(staff,'capstone_work',[oldPlan.id,{expectedRevision:0,requestId:randomUUID(),status:'in-review'},true]);
    assert.equal(preserved.assignedTo,'ralva037@fiu.edu');
    const reassigned=await rpc(staff,'capstone_work',[oldPlan.id,{expectedRevision:1,requestId:randomUUID(),assignedTo:'afeli016@fiu.edu',expectedAssignee:'ralva037@fiu.edu'},true]);
    assert.equal(reassigned.assignedTo,'afeli016@fiu.edu');
    assert.equal(reassigned.createdBy,'ralva037@fiu.edu');
    await assert.rejects(()=>rpc(staff,'capstone_work',[oldPlan.id,{expectedRevision:2,requestId:randomUUID(),assignedTo:'ralva037@fiu.edu',expectedAssignee:'afeli016@fiu.edu'},true]),/active staff/);
  });
  await t.test("initial migration refuses to run twice instead of resetting stored tickets",async()=>{
    const before=(await db.query("select count(*) from public.capstone_tickets")).rows[0].count;
    await assert.rejects(()=>db.exec(sql),/already exist/);
    await db.exec("rollback");
    assert.equal((await db.query("select count(*) from public.capstone_tickets")).rows[0].count,before);
  });
});
