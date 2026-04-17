const { URL } = require('node:url');
const { requireBearer } = require('./auth');
const {
  readSnapshot,
  runHsyncAndSnapshot,
  seedPhase,
} = require('./cstoreVerifier');

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function createApp({ config, sdk }) {
  return async function app(req, res) {
    try {
      const { pathname, searchParams } = new URL(req.url, 'http://localhost');

      if (req.method === 'GET' && pathname === '/health') {
        sendJson(res, 200, {
          ready: true,
          hostAlias: config.hostAlias,
          hostAddr: config.hostAddr,
          version: config.version,
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/seed') {
        if (!requireBearer(req, res, config.bearerToken)) {
          return;
        }
        const body = await readJsonBody(req);
        const payload = await seedPhase({
          sdk,
          hkey: body.hkey,
          sessionId: body.sessionId,
          phase: body.phase,
        });
        sendJson(res, 200, payload);
        return;
      }

      if (req.method === 'GET' && pathname === '/snapshot') {
        if (!requireBearer(req, res, config.bearerToken)) {
          return;
        }
        const payload = await readSnapshot({
          sdk,
          hkey: searchParams.get('hkey'),
        });
        sendJson(res, 200, payload);
        return;
      }

      if (req.method === 'POST' && pathname === '/hsync') {
        if (!requireBearer(req, res, config.bearerToken)) {
          return;
        }
        const body = await readJsonBody(req);
        const payload = await runHsyncAndSnapshot({
          sdk,
          hkey: body.hkey,
        });
        sendJson(res, 200, payload);
        return;
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
  };
}

module.exports = {
  createApp,
  readJsonBody,
  sendJson,
};
