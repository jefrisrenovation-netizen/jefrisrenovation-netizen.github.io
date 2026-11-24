alter table public.team_accounts add column gps_attendance boolean not null default false;

create table public.gps_attendance (
  id uuid primary key,
  account_id uuid not null references public.team_accounts(id) on delete cascade,
  kind text not null check (kind in ('entry', 'exit')),
  recorded_at timestamptz not null,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  accuracy double precision check (accuracy >= 0),
  address text,
  site_name text,
  needs_review boolean not null,
  check ((latitude is null) = (longitude is null) and (latitude is null) = (accuracy is null))
);
create index gps_attendance_account_time on public.gps_attendance(account_id, recorded_at desc);
alter table public.gps_attendance enable row level security;
revoke all on public.gps_attendance from anon, authenticated;
grant select, insert on public.gps_attendance to service_role;

create function public.record_gps_attendance(
  p_user uuid, p_id uuid, p_kind text, p_time timestamptz,
  p_lat double precision, p_lon double precision, p_accuracy double precision,
  p_address text, p_site_name text, p_verified boolean
) returns public.gps_attendance
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  account uuid;
  saved public.gps_attendance;
  last_kind text;
  last_time timestamptz;
begin
  select a.id into account
  from public.team_accounts a join public.employees e on e.id = a.employee_id and e.owner_id = a.owner_id
  where a.user_id = p_user and a.enabled and a.activated_at is not null and a.gps_attendance and e.active
  for update of a;
  if account is null then return null; end if;

  select * into saved from public.gps_attendance where id = p_id and account_id = account;
  if found then return saved; end if;

  select kind, recorded_at into last_kind, last_time from public.gps_attendance
  where account_id = account order by recorded_at desc limit 1;
  if p_time <= last_time or p_kind is distinct from (case when last_kind = 'entry' then 'exit' else 'entry' end) then
    return null;
  end if;

  insert into public.gps_attendance (id, account_id, kind, recorded_at, latitude, longitude, accuracy, address, site_name, needs_review)
  values (p_id, account, p_kind, p_time, p_lat, p_lon, p_accuracy, p_address, p_site_name, not p_verified)
  returning * into saved;
  return saved;
end;
$$;
revoke all on function public.record_gps_attendance(uuid,uuid,text,timestamptz,double precision,double precision,double precision,text,text,boolean) from public, anon, authenticated;
grant execute on function public.record_gps_attendance(uuid,uuid,text,timestamptz,double precision,double precision,double precision,text,text,boolean) to service_role;
