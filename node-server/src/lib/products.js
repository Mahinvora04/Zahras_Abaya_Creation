const crypto = require('crypto');

const slugify = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/&/g, ' and ')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const sku = (name, color, size) => [name, color, size]
  .filter(Boolean)
  .map(slugify)
  .filter(Boolean)
  .join('-')
  .toUpperCase();

function variantProduct(req, existing) {
  const fields = req.body || {};
  let variants;

  if (Array.isArray(fields.variants)) {
    variants = fields.variants;
  } else if (existing?.variants?.length) {
    variants = existing.variants.map((variant) => ({ ...variant }));
    const selected = variants.find((variant) => variant.variant_id === existing.defaultVariantId) || variants[0];
    const variantFields = ['description', 'price', 'originalPrice', 'images', 'color', 'colorHex', 'size', 'sku', 'isAvailable'];
    for (const field of variantFields) {
      if (fields[field] !== undefined && fields[field] !== null) selected[field] = fields[field];
    }
  } else {
    variants = [{
      variant_id: crypto.randomUUID(),
      sku: fields.sku,
      size: fields.size || 'One Size',
      color: fields.color || 'Default',
      colorHex: fields.colorHex,
      description: fields.description || '',
      price: fields.price ?? 0,
      originalPrice: fields.originalPrice,
      images: fields.images || [],
      isAvailable: fields.isAvailable ?? true,
    }];
  }

  if (!variants.length) {
    throw Object.assign(new Error('A product must have at least one variant'), { status: 400 });
  }

  variants = variants.map((variant) => {
    const result = {
      ...variant,
      variant_id: variant.variant_id || crypto.randomUUID(),
      isAvailable: variant.isAvailable ?? true,
    };
    delete result.stock;
    delete result.discount;
    result.sku = sku(fields.name || existing?.name, result.color, result.size);
    return result;
  });

  return {
    ...(existing || {}),
    name: fields.name ?? existing?.name,
    category: fields.category ?? existing?.category,
    featured: fields.featured ?? existing?.featured ?? false,
    variants,
    defaultVariantId: variants[0].variant_id,
  };
}

async function uniqueSlug(db, name, exclude) {
  const base = slugify(name);
  if (!base) {
    throw Object.assign(new Error('Product name must contain letters or numbers'), { status: 400 });
  }

  let candidate = base;
  let suffix = 2;
  const query = () => ({
    slug: candidate,
    ...(exclude ? { _id: { $ne: exclude } } : {}),
  });

  while (await db.collection('products').findOne(query(), { projection: { _id: 1 } })) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}

module.exports = { slugify, sku, uniqueSlug, variantProduct };
