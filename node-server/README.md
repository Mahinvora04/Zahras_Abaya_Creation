# Node.js API

Express and MongoDB implementation intended to replace `server/app/main.py` while preserving its `/api` routes and MongoDB collections. It uses the same `MONGO_URI`, JWT, Google OAuth, admin, CORS, and cookie environment settings as the Python API. Copy `.env.example` to `.env`, install dependencies with `npm install`, then run `npm start`.

The API does not migrate database data; it reads and writes the existing `zahras_abaya` database. To keep existing image URLs, copy `server/uploads` to this server's configured `UPLOAD_DIR`. The frontend can continue using port 8000 locally.

This is a new implementation, so validate it against a staging database and frontend before switching production traffic. Do not run the Python and Node APIs against the same upload directory while editing files.
