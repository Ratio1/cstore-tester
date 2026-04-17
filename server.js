const http = require('node:http');
const { createApp } = require('./src/app');
const { loadConfig } = require('./src/config');
const { createSdk } = require('./src/sdk');

function startServer({ config = loadConfig(), sdk = createSdk(), logger = console } = {}) {
  const app = createApp({ config, sdk });
  const server = http.createServer(app);

  server.listen(config.port, config.listenHost, () => {
    logger.log(
      `cstore-tester ${config.version} listening on ${config.listenHost}:${config.port} ` +
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
