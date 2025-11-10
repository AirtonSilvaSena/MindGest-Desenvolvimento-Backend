const crypto = require('crypto');

module.exports = function requestId(req, res, next) {
  const id = (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
};

