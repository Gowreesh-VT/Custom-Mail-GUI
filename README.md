# Custom Mail

A self-hosted email client, bulk sender and campaign tracker built with Next.js (App Router), Prisma and PostgreSQL. It supports multiple users with their own SMTP pools, a rich composer, CSV mail merge, scheduled sends, open/click tracking, RSVP buttons, QR codes and certificate generation — all installable as a PWA.

---

## Features

**Sending**
- Rich composer (Tiptap) with visual and HTML modes, device previews, attachments and template variables.
- Drafts, reusable templates (with favourites and test sends) and sent history.
- Bulk CSV / Excel mail merge with column-to-variable mapping and pre-send validation.
- Scheduled sends, processed by a cron endpoint.

**SMTP**
- Per-user SMTP pool with primary and fallback servers, automatic failover and health/fallback logs.
- SMTP passwords encrypted at rest (`ENCRYPTION_SECRET`).
- Admin-managed SMTP, per-user quotas and the ability to lock a user's SMTP settings.

**Tracking & analytics**
- Open and click tracking per email.
- Campaign view per bulk job with analytics and exportable reports.
- Monitor dashboard with live stream, volume charts and retry / retry-all / dismiss for failed sends.

**Events**
- Per-recipient RSVP buttons, a public confirmation page (`/rsvp/[emailId]`) and RSVP results.
- QR campaigns: generate single or bulk QR codes, embed them in emails, download as ZIP.
- Scanner PWA (`/scan`) and operator portal (`/operator`) with PIN-based operator login and scan logs.
- Certificate studio: upload a PDF template, position fields, preview and generate certificates in bulk.

**Platform**
- Multi-user accounts with JWT auth in httpOnly cookies (access + refresh tokens).
- Admin console: users, operators, announcements, push notifications, quotas, SMTP monitor, domain analytics and audit logs with retention.
- Installable PWA with offline page, background sync and web push notifications.
- Security headers / CSP and rate limiting on sensitive endpoints.
- Built-in documentation at `/docs`.

---

## Tech Stack

Next.js 16 · React 19 · TypeScript · Prisma 6 (PostgreSQL / Neon) · Tailwind CSS 4 · Radix UI · Tiptap · Nodemailer · Recharts · pdf-lib · next-pwa / web-push

---

## Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (Neon works out of the box)
- SMTP credentials for at least one sender account

### Setup

1. Install dependencies (this also runs `prisma generate`):

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values (see below).

3. Apply database migrations:

   ```bash
   npx prisma migrate deploy
   ```

4. Create the first admin user from `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME`:

   ```bash
   npx ts-node scripts/seed-admin.ts
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000, sign in as the admin and add an SMTP server under **Settings**.

---

## Environment Variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL connection string used by the app. |
| `DATABASE_URL_UNPOOLED` | Direct connection string used by Prisma migrations. |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (long random string). |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (long random string). |
| `ENCRYPTION_SECRET` | 32-character secret used to encrypt stored SMTP passwords. |
| `NEXT_PUBLIC_APP_URL` | Public URL of the deployment, no trailing slash. Used in tracking links, QR images and RSVP links. |
| `CRON_SECRET` | Bearer token required by `/api/cron/process-scheduled`. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Used only by `scripts/seed-admin.ts`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_EMAIL` | Web push keys. Generate with `npx ts-node scripts/generate-vapid-keys.ts`. |

> Changing `ENCRYPTION_SECRET` after SMTP servers are saved makes their stored passwords unreadable.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run typecheck` | Run TypeScript checks. |
| `npm run lint` | Run ESLint. |
| `npx ts-node scripts/seed-admin.ts` | Create the admin user. |
| `npx ts-node scripts/generate-vapid-keys.ts` | Generate VAPID keys for push notifications. |

---

## Scheduled Emails

Scheduled sends are processed by `POST /api/cron/process-scheduled`, authorised with `Authorization: Bearer $CRON_SECRET`.

The included GitHub Actions workflow (`.github/workflows/process-scheduled-emails.yml`) calls it every 30 minutes. Add these repository secrets for it to work:

- `CRON_SECRET` — same value as in your app environment
- `APP_URL` — your deployment URL

Any other scheduler (Vercel Cron, a server crontab) can call the same endpoint.

---

## Bulk Sending

1. Pick or write a template — starter HTML templates live in `templates/`.
2. Upload a CSV or Excel file on `/bulk` and map its columns to template variables.
3. Validate, then send now or schedule. Each bulk job becomes a campaign under **Sent → Campaigns** with its own analytics and RSVP results.

---

## Deployment

The app is designed for Vercel + Neon but runs anywhere Next.js does:

1. Set all environment variables in your host.
2. Run `npx prisma migrate deploy` against the production database.
3. Build and start (`npm run build && npm run start`), or let Vercel build it.
4. Set up the scheduled-email cron (see above).

Security headers and the Content-Security-Policy are configured in `next.config.mjs`.

---

## Project Structure

```
prisma/            Schema and migrations
public/            Icons, PWA manifests, service workers
scripts/           Admin seeding and VAPID key generation
src/app/(app)/     Signed-in app pages (compose, bulk, sent, qr, certificates, ...)
src/app/admin/     Admin console
src/app/api/       API routes
src/components/    UI components
src/lib/           Mailer, SMTP pool, auth, tracking, QR, certificates, RSVP
templates/         Starter HTML email templates
worker/            Custom service worker logic (push, sync)
```

---

## Contributing

1. Create a branch for your change.
2. Run `npm run typecheck && npm run lint` before committing.
3. Open a PR describing the change and how you tested it.

---

## License

[MIT](LICENSE) © Gowreesh V T
