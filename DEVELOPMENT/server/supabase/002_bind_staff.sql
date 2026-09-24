-- Run only after creating the intended staff users in Authentication > Users.
-- Accounts must have separate passwords, confirmed email and the exact allowlisted email.
-- This binds existing confirmed users; it does not create users or set passwords.
-- Review the final output: a NULL user_id means setup is still needed for that person.
begin;
update capstone_private.staff_members s
set user_id=u.id
from auth.users u
where lower(u.email)=s.email and u.email_confirmed_at is not null
  and not coalesce(u.is_anonymous,false) and s.user_id is null;
select name,email,user_id from capstone_private.staff_members order by name;
commit;
