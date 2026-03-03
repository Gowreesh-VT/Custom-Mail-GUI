# Custom SMTP Mail Service

A flexible TypeScript-based email service for sending bulk emails via SMTP with CSV support and HTML/Text templating.

## Features

✅ SMTP Email Service  
✅ CSV Parsing (email, fullName, custom fields)  
✅ Template Rendering (HTML & Text)  
✅ Bulk Email Sending  
✅ Password Generation  
✅ Error Handling & Logging  
✅ Rate Limiting  

## Installation

```bash
npm install
```

## Setup

### 1. Configure Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your SMTP credentials:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME=Your Company
```

**For Gmail Users:**
1. Enable 2-Step Verification in your Google Account
2. Visit: https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Use this password in `SMTP_PASSWORD`

### 2. Prepare CSV File

Create `emails.csv` with email addresses:

```csv
email,fullName
john@example.com,John Doe
jane@example.com,Jane Smith
bob@example.com,Bob Johnson
```

**Required columns:** `email`  
**Optional columns:** `fullName` or any custom field

### 3. Create Email Template

Create `templates/welcome.html`:

```html
<!DOCTYPE html>
<html>
<body>
    <h1>Welcome {{fullName}}!</h1>
    <p>Your email is: {{email}}</p>
    <p>Thank you for signing up!</p>
</body>
</html>
```

**Template Variables:**
- `{{email}}` - Recipient's email
- `{{fullName}}` - Recipient's full name
- Any custom CSV column name in `{{columnName}}` format

## Usage

### Basic Send

```bash
npm run send
```

Uses default paths:
- CSV: `./emails.csv`
- Template: `./templates/welcome.html`

### Custom Paths

```bash
npm run send:custom ./path/to/emails.csv ./path/to/template.html
```

## Programmatic Usage

```typescript
import { MailService } from './mailService';

const mailService = new MailService({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: 'your-email@gmail.com',
    smtpPassword: 'your-password',
    fromEmail: 'noreply@example.com',
    fromName: 'Your Company',
});

// Send bulk emails
const results = await mailService.sendBulkFromCSV(
    './emails.csv',
    {
        subject: 'Welcome!',
        htmlTemplatePath: './templates/welcome.html',
    },
    { rateLimitMs: 100 }
);

console.log(`Sent: ${results.sent}/${results.total}`);
```

## File Structure

```
├── sender.ts              # SMTP transporter & credentials sending
├── csvParser.ts           # CSV file parsing utilities
├── templateManager.ts     # Template loading & rendering
├── mailService.ts         # Main mail service class
├── main.ts               # CLI entry point
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── .env.example          # Environment template
├── emails.csv            # Your email list (not included)
└── templates/            # Email templates directory
    └── welcome.html      # Your email template
```

## Password Generation

To auto-generate passwords for each recipient:

```typescript
const results = await mailService.sendBulkFromCSV(
    './emails.csv',
    { subject: 'Welcome!', htmlTemplatePath: './templates/welcome.html' },
    { generatePassword: true }
);
```

Use `{{password}}` in your template to insert the generated password.

## Error Handling

The service logs all errors and continues processing remaining recipients:

```
✅ Successfully sent: 98
❌ Failed: 2

⚠️  Failed emails:
   - invalid@email: Invalid email format
   - failed@example.com: Connection timeout
```

## Advanced

### Custom Template Variables

Add any columns to your CSV and use them in templates:

```csv
email,fullName,company,productUrl
john@example.com,John Doe,Acme Inc,https://acme.com
```

```html
<p>Hello {{fullName}} from {{company}}</p>
<p>Check out: {{productUrl}}</p>
```

### Send with Text Template

```typescript
await mailService.sendEmail('user@example.com', 
    { fullName: 'John', email: 'john@example.com' },
    {
        subject: 'Welcome!',
        htmlTemplatePath: './templates/welcome.html',
        textTemplatePath: './templates/welcome.txt'
    }
);
```

## Troubleshooting

**Connection refused:** Check SMTP credentials and `SMTP_HOST`/`SMTP_PORT`

**Invalid email:** Ensure all emails in CSV are valid

**Template not found:** Check file paths are correct

**Gmail not working:** Verify app password is generated and 2-Step Verification is enabled

## License

MIT
