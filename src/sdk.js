function ensureProtocol(url) {
  return /^https?:\/\//i.test(url) ? url : `http://${url}`;
}

function resolveCstoreUrl(env = process.env) {
  return ensureProtocol(env.CSTORE_API_URL || env.EE_CHAINSTORE_API_URL || 'localhost:31234');
}

async function parseJsonResponse(response) {
  if (!response.ok) {
    throw new Error(`CStore request failed with status ${response.status}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`Failed to parse CStore response: ${error}`);
  }

  return payload.result;
}

function createCstoreClient({ baseUrl, fetchImpl, verbose = false }) {
  async function request(path, options) {
    const url = `${baseUrl}${path}`;
    if (verbose) {
      console.debug('[cstore-tester] request', { url, method: options.method });
    }
    const response = await fetchImpl(url, options);
    return await parseJsonResponse(response);
  }

  return {
    async hset({ hkey, key, value }) {
      return await request('/hset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hkey, key, value, chainstore_peers: [] }),
      });
    },

    async hgetall({ hkey }) {
      const params = new URLSearchParams({ hkey });
      return await request(`/hgetall?${params.toString()}`, {
        method: 'GET',
      });
    },

    async hsync({ hkey }) {
      return await request('/hsync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hkey, chainstore_peers: [] }),
      });
    },
  };
}

function createSdk({ cstoreUrl, fetchImpl = globalThis.fetch, verbose = false } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch implementation is required');
  }

  return {
    cstore: createCstoreClient({
      baseUrl: (cstoreUrl ? ensureProtocol(cstoreUrl) : resolveCstoreUrl()).replace(/\/+$/, ''),
      fetchImpl,
      verbose,
    }),
  };
}

module.exports = {
  createSdk,
  ensureProtocol,
  resolveCstoreUrl,
};
