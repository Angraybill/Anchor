-- Anchor platform hardening: least privilege, authenticated onboarding, and private Realtime updates.
-- Apply after 20260905120000_anchor_schema.sql.

insert into public.communities (id, name, school_domain, is_active)
values ('a11c0a00-0000-4000-8000-000000000001', 'Anchor Cal Poly Pilot', 'calpoly.edu', true)
on conflict (id) do nothing;

alter table public.route_offers
  add constraint route_offers_allowed_preferences
  check (preference_tags <@ array['quiet_ride', 'small_bag', 'accessible_pickup']::text[]);

alter table public.anchor_requests
  add constraint anchor_requests_allowed_preferences
  check (preference_tags <@ array['quiet_ride', 'small_bag', 'accessible_pickup']::text[]);

alter table public.match_events
  drop constraint match_events_event_type_check,
  add constraint match_events_event_type_check
  check (event_type in ('driver_offered', 'rider_accepted', 'declined', 'cancelled', 'checked_in', 'completed', 'reported'));

-- Remove broad Data API grants. RLS decides which of the narrowly granted operations is allowed.
revoke all on table public.communities, public.students, public.community_memberships, public.route_offers,
  public.anchor_requests, public.matches, public.match_events, public.pickup_reveals, public.student_blocks,
  public.safety_reports from anon;
revoke all on table public.communities, public.students, public.community_memberships, public.route_offers,
  public.anchor_requests, public.matches, public.match_events, public.pickup_reveals, public.student_blocks,
  public.safety_reports from authenticated;

grant usage on schema public to authenticated;
grant select on table public.communities, public.students, public.community_memberships, public.route_offers,
  public.anchor_requests, public.matches, public.match_events, public.student_blocks, public.safety_reports to authenticated;
grant insert on table public.student_blocks to authenticated;

drop policy if exists "verified drivers create their own offer" on public.route_offers;
drop policy if exists "verified riders create their own request" on public.anchor_requests;
drop policy if exists "students manage their own blocks" on public.student_blocks;
create policy "students read their own blocks" on public.student_blocks
  for select to authenticated using (blocker_id = public.current_student_id());
create policy "students create their own blocks" on public.student_blocks
  for insert to authenticated with check (blocker_id = public.current_student_id());

-- SECURITY DEFINER commands use a pinned empty search path; every relation is schema qualified.
alter function public.current_student_id() set search_path = '';
alter function public.is_active_member(uuid) set search_path = '';
alter function public.offer_seat(uuid) set search_path = '';
alter function public.accept_match(uuid, bytea) set search_path = '';
alter function public.cancel_match(uuid) set search_path = '';
alter function public.check_in_match(uuid) set search_path = '';
alter function public.complete_match(uuid) set search_path = '';
alter function public.create_safety_report(uuid, text) set search_path = '';

revoke all on all functions in schema public from public;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;

create or replace function public.bootstrap_pilot_student(input_display_name text)
returns public.students
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  pilot_community uuid := 'a11c0a00-0000-4000-8000-000000000001';
  result public.students;
begin
  if actor is null
    or actor_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@calpoly[.]edu$'
    or not exists (select 1 from auth.users where id = actor and email_confirmed_at is not null) then
    raise exception 'PILOT_ACCESS_DENIED';
  end if;
  if input_display_name is null or char_length(btrim(input_display_name)) not between 1 and 40 then
    raise exception 'INVALID_DISPLAY_NAME';
  end if;
  if not exists (select 1 from public.communities where id = pilot_community and is_active) then
    raise exception 'PILOT_UNAVAILABLE';
  end if;

  insert into public.students (auth_user_id, school_email, display_name, verification_state)
    values (actor, actor_email, btrim(input_display_name), 'demo_verified')
    on conflict (auth_user_id) do update
      set display_name = excluded.display_name
    returning * into result;
  insert into public.community_memberships (community_id, student_id)
    values (pilot_community, result.id)
    on conflict do nothing;
  return result;
end;
$$;

