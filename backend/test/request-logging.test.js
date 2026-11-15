import assert from "node:assert/strict";
import test from "node:test";
import { logUnexpectedRequestError } from "../src/request-logging.js";

function captureLog(callback) {
  const originalError = console.error;
  let logged = "";
  console.error = (line) => { logged = String(line); };
  try { callback(); }
  finally { console.error = originalError; }
  return JSON.parse(logged);
}

test("unexpected-request logs include a correlation ID and stack context", () => {
  const record = captureLog(() => logUnexpectedRequestError({
    requestId: "request-123",
    method: "POST",
    path: "/api/session",
    error: new Error("database unavailable")
  }));

  assert.equal(record.level, "error");
  assert.equal(record.event, "unhandled_request_error");
  assert.equal(record.requestId, "request-123");
  assert.equal(record.method, "POST");
  assert.equal(record.path, "/api/session");
  assert.match(record.errorStack, /request-logging\.test\.js/);
});
