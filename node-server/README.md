# Node.js API

Express and MongoDB implementation intended to replace `server/app/main.py` while preserving its `/api` routes and MongoDB collections. It uses the same `MONGO_URI`, JWT, Google OAuth, admin, CORS, and cookie environment settings as the Python API. Copy `.env.example` to `.env`, install dependencies with `npm install`, then run `npm start`.

## Source layout

- `src/server.js` loads environment settings, connects to MongoDB, and starts the HTTP server.
- `src/app.js` configures Express middleware, shared dependencies, route registration, and error handling.
- `src/database.js` creates indexes and normalizes existing product slugs at startup.
- `src/config.js` contains server and upload configuration.
- `src/routes/` groups endpoints into authentication, products, content, admin, accounts, and orders.
- `src/middleware/` contains authentication and authentication rate limiting.
- `src/lib/` contains shared HTTP, MongoDB, phone, product, and upload helpers.

The API does not migrate database data; it reads and writes the existing `zahras_abaya` database. To keep existing image URLs, copy `server/uploads` to this server's configured `UPLOAD_DIR`. The frontend can continue using port 8000 locally.

## Upload image layout

Uploaded images are stored in `uploads/` by purpose, and MongoDB image URLs use the same relative folders:

- `uploads/products/` — product photos
- `uploads/banners/` — desktop and mobile banner images
- `uploads/categories/` — category tiles
- `uploads/about/` — About page photography
- `uploads/home/` — other home page photography

Admin uploads go into `products/`, `banners/`, or `categories/` automatically. To review existing image references and unused upload files, run `node scripts/organize_uploads.js` from this folder. Add `--apply` only when you intend to update MongoDB paths, move referenced files, and delete image files not referenced by any MongoDB collection or frontend source.

This is a new implementation, so validate it against a staging database and frontend before switching production traffic. Do not run the Python and Node APIs against the same upload directory while editing files.
