-- A public request can be answered by one driver offer. This records the
-- relationship without exposing contact details or precise pickup information.
alter table public.ride_requests
  add column if not exists driver_offer_id uuid references public.rides(id) on delete set null;

alter table public.ride_requests
  drop constraint if exists ride_requests_status_check;

alter table public.ride_requests
  add constraint ride_requests_status_check
  check (status in ('open', 'driver_offered', 'fulfilled', 'cancelled'));

create unique index if not exists ride_requests_driver_offer_idx
  on public.ride_requests (driver_offer_id)
  where driver_offer_id is not null;

-- Only the driver who created an active ride can attach it to an open request.
create or replace function public.offer_ride_for_request(
  target_request_id uuid,
  target_ride_id uuid
)
returns public.ride_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  request_row public.ride_requests;
  ride_row public.rides;
begin
  if actor is null then raise exception 'UNAUTHORIZED'; end if;
  select * into request_row from public.ride_requests where id = target_request_id for update;
  if request_row.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if request_row.rider_id = actor then raise exception 'CANNOT_OFFER_TO_OWN_REQUEST'; end if;
  if request_row.status <> 'open' then raise exception 'REQUEST_NOT_OPEN'; end if;
  select * into ride_row from public.rides where id = target_ride_id for update;
  if ride_row.id is null or ride_row.driver_id <> actor then raise exception 'UNAUTHORIZED_RIDE'; end if;
  if ride_row.status <> 'active' or ride_row.seats_open < 1 then raise exception 'RIDE_NOT_AVAILABLE'; end if;
  update public.ride_requests
  set driver_offer_id = target_ride_id, status = 'driver_offered'
  where id = target_request_id
  returning * into request_row;
  return request_row;
end;
$$;

grant execute on function public.offer_ride_for_request(uuid, uuid) to authenticated;
