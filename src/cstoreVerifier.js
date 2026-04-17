const crypto = require('node:crypto');

function createValue(sessionId, key, version) {
  return JSON.stringify({ sessionId: String(sessionId), key, version });
}

function buildExpectedSnapshots(sessionId) {
  const baseline = {
    k000: createValue(sessionId, 'k000', 'v1'),
    k001: createValue(sessionId, 'k001', 'v1'),
    k002: createValue(sessionId, 'k002', 'v1'),
    k003: createValue(sessionId, 'k003', 'v1'),
  };
  const delta = {
    k000: createValue(sessionId, 'k000', 'v2'),
    k001: createValue(sessionId, 'k001', 'v2'),
    k100: createValue(sessionId, 'k100', 'v1'),
    k101: createValue(sessionId, 'k101', 'v1'),
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
      normalized[key] = String(snapshot[key]);
      return normalized;
    }, {});
}

function digestSnapshot(snapshot) {
  const normalized = normalizeSnapshot(snapshot);
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

async function readSnapshot({ sdk, hkey }) {
  const rawSnapshot = (await sdk.cstore.hgetall({ hkey })) || {};
  const snapshot = normalizeSnapshot(rawSnapshot);

  return {
    snapshot,
    digest: digestSnapshot(snapshot),
    fieldCount: Object.keys(snapshot).length,
  };
}

async function seedPhase({ sdk, hkey, sessionId, phase }) {
  const snapshots = buildExpectedSnapshots(sessionId);
  let payload;

  if (phase === 'baseline') {
    payload = snapshots.baseline;
  } else if (phase === 'delta') {
    payload = snapshots.delta;
  } else {
    throw new Error(`Unknown phase: ${phase}`);
  }

  for (const [key, value] of Object.entries(payload)) {
    await sdk.cstore.hset({ hkey, key, value });
  }

  const snapshot = await readSnapshot({ sdk, hkey });

  return {
    phase,
    writtenFieldCount: Object.keys(payload).length,
    ...snapshot,
  };
}

async function runHsyncAndSnapshot({ sdk, hkey }) {
  const hsync = await sdk.cstore.hsync({ hkey });
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
