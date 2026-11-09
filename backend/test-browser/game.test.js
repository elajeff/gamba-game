import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../../", import.meta.url));
const origin = "http://localhost:5500";
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

function initialState() {
  return { balance: 888, roundNumber: 0, gameOver: false, waitingForLoan: false,
    clientSeed: "test-client-seed", activeLoans: [], loansTaken: {}, loansRepaid: {}, history: [] };
}

async function openGame(t, options = {}) {
  const page = await browser.newPage();
  t.after(async () => {
    server.gate?.resolve();
    await page.close();
  });
  const server = {
    state: initialState(), round: null,
    startKeys: [], cashoutKeys: [],
    gate: options.holdStart ? Promise.withResolvers() : null,
    started: Promise.withResolvers()
  };
  server.snapshot = () => ({ state: { ...server.state, activeRound: server.round },
    serverTime: Date.now(), commitment: "test-commitment", epoch: 1 });
  server.settle = () => {
    const round = server.round;
    const item = { round: 1, roundId: round.id, stake: round.stake, payout: round.stake,
      multiplier: 1, net: 0, result: "CASHED OUT", repayments: [], at: Date.now() };
    server.state = { ...server.state, balance: 888, roundNumber: 1, history: [item] };
    server.round = null;
    return { result: "cashed_out", roundId: round.id, payout: round.stake, multiplier: 1,
      net: 0, historyItem: item, state: server.state, serverTime: Date.now() };
  };
  await page.routeWebSocket("**/api/round/events", () => {});
  await page.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin) {
      const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
      const body = await readFile(resolve(root, name));
      return route.fulfill({ body, contentType: types[extname(name)] });
    }
    const reply = (json, status = 200) => route.fulfill({ json, status,
      headers: { "access-control-allow-origin": origin } });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: {
      "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST",
      "access-control-allow-headers": "content-type, authorization, idempotency-key"
    } });
    if (url.pathname === "/api/session") return reply({ ...server.snapshot(), token: "test-token", sessionId: "test-session" }, 201);
    if (url.pathname === "/api/state") return reply(server.snapshot());
    if (url.pathname === "/api/round/start") {
      server.startKeys.push(request.headers()["idempotency-key"]);
      if (!server.round) {
        server.round = { id: "test-round", stake: request.postDataJSON().stake, startedAt: Date.now() };
        server.state.balance -= server.round.stake;
      }
      const response = { round: { ...server.round }, state: { ...server.state }, serverTime: Date.now() };
      server.started.resolve();
      if (options.failFirstStart && server.startKeys.length === 1) return reply({ error: "test_unavailable" }, 503);
      if (server.gate) await server.gate.promise;
      if (server.earlyRelease) return reply({ round: response.round, ...server.settle() });
      return reply(response);
    }
    if (url.pathname === "/api/round/release-intent") {
      server.earlyRelease = true;
      return reply({ releaseMode: "queued" });
    }
    if (url.pathname === "/api/round/cashout") {
      server.cashoutKeys.push(request.headers()["idempotency-key"]);
      return reply(server.settle());
    }
    if (url.pathname === "/api/round/status") return reply({ status: "running", round: server.round, multiplier: 1, serverTime: Date.now() });
    throw new Error(`Unexpected request: ${url.pathname}`);
  });
  await page.goto(origin);
  await page.waitForFunction(() => !document.querySelector("#verify-fairness-button").disabled);
  return { page, server };
}

async function pressHold(page) {
  await page.locator("#hold-button").focus();
  await page.keyboard.down("Space");
}

async function expectSettled(page) {
  await page.waitForFunction(() => document.querySelector("#round-status").textContent === "CASHED OUT");
  assert.equal(await page.locator("#balance").textContent(), "888");
}

test("release during startup settles once without a second cash-out", { timeout: 15000 }, async t => {
  const { page, server } = await openGame(t, { holdStart: true });
  await pressHold(page);
  await server.started.promise;
  const released = page.waitForResponse("**/api/round/release-intent");
  await page.keyboard.up("Space");
  await released;
  server.gate.resolve();
  await expectSettled(page);
  assert.equal(server.cashoutKeys.length, 0);
});

test("an uncertain start reuses its key and recovers the same round", { timeout: 15000 }, async t => {
  const { page, server } = await openGame(t, { failFirstStart: true });
  await pressHold(page);
  await page.waitForFunction(() => document.querySelector("#hold-button-title").textContent === "RELEASE TO CASH OUT");
  await page.keyboard.up("Space");
  await expectSettled(page);
  assert.equal(server.startKeys.length, 2);
  assert.equal(new Set(server.startKeys).size, 1);
});
