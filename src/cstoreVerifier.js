const crypto = require('node:crypto');

function buildExpectedSnapshots() {
  const baseline = {
    k000: { key: 'k000', version: 'v1' },
    k001: { key: 'k001', version: 'v1' },
    k002: { key: 'k002', version: 'v1' },
    k003: { key: 'k003', version: 'v1' },
  };
  const delta = {
    k000: { key: 'k000', version: 'v2' },
    k001: { key: 'k001', version: 'v2' },
    k100: { key: 'k100', version: 'v1' },
    k101: { key: 'k101', version: 'v1' },
  };
  const final = {
    ...baseline,
    ...delta,
  };

  return {
    baseline,
    delta,
    final,
  };
}

function normalizeSnapshot(snapshot) {
  return Object.keys(snapshot)
    .sort()
    .reduce((normalized, key) => {
      const value = snapshot[key];
      normalized[key] = typeof value === 'string' ? value : JSON.stringify(value);
      return normalized;
    }, {});
}

function digestSnapshot(snapshot) {
  const normalized = normalizeSnapshot(snapshot);
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

async function readSnapshot({ sdk, hkey }) {
  const snapshot = (await sdk.hgetall(hkey)) || {};
  const digest = digestSnapshot(snapshot);

  return {
    snapshot,
    digest,
    fieldCount: Object.keys(snapshot).length,
  };
}

async function seedPhase({ sdk, hkey, phase }) {
  const snapshots = buildExpectedSnapshots();
  let payload;

  if (phase === 'baseline') {
    payload = snapshots.baseline;
  } else if (phase === 'delta') {
    payload = snapshots.delta;
  } else {
    throw new Error(`Unknown phase: ${phase}`);
  }

  for (const [field, value] of Object.entries(payload)) {
    await sdk.hset(hkey, field, value);
  }

  const snapshot = await readSnapshot({ sdk, hkey });

  return {
    phase,
    writtenFieldCount: Object.keys(payload).length,
    ...snapshot,
  };
}

async function runHsyncAndSnapshot({ sdk, hkey }) {
  const hsync = await sdk.hsync(hkey);
  const snapshot = await readSnapshot({ sdk, hkey });

  return {
    hsync,
    ...snapshot,
  };
}

module.exports = {
  buildExpectedSnapshots,
  normalizeSnapshot,
  digestSnapshot,
  readSnapshot,
  seedPhase,
  runHsyncAndSnapshot,
};
