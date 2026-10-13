import { execFileSync } from 'node:child_process'
import { expect, it } from 'vitest'
const local = process.env.SB_URL === 'http://127.0.0.1:54321'

// Roll back all counters, making the test repeatable even after the real daily
// budget is exhausted locally. This test never connects to a hosted database.
it.skipIf(!local)('enforces both daily caps and denies direct/anonymous access in local Supabase', () => {
  const sql = `begin;
    insert into public.translation_usage(day, scope, calls)
      values ((statement_timestamp() at time zone 'UTC')::date, 'global', 0)
      on conflict (day, scope) do update set calls = 0;
    set local role authenticated;
    set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
    do $$ declare accepted integer := 0; begin
      for i in 1..25 loop
        if public.reserve_translation_quota() then accepted := accepted + 1; end if;
      end loop;
      if accepted <> 20 then raise exception 'Per-account cap failed: %', accepted; end if;
      begin
        perform * from public.translation_usage;
        raise exception 'Usage table exposed';
      exception when insufficient_privilege then null; end;
    end $$;
    reset role;
    update public.translation_usage set calls = 100 where scope = 'global'
      and day = (statement_timestamp() at time zone 'UTC')::date;
    set local role authenticated;
    set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
    do $$ begin
      if public.reserve_translation_quota() then raise exception 'Global cap failed'; end if;
    end $$;
    set local role anon;
    do $$ begin
      begin
        perform public.reserve_translation_quota();
        raise exception 'Anonymous RPC exposed';
      exception when insufficient_privilege then null; end;
    end $$;
    rollback;`
  const output = execFileSync('docker', ['exec', '-i', 'supabase_db_alpine_start', 'psql',
    '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' })
  expect(output).toContain('ROLLBACK')
})
