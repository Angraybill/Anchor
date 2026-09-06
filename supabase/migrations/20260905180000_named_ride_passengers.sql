-- Store the rider's display name so drivers can see who joined their ride.
-- Authentication can replace the display name with a user id later.

alter table public.ride_passengers
  add column if not exists passenger_name text not null default 'Cal Poly student';

drop function if exists public.join_ride(uuid, text);

create function public.join_ride(
  target_ride_id uuid,
  pickup_location text,
  passenger_name text
)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.rides;
begin
  if char_length(trim(pickup_location)) not between 1 and 120 then
    raise exception 'INVALID_PICKUP_LOCATION';
  end if;

  if char_length(trim(passenger_name)) not between 1 and 80 then
    raise exception 'INVALID_PASSENGER_NAME';
  end if;

  select * into target from public.rides
  where id = target_ride_id and status = 'active' and seats_open > 0
  for update;

  if target.id is null then
    raise exception 'RIDE_NOT_AVAILABLE';
  end if;

  insert into public.ride_passengers (ride_id, passenger_name, pickup_location)
  values (target.id, trim(passenger_name), trim(pickup_location));

  update public.rides
  set seats_open = seats_open - 1,
      status = case when seats_open - 1 = 0 then 'full' else status end
  where id = target.id
  returning * into target;

  return target;
end;
$$;

create or replace function public.list_ride_passengers(
  target_ride_id uuid,
  driver_name text
)
returns setof public.ride_passengers
language sql
security definer
set search_path = public
as $$
  select passenger.*
  from public.ride_passengers as passenger
  join public.rides as ride on ride.id = passenger.ride_id
  where ride.id = target_ride_id
    and ride.driver_name = trim(driver_name)
  order by passenger.joined_at;
$$;

grant execute on function public.join_ride(uuid, text, text) to anon, authenticated;
grant execute on function public.list_ride_passengers(uuid, text) to anon, authenticated;

create or replace function public.list_driver_rides(driver_name text)
returns setof public.rides
language sql
security definer
set search_path = public
as $$
  select ride.*
  from public.rides as ride
  where ride.driver_name = trim(driver_name)
    and ride.status in ('active', 'full')
  order by ride.departure_start;
$$;

grant execute on function public.list_driver_rides(text) to anon, authenticated;
