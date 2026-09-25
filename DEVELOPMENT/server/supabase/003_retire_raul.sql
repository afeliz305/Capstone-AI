-- Apply after 001. Deactivate the departed member without deleting any data.
-- Safe to repeat. Existing Auth users, tickets, files and history are preserved.
begin;
alter table capstone_private.staff_members
  add column if not exists active boolean not null default true;
update capstone_private.staff_members set active=false where email='ralva037@fiu.edu';

create or replace function capstone_private.staff() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('email', s.email, 'name', s.name)
  from capstone_private.staff_members s join auth.users u on u.id = s.user_id
  where s.active and s.user_id = auth.uid() and lower(u.email) = s.email
    and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)
$$;
create or replace function public.capstone_staff_session() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s jsonb := capstone_private.require_staff();
begin return jsonb_build_object('staff',s,'loginMode','password','members',
  (select jsonb_agg(jsonb_build_object('name',name,'email',email) order by name)
   from capstone_private.staff_members where active));
end $$;

-- Enforce the active roster on every new assignment. An unchanged historical
-- assignee may remain while another staff member adds notes or resolves it.
create or replace function capstone_private.check_active_assignee() returns trigger
language plpgsql security definer set search_path = '' as $$
declare assignee text := new.record->>'assignedTo';
begin
  if tg_op='UPDATE' then
    if assignee is not distinct from (old.record->>'assignedTo') then return new; end if;
  end if;
  if assignee is not null and not exists (
    select 1 from capstone_private.staff_members where email=assignee and active
  ) then
    raise sqlstate 'PT400' using message='Choose an active staff member or Unassigned.';
  end if;
  return new;
end $$;
revoke all on function capstone_private.check_active_assignee() from public,anon,authenticated;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname='capstone_active_assignee'
    and tgrelid='public.capstone_tickets'::regclass and not tgisinternal) then
    create trigger capstone_active_assignee before insert or update of record
      on public.capstone_tickets for each row execute function capstone_private.check_active_assignee();
  end if;
end $$;
-- Replaced functions retain their existing grants. No new access is granted.
notify pgrst, 'reload schema';
commit;
