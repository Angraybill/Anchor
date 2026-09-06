-- Connect live rides to the authenticated Supabase user so each person's
-- Home tab can show the rides they offered or joined.

alter table public.rides
  add column if not exists driver_id uuid references auth.users(id) on delete set null;

alter table public.ride_passengers
  add column if not exists rider_id uuid references auth.users(id) on delete cascade;

create index if not exists rides_driver_idx
  on public.rides (driver_id, departure_start);

create index if not exists ride_passengers_rider_idx
  on public.ride_passengers (rider_id, joined_at);

create unique index if not exists ride_passengers_ride_rider_idx
  on public.ride_passengers (ride_id, rider_id)
  where rider_id is not null;

alter table public.rides enable row level security;
alter table public.ride_passengers enable row level security;

drop policy if exists "public can view open rides" on public.rides;
create policy "students can view open or participating rides" on public.rides
  for select to anon, authenticated
  using (
    (status = 'active' and seats_open > 0)
    or (
      auth.uid() is not null
      and (
        driver_id = auth.uid()
        or exists (
          select 1
          from public.ride_passengers passenger
          where passenger.ride_id = rides.id
            and passenger.rider_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "public can post rides" on public.rides;
create policy "students can post rides" on public.rides
  for insert to anon, authenticated
  with check (
    status = 'active'
    and (driver_id is null or driver_id = auth.uid())
  );

drop policy if exists "students can view ride passengers" on public.ride_passengers;
create policy "students can view ride passengers" on public.ride_passengers
  for select to authenticated
  using (
    rider_id = auth.uid()
    or exists (
      select 1
      from public.rides ride
      where ride.id = ride_passengers.ride_id
        and ride.driver_id = auth.uid()
    )
  );

grant select on public.ride_passengers to authenticated;

drop function if exists public.join_ride(uuid, text);

create function public.join_ride(target_ride_id uuid, pickup_location text)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  target public.rides;
begin
  if actor is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if char_length(trim(pickup_location)) not between 1 and 120 then
    raise exception 'INVALID_PICKUP_LOCATION';
  end if;

  select * into target
  from public.rides
  where id = target_ride_id
    and status = 'active'
    and seats_open > 0
  for update;

  if target.id is null then
    raise exception 'RIDE_NOT_AVAILABLE';
  end if;

  if target.driver_id = actor then
    raise exception 'CANNOT_JOIN_OWN_RIDE';
  end if;

  if exists (
    select 1
    from public.ride_passengers
    where ride_id = target.id
      and rider_id = actor
  ) then
    raise exception 'RIDE_ALREADY_JOINED';
  end if;

  insert into public.ride_passengers (ride_id, rider_id, pickup_location)
  values (target.id, actor, trim(pickup_location));

  update public.rides
  set seats_open = seats_open - 1,
      status = case when seats_open - 1 = 0 then 'full' else status end
  where id = target.id
  returning * into target;

  return target;
end;
$$;

grant execute on function public.join_ride(uuid, text) to authenticated;
