# Custom Mail

Custom Mail includes a Next.js App Router email client UI plus a standalone CSV-based bulk sender. The UI handles per-user SMTP configs stored in MongoDB, and the bulk sender renders HTML templates from `templates/` for one-off batch sends.

## Features

- Multi-user signup/login with access + refresh JWTs in httpOnly cookies.
- Per-user SMTP settings stored in MongoDB with AES-256-GCM encrypted SMTP passwords.
- SMTP connection testing with health history.
- Rich Tiptap composer with visual/raw HTML modes, preview, drafts, templates, scheduling, and send-now.
- Sent history, draft list, template library, scheduled queue, bulk CSV mail merge, and monitor dashboard.
- Monitor stats, send-volume chart, failed-email retry/dismiss actions, and SSE activity stream with polling behavior.
- Tailwind/shadcn component system with tweakcn-style CSS variables in `app/globals.css`.

## Environment

Create `.env` from `.env.example` and set the values:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/custom-mail
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-another-long-random-secret
ENCRYPTION_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`ENCRYPTION_SECRET` is hashed to a 256-bit key and used only for SMTP password encryption.

For the SMTP test helper (`test-smtp.js`), create `.env.local` with:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=you@example.com
SMTP_FROM_NAME=Your Name
```

## Codespaces Quickstart

1. Create a Codespace for this repository.
2. Add secrets in the Codespaces environment (or create `.env` in the repo root).
3. Install dependencies: `npm install`.
4. Run the dev server: `npm run dev`.
5. Open the forwarded port 3000.

If you are using MongoDB Atlas, set `MONGODB_URI` to your Atlas connection string.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, create an account, then configure SMTP in `/settings`.

Run `npx ts-node scripts/seed-admin.ts` once to create your admin account before first login.

## Build

```bash
npm run typecheck
npm run build
npm start
```

## Bulk Sender (CSV + Templates)

The bulk sender scripts live in the repo root (`main.ts`, `mailService.ts`, `templateManager.ts`, `csvParser.ts`) and use HTML templates in `templates/`. You can run them with a TypeScript runner (for example `tsx` or `ts-node`) if you install one.

Example inputs:

- `Registration_Emails.csv`
- `Remainder_Events.csv`

## App Routes

- `/login`, `/signup`
- `/compose`
- `/monitor`
- `/drafts`
- `/sent`
- `/templates`
- `/scheduled`
- `/bulk`
- `/settings`

## API Routes

- Auth: `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/me`
- SMTP: `/api/smtp/settings`, `/api/smtp/test`
- Mail: `/api/send`, `/api/send-bulk`, `/api/attachments`
- Data: `/api/sent`, `/api/drafts`, `/api/templates`, `/api/schedule`, `/api/scheduled`
- Monitor: `/api/monitor/stats`, `/api/monitor/chart`, `/api/monitor/stream`, `/api/monitor/failed`, `/api/monitor/retry/:id`, `/api/monitor/retry-all`, `/api/monitor/dismiss/:id`

## Notes

- HTML templates live under `templates/` for batch sending and reference.
- Attachments uploaded through the API are stored locally under `uploads/<userId>/`.
- Agenda uses the same MongoDB database and stores jobs in the `agendaJobs` collection.
