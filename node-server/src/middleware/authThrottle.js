const { err } = require('../lib/http');

// This in-memory limit is per process. Multi-instance deployments should use a
// shared rate-limit store so attempts count across workers.
function createAuthThrottle() {
  const attemptsByIp = new Map();
  const windowMs = 15 * 60 * 1000;

  const middleware = (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let record = attemptsByIp.get(key);

    if (!record || now >= record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
    }

    record.count += 1;
    attemptsByIp.set(key, record);

    if (record.count > 20) {
      res.set('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
      return err(res, 429, 'Too many authentication attempts. Try again later.');
    }

    return next();
  };

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of attemptsByIp) {
      if (now >= record.resetAt) attemptsByIp.delete(key);
    }
  }, windowMs);
  cleanup.unref();

  return middleware;
}

module.exports = { createAuthThrottle };
