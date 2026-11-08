const jwt = require('jsonwebtoken');
const { err } = require('../lib/http');
const { oid } = require('../lib/mongo');

function createAuth({ db, algorithm, secret }) {
  function tokenFor(id) {
    if (!secret) throw new Error('JWT_SECRET is not configured');
    return jwt.sign({ sub: String(id) }, secret, {
      algorithm,
      expiresIn: `${Number(process.env.JWT_EXPIRES_IN_DAYS || 7)}d`,
    });
  }

  function cookie(res, token) {
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.ENVIRONMENT === 'production',
      sameSite: 'lax',
      maxAge: 7 * 86400000,
      path: '/',
    });
  }

  function auth(req, res, next) {
    try {
      if (!secret) return err(res, 503, 'Authentication is not configured');

      const token = req.cookies?.token || getCookie(req.headers.cookie, 'token');
      if (!token) return err(res, 401, 'Not authorized');

      const payload = jwt.verify(token, secret, { algorithms: [algorithm] });
      const userId = oid(payload.sub);
      if (!userId) return err(res, 401, 'Invalid token payload');

      db.collection('users').findOne({ _id: userId })
        .then((user) => {
          if (!user) return err(res, 401, 'User not found');
          req.user = user;
          return next();
        })
        .catch(next);
    } catch {
      return err(res, 401, 'Invalid token');
    }
  }

  const admin = (req, res, next) => auth(req, res, () => (
    req.user.role === 'admin' ? next() : err(res, 403, 'Admin access required')
  ));

  const idParam = (req, res, next) => {
    req.objectId = oid(
      req.params.id
      || req.params.product_id
      || req.params.order_id
      || req.params.category_id
      || req.params.slide_id
      || req.params.customer_id,
    );
    next();
  };

  return { admin, auth, cookie, idParam, tokenFor };
}

function getCookie(header, name) {
  const match = String(header || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

module.exports = { createAuth };
