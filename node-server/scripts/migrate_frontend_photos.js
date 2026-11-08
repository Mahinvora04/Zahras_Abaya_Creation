require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const REMOVE_CLIENT_FILES = process.argv.includes('--remove-client-files');
const CLIENT_ROOT = path.resolve(__dirname, '../../client');
const UPLOAD_DIR = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || './uploads');
const ASSET_PREFIX = 'frontend-assets';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const COLLECTIONS = ['slides', 'categories', 'products', 'carts', 'orders', 'features', 'product_reviews'];
const MISSING_PUBLIC_REFERENCES = new Set();
const LEGACY_PRODUCT_IMAGE_ALIASES = {
  '/images/products/floral-kaftan-1.jpg': '/uploads/floral-embroidered-kaftan-abaya-nude-1.jpg',
  '/images/products/floral-kaftan-2.jpg': '/uploads/floral-embroidered-kaftan-abaya-nude-1.jpg',
  '/images/products/layered-open-1.jpg': '/uploads/layered-open-abaya-grey-1.jpg',
  '/images/products/pearl-abaya-1.jpg': '/uploads/pearl-embellished-abaya-navy-1.jpg',
  '/images/products/jersey-hijab-1.jpg': '/uploads/jersey-hijab-set-navy-1.jpg',
  '/images/products/chiffon-hijab-1.jpg': '/uploads/premium-chiffon-hijab-dusty-pink-1.jpg',
  '/images/products/chiffon-hijab-2.jpg': '/uploads/premium-chiffon-hijab-dusty-pink-1.jpg',
};

function collectFrontendImages() {
  const sources = [
    path.join(CLIENT_ROOT, 'public', 'images'),
    path.join(CLIENT_ROOT, 'src', 'assets'),
  ];
  const images = [];

  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
      } else if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        const relative = path.relative(CLIENT_ROOT, fullPath);
        const normalized = relative.split(path.sep).join('/');
        if (normalized === 'src/assets/logo.png' || normalized === 'src/assets/logo.jpeg') continue;
        images.push({ source: fullPath, relative: normalized });
      }
    }
  }

  sources.forEach(visit);
  return images;
}

function destinationFor(relative) {
  return path.join(UPLOAD_DIR, ASSET_PREFIX, ...relative.split('/'));
}

function urlFor(relative) {
  return `/uploads/${ASSET_PREFIX}/${relative}`;
}

function copyFrontendImages(images) {
  for (const image of images) {
    const destination = destinationFor(image.relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.existsSync(destination)) {
      const sourceBytes = fs.readFileSync(image.source);
      const destinationBytes = fs.readFileSync(destination);
      if (!sourceBytes.equals(destinationBytes)) {
        throw new Error(`Destination already contains a different file: ${image.relative}`);
      }
      continue;
    }
    fs.copyFileSync(image.source, destination);
  }
}

