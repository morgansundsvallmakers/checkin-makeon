create or replace function public.check_in_member(p_medlemsnummer text)
returns table (
  status text,
  display_name text,
  visit_count bigint,
  event_title text,
  today_number bigint,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.members%rowtype;
  v_event public.events%rowtype;
  v_inserted boolean := false;
begin
  select *
  into v_member
  from public.members
  where medlemsnummer = btrim(p_medlemsnummer)
  limit 1;

  if not found then
    return query select
      'error'::text,
      null::text,
      null::bigint,
      null::text,
      null::bigint,
      'Ingen medlem med det medlemsnumret hittades.'::text;
    return;
  end if;

  if not v_member.aktiv then
    return query select
      'error'::text,
      null::text,
      null::bigint,
      null::text,
      null::bigint,
      'Medlemskapet är inte aktivt. Kontakta admin.'::text;
    return;
  end if;

  select *
  into v_event
  from public.events
  where aktiv = true
  order by datum desc
  limit 1;

  if not found then
    return query select
      'error'::text,
      null::text,
      null::bigint,
      null::text,
      null::bigint,
      'Ingen aktiv medlemskväll just nu.'::text;
    return;
  end if;

  insert into public.attendance (member_id, event_id)
  values (v_member.id, v_event.id)
  on conflict (member_id, event_id) do nothing;

  get diagnostics v_inserted = row_count;

  return query
  select
    case when v_inserted then 'ok' else 'already' end::text as status,
    v_member.namn::text as display_name,
    (select count(*)::bigint from public.attendance a where a.member_id = v_member.id) as visit_count,
    v_event.titel::text as event_title,
    (
      select count(*)::bigint
      from public.attendance a
      where (a.incheckad at time zone 'Europe/Stockholm')::date =
            (now() at time zone 'Europe/Stockholm')::date
    ) as today_number,
    null::text as message;
end;
$$;

revoke all on function public.check_in_member(text) from public;
grant execute on function public.check_in_member(text) to anon, authenticated;
