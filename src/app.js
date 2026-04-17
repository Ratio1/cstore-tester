const { URL } = require('node:url');
const { requireBearer } = require('./auth');
const {
  readSnapshot,
  runHsyncAndSnapshot,
  seedPhase,
} = require('./cstoreVerifier');

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

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
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isJsonObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateJsonObjectBody(body) {
  if (!isJsonObject(body)) {
    throw new HttpError(400, 'Bad Request');
  }
}

function validateSeedBody(body) {
  validateJsonObjectBody(body);

  if (!isNonEmptyString(body.hkey) || !isNonEmptyString(body.sessionId)) {
    throw new HttpError(400, 'Bad Request');
  }

  if (body.phase !== 'baseline' && body.phase !== 'delta') {
    throw new HttpError(400, 'Bad Request');
  }
}

function validateHkey(value) {
  if (!isNonEmptyString(value)) {
    throw new HttpError(400, 'Bad Request');
  }
}

function createApp({ config, sdk, logger = console }) {
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
        validateSeedBody(body);
        const payload = await seedPhase({
          sdk,
          hkey: body.hkey.trim(),
          sessionId: body.sessionId.trim(),
          phase: body.phase,
        });
        sendJson(res, 200, payload);
        return;
      }

      if (req.method === 'GET' && pathname === '/snapshot') {
        if (!requireBearer(req, res, config.bearerToken)) {
          return;
        }
        validateHkey(searchParams.get('hkey'));
        const payload = await readSnapshot({
          sdk,
          hkey: searchParams.get('hkey').trim(),
        });
        sendJson(res, 200, payload);
        return;
      }

      if (req.method === 'POST' && pathname === '/hsync') {
        if (!requireBearer(req, res, config.bearerToken)) {
          return;
        }
        const body = await readJsonBody(req);
        validateJsonObjectBody(body);
        validateHkey(body.hkey);
        const payload = await runHsyncAndSnapshot({
          sdk,
          hkey: body.hkey.trim(),
        });
        sendJson(res, 200, payload);
        return;
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(res, error.statusCode, { error: error.message });
        return;
      }

      logger.error(error);
      sendJson(res, 500, { error: 'Internal Server Error' });
    }
  };
}

module.exports = {
  createApp,
  HttpError,
  readJsonBody,
  sendJson,
  validateJsonObjectBody,
};