create or replace function public.create_route_offer(
  input_origin_zone text,
  input_destination_zone text,
  input_departure_start timestamptz,
  input_departure_end timestamptz,
  input_seats_open smallint,
  input_max_detour_minutes smallint,
  input_preference_tags text[] default '{}'::text[]
)
returns public.route_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.current_student_id();
  target_community uuid;
  result public.route_offers;
begin
  select membership.community_id into target_community
    from public.community_memberships membership
    join public.communities community on community.id = membership.community_id and community.is_active
    where membership.student_id = actor
    order by membership.active_at asc
    limit 1;
  if actor is null or target_community is null then raise exception 'PILOT_ACCESS_DENIED'; end if;
  if input_origin_zone not in ('north-campus', 'campus-core', 'downtown', 'public-transit-hub', 'airport-terminal')
    or input_destination_zone not in ('north-campus', 'campus-core', 'downtown', 'public-transit-hub', 'airport-terminal')
    or input_origin_zone = input_destination_zone then raise exception 'INVALID_ROUTE_ZONE'; end if;
  if input_departure_start is null or input_departure_start <= now() or input_departure_end < input_departure_start then
    raise exception 'INVALID_DEPARTURE_WINDOW';
  end if;
  if input_seats_open not between 1 and 4 or input_max_detour_minutes not between 0 and 20 then
    raise exception 'INVALID_OFFER_LIMITS';
  end if;
  if input_preference_tags is null or not (input_preference_tags <@ array['quiet_ride', 'small_bag', 'accessible_pickup']::text[]) then
    raise exception 'INVALID_PREFERENCES';
  end if;
  insert into public.route_offers (
    driver_id, community_id, origin_zone, destination_zone, departure_start, departure_end,
    seats_open, max_detour_minutes, preference_tags, expires_at
  ) values (
    actor, target_community, input_origin_zone, input_destination_zone, input_departure_start, input_departure_end,
    input_seats_open, input_max_detour_minutes, input_preference_tags, input_departure_start
  ) returning * into result;
  return result;
end;
$$;

create or replace function public.create_anchor_request(
  input_pickup_zone text,
  input_destination_zone text,
  input_arrive_by timestamptz,
  input_flexibility_minutes smallint,
  input_preference_tags text[] default '{}'::text[]
)
returns public.anchor_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.current_student_id();
  target_community uuid;
  result public.anchor_requests;
begin
  select membership.community_id into target_community
    from public.community_memberships membership
    join public.communities community on community.id = membership.community_id and community.is_active
    where membership.student_id = actor
    order by membership.active_at asc
    limit 1;
  if actor is null or target_community is null then raise exception 'PILOT_ACCESS_DENIED'; end if;
  if input_pickup_zone not in ('north-campus', 'campus-core', 'downtown', 'public-transit-hub', 'airport-terminal')
    or input_destination_zone not in ('north-campus', 'campus-core', 'downtown', 'public-transit-hub', 'airport-terminal')
    or input_pickup_zone = input_destination_zone then raise exception 'INVALID_REQUEST_ZONE'; end if;
  if input_arrive_by is null or input_arrive_by <= now() or input_flexibility_minutes not between 0 and 30 then
    raise exception 'INVALID_REQUEST_TIMING';
  end if;
  if input_preference_tags is null or not (input_preference_tags <@ array['quiet_ride', 'small_bag', 'accessible_pickup']::text[]) then
    raise exception 'INVALID_PREFERENCES';
  end if;
  insert into public.anchor_requests (
    rider_id, community_id, pickup_zone, destination_zone, arrive_by, flexibility_minutes, preference_tags, expires_at
  ) values (
    actor, target_community, input_pickup_zone, input_destination_zone, input_arrive_by, input_flexibility_minutes,
    input_preference_tags, input_arrive_by
  ) returning * into result;
  return result;
end;
$$;

