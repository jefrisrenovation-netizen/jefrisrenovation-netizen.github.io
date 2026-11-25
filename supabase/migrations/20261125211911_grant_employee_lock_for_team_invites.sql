-- Allow the invitation service to take employee row locks during phone transfer.
grant update(active) on public.employees to service_role;
