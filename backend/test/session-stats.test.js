import assert from "node:assert/strict";
import test from "node:test";
import { readProfileData } from "../src/session-stats.js";

function createSqlMock(results) {
  return {
    exec() {
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
});
