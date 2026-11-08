const express = require('express');
module.exports = function createAccountsRoutes(context) {
  const {
    db,
    asyncRoute,
    err,
    json,
    userJson,
    oid,
    ObjectId,
    normalizePhone,
    auth
  } = context;
  const router = express.Router();
  router.put('/api/users/me', auth, asyncRoute(async (req, res) => {
    const set = {};
    for (const k of ['name', 'phone']) if (req.body[k] !== undefined) set[k] = req.body[k];
    if (!Object.keys(set).length) return err(res, 400, 'No data provided for update');
    if (set.phone) set.phone = normalizePhone(set.phone);
    await db.collection('users').updateOne({
      _id: req.user._id
    }, {
      $set: set
    });
    res.json({
      success: true,
      user: userJson(await db.collection('users').findOne({
        _id: req.user._id
      }))
    });
  }));
  router.post('/api/users/me/addresses', auth, asyncRoute(async (req, res) => {
    const a = {
      label: req.body.label || 'Home',
      address: req.body.address,
      pincode: req.body.pincode,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country || 'India',
      is_default: !!req.body.is_default,
      _id: new ObjectId()
    };
    if (!a.address || !a.pincode || !a.city || !a.state) return err(res, 400, 'Address, pincode, city, and state are required');
    const u = req.user;
    if (!(u.addresses || []).length) a.is_default = true;else if (a.is_default) await db.collection('users').updateOne({
      _id: u._id,
      'addresses.is_default': true
    }, {
      $set: {
        'addresses.$.is_default': false
      }
    });
    await db.collection('users').updateOne({
      _id: u._id
    }, {
      $push: {
        addresses: a
      }
    });
    res.json({
      success: true,
      user: userJson(await db.collection('users').findOne({
        _id: u._id
      }))
    });
  }));
  router.put('/api/users/me/addresses/:address_id', auth, asyncRoute(async (req, res) => {
    const aid = oid(req.params.address_id);
    if (!aid) return err(res, 404, 'Address not found');
    const set = {};
    for (const k of ['label', 'address', 'pincode', 'city', 'state', 'country', 'is_default']) if (req.body[k] !== undefined) set[`addresses.$.${k}`] = req.body[k];
    if (!Object.keys(set).length) return err(res, 400, 'No data provided');
    if (req.body.is_default === true) await db.collection('users').updateOne({
      _id: req.user._id,
      'addresses.is_default': true
    }, {
      $set: {
        'addresses.$.is_default': false
      }
    });
    const r = await db.collection('users').updateOne({
      _id: req.user._id,
      'addresses._id': aid
    }, {
      $set: set
    });
    if (!r.matchedCount) return err(res, 404, 'Address not found');
    res.json({
      success: true,
      user: userJson(await db.collection('users').findOne({
        _id: req.user._id
      }))
    });
  }));
  router.delete('/api/users/me/addresses/:address_id', auth, asyncRoute(async (req, res) => {
    const aid = oid(req.params.address_id),
      u = await db.collection('users').findOne({
        _id: req.user._id
      }),
      a = (u?.addresses || []).find(x => String(x._id) === req.params.address_id);
    if (!aid || !a) return err(res, 404, 'Address not found');
    await db.collection('users').updateOne({
      _id: u._id
    }, {
      $pull: {
        addresses: {
          _id: aid
        }
      }
    });
    if (a.is_default) {
      const after = await db.collection('users').findOne({
        _id: u._id
      });
      if (after.addresses?.length) await db.collection('users').updateOne({
        _id: u._id
      }, {
        $set: {
          'addresses.0.is_default': true
        }
      });
    }
    res.json({
      success: true,
      user: userJson(await db.collection('users').findOne({
        _id: u._id
      }))
    });
  }));
  router.get('/api/cart', auth, asyncRoute(async (req, res) => {
    let c = await db.collection('carts').findOne({
      user_id: req.user._id
    });
    if (!c) {
      const d = {
          user_id: req.user._id,
          items: [],
          updated_at: new Date()
        },
        r = await db.collection('carts').insertOne(d);
      c = {
        ...d,
        _id: r.insertedId
      };
      await db.collection('users').updateOne({
        _id: req.user._id
      }, {
        $set: {
          cart_id: String(r.insertedId)
        }
      });
    }
    const items = [];
    for (const i of c.items || []) {
      const p = await db.collection('products').findOne({
        _id: oid(i.product_id)
      });
      if (p) items.push({
        ...i,
        product: json(p)
      });
    }
    res.json({
      success: true,
      cart: {
        _id: String(c._id),
        items,
        updated_at: json(c.updated_at)
      }
    });
  }));
  router.post('/api/cart/items', auth, asyncRoute(async (req, res) => {
    const item = req.body || {},
      pid = oid(item.product_id);
    if (!pid) return err(res, 404, 'Product not found');
    const q = Number(item.quantity ?? 1);
    if (!Number.isSafeInteger(q) || q < 1 || q > 99) return err(res, 400, 'Quantity must be an integer between 1 and 99');
    const p = await db.collection('products').findOne({
      _id: pid
    });
    if (!p) return err(res, 404, 'Product not found');
    let vId = item.variant_id || item.selectedVariant?.variant_id,
      variant;
    if (p.variants?.length) {
      variant = p.variants.find(v => v.variant_id === vId) || p.variants.find(v => v.color === item.selectedVariant?.color && v.size === item.selectedVariant?.size);
      if (!variant) return err(res, 400, 'A valid product variant is required');
      if (variant.isAvailable === false) return err(res, 409, 'This variant is unavailable');
      vId = variant.variant_id;
      item.selectedVariant = {
        ...(item.selectedVariant || {}),
        ...variant
      };
    } else if (vId) return err(res, 400, 'This product has no variants');
    let c = await db.collection('carts').findOne({
      user_id: req.user._id
    });
    if (!c) {
      const r = await db.collection('carts').insertOne({
        user_id: req.user._id,
        items: [{
          product_id: String(pid),
          quantity: q,
          selectedVariant: item.selectedVariant,
          variant_id: vId
        }],
        updated_at: new Date()
      });
      await db.collection('users').updateOne({
        _id: req.user._id
      }, {
        $set: {
          cart_id: String(r.insertedId)
        }
      });
      return res.json({
        success: true,
        message: 'Item added to cart'
      });
    }
    const found = (c.items || []).find(i => i.product_id === String(pid) && (i.variant_id || null) === (vId || null));
    if (found) {
      const updated = await db.collection('carts').updateOne({
        _id: c._id
      }, [{
        $set: {
          items: {
            $map: {
              input: '$items',
              as: 'line',
              in: {
                $cond: [{
                  $and: [{
                    $eq: ['$$line.product_id', String(pid)]
                  }, {
                    $eq: [{
                      $ifNull: ['$$line.variant_id', null]
                    }, vId || null]
                  }]
                }, {
                  $mergeObjects: ['$$line', {
                    quantity: {
                      $min: [99, {
                        $add: [{
                          $ifNull: ['$$line.quantity', 1]
                        }, q]
                      }]
                    }
                  }]
                }, '$$line']
              }
            }
          },
          updated_at: new Date()
        }
      }]);
      if (!updated.matchedCount) return err(res, 404, 'Cart not found');
    } else await db.collection('carts').updateOne({
      _id: c._id
    }, {
      $push: {
        items: {
          product_id: String(pid),
          quantity: q,
          selectedVariant: item.selectedVariant,
          variant_id: vId
        }
      },
      $set: {
        updated_at: new Date()
      }
    });
    res.json({
      success: true,
      message: 'Item added to cart'
    });
  }));
  router.put('/api/cart/items/:product_id', auth, asyncRoute(async (req, res) => {
    const c = await db.collection('carts').findOne({
      user_id: req.user._id
    });
    if (!c) return err(res, 404, 'Cart not found');
    const vid = req.query.variant_id || req.body.variant_id,
      quantity = req.body.quantity === undefined ? undefined : Number(req.body.quantity);
    if (quantity !== undefined && quantity <= 0) {
      await db.collection('carts').updateOne({
        _id: c._id
      }, {
        $pull: {
          items: {
            product_id: req.params.product_id,
            variant_id: vid || null
          }
        },
        $set: {
          updated_at: new Date()
        }
      });
      return res.json({
        success: true,
        message: 'Item removed'
      });
    }
    if (quantity !== undefined && (!Number.isSafeInteger(quantity) || quantity > 99)) return err(res, 400, 'Quantity must be an integer between 1 and 99, or 0 to remove the item');
    const set = {
      'updated_at': new Date()
    };
    if (quantity !== undefined) set['items.$.quantity'] = quantity;
    if (req.body.selectedVariant !== undefined) {
      set['items.$.selectedVariant'] = req.body.selectedVariant;
      set['items.$.variant_id'] = req.body.variant_id || req.body.selectedVariant?.variant_id;
    }
    if (Object.keys(set).length > 1) await db.collection('carts').updateOne({
      _id: c._id,
      items: {
        $elemMatch: {
          product_id: req.params.product_id,
          variant_id: vid || null
        }
      }
    }, {
      $set: set
    });
    res.json({
      success: true,
      message: 'Cart updated'
    });
  }));
  router.delete('/api/cart/items/:product_id', auth, asyncRoute(async (req, res) => {
    const c = await db.collection('carts').findOne({
      user_id: req.user._id
    });
    if (!c) return err(res, 404, 'Cart not found');
    await db.collection('carts').updateOne({
      _id: c._id
    }, {
      $pull: {
        items: {
          product_id: req.params.product_id,
          variant_id: req.query.variant_id || null
        }
      },
      $set: {
        updated_at: new Date()
      }
    });
    res.json({
      success: true,
      message: 'Item removed'
    });
  }));
  router.delete('/api/cart', auth, asyncRoute(async (req, res) => {
    await db.collection('carts').updateOne({
      user_id: req.user._id
    }, {
      $set: {
        items: [],
        updated_at: new Date()
      }
    });
    res.json({
      success: true,
      message: 'Cart cleared'
    });
  }));
  return router;
};
