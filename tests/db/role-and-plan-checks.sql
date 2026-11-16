-- Database authorization regression checks for has_role / has_active_subscription.
-- Run as one transaction; it ROLLBACKs, so nothing persists. Every row must say PASS.
begin;
set local session_replication_role = replica; -- skip signup triggers/FKs for made-up users
insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-0000000000a1','t-admin@example.invalid'),
  ('00000000-0000-4000-a000-0000000000b1','t-parent-a@example.invalid'),
  ('00000000-0000-4000-a000-0000000000b2','t-parent-b@example.invalid');
insert into public.user_roles (user_id, role) values ('00000000-0000-4000-a000-0000000000a1','admin');
insert into public.subscriptions (user_id, stripe_subscription_id, stripe_customer_id, product_id, price_id, status, environment, current_period_end) values
  ('00000000-0000-4000-a000-0000000000b1','sub_t_a','cus_t_a','p','pr','active','live', now() + interval '30 days'),
  ('00000000-0000-4000-a000-0000000000b2','sub_t_b','cus_t_b','p','pr','active','live', now() + interval '30 days');
insert into public.site_feedback (page, topic, message) values ('/t','general','role-check probe');
set local session_replication_role = origin;
create temp table r(name text, pass boolean) on commit drop;
grant insert, select on r to anon, authenticated, service_role;

-- trusted direct database context
insert into r select 'db: has_role(admin)', public.has_role('00000000-0000-4000-a000-0000000000a1','admin');
insert into r select 'db: anon cannot execute has_active_subscription', not has_function_privilege('anon','public.has_active_subscription(uuid,text)','execute');
insert into r select 'db: anon cannot execute caller_may_inspect', not has_function_privilege('anon','public.caller_may_inspect(uuid)','execute');
insert into r select 'db: authenticated cannot execute caller_may_inspect', not has_function_privilege('authenticated','public.caller_may_inspect(uuid)','execute');

-- anonymous visitor
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
insert into r select 'anon: cannot learn admin status of another account', not public.has_role('00000000-0000-4000-a000-0000000000a1','admin');
reset role;

-- regular parent A
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-4000-a000-0000000000b1"}',true);
set local role authenticated;
insert into r select 'parent: own admin check is false', not public.has_role('00000000-0000-4000-a000-0000000000b1','admin');
insert into r select 'parent: cross-account admin check hidden', not public.has_role('00000000-0000-4000-a000-0000000000a1','admin');
insert into r select 'parent: own plan visible', public.has_active_subscription('00000000-0000-4000-a000-0000000000b1','live');
insert into r select 'parent: cross-account plan hidden', not public.has_active_subscription('00000000-0000-4000-a000-0000000000b2','live');
insert into r select 'parent: admin-only rows stay hidden (RLS)', (select count(*) from public.site_feedback where message = 'role-check probe') = 0;
reset role;

-- admin
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-4000-a000-0000000000a1"}',true);
set local role authenticated;
insert into r select 'admin: own admin check true', public.has_role('00000000-0000-4000-a000-0000000000a1','admin');
insert into r select 'admin: can check another account role', not public.has_role('00000000-0000-4000-a000-0000000000b1','admin');
insert into r select 'admin: can check another account plan', public.has_active_subscription('00000000-0000-4000-a000-0000000000b2','live');
insert into r select 'admin: admin-only rows readable (RLS)', (select count(*) from public.site_feedback where message = 'role-check probe') = 1;
reset role;

-- server (service role)
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
insert into r select 'service: can check any admin role', public.has_role('00000000-0000-4000-a000-0000000000a1','admin');
insert into r select 'service: can check any plan', public.has_active_subscription('00000000-0000-4000-a000-0000000000b2','live');
reset role;

select name, case when pass then 'PASS' else 'FAIL' end as result from r;
rollback;
