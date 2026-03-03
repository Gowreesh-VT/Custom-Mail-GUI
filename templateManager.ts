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

    // Replace all {{variable}} patterns
    Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        rendered = rendered.replace(regex, String(value));
    });

    const unresolvedVars = rendered.match(/\{\{[^}]+\}\}/g);
    if (unresolvedVars) {
        console.warn(`⚠️  Unresolved template variables: ${unresolvedVars.join(', ')}`);
    }

    return rendered;
}

