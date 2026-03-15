import nodemailer from 'nodemailer';
import { loadTemplate, renderTemplate, TemplateData } from './templateManager';
import { parseCSV, EmailRecord } from './csvParser';
import { generateSecurePassword } from './sender';

export interface MailServiceConfig {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
}

export interface MailConfig {
    htmlTemplatePath?: string;
    textTemplatePath?: string;
    subject: string;
    generatePassword?: boolean;
}

export class MailService {
    private config: MailServiceConfig;
    private transporter: nodemailer.Transporter;

    constructor(config: MailServiceConfig) {
        this.config = config;
        this.transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpPort === 465,
            auth: {
                user: config.smtpUser,
                pass: config.smtpPassword,
            },
        });
    }

    /**
     * Test SMTP connection
     */
    async verifyConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            return true;
        } catch (error: any) {
            console.error('SMTP Connection Error:', error.message);
            return false;
        }
    }

    
    async sendEmail(
        recipientEmail: string,
        templateData: TemplateData,
        mailConfig: MailConfig
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            let htmlContent = '';
            let textContent = '';

            if (mailConfig.htmlTemplatePath) {
                const htmlTemplate = loadTemplate(mailConfig.htmlTemplatePath);
                htmlContent = renderTemplate(htmlTemplate, templateData);
            }

            if (mailConfig.textTemplatePath) {
                const textTemplate = loadTemplate(mailConfig.textTemplatePath);
                textContent = renderTemplate(textTemplate, templateData);
            }

            if (!htmlContent && !textContent) {
                throw new Error('At least one template (HTML or Text) must be provided');
            }

            const mailOptions = {
                from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
                to: recipientEmail,
                subject: mailConfig.subject,
                ...(htmlContent && { html: htmlContent }),
                ...(textContent && { text: textContent }),
            };

            const result = await this.transporter.sendMail(mailOptions);
            return {
                success: true,
                messageId: result.messageId,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async sendBulkFromCSV(
        csvFilePath: string,
        mailConfig: MailConfig,
        options?: {
            generatePassword?: boolean;
            rateLimitMs?: number;
        }
    ): Promise<{
        total: number;
        sent: number;
        failed: Array<{ email: string; error: string }>;
    }> {
        try {
            const records = await parseCSV(csvFilePath);
            const results = {
                total: records.length,
                sent: 0,
                failed: [] as Array<{ email: string; error: string }>,
            };

            console.log(`\nSending to ${records.length} recipient(s)...\n`);

            for (let i = 0; i < records.length; i++) {
                const record = records[i];
                const templateData: TemplateData = Object.fromEntries(
                    Object.entries(record).filter(([, v]) => v !== undefined)
                ) as TemplateData;

                if (options?.generatePassword) {
                    const password = generateSecurePassword(12);
                    templateData['password'] = password;
                }

                const result = await this.sendEmail(record.email, templateData, mailConfig);

                if (result.success) {
                    results.sent++;
                    console.log(`  sent    ->  ${record.email}`);
                } else {
                    results.failed.push({
                        email: record.email,
                        error: result.error || 'Unknown error',
                    });
                    console.error(`  failed  ->  ${record.email}  (${result.error})`);
                }

                if (i < records.length - 1) {
                    await new Promise(resolve =>
                        setTimeout(resolve, options?.rateLimitMs || 100)
                    );
                }
            }

            console.log(`\n─────────────────────────────────────`);
            console.log(`  sent    ${results.sent}  /  ${results.total}`);
            console.log(`  failed  ${results.failed.length}  /  ${results.total}`);
            console.log(`─────────────────────────────────────\n`);

            return results;
        } catch (error: any) {
            throw new Error(`Bulk send failed: ${error.message}`);
        }
    }
}