function removeClientPhotos(images) {
  const clientRoot = path.resolve(CLIENT_ROOT);
  for (const image of images) {
    const source = path.resolve(image.source);
    const relative = path.relative(clientRoot, source);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Refusing to remove a file outside client/: ${source}`);
    }
    if (!fs.existsSync(destinationFor(image.relative))) {
      throw new Error(`Refusing to remove a photo without a Node copy: ${image.relative}`);
    }
  }

  for (const image of images) fs.unlinkSync(image.source);

  const directories = new Set(images.map((image) => path.dirname(image.source)));
  const candidates = new Set();
  for (const directory of directories) {
    let current = directory;
    while (current !== clientRoot && current.startsWith(`${clientRoot}${path.sep}`)) {
      candidates.add(current);
      current = path.dirname(current);
    }
  }
  for (const directory of [...candidates].sort((a, b) => b.length - a.length)) {
    if (fs.existsSync(directory) && fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
  }
}

function rewriteImageReference(value) {
  if (typeof value !== 'string' || !value) return value;

  let pathname = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      pathname = new URL(value).pathname;
    } catch {
      return value;
    }
  }

  if (pathname.startsWith('/images/')) {
    const legacyProductImage = LEGACY_PRODUCT_IMAGE_ALIASES[pathname];
    if (legacyProductImage) {
      const filename = path.basename(legacyProductImage);
      if (!fs.existsSync(path.join(UPLOAD_DIR, filename))) {
        throw new Error(`Legacy image alias points to a missing Node upload: ${filename}`);
      }
      return legacyProductImage;
    }

    const relative = `public${pathname}`;
    const sourcePath = path.resolve(CLIENT_ROOT, ...relative.split('/'));
    if (!fs.existsSync(sourcePath)) {
      MISSING_PUBLIC_REFERENCES.add(pathname);
      return value;
    }
    return urlFor(relative);
  }

  if (pathname.startsWith('/uploads/')) return pathname;
  return value;
}

const IMAGE_FIELD_NAMES = new Set([
  'image',
  'images',
  'image_url',
  'mobile_image',
  'desktop_image',
  'image_desktop',
  'image_mobile',
]);

function rewriteDocument(value, fieldName, changes) {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteDocument(item, fieldName, changes));
  }
  if (typeof value === 'string' && IMAGE_FIELD_NAMES.has(fieldName)) {
    const rewritten = rewriteImageReference(value);
    if (rewritten !== value) changes.push({ from: value, to: rewritten });
    return rewritten;
  }
  if (!value || typeof value !== 'object' || value instanceof Date || value._bsontype) return value;

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    rewriteDocument(item, key, changes),
  ]));
}

function findImageReferences(value, fieldName, references) {
  if (Array.isArray(value)) {
    value.forEach((item) => findImageReferences(item, fieldName, references));
    return;
  }
  if (typeof value === 'string' && IMAGE_FIELD_NAMES.has(fieldName) && MISSING_PUBLIC_REFERENCES.has(value)) {
    references.add(value);
    return;
  }
  if (!value || typeof value !== 'object' || value instanceof Date || value._bsontype) return;
  Object.entries(value).forEach(([key, item]) => findImageReferences(item, key, references));
}

async function planDatabaseChanges(db) {
  const plan = [];
  const unresolvedDocuments = [];
  for (const collectionName of COLLECTIONS) {
    const collection = db.collection(collectionName);
    const cursor = collection.find({});
    for await (const document of cursor) {
      const changes = [];
      const rewritten = rewriteDocument(document, '', changes);
      if (changes.length) plan.push({ collection, document, rewritten, changes });
      const unresolved = new Set();
      findImageReferences(document, '', unresolved);
      if (unresolved.size) unresolvedDocuments.push({
        collection: collectionName,
        id: String(document._id),
        label: document.name || document.title || document.order_number || document.product_name || null,
        unresolved: [...unresolved],
        items: (document.items || []).map((item) => ({
          product_name: item.product_name,
          color: item.color,
          images: item.images,
        })),
      });
    }
  }
  return { plan, unresolvedDocuments };
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured in node-server/.env');

  const images = collectFrontendImages();
  const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 7000 });
  try {
    await client.connect();
    const db = client.db('zahras_abaya');
    const { plan, unresolvedDocuments } = await planDatabaseChanges(db);
    const fieldChanges = plan.flatMap((entry) => entry.changes);
    const staticPathChanges = fieldChanges.filter((change) => change.from.includes('/images/')).length;
    const absoluteUploadChanges = fieldChanges.length - staticPathChanges;

    console.log(`Client photos to copy: ${images.length}`);
    console.log(`Database documents to update: ${plan.length}`);
    console.log(`Static front-end image references to migrate: ${staticPathChanges}`);
    console.log(`Absolute upload URLs to normalize: ${absoluteUploadChanges}`);
    if (MISSING_PUBLIC_REFERENCES.size) {
      console.log(`Unresolved front-end paths: ${[...MISSING_PUBLIC_REFERENCES].join(', ')}`);
      console.log(`Documents containing unresolved paths: ${JSON.stringify(unresolvedDocuments)}`);
    }
    if (!APPLY) {
      console.log('Dry run only. Pass --apply to copy image files and update MongoDB.');
      if (REMOVE_CLIENT_FILES) console.log('Pass --apply --remove-client-files to also remove the migrated client photo files.');
      return;
    }

    copyFrontendImages(images);
    for (const entry of plan) {
      const { _id, ...fields } = entry.rewritten;
      await entry.collection.updateOne({ _id }, { $set: fields });
    }

    const { plan: remainingChanges, unresolvedDocuments: remainingUnresolved } = await planDatabaseChanges(db);
    if (remainingChanges.length || remainingUnresolved.length) {
      throw new Error('MongoDB still contains unresolved front-end image references; source photos were retained.');
    }

    if (REMOVE_CLIENT_FILES) removeClientPhotos(images);

    console.log(`Copied photo assets into ${path.relative(path.resolve(__dirname, '..'), UPLOAD_DIR)}.`);
    console.log('MongoDB image references now point to the Node API upload directory.');
    if (REMOVE_CLIENT_FILES) console.log(`Removed ${images.length} photo files from client/.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(`Photo migration failed: ${error.message}`);
  process.exitCode = 1;
});
