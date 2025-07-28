import { createCipher, createDecipher, randomBytes } from 'crypto'

// Simple encryption for demo - replace with proper key management in production
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'

export async function encrypt(text: string): Promise<string> {
  try {
    const cipher = createCipher('aes192', ENCRYPTION_KEY)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  } catch (error) {
    console.error('Encryption failed:', error)
    return text // Fallback to unencrypted for demo
  }
}

export async function decrypt(encryptedText: string): Promise<string> {
  try {
    const decipher = createDecipher('aes192', ENCRYPTION_KEY)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error)
    return encryptedText // Fallback to encrypted text for demo
  }
}

export function generateSecureId(): string {
  return randomBytes(16).toString('hex')
}

export function generateApiKey(): string {
  return randomBytes(32).toString('hex')
}
