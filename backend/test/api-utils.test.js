import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, readJsonLimited } from "../src/api-utils.js";

test("oversized streams are cancelled without waiting for the sender to finish", async () => {
  let cancelled = false;
  let pulls = 0;
  const body = new ReadableStream({
    pull(controller) {
      pulls += 1;
      controller.enqueue(new Uint8Array(32));
    },
    cancel() { cancelled = true; }
  }, { highWaterMark: 0 });
  await assert.rejects(readJsonLimited({ body, headers: new Headers() }, 16),
    error => error instanceof ApiError && error.status === 413 && error.code === "request_too_large");
  assert.equal(cancelled, true);
  assert.equal(pulls, 1);
});
