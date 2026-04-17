const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../src/app');

async function listenApp(app) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  return {
    port,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function request(port, method, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: options.headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return {
    status: response.status,
    json: await response.json(),
  };
}

test('GET /health is open and reports host identity', async () => {
  const app = createApp({
    config: {
      hostAlias: 'thorn-01',
      hostAddr: '10.0.0.1',
      version: '0.1.0',
      bearerToken: 'secret',
    },
    sdk: {},
  });
  const server = await listenApp(app);

  try {
    const response = await request(server.port, 'GET', '/health');

    assert.equal(response.status, 200);
    assert.deepEqual(response.json, {
      ready: true,
      hostAlias: 'thorn-01',
      hostAddr: '10.0.0.1',
      version: '0.1.0',
    });
  } finally {
    await server.close();
  }
});

test('protected routes reject a missing bearer token', async () => {
  const app = createApp({
    config: {
      hostAlias: 'thorn-01',
      hostAddr: '10.0.0.1',
      version: '0.1.0',
      bearerToken: 'secret',
    },
    sdk: {},
  });
  const server = await listenApp(app);

  try {
    const response = await request(server.port, 'GET', '/snapshot?hkey=test');

    assert.equal(response.status, 401);
    assert.deepEqual(response.json, { error: 'Unauthorized' });
  } finally {
    await server.close();
  }
});

test('POST /seed and POST /hsync return structured JSON payloads', async () => {
  const store = new Map();
  const sdk = {
    async hset(hkey, field, value) {
      const current = store.get(hkey) ?? {};
      current[field] = value;
      store.set(hkey, current);
    },
    async hgetall(hkey) {
      return store.get(hkey) ?? {};
    },
    async hsync() {
      return { synced: true };
    },
  };

  const app = createApp({
    config: {
      hostAlias: 'thorn-01',
      hostAddr: '10.0.0.1',
      version: '0.1.0',
      bearerToken: 'secret',
    },
    sdk,
  });
  const server = await listenApp(app);

  try {
    const seedResponse = await request(server.port, 'POST', '/seed', {
      headers: {
        authorization: 'Bearer secret',
        'content-type': 'application/json',
      },
      body: {
        hkey: 'cstore:session-1',
        sessionId: 'session-1',
        phase: 'baseline',
      },
    });

    assert.equal(seedResponse.status, 200);
    assert.equal(seedResponse.json.phase, 'baseline');
    assert.equal(seedResponse.json.writtenFieldCount, 4);
    assert.equal(seedResponse.json.fieldCount, 4);
    assert.equal(typeof seedResponse.json.digest, 'string');
    assert.ok(seedResponse.json.snapshot.k000);

    const hsyncResponse = await request(server.port, 'POST', '/hsync', {
      headers: {
        authorization: 'Bearer secret',
        'content-type': 'application/json',
      },
      body: {
        hkey: 'cstore:session-1',
      },
    });

    assert.equal(hsyncResponse.status, 200);
    assert.equal(hsyncResponse.json.hsync.synced, true);
    assert.equal(typeof hsyncResponse.json.digest, 'string');
    assert.ok(hsyncResponse.json.snapshot.k000);
  } finally {
    await server.close();
  }
});
