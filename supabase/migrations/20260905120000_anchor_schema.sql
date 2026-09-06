-- PolyPassengers MVP schema. All UUIDs are opaque public identifiers.
create extension if not exists pgcrypto;

create type public.verification_state as enum ('demo_verified', 'pending', 'suspended');
create type public.offer_status as enum ('active', 'paused', 'full', 'expired', 'cancelled');
create type public.request_status as enum ('draft', 'open', 'matched', 'confirmed', 'rescue_pending', 'completed', 'cancelled', 'no_match');
create type public.match_state as enum ('candidate', 'driver_offered', 'confirmed', 'declined', 'expired', 'cancelled', 'in_progress', 'completed');

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  school_domain text not null check (school_domain = lower(trim(school_domain))),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  school_email text not null unique check (school_email = lower(trim(school_email))),
  display_name text not null check (char_length(display_name) between 1 and 40),
  verification_state public.verification_state not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.community_memberships (
  community_id uuid not null references public.communities(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator')),
  active_at timestamptz not null default now(),
  primary key (community_id, student_id)
);

create table public.route_offers (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.students(id),
  community_id uuid not null references public.communities(id),
  origin_zone text not null check (origin_zone in ('north-campus', 'campus-core', 'downtown', 'public-transit-hub', 'airport-terminal')),
  origin_location text not null check (char_length(trim(origin_location)) between 1 and 120),
  destination_zone text not null check (destination_zone in ('north-campus', 'campus-core', 'downtown', 'public-transit-hub', 'airport-terminal')),
  destination_location text not null check (char_length(trim(destination_location)) between 1 and 120),
  departure_start timestamptz not null,
  departure_end timestamptz not null check (departure_end >= departure_start),
  seats_open smallint not null check (seats_open between 0 and 4),
  max_detour_minutes smallint not null check (max_detour_minutes between 0 and 20),
  preference_tags text[] not null default '{}'::text[],
  status public.offer_status not null default 'active',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (origin_zone <> destination_zone),
  check (expires_at > created_at)
);

create table public.anchor_requests (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.students(id),
  community_id uuid not null references public.communities(id),
  pickup_zone text not null check (pickup_zone in ('north-campus', 'campus-core', 'downtown', 'public-transit-hub', 'airport-terminal')),
  pickup_location text not null check (char_length(trim(pickup_location)) between 1 and 120),
  destination_zone text not null check (destination_zone in ('north-campus', 'campus-core', 'downtown', 'public-transit-hub', 'airport-terminal')),
  destination_location text not null check (char_length(trim(destination_location)) between 1 and 120),
  arrive_by timestamptz not null,
  flexibility_minutes smallint not null check (flexibility_minutes between 0 and 30),
  preference_tags text[] not null default '{}'::text[],
  status public.request_status not null default 'open',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (pickup_zone <> destination_zone),
  check (expires_at > created_at)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.route_offers(id),
  request_id uuid not null references public.anchor_requests(id),
  state public.match_state not null default 'candidate',
  arrival_slack_minutes smallint not null check (arrival_slack_minutes >= 0),
  detour_minutes smallint not null check (detour_minutes >= 0),
  explanation jsonb not null default '[]'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (offer_id, request_id)
);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  actor_id uuid not null references public.students(id),
  event_type text not null check (event_type in ('driver_offered', 'rider_accepted', 'cancelled', 'checked_in', 'completed', 'reported')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- `encrypted_detail` is written by a server-only command. There are intentionally no client policies on this table.
create table public.pickup_reveals (
  match_id uuid primary key references public.matches(id) on delete cascade,
  encrypted_detail bytea not null,
  visible_after timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.student_blocks (
  blocker_id uuid not null references public.students(id) on delete cascade,
  blocked_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.students(id),
  subject_id uuid not null references public.students(id),
  match_id uuid not null references public.matches(id),
  category text not null check (category in ('unsafe_behavior', 'harassment', 'identity_concern', 'other')),
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  check (reporter_id <> subject_id)
);

create index route_offers_community_active_idx on public.route_offers (community_id, status, departure_start);
create index anchor_requests_community_open_idx on public.anchor_requests (community_id, status, arrive_by);
create index matches_request_idx on public.matches (request_id, state);
create index match_events_match_idx on public.match_events (match_id, created_at);
create index pickup_reveals_expiry_idx on public.pickup_reveals (expires_at);

create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.students
  where auth_user_id = auth.uid()
    and verification_state = 'demo_verified'
$$;

create or replace function public.is_active_member(target_community uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_memberships membership
    where membership.community_id = target_community
      and membership.student_id = public.current_student_id()
  )
$$;

alter table public.communities enable row level security;
alter table public.students enable row level security;
alter table public.community_memberships enable row level security;
alter table public.route_offers enable row level security;
alter table public.anchor_requests enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.pickup_reveals enable row level security;
alter table public.student_blocks enable row level security;
alter table public.safety_reports enable row level security;

create policy "students read their own profile" on public.students
  for select using (id = public.current_student_id());

create policy "members read their communities" on public.communities
  for select using (public.is_active_member(id));
create policy "students read their own membership" on public.community_memberships
  for select using (student_id = public.current_student_id());

create policy "members view coarse active offers" on public.route_offers
  for select using (public.is_active_member(community_id));
create policy "verified drivers create their own offer" on public.route_offers
  for insert with check (driver_id = public.current_student_id() and public.is_active_member(community_id));
create policy "drivers manage their own offers" on public.route_offers
  for update using (driver_id = public.current_student_id()) with check (driver_id = public.current_student_id());

create policy "riders view their own requests" on public.anchor_requests
  for select using (rider_id = public.current_student_id());
create policy "verified riders create their own request" on public.anchor_requests
  for insert with check (rider_id = public.current_student_id() and public.is_active_member(community_id));
create policy "riders manage their own open request" on public.anchor_requests
  for update using (rider_id = public.current_student_id() and status in ('draft', 'open', 'matched', 'rescue_pending'))
  with check (rider_id = public.current_student_id());

create policy "participants view their match" on public.matches
  for select using (
    exists (select 1 from public.route_offers offer where offer.id = offer_id and offer.driver_id = public.current_student_id())
    or exists (select 1 from public.anchor_requests request where request.id = request_id and request.rider_id = public.current_student_id())
  );
create policy "participants view match events" on public.match_events
  for select using (
    exists (
      select 1 from public.matches match
      join public.route_offers offer on offer.id = match.offer_id
      join public.anchor_requests request on request.id = match.request_id
      where match.id = match_id
        and (offer.driver_id = public.current_student_id() or request.rider_id = public.current_student_id())
    )
  );

create policy "students manage their own blocks" on public.student_blocks
  for all using (blocker_id = public.current_student_id()) with check (blocker_id = public.current_student_id());
create policy "reporter creates and reads own report" on public.safety_reports
  for select using (reporter_id = public.current_student_id());

-- Match transitions are server commands. Clients do not have insert/update policies on matches, events, or pickup reveals.
create or replace function public.offer_seat(target_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.matches;
  actor uuid := public.current_student_id();
begin
  select * into target from public.matches where id = target_match_id for update;
  if target.id is null then raise exception 'MATCH_NOT_FOUND'; end if;
  if not exists (select 1 from public.route_offers where id = target.offer_id and driver_id = actor and status = 'active' and seats_open > 0) then
    raise exception 'UNAUTHORIZED_OR_NO_SEAT';
  end if;
  if target.state <> 'candidate' or target.expires_at <= now() then raise exception 'MATCH_NOT_OFFERABLE'; end if;
  update public.matches set state = 'driver_offered' where id = target.id returning * into target;
  insert into public.match_events (match_id, actor_id, event_type) values (target.id, actor, 'driver_offered');
  return target;
end;
$$;

create or replace function public.accept_match(target_match_id uuid, encrypted_pickup_detail bytea)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.matches;
  actor uuid := public.current_student_id();
  target_offer public.route_offers;
begin
  select * into target from public.matches where id = target_match_id for update;
  if target.id is null then raise exception 'MATCH_NOT_FOUND'; end if;
  if not exists (select 1 from public.anchor_requests where id = target.request_id and rider_id = actor) then raise exception 'UNAUTHORIZED'; end if;
  if target.state <> 'driver_offered' or target.expires_at <= now() then raise exception 'MATCH_NOT_ACCEPTABLE'; end if;
  select * into target_offer from public.route_offers where id = target.offer_id for update;
  if target_offer.status <> 'active' or target_offer.seats_open <= 0 then raise exception 'NO_SEAT'; end if;
  update public.route_offers
    set seats_open = seats_open - 1,
        status = case when seats_open - 1 = 0 then 'full'::public.offer_status else status end
    where id = target_offer.id;
  update public.matches set state = 'confirmed' where id = target.id returning * into target;
  update public.anchor_requests set status = 'confirmed' where id = target.request_id;
  insert into public.match_events (match_id, actor_id, event_type) values (target.id, actor, 'rider_accepted');
  insert into public.pickup_reveals (match_id, encrypted_detail, visible_after, expires_at)
    values (target.id, encrypted_pickup_detail, now(), target.expires_at);
  return target;
end;
$$;

create or replace function public.cancel_match(target_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.matches;
  actor uuid := public.current_student_id();
  match_driver uuid;
begin
  select * into target from public.matches where id = target_match_id for update;
  if target.id is null then raise exception 'MATCH_NOT_FOUND'; end if;
  if not exists (
    select 1 from public.route_offers offer join public.anchor_requests request on request.id = target.request_id
    where offer.id = target.offer_id and (offer.driver_id = actor or request.rider_id = actor)
  ) then raise exception 'UNAUTHORIZED'; end if;
  if target.state not in ('confirmed', 'in_progress') then raise exception 'MATCH_NOT_CANCELLABLE'; end if;
  select driver_id into match_driver from public.route_offers where id = target.offer_id;
  update public.matches set state = 'cancelled' where id = target.id returning * into target;
  if actor = match_driver then
    update public.route_offers set status = 'cancelled' where id = target.offer_id;
    update public.anchor_requests
      set status = case when arrive_by > now() then 'rescue_pending'::public.request_status else 'no_match'::public.request_status end
      where id = target.request_id;
  else
    update public.route_offers
      set seats_open = seats_open + 1,
          status = case when status = 'full' then 'active'::public.offer_status else status end
      where id = target.offer_id and status not in ('cancelled', 'expired');
    update public.anchor_requests set status = 'cancelled' where id = target.request_id;
  end if;
  insert into public.match_events (match_id, actor_id, event_type) values (target.id, actor, 'cancelled');
  return target;
end;
$$;

create or replace function public.check_in_match(target_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
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
  if target.state not in ('confirmed', 'in_progress') then raise exception 'MATCH_NOT_CHECKIN_READY'; end if;
  update public.matches set state = 'in_progress' where id = target.id returning * into target;
  insert into public.match_events (match_id, actor_id, event_type) values (target.id, actor, 'checked_in');
  return target;
end;
$$;

create or replace function public.complete_match(target_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
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
  if target.state <> 'in_progress' then raise exception 'MATCH_NOT_COMPLETABLE'; end if;
  update public.matches set state = 'completed' where id = target.id returning * into target;
  update public.anchor_requests set status = 'completed' where id = target.request_id;
  insert into public.match_events (match_id, actor_id, event_type) values (target.id, actor, 'completed');
  return target;
end;
$$;

create or replace function public.create_safety_report(target_match_id uuid, report_category text)
returns public.safety_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.matches;
  actor uuid := public.current_student_id();
  subject uuid;
  report public.safety_reports;
begin
  if report_category not in ('unsafe_behavior', 'harassment', 'identity_concern', 'other') then raise exception 'INVALID_REPORT_CATEGORY'; end if;
  select * into target from public.matches where id = target_match_id;
  if target.id is null then raise exception 'MATCH_NOT_FOUND'; end if;
  select case when offer.driver_id = actor then request.rider_id else offer.driver_id end into subject
    from public.route_offers offer join public.anchor_requests request on request.id = target.request_id
    where offer.id = target.offer_id and (offer.driver_id = actor or request.rider_id = actor);
  if subject is null then raise exception 'UNAUTHORIZED'; end if;
  insert into public.safety_reports (reporter_id, subject_id, match_id, category)
    values (actor, subject, target.id, report_category)
    returning * into report;
  insert into public.student_blocks (blocker_id, blocked_id) values (actor, subject) on conflict do nothing;
  insert into public.match_events (match_id, actor_id, event_type) values (target.id, actor, 'reported');
  return report;
end;
$$;

revoke all on function public.current_student_id() from public;
revoke all on function public.is_active_member(uuid) from public;
grant execute on function public.current_student_id() to authenticated;
grant execute on function public.is_active_member(uuid) to authenticated;
grant execute on function public.offer_seat(uuid) to authenticated;
grant execute on function public.accept_match(uuid, bytea) to authenticated;
grant execute on function public.cancel_match(uuid) to authenticated;
grant execute on function public.check_in_match(uuid) to authenticated;
grant execute on function public.complete_match(uuid) to authenticated;
grant execute on function public.create_safety_report(uuid, text) to authenticated;
