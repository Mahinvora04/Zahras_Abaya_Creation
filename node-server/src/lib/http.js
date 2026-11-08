const err = (res, status, detail) => res.status(status).json({ detail });

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

module.exports = { asyncRoute, err };
