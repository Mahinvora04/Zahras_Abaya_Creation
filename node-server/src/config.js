const path = require('path');

const PORT = Number(process.env.PORT || 8000);
const ALGORITHM = process.env.JWT_ALGORITHM || 'HS256';
const SECRET = process.env.JWT_SECRET;
const DB_NAME = 'zahras_abaya';
const UPLOAD_DIR = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || './uploads');

module.exports = { ALGORITHM, DB_NAME, PORT, SECRET, UPLOAD_DIR };
