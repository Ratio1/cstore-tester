function requireBearer(req, res, token) {
  const header = req.headers.authorization || '';
  const expected = `Bearer ${token}`;

  if (!token || header !== expected) {
    res.statusCode = 401;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return false;
  }

  return true;
}

module.exports = {
  requireBearer,
};
