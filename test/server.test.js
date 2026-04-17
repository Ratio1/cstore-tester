const test = require('node:test');
const assert = require('node:assert/strict');

const { startServer } = require('../server');

test('startServer logs version, hostAlias, and hostAddr', async () => {
  const logs = [];
  const server = startServer({
    config: {
      port: 0,
      listenHost: '127.0.0.1',
      version: '0.1.0',
      hostAlias: 'thorn-01',
      hostAddr: '10.0.0.1',
    },
    sdk: {
      cstore: {
        hgetall: async () => ({}),
        hset: async () => ({}),
        hsync: async () => ({}),
      },
    },
    logger: {
      log: (message) => logs.push(message),
    },
  });

  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  await new Promise((resolve) => server.close(resolve));

  assert.equal(logs.length, 1);
  assert.equal(typeof address.port, 'number');
  assert.match(
    logs[0],
    new RegExp(
      `cstore-tester 0\\.1\\.0 listening on 127\\.0\\.0\\.1:${address.port} for thorn-01@10\\.0\\.0\\.1`,
    ),
  );
});
