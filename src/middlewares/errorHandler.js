const logger = require('../utils/logger');

// Central error handler: uniform JSON response
module.exports = function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.expose ? err.message : (status >= 500 ? 'Erro interno do servidor' : err.message);
  const payload = {
    code,
    message,
    path: req.originalUrl,
    requestId: req.id
  };
  logger.error('request_error', { status, code, path: req.originalUrl, requestId: req.id, err: { message: err.message, stack: err.stack } });
  res.status(status).json(payload);
};

