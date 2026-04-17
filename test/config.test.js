const test = require('node:test');
const assert = require('node:assert/strict');

const { loadConfig } = require('../src/config');

test('loadConfig uses the plan defaults when env vars are missing', () => {
  const config = loadConfig({});

  assert.equal(config.bearerToken, 'dev-token');
  assert.equal(config.hostAlias, 'unknown-node');
  assert.equal(config.hostAddr, 'unknown-address');
});
