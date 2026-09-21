-- Run this in Supabase SQL Editor. Replaces the single-schedule-per-shop
-- columns with a proper table, so each shop can have any number of
-- auto-sync times, each in its own timezone.

create table if not exists sync_schedules (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  timezone text not null,       -- IANA name, e.g. "Asia/Kolkata", "America/New_York"
  hour smallint not null,       -- 0-23, local hour in that timezone
  minute smallint not null,     -- 0-59
  enabled boolean not null default true,
  last_synced_date date,        -- local calendar date (in that timezone) it last fired
  created_at timestamptz not null default now()
);

create index if not exists sync_schedules_shop_lookup on sync_schedules (shop_id);
alter table sync_schedules enable row level security;

-- The old single-schedule columns on shops are no longer used.
alter table shops drop column if exists sync_enabled;
alter table shops drop column if exists sync_hour_utc;
alter table shops drop column if exists sync_minute_utc;
alter table shops drop column if exists last_auto_synced_date;
