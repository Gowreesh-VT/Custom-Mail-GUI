# Custom Mail

TypeScript-based SMTP bulk mail sender that reads recipients from CSV and renders HTML/text templates with placeholder variables.

## What It Does

- Verifies SMTP connectivity before sending.
- Parses CSV input and validates email addresses.
- Renders templates using CSV column values (for example `{{teamName}}`, `{{leadName}}`).
- Supports optional conditional template blocks:
  - `{{#fieldName}}...{{/fieldName}}` renders only when the field is present and non-empty.
- Sends to all valid recipients with per-email logging.
- Can optionally generate per-recipient secure passwords and expose them as `{{password}}`.

## Repository Structure

```text
.
├── .env.example
├── csvParser.ts
├── emails.csv
├── mailService.ts
├── main.ts
├── sender.ts
├── templateManager.ts
├── test-smtp.js
├── templates/
│   └── welcome.html
├── package.json
├── tsconfig.json
├── LICENSE
└── README.md
```

## Requirements

- Node.js 18+ recommended
- npm

## Installation

```bash
npm install
```

## Environment Setup

Create a `.env` file in project root:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME=Your Name or Organization
```

You can copy from:

```bash
cp .env.example .env
```

## CSV Format

Your CSV must include an `email` column.

Current repository examples (`emails.csv`) use:

```csv
email,leadName,teamName,track,member2,member3,member4
```

Notes:
- Invalid email rows are skipped.
- If all rows are invalid (or CSV is empty), sending fails.
- Any header can be used in templates as `{{headerName}}`.

## Template Format

Default template path used by CLI:


```text
templates/welcome.html
```


Variable examples:

```html
<p>Dear Team {{teamName}},</p>
<p>Lead: {{leadName}}</p>
```

Conditional block example:

```html
{{#member4}}<p>Member 4: {{member4}}</p>{{/member4}}
```


## Running the Sender
### Default input files

Uses:
- CSV: `./emails.csv`
- Template: `./templates/welcome.html`

```bash
npm run send
```

### Custom CSV and template paths

`main.ts` supports positional args:

```bash
npm run send -- ./secondary.csv ./templates/welcome.html
```

## Script Reference

From `package.json`:

- `npm run send` - runs `ts-node main.ts`
- `npm run send:custom` - runs `ts-node main.ts ./path/to/emails.csv ./path/to/template.html` (example placeholder command)
- `npm test` - placeholder script (currently exits with error)

Note:
- `generate-sample` exists in `package.json` but points to `scripts/generate-samples.ts`, which is not present in this repository.

## SMTP Test Utility

`test-smtp.js` is a standalone SMTP test helper.

Important:
- It reads `.env.local` (not `.env`).
- It checks connection and sends a test email to `SMTP_USER`.

Run manually:

```bash
node test-smtp.js
```

## Programmatic Usage

```ts
import { MailService } from './mailService';

const mailService = new MailService({
  smtpHost: process.env.SMTP_HOST!,
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER!,
  smtpPassword: process.env.SMTP_PASSWORD!,
  fromEmail: process.env.SMTP_FROM_EMAIL!,
  fromName: process.env.SMTP_FROM_NAME || 'Mailer',
});

const connected = await mailService.verifyConnection();
if (!connected) throw new Error('SMTP verification failed');

await mailService.sendBulkFromCSV('./emails.csv', {
  subject: 'Your Subject Here',
  htmlTemplatePath: './templates/welcome.html',
}, {
  rateLimitMs: 100,
  generatePassword: false,
});
```

## Behavior Summary

- `main.ts` exits with non-zero status when:
  - required SMTP env vars are missing,
  - SMTP verification fails,
  - input CSV/template file does not exist,
  - at least one email fails to send.
- Subject is currently hardcoded in `main.ts` as:
  - `TetherX Prize: .xyz Domain Allocation Instructions`

## License
MIT