const http = require('node:http');
const { createApp } = require('./src/app');
const { loadConfig } = require('./src/config');
const { createSdk } = require('./src/sdk');

function startServer({ config = loadConfig(), sdk = createSdk(), logger = console } = {}) {
  const app = createApp({ config, sdk, logger });
  const server = http.createServer(app);

  server.listen(config.port, config.listenHost, () => {
    const address = server.address();
    const boundPort = typeof address === 'object' && address ? address.port : config.port;
    logger.log(
      `cstore-tester ${config.version} listening on ${config.listenHost}:${boundPort} ` +
        `for ${config.hostAlias}@${config.hostAddr}`,
    );
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
};
