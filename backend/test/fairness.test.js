import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { crashPointFromDigest } from "../src/fairness.js";
import { hexToBytes } from "../src/crypto-utils.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const vector = JSON.parse(await readFile(resolve(root, "tools/fairness-test-vectors.json"), "utf8"));

test("crash formula clamps outcomes below x1.00", () => {
  assert.equal(crashPointFromDigest(new Uint8Array(32), 1), 1);
});

test("crash formula gives the crash point from the fixed test vector", () => {
  const digest = hexToBytes(vector.hmacSha256);
  assert.equal(crashPointFromDigest(digest, vector.edgePercent), vector.crashPoint);
});

test("a digest at the upper end hits the crash point ceiling", () => {
  const digest = new Uint8Array(32).fill(255);
  assert.equal(crashPointFromDigest(digest, 1), 1_000_000);
});

test("a higher house edge lowers the crash point", () => {
  const digest = hexToBytes(vector.hmacSha256);
  assert.equal(crashPointFromDigest(digest, 0), 1.41);
  assert.equal(crashPointFromDigest(digest, 1), 1.39);
  assert.equal(crashPointFromDigest(digest, 3), 1.37);
});
