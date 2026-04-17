function createSdk() {
  const imported = require('@ratio1/edge-sdk-ts');
  const EdgeSdk = imported.EdgeSdk || imported.default || imported;

  return new EdgeSdk({ verbose: false });
}

module.exports = {
  createSdk,
};
