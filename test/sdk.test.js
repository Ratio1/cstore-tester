const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');

const { createSdk, resolveCstoreUrl } = require('../src/sdk');

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

test('resolveCstoreUrl prefers EE_CHAINSTORE_API_URL and adds http protocol', () => {
  const url = resolveCstoreUrl({ EE_CHAINSTORE_API_URL: '127.0.0.1:31234' });
  assert.equal(url, 'http://127.0.0.1:31234');
});

test('createSdk talks to the local CStore HTTP API shape', async () => {
  const requests = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null;
      requests.push({ method: req.method, url: req.url, body });
      res.setHeader('content-type', 'application/json; charset=utf-8');

      if (req.url.startsWith('/hgetall')) {
        res.end(JSON.stringify({ result: { k000: 'v1' } }));
        return;
      }

      if (req.url === '/hset') {
        res.end(JSON.stringify({ result: true }));
        return;
      }

      if (req.url === '/hsync') {
        res.end(JSON.stringify({ result: { hkey: 'players', merged_fields: 2 } }));
        return;
      }

      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'not found' }));
    });
  });

  await listen(server);
  const address = server.address();
  const sdk = createSdk({ cstoreUrl: `127.0.0.1:${address.port}` });

  try {
    assert.equal(await sdk.cstore.hset({ hkey: 'players', key: 'k000', value: 'v1' }), true);
    assert.deepEqual(await sdk.cstore.hgetall({ hkey: 'players' }), { k000: 'v1' });
    assert.deepEqual(await sdk.cstore.hsync({ hkey: 'players' }), { hkey: 'players', merged_fields: 2 });
  } finally {
    await close(server);
  }

  assert.deepEqual(requests, [
    {
      method: 'POST',
      url: '/hset',
      body: { hkey: 'players', key: 'k000', value: 'v1', chainstore_peers: [] },
    },
    {
      method: 'GET',
      url: '/hgetall?hkey=players',
      body: null,
    },
    {
      method: 'POST',
      url: '/hsync',
      body: { hkey: 'players', chainstore_peers: [] },
    },
  ]);
});