create or replace function public.offer_seat(target_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.matches;
  actor uuid := public.current_student_id();
begin
  select * into target from public.matches where id = target_match_id for update;
  if target.id is null then raise exception 'MATCH_NOT_FOUND'; end if;
  if not exists (
    select 1
    from public.route_offers offer
    join public.anchor_requests request on request.id = target.request_id
    where offer.id = target.offer_id
      and offer.driver_id = actor
      and offer.community_id = request.community_id
      and offer.driver_id <> request.rider_id
      and offer.status = 'active'
      and offer.seats_open > 0
      and offer.expires_at > now()
      and request.status in ('open', 'matched', 'rescue_pending')
      and request.expires_at > now()
      and public.is_active_member(offer.community_id)
  ) then raise exception 'UNAUTHORIZED_OR_NO_SEAT'; end if;
  if target.state <> 'candidate' or target.expires_at <= now() then raise exception 'MATCH_NOT_OFFERABLE'; end if;
  update public.matches set state = 'driver_offered' where id = target.id returning * into target;
  update public.anchor_requests set status = 'matched' where id = target.request_id and status in ('open', 'rescue_pending');
  insert into public.match_events (match_id, actor_id, event_type) values (target.id, actor, 'driver_offered');
  return target;
end;
$$;

create or replace function public.accept_match(target_match_id uuid, encrypted_pickup_detail bytea)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.matches;
  actor uuid := public.current_student_id();
  target_offer public.route_offers;
  target_request public.anchor_requests;
begin
  select * into target from public.matches where id = target_match_id for update;
  if target.id is null then raise exception 'MATCH_NOT_FOUND'; end if;
  select * into target_request from public.anchor_requests where id = target.request_id for update;
  if target_request.rider_id <> actor
    or target_request.status not in ('open', 'matched', 'rescue_pending')
    or target_request.expires_at <= now()
    or not public.is_active_member(target_request.community_id) then
    raise exception 'UNAUTHORIZED_OR_INACTIVE';
  end if;
  if target.state <> 'driver_offered' or target.expires_at <= now() then raise exception 'MATCH_NOT_ACCEPTABLE'; end if;
  if encrypted_pickup_detail is null or octet_length(encrypted_pickup_detail) not between 29 and 2048 then
    raise exception 'INVALID_PICKUP_DETAIL';
  end if;
  select * into target_offer from public.route_offers where id = target.offer_id for update;
  if target_offer.community_id <> target_request.community_id
    or target_offer.driver_id = target_request.rider_id
    or target_offer.status <> 'active'
    or target_offer.seats_open <= 0
    or target_offer.expires_at <= now()
    or not exists (
      select 1
      from public.students driver
      join public.community_memberships membership on membership.student_id = driver.id and membership.community_id = target_offer.community_id
      join public.communities community on community.id = membership.community_id and community.is_active
      where driver.id = target_offer.driver_id and driver.verification_state = 'demo_verified'
    ) then raise exception 'DRIVER_UNAVAILABLE'; end if;
  update public.route_offers
    set seats_open = seats_open - 1,
        status = case when seats_open - 1 = 0 then 'full'::public.offer_status else status end
    where id = target_offer.id;
  update public.matches set state = 'confirmed' where id = target.id returning * into target;
  update public.anchor_requests set status = 'confirmed' where id = target_request.id;
  insert into public.match_events (match_id, actor_id, event_type) values (target.id, actor, 'rider_accepted');
  insert into public.pickup_reveals (match_id, encrypted_detail, visible_after, expires_at)
    values (target.id, encrypted_pickup_detail, now(), target.expires_at);
  return target;
end;
$$;

create or replace function public.decline_match(target_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.matches;
  actor uuid := public.current_student_id();
begin
  select * into target from public.matches where id = target_match_id for update;
  if target.id is null then raise exception 'MATCH_NOT_FOUND'; end if;
  if not exists (
    select 1 from public.route_offers offer join public.anchor_requests request on request.id = target.request_id
    where offer.id = target.offer_id and (offer.driver_id = actor or request.rider_id = actor)
  ) then raise exception 'UNAUTHORIZED'; end if;
  if target.state not in ('candidate', 'driver_offered') then raise exception 'MATCH_NOT_DECLINABLE'; end if;
  update public.matches set state = 'declined' where id = target.id returning * into target;
  insert into public.match_events (match_id, actor_id, event_type) values (target.id, actor, 'declined');
  return target;
end;
$$;

create or replace function public.is_match_participant(target_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matches match
    join public.route_offers offer on offer.id = match.offer_id
    join public.anchor_requests request on request.id = match.request_id
    where match.id = target_match_id
      and (offer.driver_id = public.current_student_id() or request.rider_id = public.current_student_id())
  )
$$;

drop policy if exists "participants view their match" on public.matches;
create policy "participants view their match" on public.matches
  for select to authenticated using (public.is_match_participant(id));
drop policy if exists "participants view match events" on public.match_events;
create policy "participants view match events" on public.match_events
  for select to authenticated using (public.is_match_participant(match_id));

create or replace function public.check_in_match(target_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.matches;
  actor uuid := public.current_student_id();
begin
  select * into target from public.matches where id = target_match_id for update;
  if target.id is null then raise exception 'MATCH_NOT_FOUND'; end if;
  if not exists (
    select 1 from public.route_offers offer join public.anchor_requests request on request.id = target.request_id
    where offer.id = target.offer_id and (offer.driver_id = actor or request.rider_id = actor)
  ) then raise exception 'UNAUTHORIZED'; end if;
  if target.state = 'in_progress' then return target; end if;
  if target.state <> 'confirmed' then raise exception 'MATCH_NOT_CHECKIN_READY'; end if;
  update public.matches set state = 'in_progress' where id = target.id returning * into target;
  insert into public.match_events (match_id, actor_id, event_type) values (target.id, actor, 'checked_in');
  return target;
end;
$$;

-- Realtime broadcasts contain only match/event rows. Pickup ciphertext is never broadcast.
create or replace function public.broadcast_match_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'anchor:match:' || new.id::text, TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, new, old
  );
  return null;
end;
$$;

create or replace function public.broadcast_match_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'anchor:match:' || new.match_id::text, TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, new, old
  );
  return null;
end;
$$;

create trigger anchor_broadcast_match_change
  after update on public.matches
  for each row execute function public.broadcast_match_change();
create trigger anchor_broadcast_match_event
  after insert on public.match_events
  for each row execute function public.broadcast_match_event();

drop policy if exists "Anchor participants receive private match updates" on realtime.messages;
create policy "Anchor participants receive private match updates"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() ~ '^anchor:match:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and exists (
      select 1
      from public.matches match
      where match.id = right(realtime.topic(), 36)::uuid
        and public.is_match_participant(match.id)
    )
  );

