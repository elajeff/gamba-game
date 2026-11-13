export function readStoredSession(localStore, key) {
  try {
    const value = localStore.getItem(key);
    const parsed = value ? JSON.parse(value) : null;
    return parsed && typeof parsed.token === "string" && typeof parsed.sessionId === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function readLastReveal(localStore, key) {
  try {
    const value = localStore.getItem(key);
    const reveal = value ? JSON.parse(value) : null;
    return reveal && reveal.serverSeed && reveal.commitment ? reveal : null;
  } catch {
    return null;
  }
}

export function storeJson(localStore, key, value) {
  localStore.setItem(key, JSON.stringify(value));
}
