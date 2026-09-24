-- Capstone AI Chat: apply ONCE in this project's Supabase SQL Editor.
-- Creates new app objects only. Aborts if they already exist; never resets data.
-- No passwords, API secrets, test tickets, or auth users are created here.
begin;
do $$ begin
  if to_regclass('public.capstone_tickets') is not null
     or to_regclass('public.capstone_schema_version') is not null
     or exists (select 1 from storage.buckets where id = 'capstone-attachments') then
    raise exception 'Capstone objects already exist. Stop and inspect the existing installation; do not delete tickets or rerun this initial migration.';
  end if;
end $$;
create schema if not exists capstone_private;
revoke all on schema capstone_private from public, anon, authenticated;
grant usage on schema capstone_private to authenticated;

create table capstone_private.staff_members (
  email text primary key, name text not null,
  user_id uuid unique references auth.users(id)
);
insert into capstone_private.staff_members(email, name) values
 ('zrich010@fiu.edu','Zavier Richardson'), ('chern563@fiu.edu','Christopher Hernandez'),
 ('malva517@fiu.edu','Michael Alvarez'), ('rchar044@fiu.edu','Romelin Charnel'),
 ('ralva037@fiu.edu','Raul Alvarenga'), ('afeli016@fiu.edu','Anthony Feliz');
alter table capstone_private.staff_members enable row level security;
revoke all on capstone_private.staff_members from public, anon, authenticated;

create function capstone_private.staff() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('email', s.email, 'name', s.name)
  from capstone_private.staff_members s join auth.users u on u.id = s.user_id
  where s.user_id = auth.uid() and lower(u.email) = s.email
    and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)
$$;
create function capstone_private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select capstone_private.staff() is not null
$$;
create function capstone_private.require_staff() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s jsonb := capstone_private.staff();
begin
  if s is null then raise sqlstate 'PT403' using message = 'Unauthorized access. A verified, provisioned staff account is required.'; end if;
  return s;
end $$;
create function capstone_private.txt(j jsonb, k text, max_length integer, required boolean default false) returns text
language plpgsql immutable set search_path = '' as $$
declare v text := coalesce(j->>k, '');
begin
  if (j ? k and j->k <> 'null'::jsonb and jsonb_typeof(j->k) <> 'string')
     or length(v) > max_length or (required and length(btrim(v)) = 0) then
    raise sqlstate 'PT400' using message = 'Invalid or missing field: ' || k;
  end if;
  return btrim(v);
end $$;
create function capstone_private.topic(t text) returns boolean language sql immutable set search_path = '' as $$
  select t = any(array['Workflow and improvements','Testing and updates','Implementation and testing',
    'Website navigation','Coursework','Attendance','Scrum and sprints','Showcase','Templates and branding','Other'])
$$;

create sequence capstone_private.ticket_number start 1001;
create table public.capstone_tickets (
  id text primary key default ('CAP-' || nextval('capstone_private.ticket_number')),
  owner_id uuid not null references auth.users(id),
  request_id uuid not null,
  request_payload jsonb not null,
  staff_created boolean not null,
  ready boolean not null default false,
  created_at timestamptz not null default now(),
  record jsonb not null,
  unique(owner_id, request_id)
);
create table public.capstone_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null references public.capstone_tickets(id),
  path text unique not null, name text not null, position integer not null,
  size bigint not null check(size between 1 and 5242880),
  type text not null check(type in ('application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'))
);
alter table public.capstone_tickets enable row level security;
alter table public.capstone_attachments enable row level security;
revoke all on public.capstone_tickets, public.capstone_attachments from public, anon, authenticated;
grant select on public.capstone_tickets, public.capstone_attachments to authenticated;
create policy capstone_staff_tickets on public.capstone_tickets for select to authenticated
  using (ready and capstone_private.is_staff());
