alter table public.team_accounts add column archived_phone text;
alter table public.team_accounts drop constraint team_phone_required;
alter table public.team_accounts add constraint team_phone_required check (
 (login_method <> 'phone' or (coalesce(archived_phone,phone) ~ '^[+][1-9][0-9]{7,14}$' and email is null))
 and (archived_phone is null or (not enabled and phone=''))
);

create unique index team_accounts_contact_phone_unique
 on public.team_accounts ((regexp_replace(phone, '[^0-9]', '', 'g')))
 where regexp_replace(phone, '[^0-9]', '', 'g') <> '';
drop index public.team_phone_login_unique;

create function public.issue_team_invite(
 p_owner uuid, p_employee uuid, p_username text, p_email text, p_phone text,
 p_token_hash text, p_transfer boolean, p_gps boolean
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
 current_account public.team_accounts%rowtype;
 phone_account public.team_accounts%rowtype;
 phone_key text := regexp_replace(p_phone, '[^0-9]', '', 'g');
 issued_account_id uuid;
 account_method text := case when p_email is null then 'phone' else 'email' end;
 conflict_constraint text;
begin
 -- Serialize changes to phone assignments across invitation requests.
 perform pg_advisory_xact_lock(195384832, 1);
 perform 1 from public.employees
 where id=p_employee and owner_id=p_owner and active for update;
 if not found then return jsonb_build_object('error','access_denied'); end if;

 select * into current_account from public.team_accounts where employee_id=p_employee for update;
 if found then
  if current_account.owner_id<>p_owner then return jsonb_build_object('error','access_denied'); end if;
  if not current_account.enabled or current_account.archived_phone is not null then
   return jsonb_build_object('error','access_blocked');
  end if;
  if current_account.user_id is not null and (
   current_account.email is distinct from p_email or current_account.login_method<>account_method
   or (account_method='phone' and current_account.phone<>p_phone)
  ) then return jsonb_build_object('error','linked_email_locked'); end if;
 end if;

 if phone_key<>'' then
  select * into phone_account from public.team_accounts
  where regexp_replace(phone,'[^0-9]','','g')=phone_key and employee_id<>p_employee for update;
  if found then
   if phone_account.owner_id<>p_owner then return jsonb_build_object('error','phone_taken'); end if;
   perform 1 from public.employees where id=phone_account.employee_id and not active for update;
   if not found then
    return jsonb_build_object('error','phone_taken','employee_id',phone_account.employee_id);
   end if;
   if not p_transfer then return jsonb_build_object('error','archived_phone_taken'); end if;
   update public.team_accounts set archived_phone=phone, phone='', enabled=false where id=phone_account.id;
   update public.team_invites set used_at=now() where account_id=phone_account.id and used_at is null;
  end if;
 end if;

 insert into public.team_accounts(owner_id,employee_id,username,email,phone,login_method,auth_email,gps_attendance)
 values(p_owner,p_employee,p_username,p_email,p_phone,account_method,
  case when account_method='phone' then coalesce(current_account.auth_email,gen_random_uuid()::text||'@staff.suivi.invalid') end,
  coalesce(p_gps,false))
 on conflict (employee_id) do update set username=excluded.username,email=excluded.email,phone=excluded.phone,
  login_method=excluded.login_method,auth_email=excluded.auth_email,
  gps_attendance=coalesce(p_gps,team_accounts.gps_attendance)
 returning id into issued_account_id;

 update public.team_invites i set used_at=now() where i.account_id=issued_account_id and i.used_at is null;
 insert into public.team_invites(token_hash,account_id,expires_at)
 values(p_token_hash,issued_account_id,'infinity');
 return jsonb_build_object('created',true);
exception when unique_violation then
 get stacked diagnostics conflict_constraint=constraint_name;
 if conflict_constraint='team_accounts_username_key' then return jsonb_build_object('error','username_taken'); end if;
 if conflict_constraint in ('team_accounts_contact_phone_unique','team_phone_login_unique') then
  return jsonb_build_object('error','phone_taken');
 end if;
 raise;
end;
$$;

revoke all on function public.issue_team_invite(uuid,uuid,text,text,text,text,boolean,boolean) from public, anon, authenticated;
grant execute on function public.issue_team_invite(uuid,uuid,text,text,text,text,boolean,boolean) to service_role;
