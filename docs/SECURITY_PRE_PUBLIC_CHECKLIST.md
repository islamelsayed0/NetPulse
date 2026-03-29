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

## 4. Optional tooling

- [TruffleHog](https://github.com/trufflesecurity/trufflehog) or [gitleaks](https://github.com/gitleaks/gitleaks) for automated secret scanning.

## Last run (maintainer: update when you scan)

- **Ingest / debug telemetry:** removed from `proxy.ts`, `lib/data/monitors.ts`, and `dashboard-home-content.tsx` (no `127.0.0.1:7838` calls in app code).
- **`.gitignore`:** includes `.env*.local`, `.vercel`, `local.settings.json`, `/.clerk/`.
- **Sample git check:** `git log` on `.env.local` showed no commits in this clone at checklist creation time.