create policy capstone_staff_attachments on public.capstone_attachments for select to authenticated
  using (capstone_private.is_staff() and exists(select 1 from public.capstone_tickets t where t.id = ticket_id));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('capstone-attachments','capstone-attachments',false,5242880,
  array['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

create function capstone_private.can_upload(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.capstone_attachments a join public.capstone_tickets t on t.id = a.ticket_id
    where a.path = object_name and t.owner_id = auth.uid() and not t.ready and t.created_at > now() - interval '24 hours')
$$;
create function capstone_private.can_download(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.capstone_attachments a join public.capstone_tickets t on t.id = a.ticket_id
    where a.path = object_name and ((t.ready and capstone_private.is_staff())
      or (not t.ready and t.owner_id = auth.uid() and t.created_at > now() - interval '24 hours')))
$$;
-- No update, delete, overwrite, or public read policy. Signed URLs are not needed.
create policy capstone_file_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'capstone-attachments' and capstone_private.can_upload(name));
create policy capstone_file_read on storage.objects for select to authenticated
  using (bucket_id = 'capstone-attachments' and capstone_private.can_download(name));
-- Guard against unrelated permissive Storage policies in an existing project.
create policy capstone_file_insert_guard on storage.objects as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'capstone-attachments' or capstone_private.can_upload(name));
create policy capstone_file_read_guard on storage.objects as restrictive for select to anon, authenticated
  using (bucket_id <> 'capstone-attachments' or capstone_private.can_download(name));
create policy capstone_file_update_guard on storage.objects as restrictive for update to anon, authenticated
  using (bucket_id <> 'capstone-attachments') with check (bucket_id <> 'capstone-attachments');
create policy capstone_file_delete_guard on storage.objects as restrictive for delete to anon, authenticated
  using (bucket_id <> 'capstone-attachments');

create table public.capstone_schema_version(version integer primary key check(version = 1));
insert into public.capstone_schema_version values(1);
alter table public.capstone_schema_version enable row level security;
revoke all on public.capstone_schema_version from public, anon, authenticated;
grant select on public.capstone_schema_version to anon, authenticated;
create policy capstone_version_read on public.capstone_schema_version for select to anon, authenticated using(true);

create function public.capstone_health() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('schemaVersion',1,'shared',true,'backend','supabase',
    'privateAttachments',exists(select 1 from storage.buckets where id='capstone-attachments' and not public))
$$;
create function public.capstone_staff_session() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s jsonb := capstone_private.require_staff();
begin return jsonb_build_object('staff',s,'loginMode','password','members',
  (select jsonb_agg(jsonb_build_object('name',name,'email',email) order by name) from capstone_private.staff_members));
end $$;

create function capstone_private.submission_result(t public.capstone_tickets) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',t.id,'complete',t.ready,'attachments',coalesce(
    (select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'size',a.size,'type',a.type,'path',a.path) order by a.position)
    from public.capstone_attachments a where a.ticket_id=t.id),'[]'::jsonb))
$$;

create function public.capstone_submit(input jsonb, request_id uuid, staff_created boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); s jsonb; t public.capstone_tickets; rec jsonb; f jsonb;
  nm text; em text; cat text; assignee text; contact jsonb; method text; phone text;
  fname text; mime text; fsize bigint; fid uuid; total bigint := 0; file_index integer := 0;
