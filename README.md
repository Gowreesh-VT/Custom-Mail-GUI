# Custom Mail

Custom Mail is a self-hosted email client and bulk sender built with Next.js (App Router). It supports multiple users with per-user SMTP configuration, a rich composer, scheduled sends, CSV-based bulk mail merge, and monitoring tools for send status and retries.

This README covers local development, Codespaces, environment setup, and common maintenance tasks.

---

## Features

- Multi-user accounts with JWT-based auth (httpOnly cookies).
- Per-user SMTP configuration with encrypted SMTP passwords.
- Rich editor (Tiptap) with visual and HTML modes, templates, and previews.
- Drafts, templates, scheduled queue, sent history, and bulk CSV sending.
- Admin console: users, announcements, templates, and audit logs.
- Monitor dashboard with retry/dismiss actions and volume charts.
- Security: CSP/security headers and basic rate-limiting for sensitive endpoints.

---

## Quick Start (Local)

1. Copy `.env.example` to `.env` and fill the required values (database, Redis, secrets).

2. Install dependencies:

```bash
npm install
```

3. Run database migrations (if using Prisma / Neon):

```bash
npx prisma migrate deploy
```

4. Seed an admin user (optional):

```bash
npx ts-node scripts/seed-admin.ts
```

5. Start development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Required Environment Variables

Create `.env` from `.env.example` and set the following (example values):

```env
DATABASE_URL=postgresql://user:password@host/db
DATABASE_URL_UNPOOLED=postgresql://user:password@host/db
REDIS_URL=redis://user:pass@host:6379
JWT_ACCESS_SECRET=long-random-secret
JWT_REFRESH_SECRET=another-long-secret
ENCRYPTION_SECRET=32-char-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=long-random-secret
```

- `ENCRYPTION_SECRET` is used to derive the key for encrypting SMTP credentials.
- If using Upstash / Neon, set their respective URLs/tokens as in `.env.example`.

---

## Codespaces Quickstart

1. Create a Codespace for this repository.
2. Add required secrets in the Codespaces settings or create a `.env` in the repo root.
3. Install dependencies: `npm install`.
4. Run dev server: `npm run dev` and open the forwarded port.

---

## Scripts

- `npm run dev` — Start dev server with hot reload
- `npm run build` — Build for production
- `npm run start` — Run the production build (after `npm run build`)
- `npm run typecheck` — Run TypeScript checks
- `npm run lint` — Run ESLint

---

## Bulk CSV Sending

Bulk send inputs are CSV files and HTML templates found in the `templates/` directory. The UI under `/bulk` guides mapping CSV columns to template variables and performs validation.

If you prefer CLI automation, the repository includes helper scripts in `scripts/` for generating icons, seeding, and other maintenance tasks.

---

## Admin Console

- Manage users: `/admin/users`
- Announcements: `/admin/announcements` (create/activate/deactivate/delete)
- Audit and templates management

Note: the admin announcements page has a refreshed UI with badges, expiry metadata and filtering.

---

## Security & Deployment Notes

- Content-Security-Policy and several security headers are preconfigured in `next.config.mjs`.
- Protect the `CRON_SECRET` and other secrets; the scheduled job endpoint uses a timing-safe comparison.

---

## Contributing

1. Create a branch for your change.
2. Run `npm install` and make your edits.
3. Run `npm run typecheck && npm run lint` and fix any issues.
4. Open a PR with a clear description of the change and testing instructions.

---

If you'd like, I can also add a short DEVELOPMENT.md with common debug tips (dev server, inspecting Prisma, seed commands, email testing). 
