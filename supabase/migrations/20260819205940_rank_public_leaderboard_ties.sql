create or replace function public.get_public_leaderboard(p_range text default 'month')
returns table (
  rank bigint,
  display_name text,
  visit_count bigint,
  fixit_stars integer
)
language sql
security definer
set search_path = public
stable
as $$
with bounds as (
  select case
    when p_range = 'month' then date_trunc('month', now() at time zone 'Europe/Stockholm')
    when p_range = 'year' then date_trunc('year', now() at time zone 'Europe/Stockholm')
    when p_range = 'total' then null::timestamp
    else null::timestamp
  end as start_local
),
filtered_attendance as (
  select a.member_id
  from public.attendance a
  cross join bounds b
  where p_range = 'total'
     or (p_range in ('month','year') and (a.incheckad at time zone 'Europe/Stockholm') >= b.start_local)
),
visit_counts as (
  select member_id, count(*)::bigint as visit_count
  from filtered_attendance
  group by member_id
),
latest_fixit_events as (
  select e.id
  from public.events e
  where regexp_replace(lower(e.titel), '[^a-z0-9]', '', 'g') = 'fixitday'
    and e.datum <= (now() at time zone 'Europe/Stockholm')::date
  order by e.datum desc, e.id desc
  limit 3
),
fixit_counts as (
  select a.member_id, count(distinct a.event_id)::integer as fixit_stars
  from public.attendance a
  where a.event_id in (select id from latest_fixit_events)
  group by a.member_id
),
ranked as (
  select
    rank() over (order by v.visit_count desc) as rank,
    m.namn as display_name,
    v.visit_count,
    coalesce(f.fixit_stars, 0)::integer as fixit_stars
  from public.members m
  join visit_counts v on v.member_id = m.id
  left join fixit_counts f on f.member_id = m.id
)
select r.rank, r.display_name, r.visit_count, r.fixit_stars
from ranked r
where p_range in ('month','year','total')
order by r.visit_count desc, r.display_name asc
limit 50;
$$;
