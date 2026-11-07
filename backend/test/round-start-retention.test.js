import assert from "node:assert/strict";
import test from "node:test";
import { GameSession } from "../src/game-session.js";

test("a saved round-start response can be replayed after the idempotency cache expires", async () => {
  const idempotencyKey = "start-key-00000001";
  const savedResponse = {
    state: { balance: 878, roundNumber: 1 },
    round: { id: "round-1", status: "running" }
  };
  const session = {
    cachedIdempotent: () => null,
    getActiveRound: () => null,
    replayRoundStart: GameSession.prototype.replayRoundStart,
    sql: {
      exec(statement, ...parameters) {
        assert.match(statement, /SELECT response_json FROM rounds WHERE idempotency_key/);
        assert.deepEqual(parameters, [idempotencyKey]);
        return { toArray: () => [{ response_json: JSON.stringify(savedResponse) }] };
      }
    }
  };

  const response = await GameSession.prototype.startRound.call(session, {}, idempotencyKey);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.state, savedResponse.state);
  assert.deepEqual(body.round, savedResponse.round);
  assert.equal(typeof body.serverTime, "number");
});
