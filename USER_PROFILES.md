# User profiles

Answer to the open question: **how many user profiles exist, and who are they?** This is a
read-only inventory of the `users` table in the live Neon database, taken 2026-10-28.

## Why it took two attempts

Earlier reads of this table failed with `Failed query … DrizzleQueryError` and
`read ETIMEDOUT`. The table was never missing — the Neon compute was asleep and the socket timed
out before the wake finished. Once the compute was warm, the same queries answered in under a
second. The pool is now kept warm and retried once on connection failure; see
[lib/db.ts:67](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/lib/db.ts#L67) and
[lib/db.ts:137](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/lib/db.ts#L137).

## The 11 rows

Id 20 (`fakiiahmad001@gmail.com`) was deleted on 2026-10-28 at the owner's request — see
[Deleting the gmail account](#deleting-the-gmail-account).

| id | Name | Email | Role | Status | Email verified | Created |
|---|---|---|---|---|---|---|
| 5 | Herbert Strayhorn | herbert.strayhorn@example.com | manager | busy | yes | 2026-10-24 |
| 6 | Jitu Chauhan | jitu.chauhan@example.com | user | online | yes | 2026-10-24 |
| 7 | Denise Reece | denise.reece@example.com | user | online | yes | 2026-10-24 |
| 8 | Kevin White | kevin.white@example.com | user | online | yes | 2026-10-24 |
| 9 | E2E Tester | e2e-1792836876@example.com | user | offline | no | 2026-10-24 |
| 10 | Amara Okafor | amara.okafor@example.com | manager | online | yes | 2026-10-24 |
| 11 | Dmitri Volkov | dmitri.volkov@example.com | user | online | yes | 2026-10-24 |
| 12 | Lena Ortiz | lena.ortiz@example.com | user | online | yes | 2026-10-24 |
| 13 | Kwame Mensah | kwame.mensah@example.com | user | online | yes | 2026-10-24 |
| 14 | Sofia Lindqvist | sofia.lindqvist@example.com | user | online | yes | 2026-10-24 |
| 15 | Ravi Chandran | ravi.chandran@example.com | user | online | yes | 2026-10-24 |

Ids 1–4 and 16–20 no longer exist; the table was truncated at some point in its history (see
`tests/unit/schema-safety.test.ts`, which guards against auth ever doing that again).

## Where they came from

| Source | Accounts |
|---|---|
| [`scripts/seed-team-members.js`](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/scripts/seed-team-members.js) | 5, 6, 7, 8 — the seeder also defines a `You (Current User)` row and six more members that were never or no longer inserted |
| [`drizzle/seed-v3.js`](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/drizzle/seed-v3.js) | 10, 11, 12, 13, 14, 15 |
| A scripted signup against the running app | 9 — a test account, named and timestamped by whatever created it, never verified |

Every `@example.com` row is demo data. The `status` values (`online`, `busy`) are seeded literals,
not live presence. There is no real user account in the table today.

## Credentials to log in

Passwords are bcrypt hashes and cannot be read back out of the database. Both seeders hash the
same literal, so every demo account above signs in with `password123` as the password. Treat that
as public knowledge — it is committed in the repo.

For a real account, the password is whatever was chosen at signup and is stored only as a hash; it
cannot be recovered, and nothing in the repo or the database reveals it. To get back in, reset it:

- `/forgot-password` with the address, then follow the emailed link, or
- re-run the seed logic for that one row with a new hash — a live write, so it needs approval.

`/forgot-password` sends through Resend ([lib/auth-actions.ts:233](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/lib/auth-actions.ts#L233)), so it needs `RESEND_API_KEY`
and a deliverable address.

**No super-admin exists right now.** Super-admin is granted by role `admin`/`superadmin` or by
membership of `ADMIN_EMAILS` ([lib/roles.ts:33](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/lib/roles.ts#L33)). None of the 12 rows has an admin role, and the one
`ADMIN_EMAILS` address is not among them — so `/admin/cms` and the other super-admin surfaces are
unreachable until that address signs up (`roleForSignup` stamps it `superadmin` on first signup).

## Deleting the gmail account

`fakiiahmad001@gmail.com` was id 20, the only real account. Checked before deleting:

- **43 foreign-key columns** across the schema point at `users`; every one of them had **0 rows**
  for id 20. Nothing cascaded, nothing was restricted, nothing left orphaned.
- The address appeared in exactly one place in the whole database — its own `users.email` row.
  No pending `workspace_invitations`, no report recipients.

Deleted 2026-10-28 after explicit approval:

```sql
DELETE FROM users WHERE id = 20;
```

Verified afterwards: 1 row removed, `users` went from 12 rows to 11, and the address is gone. The
full row — 18 columns including the old password hash — was saved first to
`jiravision-user-20-backup.json` in the project root, which can be re-inserted if that turns out to
be wanted. It is git-ignored and chmod 600, because it holds a password hash.
