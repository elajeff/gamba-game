# Checking fairness

`tools/verify-fairness.js` checks an export with Node, separately from the browser and Worker code. The game also has a "Verify past rounds" button.

## Input format

`/api/fairness` needs the session's bearer token, which `POST /api/session` returns and the game also keeps in local storage. Each call returns up to 100 seeds and 100 rounds, and the reply includes `totalSeeds` and `totalRounds`. Ask for the next pages with `seedOffset` and `roundOffset` until you have that many of each.

Put the `seeds` and `rounds` from every page into one UTF-8 JSON file, unchanged. `houseEdgePercent` is optional:

```json
{
  "houseEdgePercent": 1,
  "seeds": [
    {
      "epoch": 1,
      "commitment": "SHA-256 commitment as 64 hex characters",
      "revealed_seed": "revealed 32-byte seed as 64 hex characters"
    }
  ],
  "rounds": [
    {
      "id": "round ID",
      "epoch": 1,
      "nonce": 1,
      "client_seed": "client seed",
      "edge_percent": 1,
      "status": "busted",
      "crash_point": 1.39
    }
  ]
}
```

An unrevealed seed is expected for the current epoch, so records depending on it are reported as pending rather than failed.

## Run it

From the repository root:

```sh
node tools/verify-fairness.js fairness-export.json
```

The command prints a JSON report with the number of verified seed epochs and rounds, pending records, and any mismatches. It exits with status `2` when a verification mismatch is found, and `1` when the input cannot be read as valid JSON. `passed: true` means no inconsistency was found in the supplied records; `complete: true` additionally means no seed or round remains pending.

## Fixed vector

`tools/fairness-test-vectors.json` holds a fixed input with its expected HMAC-SHA-256 digest, commitment and crash point. The automated tests check these values.

## What this does not prove

A passing check shows that the records you supply match their commitments and the published formula; it can't show that no round was left out of the export or that the deployed code never changed.
