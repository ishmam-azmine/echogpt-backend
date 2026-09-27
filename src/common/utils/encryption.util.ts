import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;

  if (!secret) {
    throw new Error('ENCRYPTION_KEY is not configured');
  }

  return createHash('sha256').update(secret).digest();
}

export function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}

export function decrypt(value: string): string {
  const [ivText, authTagText, encryptedText] = value.split('.');

  if (!ivText || !authTagText || !encryptedText) {
    throw new Error('Encrypted value is invalid');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getKey(),
    Buffer.from(ivText, 'base64'),
  );

  decipher.setAuthTag(Buffer.from(authTagText, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
