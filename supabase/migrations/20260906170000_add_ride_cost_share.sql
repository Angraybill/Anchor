-- A voluntary, display-only cost share per passenger. PolyPassenger does not
-- collect, hold, or process payment.
alter table public.rides
  add column if not exists cost_cents integer not null default 0
  check (cost_cents between 0 and 10000);

comment on column public.rides.cost_cents is
  'Optional voluntary cost share per passenger in cents; no in-app payment processing.';
