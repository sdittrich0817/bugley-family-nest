create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_subscriptions_user_id on public.subscriptions(user_id);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "Parents view own subscription" on public.subscriptions for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_active_subscription(user_uuid uuid, check_env text default 'live')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.subscriptions where user_id = user_uuid and environment = check_env and (
    (status in ('active','trialing','past_due') and (current_period_end is null or current_period_end > now()))
    or (status = 'canceled' and current_period_end > now())));
$$;
grant execute on function public.has_active_subscription(uuid, text) to authenticated, service_role;

create or replace function public.sync_plan_from_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.family_glow_settings
     set plan = case when new.price_id like 'family_plus%' then 'family_plus' else 'family' end,
         updated_at = now()
   where parent_id = new.user_id;
  if not found then
    insert into public.family_glow_settings(parent_id, plan)
    values (new.user_id, case when new.price_id like 'family_plus%' then 'family_plus' else 'family' end)
    on conflict do nothing;
  end if;
  return new;
end; $$;
revoke execute on function public.sync_plan_from_subscription() from public, anon, authenticated;
create trigger subscriptions_sync_plan after insert or update of price_id on public.subscriptions
for each row execute function public.sync_plan_from_subscription();