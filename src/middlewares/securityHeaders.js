module.exports = function securityHeaders(_req, res, next) {
  // Minimal hardening without external deps (helmet)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Avoid strict CSP to not break Swagger in dev; can be tightened in prod
  next();
};

