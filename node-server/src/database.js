const { MongoClient } = require('mongodb');
const { DB_NAME } = require('./config');
const { slugify } = require('./lib/products');

async function connectDatabase(uri) {
  if (!uri) throw new Error('MONGO_URI is not configured');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB_NAME);

  await createIndexes(db);
  await normalizeProductSlugs(db);
  await db.collection('products').createIndex({ slug: 1 }, { unique: true, sparse: true });

  return { client, db };
}

async function createIndexes(db) {
  await Promise.all([
    db.collection('users').createIndex('google_sub', {
      unique: true,
      partialFilterExpression: { google_sub: { $type: 'string' } },
    }),
    db.collection('users').createIndex({ email: 1 }, {
      name: 'email_unique_case_insensitive',
      unique: true,
      partialFilterExpression: { email: { $type: 'string' } },
      collation: { locale: 'en', strength: 2 },
    }),
    db.collection('product_reviews').createIndex({ product_id: 1 }),
    db.collection('orders').createIndex({ user_id: 1, checkout_version: 1 }, {
      name: 'user_checkout_version_unique',
      unique: true,
      partialFilterExpression: { checkout_version: { $type: 'string' } },
    }),
    db.collection('products').createIndex({ category: 1 }, { name: 'product_category_count' }),
  ]);
}

async function normalizeProductSlugs(db) {
  const usedSlugs = new Set();
  const products = db.collection('products').find({}, {
    projection: { name: 1, slug: 1 },
  }).sort({ _id: 1 });

  for await (const product of products) {
    const base = slugify(product.name);
    if (!base) continue;

    let slug = base;
    let suffix = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${suffix++}`;
    usedSlugs.add(slug);

    if (product.slug !== slug) {
      await db.collection('products').updateOne(
        { _id: product._id },
        { $set: { slug } },
      );
    }
  }
}

module.exports = { connectDatabase };
