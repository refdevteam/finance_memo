-- Rate limiting generik berbasis database.
--
-- Dipakai oleh route/server action yang tidak punya penjaga lain:
--   * /api/reminders/snooze        -> per pengguna
--   * verifyTurnstileToken         -> per IP (proxy ke Cloudflare)
--
-- Tabel tidak dapat dibaca/ditulis langsung: RLS aktif tanpa policy dan tanpa
-- GRANT tabel. Satu-satunya jalan adalah fungsi SECURITY DEFINER di bawah.

create table if not exists public.rate_limits (
  key      text primary key,
  count    integer not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;

create index if not exists rate_limits_reset_at_idx
  on public.rate_limits (reset_at);

-- Atomik: dua request bersamaan tidak bisa sama-sama lolos karena
-- penambahan count terjadi di dalam satu statement UPSERT.
create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    return false;
  end if;

  -- Bersihkan sisa jendela lama supaya tabel tidak tumbuh tanpa batas.
  delete from public.rate_limits
   where reset_at < now() - interval '1 day';

  insert into public.rate_limits (key, count, reset_at)
  values (left(p_key, 200), 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count    = case
                     when public.rate_limits.reset_at <= now() then 1
                     else public.rate_limits.count + 1
                   end,
        reset_at = case
                     when public.rate_limits.reset_at <= now()
                       then now() + make_interval(secs => p_window_seconds)
                     else public.rate_limits.reset_at
                   end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to anon, authenticated, service_role;
