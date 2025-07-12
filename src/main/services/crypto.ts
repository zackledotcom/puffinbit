export async function encrypt(data: string): Promise<string> {
  // Placeholder encryption: return base64 encoded string
  return Buffer.from(data, 'utf-8').toString('base64')
}

export async function decrypt(data: string): Promise<string> {
  // Placeholder decryption: decode base64 string
  return Buffer.from(data, 'base64').toString('utf-8')
}
