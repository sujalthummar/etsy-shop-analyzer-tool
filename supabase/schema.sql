-- Run this once in the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  etsy_shop_id bigint not null unique,
  shop_name text not null,
  created_at timestamptz not null default now()
);

-- One row per listing per sync run. This is the history table --
-- diffs are computed by comparing the two most recent rows for a listing_id.
-- run_id groups every listing snapshotted in the same sync call together,
-- which is how we detect a listing that disappeared from the shop entirely
-- (present in the previous run, missing from the latest one).
create table if not exists listing_snapshots (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  listing_id bigint not null,
  run_id uuid not null,
  title text,
  description text,
  price numeric,
  currency_code text,
  quantity int,
  tags text[],
  taken_at timestamptz not null default now()
);

create index if not exists listing_snapshots_lookup
  on listing_snapshots (shop_id, listing_id, taken_at desc);

create index if not exists listing_snapshots_run_lookup
  on listing_snapshots (shop_id, run_id);

-- One row per detected field change. This is what the dashboard reads.
create table if not exists listing_changes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  listing_id bigint not null,
  listing_title text,
  listing_url text,
  field text not null,
  old_value text,
  new_value text,
  detected_at timestamptz not null default now()
);

create index if not exists listing_changes_lookup
  on listing_changes (shop_id, detected_at desc);

-- Row Level Security: locked down by default. The app talks to Supabase
-- using the service_role key from server-side API routes only, which
-- bypasses RLS, so these tables are never exposed directly to the browser.
alter table shops enable row level security;
alter table listing_snapshots enable row level security;
alter table listing_changes enable row level security;
