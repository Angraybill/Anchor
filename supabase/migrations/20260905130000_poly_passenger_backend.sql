-- PolyPassengers backend glue for verified Cal Poly users and driver-posted rides.

insert into public.communities (name, school_domain)
select 'Cal Poly', 'calpoly.edu'
where not exists (select 1 from public.communities where school_domain = 'calpoly.edu');

drop policy if exists "students read their own profile" on public.students;
create policy "students read their own profile" on public.students
  for select using (auth_user_id = auth.uid());

create or replace function public.provision_calpoly_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(new.email));
  cal_poly_community uuid;
  student uuid;
begin
  if normalized_email is null or normalized_email !~ '@calpoly\.edu$' then
    raise exception 'CAL_POLY_EMAIL_REQUIRED';
  end if;

  select id into cal_poly_community from public.communities where school_domain = 'calpoly.edu' and is_active;
  if cal_poly_community is null then raise exception 'CAL_POLY_COMMUNITY_NOT_FOUND'; end if;

  insert into public.students (auth_user_id, school_email, display_name)
  values (
    new.id,
    normalized_email,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(normalized_email, '@', 1)), 40)
  )
  returning id into student;

  insert into public.community_memberships (community_id, student_id)
  values (cal_poly_community, student);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_provision_student on auth.users;
create trigger on_auth_user_created_provision_student
  after insert on auth.users
  for each row execute function public.provision_calpoly_student();

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
  if confirmed_at is null then
    raise exception 'EMAIL_NOT_VERIFIED';
  end if;

  update public.students
    set verification_state = 'demo_verified'
    where auth_user_id = auth.uid()
      and school_email ~* '@calpoly\.edu$'
    returning * into profile;

  if profile.id is null then raise exception 'CAL_POLY_PROFILE_NOT_FOUND'; end if;
  return profile;
end;
$$;

-- A rider joins a driver-posted offer. The seat remains reserved by the existing
-- accept_match command so the final-seat update stays atomic and server-side.
create or replace function public.join_open_ride(target_offer_id uuid, requested_pickup_location text)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := public.current_student_id();
  target_offer public.route_offers;
  created_request public.anchor_requests;
  created_match public.matches;
begin
  if actor is null then raise exception 'UNAUTHORIZED'; end if;
  if char_length(trim(requested_pickup_location)) not between 1 and 120 then
    raise exception 'INVALID_PICKUP_LOCATION';
  end if;

  select * into target_offer
    from public.route_offers
    where id = target_offer_id
      and status = 'active'
      and seats_open > 0
      and public.is_active_member(community_id)
    for update;

  if target_offer.id is null then raise exception 'RIDE_NOT_AVAILABLE'; end if;
  if target_offer.driver_id = actor then raise exception 'CANNOT_JOIN_OWN_RIDE'; end if;

  insert into public.anchor_requests (
    rider_id, community_id, pickup_zone, pickup_location, destination_zone,
    destination_location, arrive_by, flexibility_minutes, status, expires_at
  ) values (
    actor, target_offer.community_id, target_offer.origin_zone, trim(requested_pickup_location),
    target_offer.destination_zone, target_offer.destination_location, target_offer.departure_end,
    15, 'open', target_offer.expires_at
  ) returning * into created_request;

  insert into public.matches (
    offer_id, request_id, state, arrival_slack_minutes, detour_minutes,
    explanation, expires_at
  ) values (
    target_offer.id, created_request.id, 'driver_offered', 15, target_offer.max_detour_minutes,
    jsonb_build_array(jsonb_build_object('kind', 'detour', 'text', 'Fits the driver’s posted route.')),
    target_offer.expires_at
  ) returning * into created_match;

  return created_match;
end;
$$;

grant execute on function public.activate_my_student() to authenticated;
grant execute on function public.join_open_ride(uuid, text) to authenticated;
