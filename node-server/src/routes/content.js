const express = require('express');
module.exports = function createContentRoutes(context) {
  const {
    db,
    asyncRoute,
    err,
    json,
    safeRegex,
    admin,
    idParam,
    upload,
    slugify,
    saveFile,
    deleteImage
  } = context;
  const router = express.Router();
  router.get('/api/admin/categories', admin, asyncRoute(async (req, res) => res.json({
    success: true,
    categories: (await db.collection('categories').find().sort({
      order: 1
    }).limit(500).toArray()).map(json)
  })));
  router.post('/api/admin/categories', admin, asyncRoute(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    if (!name || name.length > 60) return err(res, 400, 'Category name is required');
    if (await db.collection('categories').findOne({
      name: {
        $regex: `^${safeRegex(name)}$`,
        $options: 'i'
      }
    })) return err(res, 409, 'A category with this name already exists');
    const first = await db.collection('categories').findOne({
      image: {
        $type: 'string',
        $ne: ''
      }
    }, {
      projection: {
        image: 1
      }
    });
    const doc = {
      name,
      query: name,
      count: '',
      image: first?.image || '',
      order: await db.collection('categories').countDocuments({}),
      isActive: true
    };
    const r = await db.collection('categories').insertOne(doc);
    doc._id = String(r.insertedId);
    res.status(201).json({
      success: true,
      category: doc
    });
  }));
  router.delete('/api/admin/categories/:category_id', admin, idParam, asyncRoute(async (req, res) => {
    const c = req.objectId && (await db.collection('categories').findOne({
      _id: req.objectId
    }));
    if (!c) return err(res, 404, 'Category not found');
    const vals = [c._id, c.name, c.query].filter(x => x != null);
    const n = await db.collection('products').countDocuments({
      category: {
        $in: vals
      }
    });
    if (n) return err(res, 409, `This category is used by ${n} product(s). Move those products to another category before deleting it.`);
    await db.collection('categories').deleteOne({
      _id: c._id
    });
    res.json({
      success: true,
      message: 'Category deleted'
    });
  }));
  router.put('/api/admin/categories/:category_id/image', admin, idParam, asyncRoute(async (req, res) => {
    const r = await db.collection('categories').updateOne({
      _id: req.objectId
    }, {
      $set: {
        image: String(req.body?.image || '').trim()
      }
    });
    if (!r.matchedCount) return err(res, 404, 'Category not found');
    res.json({
      success: true,
      category: json(await db.collection('categories').findOne({
        _id: req.objectId
      }))
    });
  }));
  router.get('/api/admin/slides', admin, asyncRoute(async (req, res) => res.json({
    success: true,
    slides: (await db.collection('slides').find().sort({
      order: 1
    }).limit(100).toArray()).map(json)
  })));
  router.post('/api/admin/slides', admin, asyncRoute(async (req, res) => {
    const d = slideBody(req.body);
    if (!d) return err(res, 400, 'Slide title and image are required');
    const r = await db.collection('slides').insertOne(d);
    d._id = String(r.insertedId);
    res.status(201).json({
      success: true,
      slide: d
    });
  }));
  router.put('/api/admin/slides/:slide_id', admin, idParam, asyncRoute(async (req, res) => {
    const old = req.objectId && (await db.collection('slides').findOne({
        _id: req.objectId
      })),
      d = slideBody(req.body);
    if (!old) return err(res, 404, 'Banner not found');
    if (!d) return err(res, 400, 'Banner needs a title, horizontal desktop image, and vertical mobile image');
    await db.collection('slides').updateOne({
      _id: old._id
    }, {
      $set: d
    });
    for (const key of ['image', 'mobile_image']) if (old[key] !== d[key]) deleteImage(old[key]);
    res.json({
      success: true,
      slide: json(await db.collection('slides').findOne({
        _id: old._id
      }))
    });
  }));
  router.put('/api/admin/slides/:slide_id/order', admin, idParam, asyncRoute(async (req, res) => {
    const slides = await db.collection('slides').find().sort({
        order: 1,
        _id: 1
      }).limit(100).toArray(),
      i = slides.findIndex(s => s._id.equals(req.objectId)),
      target = Number(req.body?.order) - 1;
    if (i < 0) return err(res, 404, 'Banner not found');
    if (!Number.isInteger(target) || target < 0 || target >= slides.length) return err(res, 400, 'Choose an order within the current banner count');
    if (i !== target) {
      const a = slides[i].order ?? i,
        b = slides[target].order ?? target;
      await db.collection('slides').updateOne({
        _id: slides[i]._id
      }, {
        $set: {
          order: b
        }
      });
      await db.collection('slides').updateOne({
        _id: slides[target]._id
      }, {
        $set: {
          order: a
        }
      });
    }
    res.json({
      success: true,
      slides: (await db.collection('slides').find().sort({
        order: 1,
        _id: 1
      }).limit(100).toArray()).map(json)
    });
  }));
  router.delete('/api/admin/slides/:slide_id', admin, idParam, asyncRoute(async (req, res) => {
    const s = req.objectId && (await db.collection('slides').findOne({
      _id: req.objectId
    }));
    if (!s) return err(res, 404, 'Banner not found');
    await db.collection('slides').deleteOne({
      _id: s._id
    });
    for (const image of new Set([s.image, s.mobile_image])) deleteImage(image);
    res.json({
      success: true,
      message: 'Banner deleted'
    });
  }));
  function slideBody(b = {}) {
    const title = String(b.title || '').trim(),
      image = String(b.image || '').trim(),
      mobile_image = String(b.mobile_image || '').trim();
    if (!title || title.length > 120 || !image || !mobile_image) return null;
    return {
      title,
      image,
      mobile_image,
      tagline: String(b.tagline || '').trim(),
      subtitle: String(b.subtitle || '').trim(),
      link: String(b.link || '/products').trim(),
      cta: String(b.cta || 'Shop Now').trim(),
      order: Number(b.order) || 0
    };
  }
  router.post('/api/admin/uploads/images', admin, upload.array('files', 10), asyncRoute(async (req, res) => {
    const a = slugify(req.body.product_name),
      b = slugify(req.body.color);
    if (!a || !b) return err(res, 400, 'Enter the product name and color before uploading images');
    if (!req.files?.length) return err(res, 400, 'Select at least one image');
    const urls = req.files.map((file) => `/uploads/${saveFile(`${a}-${b}`, file, 'products')}`);
    res.json({
      success: true,
      images: urls
    });
  }));
  router.delete('/api/admin/uploads/images', admin, asyncRoute(async (req, res) => res.json({
    success: true,
    deleted: deleteImage(req.body?.image_url)
  })));
  router.post('/api/admin/uploads/banners', admin, upload.single('file'), asyncRoute(async (req, res) => {
    const p = slugify(req.body.title);
    if (!p || !req.file) return err(res, 400, 'Enter a banner title and select an image');
    res.json({
      success: true,
      image: `/uploads/${saveFile(`banner-${p}`, req.file, 'banners')}`
    });
  }));
  router.post('/api/admin/uploads/categories', admin, upload.single('file'), asyncRoute(async (req, res) => {
    const p = slugify(req.body.category_name);
    if (!p || !req.file) return err(res, 400, 'Category name and image are required');
    res.json({
      success: true,
      image: `/uploads/${saveFile(`category-${p}`, req.file, 'categories')}`
    });
  }));

  router.get('/api/content/homepage', asyncRoute(async (req, res) => {
    const [slides, categories, features] = await Promise.all([
      db.collection('slides').find().sort({ order: 1 }).limit(10).toArray(),
      db.collection('categories').find({ isActive: true }).sort({ order: 1 }).limit(10).toArray(),
      db.collection('features').find().sort({ order: 1 }).limit(10).toArray(),
    ]);

    const categoriesWithCounts = await Promise.all(categories.map(async (category) => {
      const categoryValues = [category._id, String(category._id), category.name, category.query]
        .filter(Boolean);
      const productCount = await db.collection('products').countDocuments({
        isActive: { $ne: false },
        category: { $in: categoryValues },
      });
      return { ...category, productCount };
    }));

    res.json({
      success: true,
      data: {
        slides: slides.map(json),
        categories: categoriesWithCounts.map(json),
        features: features.map(json),
        first_feature: json(features[0] || null),
        last_feature: json(features.at(-1) || null),
      },
    });
  }));

  return router;
};