revoke all on function public.bootstrap_pilot_student(text) from public, anon;
revoke all on function public.create_route_offer(text, text, timestamptz, timestamptz, smallint, smallint, text[]) from public, anon;
revoke all on function public.create_anchor_request(text, text, timestamptz, smallint, text[]) from public, anon;
revoke all on function public.decline_match(uuid) from public, anon;
revoke all on function public.is_match_participant(uuid) from public, anon;
revoke all on function public.broadcast_match_change() from public, anon;
revoke all on function public.broadcast_match_event() from public, anon;

grant execute on function public.current_student_id() to authenticated;
grant execute on function public.is_active_member(uuid) to authenticated;
grant execute on function public.bootstrap_pilot_student(text) to authenticated;
grant execute on function public.create_route_offer(text, text, timestamptz, timestamptz, smallint, smallint, text[]) to authenticated;
grant execute on function public.create_anchor_request(text, text, timestamptz, smallint, text[]) to authenticated;
grant execute on function public.offer_seat(uuid) to authenticated;
grant execute on function public.accept_match(uuid, bytea) to authenticated;
grant execute on function public.decline_match(uuid) to authenticated;
grant execute on function public.is_match_participant(uuid) to authenticated;
grant execute on function public.cancel_match(uuid) to authenticated;
grant execute on function public.check_in_match(uuid) to authenticated;
grant execute on function public.complete_match(uuid) to authenticated;
grant execute on function public.create_safety_report(uuid, text) to authenticated;