begin
  if actor is null then raise sqlstate 'PT401' using message='A requester session is required.'; end if;
  if request_id is null or input is null or jsonb_typeof(input)<>'object' or pg_column_size(input)>64000 or staff_created is null then
    raise sqlstate 'PT400' using message='Invalid submission.';
  end if;
  if staff_created then s := capstone_private.require_staff(); end if;
  -- Serializes reservations, quota accounting and request-ID retries, not reads.
  perform pg_advisory_xact_lock(721306419);
  select * into t from public.capstone_tickets c where c.owner_id=actor and c.request_id=capstone_submit.request_id;
  if found then
    if t.request_payload <> input or t.staff_created <> capstone_submit.staff_created then
      raise sqlstate 'PT409' using message='Submission identifier already used for a different request.';
    end if;
    return capstone_private.submission_result(t);
  end if;
  if (select count(*) from public.capstone_tickets) >= 1000 then raise sqlstate 'PT413' using message='Test queue limit reached. Ask the project owner to archive it safely.'; end if;
  if (select count(*) from public.capstone_tickets c where c.owner_id=actor and c.created_at > now()-interval '1 hour') >= 10 then
    raise sqlstate 'PT429' using message='Please wait before submitting more test tickets.';
  end if;
  nm := case when staff_created then s->>'name' else capstone_private.txt(input,'name',120,true) end;
  em := lower(case when staff_created then s->>'email' else capstone_private.txt(input,'email',254,true) end);
  if em !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$'
     or split_part(em,'@',1) like '.%' or split_part(em,'@',1) like '%.' or em like '%..%' or length(split_part(em,'@',1))>64 then
    raise sqlstate 'PT400' using message='Enter a valid contact email.';
  end if;
  cat := coalesce(nullif(capstone_private.txt(input,'category',80),''),'Other');
  if not capstone_private.topic(cat) then raise sqlstate 'PT400' using message='Choose a valid ticket topic.'; end if;
  assignee := case when staff_created then nullif(lower(capstone_private.txt(input,'assignedTo',254)), '') else null end;
  if assignee is not null and not exists(select 1 from capstone_private.staff_members where email=assignee) then
    raise sqlstate 'PT400' using message='Choose an approved staff member.';
  end if;
  method := coalesce(nullif(capstone_private.txt(input,'preferredContactMethod',10),''),'email');
  phone := capstone_private.txt(input,'contactPhone',40);
  if method not in ('email','phone') or (method='phone' and (phone !~ '^\+[1-9][0-9]{7,14}$'
     or (phone like '+1%' and phone !~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$'))) then
    raise sqlstate 'PT400' using message='Enter a valid phone number with country code.';
  end if;
  contact := jsonb_build_object('method',method,'value',case when method='phone' then phone else em end);
  if input ? 'projectOwnerTicket' and jsonb_typeof(input->'projectOwnerTicket') <> 'boolean' then raise sqlstate 'PT400' using message='Invalid project-owner classification.'; end if;
  if jsonb_typeof(coalesce(input->'attachments','[]')) <> 'array' or jsonb_array_length(coalesce(input->'attachments','[]'))>3 then
    raise sqlstate 'PT400' using message='Choose at most three documents.';
  end if;
  for f in select value from jsonb_array_elements(coalesce(input->'attachments','[]')) loop
    fname := capstone_private.txt(f,'name',180,true); mime := capstone_private.txt(f,'type',100,true);
    if fname ~ '[/\\\x00-\x1f\x7f]' or fname like '.%' or jsonb_typeof(f->'size') is distinct from 'number'
      or (f->>'size') !~ '^[0-9]+$' then raise sqlstate 'PT400' using message='Invalid attachment metadata.'; end if;
    fsize := (f->>'size')::bigint;
    if fsize not between 1 and 5242880 or not ((lower(fname) like '%.pdf' and mime='application/pdf')
      or (lower(fname) like '%.txt' and mime='text/plain')
      or (lower(fname) like '%.docx' and mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document')) then
      raise sqlstate 'PT400' using message='Only PDF, DOCX and TXT documents up to 5 MB are accepted.';
    end if;
    total := total + fsize;
  end loop;
  if total>10485760 or total+coalesce((select sum(size) from public.capstone_attachments),0)>104857600 then
    raise sqlstate 'PT413' using message='Document size limit reached.';
  end if;
  rec := jsonb_build_object('name',nm,'email',em,'contact',contact,'category',cat,
    'question',capstone_private.txt(input,'question',500,true),'details',capstone_private.txt(input,'details',3000,true),
    'transcript',case when not staff_created and input->'includeTranscript'='true'::jsonb then capstone_private.txt(input,'transcript',5000) else '' end,
    'privateToInstructor',not staff_created and coalesce(input->'privateToInstructor'='true'::jsonb,false),
    'accountId',null,'identitySource',case when staff_created then 'staff-session' else 'manual' end,
    'source','Capstone Supabase test queue','status','open','priority','normal','revision',0,
    'assignedTo',assignee,'createdAt',now(),'activity','[]'::jsonb,'attachments','[]'::jsonb);
  if staff_created then rec := rec || jsonb_build_object('createdBy',em,'projectOwnerTicket',coalesce(input->'projectOwnerTicket'='true'::jsonb,false)); end if;
  if assignee is not null then rec := rec || jsonb_build_object('assignedBy',em,'assignedAt',now()); end if;
  insert into public.capstone_tickets(owner_id,request_id,request_payload,staff_created,record)
    values(actor,request_id,input,staff_created,rec) returning * into t;
  for f in select value from jsonb_array_elements(coalesce(input->'attachments','[]')) loop
    fid := gen_random_uuid();
    insert into public.capstone_attachments(id,ticket_id,path,name,position,size,type)
      values(fid,t.id,actor::text||'/'||t.id||'/'||fid::text,f->>'name',file_index,(f->>'size')::bigint,f->>'type');
    file_index := file_index + 1;
  end loop;
  return capstone_private.submission_result(t);
end $$;

create function public.capstone_finalize(ticket_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.capstone_tickets; docs jsonb;
begin
  select * into t from public.capstone_tickets where id=ticket_id for update;
  if t.id is null or auth.uid() is null or t.owner_id<>auth.uid() then raise sqlstate 'PT403' using message='This submission is not yours.'; end if;
  if t.staff_created then perform capstone_private.require_staff(); end if;
  if not t.ready then
    if t.created_at<=now()-interval '24 hours' then raise sqlstate 'PT409' using message='This unfinished submission expired. Contact the project owner.'; end if;
    if exists(select 1 from public.capstone_attachments a where a.ticket_id=t.id and not exists(
      select 1 from storage.objects o where o.bucket_id='capstone-attachments' and o.name=a.path
        and o.metadata->>'size'=a.size::text and o.metadata->>'mimetype'=a.type)) then
      raise sqlstate 'PT409' using message='Some documents have not finished uploading. Your ticket has not been confirmed.';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'size',size,'type',type) order by position),'[]') into docs
      from public.capstone_attachments where capstone_attachments.ticket_id=t.id;
    t.record := t.record || jsonb_build_object('id',t.id,'attachments',docs);
    update public.capstone_tickets set ready=true, record=t.record where id=t.id;
  end if;
  if t.staff_created then return t.record; end if;
  return jsonb_build_object('id',t.id,'status',t.record->>'status','createdAt',t.created_at);
end $$;

create function public.capstone_list() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin perform capstone_private.require_staff();
  return coalesce((select jsonb_agg(record order by created_at desc,id desc) from public.capstone_tickets),'[]');
end $$;
create function public.capstone_get(ticket_id text) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare rec jsonb;
begin perform capstone_private.require_staff();
  select record into rec from public.capstone_tickets where id=ticket_id;
  if rec is null then raise sqlstate 'PT404' using message='Ticket not found.'; end if;
  return rec;
end $$;
create function public.capstone_requester_preview(ticket_id text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare r jsonb := public.capstone_get(ticket_id);
begin return jsonb_build_object('id',r->'id','category',r->'category','status',r->'status','question',r->'question',
  'details',r->'details','createdAt',r->'createdAt','updatedAt',coalesce(r->'updatedAt',r->'createdAt'),
  'comments',coalesce((select jsonb_agg(jsonb_build_object('id',a->'id','body',a->'body','authorName',a->'author'->'name','createdAt',a->'createdAt'))
    from jsonb_array_elements(coalesce(r->'activity','[]')) a where a->>'type'='additional-comment'),'[]'));
end $$;

create function public.capstone_work(ticket_id text, input jsonb, quick boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s jsonb := capstone_private.require_staff(); t public.capstone_tickets; r jsonb; fields jsonb; prev jsonb;
  assignee text; note text; comment text; rid text; activity jsonb; stamp timestamptz := now(); rev integer;
begin
  if input is null or jsonb_typeof(input)<>'object' or quick is null then raise sqlstate 'PT400' using message='Invalid ticket changes.'; end if;
  select * into t from public.capstone_tickets where id=ticket_id and ready for update;
  if t.id is null then raise sqlstate 'PT404' using message='Ticket not found.'; end if;
  r:=t.record; rev:=coalesce((r->>'revision')::integer,0);
  rid:=input->>'requestId';
  if rid is null or rid !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then
    raise sqlstate 'PT400' using message='A valid save identifier is required.';
  end if;
  select a into prev from jsonb_array_elements(coalesce(r->'workSaves','[]')) a where a->>'requestId'=rid;
  if prev is not null then
    if prev->'input'<>input or prev->>'author'<>s->>'email' or prev->'quick'<>to_jsonb(quick) then
      raise sqlstate 'PT409' using message='Save identifier already used.';
    end if;
    return r;
  end if;
  if input->'expectedRevision' is distinct from to_jsonb(rev) then raise sqlstate 'PT409' using message='Ticket changed. Reload it; your draft has not been applied.'; end if;
  if quick then
    if not (input ? 'status' or input ? 'assignedTo') then raise sqlstate 'PT400' using message='Choose a status or assignment.'; end if;
    if input ? 'assignedTo' and coalesce(input->'expectedAssignee','null') is distinct from coalesce(r->'assignedTo','null') then
      raise sqlstate 'PT409' using message='Assignment changed. Refresh the queue.';
    end if;
    fields:=jsonb_build_object('status',coalesce(input->'status',r->'status'),'priority',r->'priority',
      'category',r->'category','question',r->'question','details',r->'details','resolution',coalesce(r->'resolution','""'),
      'assignedTo',case when input ? 'assignedTo' then input->'assignedTo' else r->'assignedTo' end,
      'projectOwnerTicket',coalesce(r->'projectOwnerTicket','false'));
    note:=''; comment:='';
  else
    fields:=jsonb_build_object('status',input->'status','priority',input->'priority','category',input->'category',
      'question',capstone_private.txt(input,'question',500,true),'details',capstone_private.txt(input,'details',3000,true),
      'resolution',capstone_private.txt(input,'resolution',3000),'assignedTo',input->'assignedTo',
      'projectOwnerTicket',coalesce(input->'projectOwnerTicket',r->'projectOwnerTicket','false'));
    note:=capstone_private.txt(input,'workNote',4000); comment:=capstone_private.txt(input,'additionalComment',4000);
  end if;
  if coalesce(fields->>'status','') not in ('open','in-review','resolved')
    or coalesce(fields->>'priority','') not in ('low','normal','high','urgent')
    or not coalesce(capstone_private.topic(fields->>'category'),false)
    or jsonb_typeof(fields->'projectOwnerTicket') is distinct from 'boolean' then
    raise sqlstate 'PT400' using message='Choose valid ticket fields.';
  end if;
  assignee:=fields->>'assignedTo';
  if assignee is not null and not exists(select 1 from capstone_private.staff_members where email=assignee) then
    raise sqlstate 'PT400' using message='Choose an approved staff member.';
  end if;
  activity:=coalesce(r->'activity','[]');
  if jsonb_array_length(activity)>500 then raise sqlstate 'PT413' using message='Ticket history limit reached. Ask the project owner to archive it.'; end if;
  if r->'assignedTo' is distinct from fields->'assignedTo' then r:=r||jsonb_build_object('assignedBy',s->>'email','assignedAt',stamp); end if;
  if fields->>'status'='resolved' and r->>'status'<>'resolved' then r:=r||jsonb_build_object('resolvedBy',s->>'email','resolvedAt',stamp); end if;
  activity:=activity||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'type','update','body','Ticket fields saved.','author',s,'createdAt',stamp));
  if note<>'' then activity:=activity||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'type','work-note','body',note,'author',s,'createdAt',stamp)); end if;
  if comment<>'' then activity:=activity||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'type','additional-comment','body',comment,'author',s,'createdAt',stamp)); end if;
  r:=r||fields||jsonb_build_object('activity',activity,'revision',rev+1,'updatedAt',stamp,'updatedBy',s->>'email',
    'workSaves',coalesce((select jsonb_agg(a) from (select value a from jsonb_array_elements(coalesce(r->'workSaves','[]')) with ordinality e(value,n) order by n desc limit 49) q),'[]')
      ||jsonb_build_array(jsonb_build_object('requestId',rid,'author',s->>'email','input',input,'quick',quick)));
  update public.capstone_tickets set record=r where id=t.id;
  return r;
end $$;

-- Explicit execute grants: no accidental PUBLIC access to security-definer RPCs.
revoke all on all functions in schema capstone_private from public, anon, authenticated;
grant execute on function capstone_private.is_staff(),capstone_private.require_staff(),
  capstone_private.can_upload(text),capstone_private.can_download(text) to authenticated;
grant usage on schema capstone_private to anon;
grant execute on function capstone_private.can_upload(text),capstone_private.can_download(text) to anon;
revoke all on function public.capstone_health(),public.capstone_staff_session(),public.capstone_submit(jsonb,uuid,boolean),
 public.capstone_finalize(text),public.capstone_list(),public.capstone_get(text),public.capstone_requester_preview(text),
 public.capstone_work(text,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.capstone_health() to anon, authenticated;
grant execute on function public.capstone_staff_session(),public.capstone_submit(jsonb,uuid,boolean),
 public.capstone_finalize(text),public.capstone_list(),public.capstone_get(text),public.capstone_requester_preview(text),
 public.capstone_work(text,jsonb,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
