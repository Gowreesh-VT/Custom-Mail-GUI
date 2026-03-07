import fs from 'fs';

export interface TemplateData {
    [key: string]: string | number | boolean;
}

export function loadTemplate(templatePath: string): string {
    try {
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template file not found: ${templatePath}`);
        }
        return fs.readFileSync(templatePath, 'utf-8');
    } catch (error: any) {
        throw new Error(`Failed to load template: ${error.message}`);
    }
}

export function renderTemplate(template: string, data: TemplateData): string {
    let rendered = template;

    rendered = rendered.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, content) => {
        const value = data[key];
        return value && String(value).trim() !== '' ? content : '';
    });

    // Replace all {{variable}} patterns
    Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        rendered = rendered.replace(regex, String(value));
    });

    // Replace any remaining unresolved variables with empty string
    rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');

    return rendered;
}

