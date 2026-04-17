const { version } = require('../package.json');

function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT || 3000),
    listenHost: env.LISTEN_HOST || '0.0.0.0',
    bearerToken: env.CSTORE_TESTER_BEARER_TOKEN || '',
    hostAlias: env.R1EN_HOST_ID || env.EE_HOST_ID || '',
    hostAddr: env.R1EN_HOST_ADDR || env.EE_HOST_ADDR || '',
    version,
  };
}

module.exports = {
  loadConfig,
};
