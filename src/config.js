const { version } = require('../package.json');

function parsePort(value) {
  const port = Number(value ?? 3000);

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}

function loadConfig(env = process.env) {
  return {
    port: parsePort(env.PORT),
    listenHost: env.LISTEN_HOST || '0.0.0.0',
    bearerToken: env.CSTORE_TESTER_BEARER_TOKEN || 'dev-token',
    hostAlias: env.R1EN_HOST_ID || env.EE_HOST_ID || 'unknown-node',
    hostAddr: env.R1EN_HOST_ADDR || env.EE_HOST_ADDR || 'unknown-address',
    version,
  };
}

module.exports = {
  parsePort,
  loadConfig,
};
