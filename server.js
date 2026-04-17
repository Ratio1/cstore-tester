const http = require('node:http');
const { createApp } = require('./src/app');
const { loadConfig } = require('./src/config');
const { createSdk } = require('./src/sdk');

const config = loadConfig();
const sdk = createSdk();
const app = createApp({ config, sdk });

http.createServer(app).listen(config.port, config.listenHost, () => {
  console.log(`cstore-tester listening on ${config.listenHost}:${config.port}`);
});
