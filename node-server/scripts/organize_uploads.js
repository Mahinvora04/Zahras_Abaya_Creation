require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(__dirname, '..', '..');
const CLIENT_ROOT = path.join(ROOT, 'client');
const UPLOAD_DIR = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || './uploads');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.bmp', '.svg']);

function imageFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const result = [];
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...imageFiles(full));
    else if (item.isFile() && IMAGE_EXTENSIONS.has(path.extname(item.name).toLowerCase())) result.push(full);
  }
  return result;
}

function removeEmptyDirectories(directory) {
  if (!fs.existsSync(directory)) return;
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    if (item.isDirectory()) removeEmptyDirectories(path.join(directory, item.name));
  }
  if (directory !== UPLOAD_DIR && fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
}

function imageUrlPath(value) {
  if (typeof value !== 'string' || !value) return null;
  let pathname = value;
  try { if (/^https?:\/\//i.test(value)) pathname = new URL(value).pathname; } catch { return null; }
  return pathname.startsWith('/uploads/') && pathname !== '/uploads/' ? pathname : null;
}

function classify(relative) {
  const parts = relative.split(/[\\/]+/);
  const file = parts.at(-1).toLowerCase();
  if (parts[0] === 'products' || parts[0] === 'product-images') return path.join('products', ...parts.slice(1));
  if (parts[0] === 'banners') return path.join('banners', ...parts.slice(1));
  if (parts[0] === 'categories') return path.join('categories', ...parts.slice(1));
  if (parts[0] === 'about') return path.join('about', ...parts.slice(1));
  if (parts[0] === 'home') return path.join('home', ...parts.slice(1));
  if (parts[0] === 'frontend-assets') {
    const afterRoot = parts.slice(1);
    if (/^banner[-_]/i.test(file)) return path.join('banners', file);
    const category = afterRoot.find((part) => ['about', 'categories', 'home', 'banners', 'products'].includes(part.toLowerCase()));
    if (category) return path.join(category.toLowerCase(), ...afterRoot.slice(afterRoot.indexOf(category) + 1));
    if (/^banner[-_]/i.test(file)) return path.join('banners', parts.at(-1));
    return path.join('site', ...afterRoot.slice(1));
  }
  if (/^banner[-_]/i.test(file)) return path.join('banners', ...parts);
  if (/^category[-_]/i.test(file)) return path.join('categories', ...parts);
  return path.join('products', ...parts);
}

function rewriteValue(value, referenceSet, fileMoves) {
  const pathname = imageUrlPath(value);
  if (!pathname) return value;
  const relative = pathname.slice('/uploads/'.length);
  const targetRelative = fileMoves.get(relative);
  if (!targetRelative) {
    referenceSet.add(relative.replaceAll('\\', '/'));
    return value;
  }
  const nextPath = `/uploads/${targetRelative.replaceAll('\\', '/')}`;
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    url.pathname = nextPath;
    return url.toString();
  }
  return nextPath;
}

function rewriteDocument(value, key, fileMoves, changes) {
  if (Array.isArray(value)) return value.map((item) => rewriteDocument(item, key, fileMoves, changes));
  if (typeof value === 'string') {
    const next = rewriteValue(value, new Set(), fileMoves);
    if (next !== value) changes.push({ from: value, to: next });
    return next;
  }
  if (!value || typeof value !== 'object' || value instanceof Date || value._bsontype) return value;
  return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [
    childKey, rewriteDocument(child, childKey, fileMoves, changes),
  ]));
}

function collectReferences(value, key, refs) {
  if (Array.isArray(value)) return value.forEach((item) => collectReferences(item, key, refs));
  if (typeof value === 'string') {
    const pathname = imageUrlPath(value);
    if (pathname) refs.add(pathname.slice('/uploads/'.length).replaceAll('\\', '/'));
    return;
  }
  if (!value || typeof value !== 'object' || value instanceof Date || value._bsontype) return;
  Object.entries(value).forEach(([childKey, child]) => collectReferences(child, childKey, refs));
}

