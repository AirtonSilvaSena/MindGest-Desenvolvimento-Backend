// Simple in-memory rate limiter middleware (no external deps)
// Applies per key (e.g., IP) within a time window.

function rateLimit({ windowMs = 60000, max = 20, keyGenerator }) {
  const store = new Map();

  return function (req, res, next) {
    const key = keyGenerator ? keyGenerator(req) : req.ip;
    const now = Date.now();
    const entry = store.get(key) || { count: 0, reset: now + windowMs };

    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + windowMs;
    }
    entry.count += 1;
    store.set(key, entry);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(entry.reset / 1000)));

    if (entry.count > max) {
      return res.status(429).json({ message: 'Muitas tentativas, tente novamente mais tarde.' });
    }
    next();
  };
}

module.exports = rateLimit;

