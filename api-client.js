// Small browser API client. It owns HTTP mechanics, while game.js owns game state and UI messages.
export class ApiError extends Error {
  constructor(status, data) {
    super(data?.message || data?.error || `Backend request failed (HTTP ${status}).`);
    this.name = "ApiError";
    this.status = status;
    this.code = data?.error || "http_error";
    this.data = data;
  }
}

export function createApiClient({ baseUrl, getToken, timeoutMs, fetchImpl = (...args) => fetch(...args) }) {
  return async function api(path, options = {}) {
    const method = options.method || "GET";
    const headers = new Headers();
    if (options.body !== undefined) headers.set("content-type", "application/json");
    const token = options.auth === false ? null : getToken?.();
    if (token) headers.set("authorization", `Bearer ${token}`);
    if (options.idempotencyKey) headers.set("idempotency-key", options.idempotencyKey);

    const requestOptions = { method, headers, cache: "no-store" };
    if (options.body !== undefined) requestOptions.body = JSON.stringify(options.body);
    if (options.keepalive) requestOptions.keepalive = true;

    // Only retry operations with an idempotency key, reusing exactly the same key and body.
    const maxAttempts = options.idempotencyKey ? 2 : 1;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      let response;
      let text;
      const controller = new AbortController();
      const externalSignal = options.signal || null;
      const relayExternalAbort = () => controller.abort(externalSignal.reason);
      if (externalSignal?.aborted) relayExternalAbort();
      else externalSignal?.addEventListener("abort", relayExternalAbort, { once: true });
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        response = await fetchImpl(`${baseUrl}${path}`, {
          ...requestOptions,
          signal: controller.signal
        });
        // Keep the timeout active while reading the body too, not just until headers arrive.
        text = await response.text();
      } catch (error) {
        if (attempt + 1 < maxAttempts) continue;
        if (error?.name === "AbortError") {
          throw new Error("The game server took too long to respond. Check your connection and try again.");
        }
        throw new Error("Couldn't reach the game server. Check your connection and try again.");
      } finally {
        clearTimeout(timeoutId);
        externalSignal?.removeEventListener("abort", relayExternalAbort);
      }

      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* The body is not JSON, so the error falls back to the status code. */ }
      if (!response.ok) throw new ApiError(response.status, data);
      return data || {};
    }
  };
}
