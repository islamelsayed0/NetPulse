# NetPulse — scheduled monitor checks (CRON)

This app runs HTTP health checks via `POST /api/check-monitors`. External schedulers (e.g. [cron-job.org](https://cron-job.org)) call that URL on a fixed interval. The dashboard **Run checks now** button uses a **Clerk-authenticated server action** instead, so your `CRON_SECRET` never ships to the browser.

## 1. Generate a secure `CRON_SECRET`

Use a long random string (at least 32 bytes of entropy).

**macOS / Linux (OpenSSL):**

```bash
openssl rand -hex 32
```

**Node.js:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env.local` (and to your host’s environment in production):

```bash
CRON_SECRET=paste-the-value-here
```

Redeploy or restart Next.js after changing env vars.

---

## 2. Set up cron-job.org (step by step)

1. **Create an account** at [https://cron-job.org](https://cron-job.org) and sign in.

2. **Open “Cronjobs”** — use the main navigation to the list of jobs (often labeled **Cronjobs** or **Dashboard**).

3. **Create cronjob** — click **Create cronjob** (or **+**).

4. **Title** — e.g. `NetPulse monitor checks`.

5. **Address (URL)** — your public site URL plus the API path, for example:
   - `https://your-domain.com/api/check-monitors`
   - *Screenshot moment:* the field is usually labeled **URL** or **Address**; paste the full `https://…` string.

6. **Schedule** — set interval to **Every minute** (or your desired frequency). Note: NetPulse’s rolling uptime window assumes up to **720** recent checks per monitor (roughly 30 days at 1-minute intervals).

7. **Request method** — choose **POST** (not GET).

8. **Headers** — add a custom header:
   - **Name:** `x-cron-secret`
   - **Value:** the same value as `CRON_SECRET` in your server env.
   - *Screenshot moment:* look for **Headers**, **HTTP Headers**, or **Advanced**; add one row with name/value as above. Do not put the secret in the URL query string.

9. **Save** the job and ensure it is **enabled**.

10. **Execution log** — after a few minutes, open the job’s **history** / **log** tab and confirm responses are **200** (not 401). A **401** almost always means the header name/value does not match `CRON_SECRET`.

---

## 3. Test the endpoint with curl

Replace placeholders:

```bash
curl -sS -X POST "https://your-domain.com/api/check-monitors" \
  -H "x-cron-secret: YOUR_CRON_SECRET_VALUE" \
  -H "Content-Type: application/json"
```

Expected: JSON like `{ "ok": true, "checked": N, "results": [...] }`.

- **401** — missing/wrong `x-cron-secret`, or `CRON_SECRET` not set on the server.
- **500** — `CRON_SECRET` missing in env (misconfiguration) or an internal error (check server logs).

---

## 4. Verify checks in Supabase

1. Open your project in [Supabase Dashboard](https://supabase.com/dashboard) → **Table Editor**.

2. **`monitor_checks`** — you should see new rows with `monitor_id`, `status` (`up`, `degraded`, or `down`), `response_time`, `status_code`, `error_message`, and `checked_at` advancing after each run.

3. **`monitors`** — `last_checked` should update; `status` should reflect `operational`, `degraded`, or `down`; `uptime_percentage` updates from the last **720** checks (treating `up` and `degraded` as successful for the percentage).

4. **`incidents`** — when a monitor goes from healthy to down, a row appears with title `Monitor Down — {name}` and severity `critical`. When it recovers, matching **active** incidents for that monitor are set to `resolved` with `resolved_at` set.

Optional SQL in **SQL Editor**:

```sql
select id, monitor_id, status, response_time, status_code, checked_at
from monitor_checks
order by checked_at desc
limit 20;
```

---

## 5. Security notes

- Treat `CRON_SECRET` like a password: rotate if leaked, never commit to git, never expose in client-side code.
- The dashboard button calls `runMyMonitorChecksNow()` on the server under the user’s Clerk session — it does **not** use `CRON_SECRET` in the browser.
