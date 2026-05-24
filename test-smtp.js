const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const fs = require('fs');

const envLocalPath = '.env.local';
const envPath = '.env';

if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

console.log('📧 Testing SMTP Configuration...\n');

console.log('Current Settings:');
console.log('- Host:', process.env.SMTP_HOST);
console.log('- Port:', process.env.SMTP_PORT);
console.log('- User:', process.env.SMTP_USER);
console.log('- Password:', process.env.SMTP_PASSWORD ? '***' + process.env.SMTP_PASSWORD.slice(-4) : 'NOT SET');
console.log('- From:', process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER);
console.log('\n');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
    debug: true,
    logger: true
});

console.log('Test 1: Verifying SMTP connection...');
transporter.verify(function (error, success) {
    if (error) {
        console.log('Connection failed:', error.message);
        console.log('\nPossible fixes:');
        console.log('1. Check if SMTP_USER matches your Zoho email');
        console.log('2. Generate App Password if 2FA is enabled');
        console.log('3. Enable IMAP/SMTP in Zoho Mail settings');
        process.exit(1);
    } else {
        console.log('SMTP connection verified!\n');

        console.log('Test 2: Sending test email...');
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: process.env.SMTP_USER,
            subject: 'Gowreesh SMTP Test',
            html: `
                <h2>SMTP Test Successful!</h2>
                <p>Your SMTP configuration is working correctly.</p>
                <p><strong>Host:</strong> ${process.env.SMTP_HOST}</p>
                <p><strong>Port:</strong> ${process.env.SMTP_PORT}</p>
                <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Email send failed:', error.message);
                process.exit(1);
            } else {
                console.log('Test email sent successfully!');
                console.log('Message ID:', info.messageId);
                console.log('\nCheck your inbox:', process.env.SMTP_USER);
                process.exit(0);
            }
        });
    }
});
