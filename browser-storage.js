export function readStoredSession(localStore, key) {
  try {
    const value = localStore.getItem(key);
    const parsed = value ? JSON.parse(value) : null;
    return parsed && typeof parsed.token === "string" && typeof parsed.sessionId === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function storeSession(localStore, key, session) {
  localStore.setItem(key, JSON.stringify(session));
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

export function storeLastReveal(localStore, key, reveal) {
  localStore.setItem(key, JSON.stringify(reveal));
}
