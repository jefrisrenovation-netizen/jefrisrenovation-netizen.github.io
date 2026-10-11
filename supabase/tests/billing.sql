-- Isolated regression check. No account or billing data survives the rollback.
begin;
insert into auth.users(id,aud,role,email) values('11111111-1111-4111-8111-111111111111','authenticated','authenticated','billing-rollback@example.invalid');
insert into public.billing_accounts(owner_id,enrolled_at) values('11111111-1111-4111-8111-111111111111',now()-interval '1 year');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
update public.billing_config set launch_at=null;
set local role authenticated;
do $$begin assert public.billing_can_write(), 'prelaunch denied'; assert not has_table_privilege('authenticated','public.billing_accounts','INSERT'), 'trial forgery'; assert not has_table_privilege('authenticated','public.apple_subscriptions','INSERT'), 'purchase forgery'; end$$;
reset role;
update public.billing_config set launch_at=now()-interval '1 year';
set local role authenticated;
do $$begin
 assert not public.billing_can_write(), 'expired accepted';
 begin
  insert into public.employees(owner_id,name,active) values('11111111-1111-4111-8111-111111111111','Rollback Employee',true);
  raise exception 'expired account can add employee';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
insert into public.apple_subscriptions values('rollback','11111111-1111-4111-8111-111111111111','123','Sandbox',now()+interval '1 month',null,now());
set local role authenticated;
do $$begin assert not public.billing_can_write(), 'sandbox accepted in production'; end$$;
reset role;
update public.apple_subscriptions set environment='Production';
set local role authenticated;
do $$begin assert public.billing_can_write(), 'production denied'; end$$;
reset role;
update public.apple_subscriptions set revoked_at=now();
set local role authenticated;
do $$begin assert not public.billing_can_write(), 'revoked accepted'; end$$;
reset role;
update public.billing_accounts set enrolled_at=now();
set local role authenticated;
do $$begin assert public.billing_can_write(), 'new twenty-day trial denied'; end$$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$begin assert (select count(*) from public.apple_subscriptions)=0, 'other owner purchase visible'; end$$;
reset role;
rollback;
select 'passed: ownership, server expiry, sandbox isolation, trial and write enforcement' as billing_tests;
