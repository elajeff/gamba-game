import { base64url, fromBase64Url, hmacBytes } from "./crypto-utils.js";

export async function signedSessionToken(sessionId, secret) {
  const signature = await hmacBytes(new TextEncoder().encode(secret), sessionId);
  return `${sessionId}.${base64url(signature)}`;
}

export async function verifySessionToken(token, secret) {
  if (typeof token !== "string" || typeof secret !== "string" || secret.length === 0) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const sessionId = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !/^[A-Za-z0-9_-]{40,50}$/.test(signature)) return null;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  let sigBytes;
  try { sigBytes = fromBase64Url(signature); } catch { return null; }
  const ok = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(sessionId));
  return ok ? sessionId : null;
}
