const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildExpectedSnapshots,
  digestSnapshot,
  seedPhase,
} = require('../src/cstoreVerifier');

test('buildExpectedSnapshots returns the expected baseline, delta, and final snapshots', () => {
  const { baseline, delta, final } = buildExpectedSnapshots('session-1');

  assert.deepEqual(Object.keys(baseline), ['k000', 'k001', 'k002', 'k003']);
  assert.equal(JSON.parse(final.k000).version, 'v2');
  assert.equal(JSON.parse(final.k100).key, 'k100');
  assert.deepEqual(Object.keys(delta), ['k000', 'k001', 'k100', 'k101']);
});

test('seedPhase writes the baseline phase and returns a stable digest', async () => {
  const writes = [];
  const store = new Map();
  const sdk = {
    cstore: {
      async hset({ hkey, key, value }) {
        writes.push([hkey, key, value]);
        const current = store.get(hkey) ?? {};
        current[key] = value;
        store.set(hkey, current);
      },
      async hgetall({ hkey }) {
        return store.get(hkey) ?? {};
      },
    },
  };

  const result = await seedPhase({
    sdk,
    hkey: 'cstore:session-1',
    sessionId: 'session-1',
    phase: 'baseline',
  });

  const expectedSnapshot = {
    k000: JSON.stringify({ sessionId: 'session-1', key: 'k000', version: 'v1' }),
    k001: JSON.stringify({ sessionId: 'session-1', key: 'k001', version: 'v1' }),
    k002: JSON.stringify({ sessionId: 'session-1', key: 'k002', version: 'v1' }),
    k003: JSON.stringify({ sessionId: 'session-1', key: 'k003', version: 'v1' }),
  };

  assert.equal(result.phase, 'baseline');
  assert.equal(result.writtenFieldCount, 4);
  assert.equal(result.fieldCount, 4);
  assert.deepEqual(result.snapshot, expectedSnapshot);
  assert.equal(result.digest, digestSnapshot(expectedSnapshot));
  assert.deepEqual(writes, [
    [
      'cstore:session-1',
      'k000',
      JSON.stringify({ sessionId: 'session-1', key: 'k000', version: 'v1' }),
    ],
    [
      'cstore:session-1',
      'k001',
      JSON.stringify({ sessionId: 'session-1', key: 'k001', version: 'v1' }),
    ],
    [
      'cstore:session-1',
      'k002',
      JSON.stringify({ sessionId: 'session-1', key: 'k002', version: 'v1' }),
    ],
    [
      'cstore:session-1',
      'k003',
      JSON.stringify({ sessionId: 'session-1', key: 'k003', version: 'v1' }),
    ],
  ]);
});
