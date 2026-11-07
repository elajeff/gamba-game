import assert from "node:assert/strict";
import test from "node:test";
import { readProfileData, recordSettledRound } from "../src/session-stats.js";

function createSqlMock(results = []) {
  const calls = [];
  return {
    calls,
    exec(_statement, ...parameters) {
      calls.push({ parameters });
      const next = results.shift();
      return { toArray: () => next ?? [] };
    }
  };
}

test("profile data maps stored totals and calculates the win rate", () => {
  const sql = createSqlMock([
    [{ rounds_played: 4, wins: 2, losses: 1, pushes: 1, total_staked: 100, total_payout: 120,
      net_result: 20, best_multiplier: 2.5, best_payout: 60 }],
    [{ epoch: 1, round_number: 4, payout: 60 }]
  ]);

  const profile = readProfileData(sql);

  assert.deepEqual(profile.stats, {
    roundsPlayed: 4, wins: 2, losses: 1, pushes: 1, totalStaked: 100, totalPayout: 120,
    netResult: 20, bestMultiplier: 2.5, bestPayout: 60, winRate: 50
  });
  assert.deepEqual(profile.leaderboard, [{ epoch: 1, round_number: 4, payout: 60 }]);
  assert.equal(sql.calls.length, 2);
});

test("settling a round updates session totals and only a cash-out reaches the leaderboard", () => {
  const win = createSqlMock();
  recordSettledRound(win, { id: "round-1", epoch: 1 }, {
    payout: 20, stake: 10, multiplier: 2, net: 10, result: "CASHED OUT", round: 1, at: 123
  });
  assert.deepEqual(win.calls[0].parameters, [1, 0, 0, 10, 20, 10, 2, 20, 123]);
  // The leaderboard insert is the only statement that takes the round id.
  assert.ok(win.calls.some((call) => call.parameters.includes("round-1")));

  const loss = createSqlMock();
  recordSettledRound(loss, { id: "round-2", epoch: 1 }, {
    payout: 0, stake: 10, multiplier: 1, net: -10, result: "BUSTED", round: 2, at: 124
  });
  assert.deepEqual(loss.calls[0].parameters, [0, 1, 0, 10, 0, -10, 0, 0, 124]);
  assert.ok(!loss.calls.some((call) => call.parameters.includes("round-2")));
});
