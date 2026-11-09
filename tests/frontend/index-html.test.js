import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const [html, ...scripts] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "game.js"), "utf8"),
  readFile(resolve(root, "dialogs.js"), "utf8")
]);

test("HTML IDs are unique and every static JavaScript ID lookup exists", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size, "HTML must not contain duplicate IDs");
  for (const match of scripts.join("\n").matchAll(/getElementById\("([^"]+)"\)/g)) {
    assert.ok(ids.includes(match[1]), `Missing HTML element #${match[1]}`);
  }
});
