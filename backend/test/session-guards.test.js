import assert from "node:assert/strict";
import test from "node:test";
import { GameSession } from "../src/game-session.js";

function isApiError(error, status, code) {
  return error && error.status === status && error.code === code;
}

test("client seed cannot be changed while a server round is active", async () => {
  const session = {
    readState: () => ({ balance: 800, currentEpoch: 1, clientSeed: "client-seed-1234" }),
    getActiveRound: () => ({ id: "active-round", status: "running" })
  };

  await assert.rejects(
    GameSession.prototype.setClientSeed.call(session, { clientSeed: "replacement-seed-123" }),
    (error) => isApiError(error, 409, "round_in_progress")
  );
});

test("game reset cannot run while a server round is active", async () => {
  const session = {
    readState: () => ({ balance: 800, currentEpoch: 1, clientSeed: "client-seed-1234" }),
    cachedIdempotent: () => null,
    getActiveRound: () => ({ id: "active-round", status: "running" })
  };

  await assert.rejects(
    GameSession.prototype.resetGame.call(session, "reset-guard-test-0001"),
    (error) => isApiError(error, 409, "round_in_progress")
  );
});
