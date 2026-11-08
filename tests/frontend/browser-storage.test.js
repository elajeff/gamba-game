import assert from "node:assert/strict";
import test from "node:test";
import { readLastReveal, readStoredSession } from "../../browser-storage.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; }
  };
}

const SESSION_KEY = "session";
const REVEAL_KEY = "reveal";
const validSession = { sessionId: "session-1", token: "signed-token" };
const validReveal = { epoch: 2, serverSeed: "revealed-seed", commitment: "seed-commitment" };

test("stored session is read back and malformed or incomplete records are ignored", () => {
  assert.deepEqual(readStoredSession(memoryStorage({ [SESSION_KEY]: JSON.stringify(validSession) }), SESSION_KEY), validSession);
  assert.equal(readStoredSession(memoryStorage({ [SESSION_KEY]: "{" }), SESSION_KEY), null);
  assert.equal(readStoredSession(memoryStorage({ [SESSION_KEY]: JSON.stringify({ token: "only-token" }) }), SESSION_KEY), null);
});

test("revealed fairness data is read back and incomplete records are ignored", () => {
  assert.deepEqual(readLastReveal(memoryStorage({ [REVEAL_KEY]: JSON.stringify(validReveal) }), REVEAL_KEY), validReveal);
  assert.equal(readLastReveal(memoryStorage({ [REVEAL_KEY]: "{}" }), REVEAL_KEY), null);
});
