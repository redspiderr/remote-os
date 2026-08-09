import CryptoJS from "crypto-js";

const KEY = process.env.CALENDAR_ENCRYPTION_KEY ?? "remote-os-calendar-default-key-32chars";

export function encryptToken(plain: string): string {
  return CryptoJS.AES.encrypt(plain, KEY).toString();
}

export function decryptToken(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
