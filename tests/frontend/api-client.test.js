import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, createApiClient } from "../../api-client.js";

test("API client sends the current session token and JSON body", async () => {
  let request;
  const api = createApiClient({
    baseUrl: "https://example.test",
    getToken: () => "session-token",
    timeoutMs: 1000,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
  });

  const response = await api("/api/round/start", {
    method: "POST",
    body: { stake: 25 },
    idempotencyKey: "start-key-123"
  });

  assert.deepEqual(response, { ok: true });
  assert.equal(request.url, "https://example.test/api/round/start");
  assert.equal(request.options.headers.get("authorization"), "Bearer session-token");
  assert.equal(request.options.headers.get("idempotency-key"), "start-key-123");
  assert.equal(request.options.headers.get("content-type"), "application/json");
  assert.equal(request.options.body, JSON.stringify({ stake: 25 }));
});

test("API client passes keepalive to fetch", async () => {
  let requestOptions;
  const api = createApiClient({
    baseUrl: "https://example.test",
    getToken: () => null,
    timeoutMs: 1000,
    fetchImpl: async (url, options) => {
      requestOptions = options;
      return new Response('{"ok":true}', { status: 200 });
    }
  });

  await api("/api/round/cashout", { method: "POST", body: { roundId: "r1" }, keepalive: true });
  assert.equal(requestOptions.keepalive, true);
});

test("API client retries a network failure only when an idempotency key is supplied", async () => {
  let calls = 0;
  const api = createApiClient({
    baseUrl: "https://example.test",
    getToken: () => null,
    timeoutMs: 1000,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("connection reset");
      return new Response('{"ok":true}', { status: 200 });
    }
  });

  assert.deepEqual(await api("/api/round/start", {
    method: "POST", body: { stake: 10 }, idempotencyKey: "same-key"
  }), { ok: true });
  assert.equal(calls, 2);
});

test("API client does not retry a request without an idempotency key", async () => {
  let calls = 0;
  const api = createApiClient({
    baseUrl: "https://example.test",
    getToken: () => null,
    timeoutMs: 1000,
    fetchImpl: async () => {
      calls += 1;
      throw new TypeError("connection reset");
    }
  });

  await assert.rejects(api("/api/state"), /Couldn't reach the game server/);
  assert.equal(calls, 1);
});

test("API client gives up on a request that stalls on the headers or the body", { timeout: 1000 }, async () => {
  const hangUntilAborted = (signal) => new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason));
  });
  const stalledFetches = [
    (url, options) => hangUntilAborted(options.signal),
    async (url, options) => ({ text: () => hangUntilAborted(options.signal) })
  ];

  for (const fetchImpl of stalledFetches) {
    const api = createApiClient({
      baseUrl: "https://example.test",
      getToken: () => null,
      timeoutMs: 10,
      fetchImpl
    });

    await assert.rejects(api("/api/state"), /took too long/);
  }
});

test("API client preserves structured HTTP error details", async () => {
  const api = createApiClient({
    baseUrl: "https://example.test",
    getToken: () => null,
    timeoutMs: 1000,
    fetchImpl: async () => new Response('{"error":"invalid_bet","message":"Stake is invalid."}', { status: 400 })
  });

  await assert.rejects(api("/api/round/start", { method: "POST", body: { stake: -1 } }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    assert.equal(error.code, "invalid_bet");
    assert.equal(error.message, "Stake is invalid.");
    return true;
  });
});

test("API client clearly reports missing backend configuration", async () => {
  const api = createApiClient({ baseUrl: "", getToken: () => null, timeoutMs: 1000 });
  await assert.rejects(api("/api/state"), /Backend URL is not configured/);
});
