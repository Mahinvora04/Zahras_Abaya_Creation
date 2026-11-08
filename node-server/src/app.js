const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const { ObjectId } = require('mongodb');
const { OAuth2Client } = require('google-auth-library');
const net = require('net');

const { ALGORITHM, SECRET, UPLOAD_DIR } = require('./config');
const { asyncRoute, err } = require('./lib/http');
const { json, oid, safeRegex, userJson } = require('./lib/mongo');
const { normalizePhone } = require('./lib/phone');
const { slugify, uniqueSlug, variantProduct } = require('./lib/products');
const { createUploadTools } = require('./lib/uploads');
const { createAuth } = require('./middleware/auth');
const { createAuthThrottle } = require('./middleware/authThrottle');

const createAuthRoutes = require('./routes/auth');
const createProductRoutes = require('./routes/products');
const createContentRoutes = require('./routes/content');
const createAdminRoutes = require('./routes/admin');
const createAccountRoutes = require('./routes/accounts');
const createOrderRoutes = require('./routes/orders');

function createApp(db) {
  const app = express();
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const isPrivateIpv4 = (address) => {
    if (!net.isIPv4(address)) return false;
    const [first, second] = address.split('.').map(Number);
    return first === 10
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168);
  };
  const isDevelopmentLanOrigin = (origin) => {
    if (process.env.ENVIRONMENT === 'production') return false;
    try {
      const url = new URL(origin);
      return url.protocol === 'http:' && url.port === '5173' && isPrivateIpv4(url.hostname);
    } catch {
      return false;
    }
  };
  const { deleteImage, saveFile, upload } = createUploadTools(UPLOAD_DIR);
  const authMiddleware = createAuth({ db, algorithm: ALGORITHM, secret: SECRET });

  app.use(cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin) || isDevelopmentLanOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use('/uploads', express.static(UPLOAD_DIR));

  const context = {
    db,
    ...authMiddleware,
    asyncRoute,
    authThrottle: createAuthThrottle(),
    bcrypt,
    crypto,
    deleteImage,
    err,
    json,
    normalizePhone,
    OAuth2Client,
    oid,
    ObjectId,
    safeRegex,
    saveFile,
    SECRET,
    slugify,
    uniqueSlug: (name, exclude) => uniqueSlug(db, name, exclude),
    upload,
    userJson,
    variantProduct,
  };

  const routeModules = [
    createAuthRoutes,
    createProductRoutes,
    createContentRoutes,
    createAdminRoutes,
    createAccountRoutes,
    createOrderRoutes,
  ];
  for (const createRoutes of routeModules) app.use(createRoutes(context));

  app.use((req, res) => err(res, 404, 'Not found'));
  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);

    const status = error.status || (error instanceof multer.MulterError ? 413 : 500);
    const detail = error.status
      ? error.message
      : error instanceof multer.MulterError
        ? 'Image must be 8 MB or smaller'
        : 'Internal server error';
    return res.status(status).json({ detail });
  });

  return app;
}

module.exports = { createApp };
