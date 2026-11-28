-- Queue notifications only for teams with a registered test device.
-- Apply together with the device-registration and APNs delivery services.
create table public.attendance_push_devices (
  token text primary key check (token ~ '^[0-9a-f]{64,}$'),
  owner_id uuid not null references auth.users(id) on delete cascade
);
create index attendance_push_devices_owner_idx on public.attendance_push_devices(owner_id);

create table public.attendance_push_events (
  kind text not null check (kind in ('manual', 'entry', 'exit')),
  record_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  occurred_at timestamptz not null,
  work_date date,
  site_name text,
  queued_at timestamptz not null default now(),
  primary key (kind, record_id)
);

alter table public.attendance_push_devices enable row level security;
alter table public.attendance_push_events enable row level security;
revoke all on public.attendance_push_devices, public.attendance_push_events from public, anon, authenticated;
grant select, insert, update, delete on public.attendance_push_devices, public.attendance_push_events to service_role;

create function public.queue_attendance_push_event() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_table_name = 'work_days' then
    insert into public.attendance_push_events(kind, record_id, owner_id, employee_id, occurred_at, work_date)
    select 'manual', new.id, new.owner_id, new.employee_id, new.created_at, new.work_date
    from public.team_accounts a
    where a.owner_id = new.owner_id and a.employee_id = new.employee_id
      and a.user_id = new.submitted_by and a.enabled and not a.gps_attendance
      and exists (select 1 from public.attendance_push_devices d where d.owner_id = a.owner_id)
    on conflict do nothing;
  else
    insert into public.attendance_push_events(kind, record_id, owner_id, employee_id, occurred_at, site_name)
    select new.kind, new.id, a.owner_id, a.employee_id, new.recorded_at, new.site_name
    from public.team_accounts a
    where a.id = new.account_id and a.enabled
      and exists (select 1 from public.attendance_push_devices d where d.owner_id = a.owner_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.queue_attendance_push_event() from public, anon, authenticated;

create trigger attendance_push_manual after insert on public.work_days
for each row execute function public.queue_attendance_push_event();

create trigger attendance_push_gps after insert on public.gps_attendance
for each row execute function public.queue_attendance_push_event();

create function public.set_attendance_push_device(device_token text, enabled boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  account_owner uuid := auth.uid();
begin
  if account_owner is null or device_token is null or device_token !~ '^[0-9a-f]{64,256}$' then
    raise exception 'Invalid push registration';
  end if;

  if enabled then
    if not exists (select 1 from public.employees e where e.owner_id = account_owner and e.active) then
      raise exception 'Only team owners can register a device';
    end if;

    insert into public.attendance_push_devices(token, owner_id)
    values (device_token, account_owner)
    on conflict (token) do nothing;

    if not exists (
      select 1 from public.attendance_push_devices d
      where d.token = device_token and d.owner_id = account_owner
    ) then
      raise exception 'Push registration unavailable';
    end if;
  else
    delete from public.attendance_push_devices
    where token = device_token and owner_id = account_owner;
  end if;
end;
$$;

revoke all on function public.set_attendance_push_device(text, boolean) from public, anon;
grant execute on function public.set_attendance_push_device(text, boolean) to authenticated;