function collectFrontendLiteralReferences() {
  const refs = new Set();
  const sourceFiles = [];
  function visit(dir) {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) visit(full);
      else if (item.isFile() && /\.(jsx?|tsx?)$/i.test(item.name)) sourceFiles.push(full);
    }
  }
  visit(path.join(CLIENT_ROOT, 'src'));
  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(/['"`]([^'"`]*\/uploads\/[^'"`]*)['"`]/g)) {
      const pathname = imageUrlPath(match[1]);
      if (pathname) refs.add(pathname.slice('/uploads/'.length).replaceAll('\\', '/'));
    }
  }
  return refs;
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured in node-server/.env');
  const files = imageFiles(UPLOAD_DIR);
  const fileMoves = new Map();
  for (const file of files) {
    const oldRelative = path.relative(UPLOAD_DIR, file).replaceAll('\\', '/');
    const newRelative = classify(oldRelative).replaceAll('\\', '/');
    fileMoves.set(oldRelative, newRelative);
  }

  const mongo = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await mongo.connect();
    const db = mongo.db('zahras_abaya');
    const refs = collectFrontendLiteralReferences();
    const updates = [];
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    for (const { name } of collections) {
      const collection = db.collection(name);
      for await (const doc of collection.find({})) {
        collectReferences(doc, '', refs);
        const changes = [];
        const rewritten = rewriteDocument(doc, '', fileMoves, changes);
        if (changes.length) updates.push({ collection, doc, rewritten, changes });
      }
    }

    const referencedFiles = new Set();
    const missingReferences = [];
    for (const ref of refs) {
      const file = path.resolve(UPLOAD_DIR, ...ref.split('/'));
      if (file.startsWith(`${path.resolve(UPLOAD_DIR)}${path.sep}`) && fs.existsSync(file)) referencedFiles.add(ref);
      else missingReferences.push(ref);
    }
    const filesByOldPath = new Map(files.map((file) => [path.relative(UPLOAD_DIR, file).replaceAll('\\', '/'), file]));
    const moves = files.filter((file) => {
      const oldRelative = path.relative(UPLOAD_DIR, file).replaceAll('\\', '/');
      return fileMoves.get(oldRelative) !== oldRelative && referencedFiles.has(oldRelative);
    });
    const deletes = files.filter((file) => {
      const oldRelative = path.relative(UPLOAD_DIR, file).replaceAll('\\', '/');
      return !referencedFiles.has(oldRelative);
    });

    console.log(`Image files found: ${files.length}`);
    console.log(`Referenced image files: ${referencedFiles.size}`);
    console.log(`Referenced files to move: ${moves.length}`);
    console.log(`MongoDB documents needing path updates: ${updates.length}`);
    console.log(`Unreferenced image files to remove: ${deletes.length}`);
    console.log(`Missing referenced files: ${missingReferences.length}${missingReferences.length ? ` (${JSON.stringify(missingReferences)})` : ''}`);
    if (!APPLY) {
      console.log('Dry run only. Pass --apply to update MongoDB and reorganize/remove image files.');
      for (const file of deletes) console.log(`UNUSED ${path.relative(UPLOAD_DIR, file)}`);
      for (const file of moves) console.log(`MOVE ${path.relative(UPLOAD_DIR, file)} -> ${fileMoves.get(path.relative(UPLOAD_DIR, file).replaceAll('\\', '/'))}`);
      return;
    }
    if (missingReferences.length) throw new Error('Cannot apply while MongoDB or frontend references missing image files.');

    // Move only after validating each destination to avoid overwriting a different image.
    for (const file of moves) {
      const oldRelative = path.relative(UPLOAD_DIR, file).replaceAll('\\', '/');
      const destination = path.resolve(UPLOAD_DIR, fileMoves.get(oldRelative));
      if (!destination.startsWith(`${path.resolve(UPLOAD_DIR)}${path.sep}`)) throw new Error(`Unsafe move destination: ${destination}`);
      if (fs.existsSync(destination) && !fs.readFileSync(destination).equals(fs.readFileSync(file))) {
        throw new Error(`Destination already has different content: ${fileMoves.get(oldRelative)}`);
      }
    }
    for (const update of updates) {
      const { _id, ...fields } = update.rewritten;
      await update.collection.updateOne({ _id }, { $set: fields });
    }
    for (const file of moves) {
      const oldRelative = path.relative(UPLOAD_DIR, file).replaceAll('\\', '/');
      const destination = path.resolve(UPLOAD_DIR, fileMoves.get(oldRelative));
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      if (!fs.existsSync(destination)) fs.renameSync(file, destination);
      else fs.unlinkSync(file);
    }
    for (const file of deletes) fs.unlinkSync(file);
    removeEmptyDirectories(UPLOAD_DIR);
    console.log('MongoDB references updated, referenced images organized, and unreferenced images removed.');
  } finally {
    await mongo.close();
  }
}

main().catch((error) => {
  console.error(`Upload organization failed: ${error.message}`);
  process.exitCode = 1;
});
