-- Use the auth.users row directly so email verification works even when the
-- access token does not yet contain an email_confirmed_at claim.
create or replace function public.activate_my_student()
returns public.students
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.students;
  confirmed_at timestamptz;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  select email_confirmed_at into confirmed_at from auth.users where id = auth.uid();
  if confirmed_at is null then raise exception 'EMAIL_NOT_VERIFIED'; end if;

  update public.students
    set verification_state = 'demo_verified'
    where auth_user_id = auth.uid()
      and school_email ~* '@calpoly\.edu$'
    returning * into profile;

  if profile.id is null then raise exception 'CAL_POLY_PROFILE_NOT_FOUND'; end if;
  return profile;
end;
$$;

grant execute on function public.activate_my_student() to authenticated;
