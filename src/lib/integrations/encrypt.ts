import * as CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.INTEGRATION_SECRET ??
  "fallback-remote-os-integration-secret-key-do-not-use-in-prod";

export function encryptCredentials(plain: Record<string, unknown>): string {
  return CryptoJS.AES.encrypt(JSON.stringify(plain), ENCRYPTION_KEY).toString();
}

export function decryptCredentials(cipherText: string): Record<string, unknown> {
  const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8)) as Record<string, unknown>;
}
