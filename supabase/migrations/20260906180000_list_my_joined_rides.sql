-- Fetch a rider's own completed join records without relying on a nested
-- PostgREST relationship being visible through RLS after a reload.
create or replace function public.list_my_joined_rides()
returns table (
  id uuid,
  driver_id uuid,
  driver_name text,
  origin_location text,
  destination_location text,
  departure_start timestamptz,
  departure_end timestamptz,
  seats_open integer,
  max_detour_minutes integer,
  status text,
  created_at timestamptz,
  cost_cents integer,
  pickup_location text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ride.id,
    ride.driver_id,
    ride.driver_name,
    ride.origin_location,
    ride.destination_location,
    ride.departure_start,
    ride.departure_end,
    ride.seats_open,
    ride.max_detour_minutes,
    ride.status,
    ride.created_at,
    ride.cost_cents,
    passenger.pickup_location,
    passenger.joined_at
  from public.ride_passengers passenger
  join public.rides ride on ride.id = passenger.ride_id
  where passenger.rider_id = auth.uid()
  order by passenger.joined_at desc;
$$;

grant execute on function public.list_my_joined_rides() to authenticated;
