import { base64url, fromBase64, fromBase64Url, bytesToHex, hexToBytes } from "./crypto-utils.js";

async function importSeedKey(keyB64, usage) {
  const rawKey = fromBase64(keyB64);
  if (rawKey.length !== 32) throw new Error("SEED_ENCRYPTION_KEY must decode to exactly 32 bytes");
  return crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, [usage]);
}

// Server seeds are stored encrypted at rest and are only decrypted when needed for a round.
export async function encryptSeed(seedHex, keyB64) {
  const key = await importSeedKey(keyB64, "encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, hexToBytes(seedHex));
  return { iv: base64url(iv), ciphertext: base64url(new Uint8Array(ciphertext)) };
}

export async function decryptSeed(ivB64, cipherB64, keyB64) {
  const key = await importSeedKey(keyB64, "decrypt");
  const iv = fromBase64Url(ivB64);
  const cipher = fromBase64Url(cipherB64);
  const clear = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher));
  return bytesToHex(clear);
}
