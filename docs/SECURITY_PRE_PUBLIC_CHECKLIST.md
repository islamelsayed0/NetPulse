# Pre-public repository checklist

Run these steps before making the NetPulse GitHub repository public.

## 1. Confirm secrets are not tracked

- `.env.local` must stay **untracked** (gitignored via `.env*.local`). Verify:

  ```bash
  git check-ignore -v .env.local
  git log --all --full-history -- .env.local
  ```

  The second command should print **nothing** (file never committed).

## 2. Git history pickaxe (examples)

Search for strings that should never appear in committed source:

```bash
git log -p --all -S 'sk_live' -- .
git log -p --all -S 'sk_test_' -- .   # review hits: only docs/examples, not real keys
git log -p --all -S 'SUPABASE_SERVICE_ROLE_KEY=' -- .
git log -p --all -S 'CRON_SECRET=' -- .
```

Review any matches; rotate keys if a real secret ever appeared in history.

## 3. Working tree scan (examples)

From the repo root:

```bash
rg -n "sk_live|sk_test_[a-zA-Z0-9]{20,}|re_[a-zA-Z0-9_]{15,}" \
  --glob '!package-lock.json' --glob '!.env*.local' .
```

Expect hits only in `.env.local` (ignored) or in documentation placeholders—not in committed env files with values.

## 4. Database access model (verify after running migrations)

NetPulse never uses the Supabase anon key. All database access is server side via the service role client and filtered by Clerk `user_id`. The `anon` and `authenticated` roles must have **no** privileges on any NetPulse table.

- Run `supabase/migrations/009_revoke_anon_access.sql` in the Supabase SQL Editor (fresh installs: `supabase/NETPULSE_FULL_SETUP.sql` already includes it).
- Verify in the SQL Editor (both queries must return zero rows):

  ```sql
  SELECT grantee, table_name, privilege_type
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated');

  SELECT policyname, tablename FROM pg_policies
  WHERE schemaname = 'public' AND policyname LIKE 'netpulse_anon_%';
  ```

- Optional external check: a request with the anon key must be rejected:

  ```bash
  curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/monitors?select=id" \
    -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>"
  # expect a permission denied error, never a JSON array of rows
  ```

- `git grep -n "SUPABASE_ANON_KEY\|createPublicSupabaseClient\|createBrowserClient"` must return nothing in app code.

## 5. Outbound request safety

- Monitor URLs are checked by `lib/monitoring/url-guard.ts` on create, on update, and before every probe hop (redirects are followed manually, max 5 hops). Private, loopback, link local, unique local, multicast and unspecified addresses, including cloud metadata (`169.254.169.254`) and IPv4 mapped IPv6, are rejected.

## 6. Optional tooling

- [TruffleHog](https://github.com/trufflesecurity/trufflehog) or [gitleaks](https://github.com/gitleaks/gitleaks) for automated secret scanning.

## Last run (maintainer: update when you scan)

- **Ingest / debug telemetry:** removed from `proxy.ts`, `lib/data/monitors.ts`, and `dashboard-home-content.tsx` (no `127.0.0.1:7838` calls in app code).
- **`.gitignore`:** includes `.env*.local`, `.vercel`, `local.settings.json`, `/.clerk/`.
- **Sample git check:** `git log` on `.env.local` showed no commits in this clone at checklist creation time.
