import crypto from 'crypto';

// Generate cryptographically secure random password
export function generateSecurePassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '@#$%&*';

    const allChars = uppercase + lowercase + numbers + symbols;

    const secureRandomIndex = (max: number): number => {
        const randomBytes = crypto.randomBytes(4);
        const randomValue = randomBytes.readUInt32BE(0);
        return randomValue % max;
    };

    let password = '';
    password += uppercase[secureRandomIndex(uppercase.length)];
    password += lowercase[secureRandomIndex(lowercase.length)];
    password += numbers[secureRandomIndex(numbers.length)];
    password += symbols[secureRandomIndex(symbols.length)];

    for (let i = password.length; i < length; i++) {
        password += allChars[secureRandomIndex(allChars.length)];
    }

    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
        const j = secureRandomIndex(i + 1);
        [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }

    return passwordArray.join('');
}
