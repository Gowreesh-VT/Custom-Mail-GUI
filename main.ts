import dotenv from 'dotenv';
import fs from 'fs';
import { MailService, MailServiceConfig } from './mailService';

dotenv.config();

async function main() {
    // Configuration from environment variables
    const config: MailServiceConfig = {
        smtpHost: process.env.SMTP_HOST!,
        smtpPort: parseInt(process.env.SMTP_PORT!),
        smtpUser: process.env.SMTP_USER!,
        smtpPassword: process.env.SMTP_PASSWORD!,
        fromEmail: process.env.SMTP_FROM_EMAIL!,
        fromName: process.env.SMTP_FROM_NAME!,
    };

    if (!config.smtpHost || !config.smtpUser || !config.smtpPassword || !config.fromEmail) {
        console.error('❌ Missing required environment variables:');
        console.error('   SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL');
        console.error('\n📝 Please update your .env file');
        process.exit(1);
    }

    // Initialize mail service
    const mailService = new MailService(config);

    console.log('🔐 Verifying SMTP connection...');
    const isConnected = await mailService.verifyConnection();

    if (!isConnected) {
        console.error('❌ Failed to connect to SMTP server');
        process.exit(1);
    }

    console.log('✅ SMTP connection verified!\n');

    const csvPath = process.argv[2] || './emails.csv';
    const htmlTemplatePath = process.argv[3] || './templates/welcome.html';

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ CSV file not found: ${csvPath}`);
        console.error(`📝 Create a CSV file with columns: email, fullName (optional)\n`);
        process.exit(1);
    }

    if (!fs.existsSync(htmlTemplatePath)) {
        console.error(`❌ Template file not found: ${htmlTemplatePath}`);
        console.error(`📝 Add your HTML template at that path and try again.`);
        process.exit(1);
    }

    // Send bulk emails
    try {
        const results = await mailService.sendBulkFromCSV(csvPath, {
            subject: 'TetherX: Order & Chaos — You\'re Invited 🚀',
            htmlTemplatePath,
            generatePassword: false, // Toggle to Generate passwords
        });

        if (results.failed.length > 0) {
            console.log('\n⚠️  Failed emails:');
            results.failed.forEach(item => {
                console.log(`   - ${item.email}: ${item.error}`);
            });
        }

        process.exit(results.failed.length > 0 ? 1 : 0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
