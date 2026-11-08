const express = require('express');
module.exports = function createProductsRoutes(context) {
  const {
    db,
    asyncRoute,
    err,
    json,
    oid,
    safeRegex,
    slugify,
    variantProduct,
    uniqueSlug,
    admin,
    idParam
  } = context;
  const router = express.Router();
  router.get('/api/products', asyncRoute(async (req, res) => {
    const page = req.query.page === undefined ? 1 : Number(req.query.page),
      limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) return err(res, 400, 'Page must be an integer between 1 and 10000');
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) return err(res, 400, 'Limit must be an integer between 1 and 100');
    const minPrice = req.query.minPrice === undefined ? undefined : Number(req.query.minPrice),
      maxPrice = req.query.maxPrice === undefined ? undefined : Number(req.query.maxPrice);
    if (minPrice !== undefined && !Number.isFinite(minPrice) || maxPrice !== undefined && !Number.isFinite(maxPrice) || minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) return err(res, 400, 'Price filters must be valid numbers and minimum cannot exceed maximum');
    const base = {
      isActive: {
        $ne: false
      }
    };
    if (req.query.featured === 'true') base.featured = true;
    if (req.query.category && req.query.category !== 'All') {
      const category = String(req.query.category).slice(0, 100),
        c = await db.collection('categories').findOne({
          name: {
            $regex: safeRegex(category),
            $options: 'i'
          }
        });
      base.category = c ? {
        $in: [c._id, c.name, c.query].filter(x => x != null)
      } : {
        $regex: `^${safeRegex(category)}$`,
        $options: 'i'
      };
    }
    if (req.query.search?.trim()) base.name = {
      $regex: safeRegex(String(req.query.search).slice(0, 100)),
      $options: 'i'
    };
    const prices = await db.collection('products').aggregate([{
      $match: base
    }, {
      $unwind: '$variants'
    }, {
      $group: {
        _id: null,
        minPrice: {
          $min: '$variants.price'
        },
        maxPrice: {
          $max: '$variants.price'
        }
      }
    }]).toArray();
    const filters = await db.collection('products').aggregate([{
      $match: base
    }, {
      $unwind: {
        path: '$variants',
        preserveNullAndEmptyArrays: true
      }
    }, {
      $group: {
        _id: null,
        sizes: {
          $addToSet: '$variants.size'
        },
        colors: {
          $addToSet: '$variants.color'
        }
      }
    }]).toArray();
    const p = prices[0] || {},
      f = filters[0] || {};
    const vc = {};
    if (minPrice !== undefined) vc.price = {
      $gte: minPrice
    };
    if (maxPrice !== undefined) (vc.price ||= {}).$lte = maxPrice;
    if (req.query.sizes) vc.size = {
      $in: String(req.query.sizes).split(',').map(x => x.trim())
    };
    if (req.query.colors) vc.color = {
      $in: String(req.query.colors).split(',').map(x => x.trim())
    };
    const query = {
      ...base
    };
    if (Object.keys(vc).length) query.variants = {
      $elemMatch: vc
    };
    const count = await db.collection('products').countDocuments(query);
    const sort = String(req.query.sort || 'newest');
    const field = sort.includes('price') ? 'variants.price' : sort === 'rating' ? 'rating' : '_id';
    const direction = ['newest', 'price-high', 'rating'].includes(sort) ? -1 : 1;
    const docs = await db.collection('products').find(query).sort(field, direction).skip((page - 1) * limit).limit(limit).toArray();
    res.json({
      success: true,
      products: docs.map(json),
      totalCount: count,
      totalPages: count ? Math.ceil(count / limit) : 1,
      currentPage: page,
      availableFilters: {
        minPrice: p.minPrice ?? 0,
        maxPrice: p.maxPrice ?? 10000,
        sizes: (f.sizes || []).filter(Boolean).map(String).sort(),
        colors: (f.colors || []).filter(Boolean).map(String).sort()
      }
    });
  }));
  router.get('/api/products/featured', asyncRoute(async (req, res) => res.json({
    success: true,
    products: (await db.collection('products').find({
      featured: true,
      isActive: {
        $ne: false
      }
    }).limit(5).toArray()).map(json)
  })));
  router.get('/api/products/:product_id', asyncRoute(async (req, res) => {
    const id = oid(req.params.product_id);
    const p = await db.collection('products').findOne(id ? {
      _id: id
    } : {
      slug: req.params.product_id
    });
    if (!p || p.isActive === false) return err(res, 404, 'Product not found');
    const reviews = await db.collection('product_reviews').find({
      product_id: String(p._id)
    }, {
      projection: {
        product_id: 1,
        variant_id: 1,
        rating: 1,
        title: 1,
        body: 1,
        reviewer_name: 1,
        created_at: 1,
        verified: 1,
        is_sample: 1
      }
    }).sort({
      created_at: -1
    }).limit(5000).toArray();
    p.reviews = reviews.map(r => ({
      id: String(r._id),
      rating: r.rating ?? 5,
      title: r.title || '',
      body: r.body || '',
      name: r.reviewer_name || 'Customer',
      created_at: r.created_at,
      verified: r.verified ?? true,
      is_sample: r.is_sample ?? false
    }));
    res.json({
      success: true,
      product: json(p)
    });
  }));
  router.post('/api/admin/products', admin, asyncRoute(async (req, res) => {
    const p = variantProduct(req);
    p.slug = await uniqueSlug(p.name);
    p.isActive = true;
    const r = await db.collection('products').insertOne(p);
    p._id = String(r.insertedId);
    res.status(201).json({
      success: true,
      product: p
    });
  }));
  router.get('/api/admin/products', admin, asyncRoute(async (req, res) => res.json({
    success: true,
    products: (await db.collection('products').find().sort({
      _id: -1
    }).limit(500).toArray()).map(json)
  })));
  router.get('/api/admin/products/:id', admin, idParam, asyncRoute(async (req, res) => {
    const p = req.objectId && (await db.collection('products').findOne({
      _id: req.objectId
    }));
    if (!p) return err(res, 404, 'Product not found');
    res.json({
      success: true,
      product: json(p)
    });
  }));
  router.put('/api/admin/products/:id', admin, idParam, asyncRoute(async (req, res) => {
    const old = req.objectId && (await db.collection('products').findOne({
      _id: req.objectId
    }));
    if (!old) return err(res, 404, 'Product not found');
    const p = variantProduct(req, old);
    p.slug = await uniqueSlug(p.name, old._id);
    await db.collection('products').updateOne({
      _id: old._id
    }, {
      $set: p
    });
    res.json({
      success: true,
      product: json(await db.collection('products').findOne({
        _id: old._id
      }))
    });
  }));
  router.delete('/api/admin/products/:id', admin, idParam, asyncRoute(async (req, res) => {
    const r = await db.collection('products').updateOne({
      _id: req.objectId
    }, {
      $set: {
        isActive: false
      }
    });
    if (!r.matchedCount) return err(res, 404, 'Product not found');
    res.json({
      success: true,
      message: 'Product unpublished'
    });
  }));
  router.patch('/api/admin/products/:id/listing', admin, idParam, asyncRoute(async (req, res) => {
    const active = String(req.query.is_active) === 'true';
    const r = await db.collection('products').updateOne({
      _id: req.objectId
    }, {
      $set: {
        isActive: active
      }
    });
    if (!r.matchedCount) return err(res, 404, 'Product not found');
    res.json({
      success: true,
      isActive: active
    });
  }));
  return router;
};
