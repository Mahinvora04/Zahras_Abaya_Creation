const express = require('express');
module.exports = function createAuthRoutes(context) {
  const {
    db,
    authThrottle,
    asyncRoute,
    err,
    safeRegex,
    normalizePhone,
    bcrypt,
    cookie,
    tokenFor,
    userJson,
    OAuth2Client,
    auth
  } = context;
  const router = express.Router();
  router.post('/api/auth/register', authThrottle, asyncRoute(async (req, res) => {
    const {
      name,
      password
    } = req.body || {};
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!name || !email.includes('@') || !password) return err(res, 422, 'Invalid registration details');
    if (password.length < 6) return err(res, 400, 'Password must be 6+ chars');
    if (await db.collection('users').findOne({
      email: {
        $regex: `^${safeRegex(email)}$`,
        $options: 'i'
      }
    })) return err(res, 400, 'An account with this email already exists');
    const phone = req.body.phone?.trim() ? normalizePhone(req.body.phone) : null;
    const doc = {
      name,
      email,
      phone,
      phone_verified: false,
      password: await bcrypt.hash(password, 10),
      role: 'user'
    };
    let result;
    try {
      result = await db.collection('users').insertOne(doc);
    } catch (e) {
      if (e.code === 11000) return err(res, 409, 'An account with this email already exists');
      throw e;
    }
    cookie(res, tokenFor(result.insertedId));
    res.status(201).json({
      success: true,
      user: {
        _id: String(result.insertedId),
        name,
        email,
        phone,
        phone_verified: false,
        role: 'user'
      }
    });
  }));
  router.post('/api/auth/login', authThrottle, asyncRoute(async (req, res) => {
    const email = String(req.body?.email || '').toLowerCase(),
      u = await db.collection('users').findOne({
        email: {
          $regex: `^${safeRegex(email)}$`,
          $options: 'i'
        }
      });
    if (!u || !u.password || !(await bcrypt.compare(req.body?.password || '', u.password))) return err(res, 401, 'Invalid email or password');
    cookie(res, tokenFor(u._id));
    res.json({
      success: true,
      user: userJson(u)
    });
  }));
  router.post('/api/admin/login', authThrottle, asyncRoute(async (req, res) => {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
      password = process.env.ADMIN_PASSWORD || '';
    if (!email || !password) return err(res, 503, 'Admin credentials are not configured on the server');
    if (String(req.body?.email).toLowerCase() !== email || req.body?.password !== password) return err(res, 401, 'Invalid admin email or password');
    let u = await db.collection('users').findOne({
      email: {
        $regex: `^${safeRegex(email)}$`,
        $options: 'i'
      }
    });
    if (u && u.role != null && u.role !== 'admin') return err(res, 409, 'Admin email is already assigned to a customer account');
    if (!u) {
      try {
        const r = await db.collection('users').insertOne({
          email,
          name: 'Store Admin',
          role: 'admin'
        });
        u = await db.collection('users').findOne({
          _id: r.insertedId
        });
      } catch (e) {
        if (e.code !== 11000) throw e;
        u = await db.collection('users').findOne({
          email: {
            $regex: `^${safeRegex(email)}$`,
            $options: 'i'
          }
        });
        if (!u) throw e;
      }
    }
    if (u.role != null && u.role !== 'admin') return err(res, 409, 'Admin email is already assigned to a customer account');
    if (u.role !== 'admin') {
      await db.collection('users').updateOne({
        _id: u._id
      }, {
        $set: {
          role: 'admin'
        }
      });
      u.role = 'admin';
    }
    cookie(res, tokenFor(u._id));
    res.json({
      success: true,
      user: userJson(u)
    });
  }));
  router.post('/api/auth/google', authThrottle, asyncRoute(async (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) return err(res, 503, 'Google sign-in is not configured');
    let claims;
    try {
      const ticket = await new OAuth2Client(process.env.GOOGLE_CLIENT_ID).verifyIdToken({
        idToken: req.body?.credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      claims = ticket.getPayload();
    } catch {
      return err(res, 401, 'Invalid Google sign-in credential');
    }
    const sub = claims?.sub,
      email = String(claims?.email || '').trim().toLowerCase();
    if (!sub || !email || claims.email_verified !== true) return err(res, 401, 'Google did not provide a verified email address');
    let u = await db.collection('users').findOne({
      google_sub: sub
    });
    if (!u) {
      u = await db.collection('users').findOne({
        email: {
          $regex: `^${safeRegex(email)}$`,
          $options: 'i'
        }
      });
      if (u) {
        if (u.google_sub && u.google_sub !== sub) return err(res, 409, 'This account is linked to a different Google account');
        const r = await db.collection('users').updateOne({
          _id: u._id,
          google_sub: {
            $in: [null, sub]
          }
        }, {
          $set: {
            google_sub: sub
          }
        });
        if (!r.matchedCount) return err(res, 409, 'This account is linked to a different Google account');
        u.google_sub = sub;
      } else {
        const doc = {
          name: claims.name || email.split('@')[0],
          email,
          phone: null,
          phone_verified: false,
          google_sub: sub,
          role: 'user'
        };
        try {
          const r = await db.collection('users').insertOne(doc);
          u = {
            ...doc,
            _id: r.insertedId
          };
        } catch (e) {
          if (e.code !== 11000) throw e;
          u = await db.collection('users').findOne({
            $or: [{
              google_sub: sub
            }, {
              email: {
                $regex: `^${safeRegex(email)}$`,
                $options: 'i'
              }
            }]
          });
          if (!u) throw e;
        }
      }
    }
    cookie(res, tokenFor(u._id));
    res.json({
      success: true,
      user: userJson(u)
    });
  }));
  router.get('/api/auth/me', auth, (req, res) => res.json({
    success: true,
    user: userJson(req.user)
  }));
  router.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', {
      path: '/'
    });
    res.json({
      success: true,
      message: 'Logged out'
    });
  });
  return router;
};
