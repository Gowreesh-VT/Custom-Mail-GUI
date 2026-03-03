import fs from 'fs';

export interface EmailRecord {
    email: string;
    fullName?: string;
    [key: string]: string | undefined; // Allow additional custom fields
}

export async function parseCSV(filePath: string): Promise<EmailRecord[]> {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length === 0) {
            throw new Error('CSV file is empty');
        }

        // Parse header (preserve original casing to match template variables)
        const headers = lines[0].split(',').map(h => h.trim());
        
        if (!headers.includes('email')) {
            throw new Error('CSV must contain an "email" column');
        }

        // Parse rows
        const records: EmailRecord[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            
            const record: Partial<EmailRecord> & Record<string, string> = {} as any;
            headers.forEach((header, index) => {
                if (values[index]) {
                    record[header] = values[index];
                }
            });

            // Validate email
            if (!record.email || !isValidEmail(record.email)) {
                console.warn(`⚠️  Skipping invalid email at row ${i + 1}: ${record.email}`);
                continue;
            }

            records.push(record as EmailRecord);
        }

        if (records.length === 0) {
            throw new Error('No valid email records found in CSV');
        }

        return records;
    } catch (error: any) {
        throw new Error(`Failed to parse CSV: ${error.message}`);
    }
}

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


