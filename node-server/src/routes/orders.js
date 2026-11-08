const express = require('express');
module.exports = function createOrdersRoutes(context) {
  const {
    db,
    asyncRoute,
    err,
    json,
    oid,
    idParam,
    crypto,
    auth,
    admin
  } = context;
  const router = express.Router();
  router.post('/api/orders', auth, asyncRoute(async (req, res) => {
    const paymentMethod = req.body?.payment_method || 'on_delivery';
    if (!['on_delivery', 'upi'].includes(paymentMethod)) return err(res, 400, 'Select a valid payment method');
    const address = (req.user.addresses || []).find(a => String(a._id) === String(req.body.address_id));
    if (!address) return err(res, 400, 'Choose a saved delivery address');
    if (!req.user.phone) return err(res, 400, 'Add a phone number before placing an order');
    const c = await db.collection('carts').findOne({
      user_id: req.user._id
    });
    if (!c?.items?.length) return err(res, 400, 'Your cart is empty');
    let subtotal = 0,
      items = [];
    for (const line of c.items) {
      const quantity = Number(line.quantity);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) return err(res, 400, 'A cart item has an invalid quantity; update it before checkout');
      const p = await db.collection('products').findOne({
        _id: oid(line.product_id)
      });
      if (!p) return err(res, 400, 'A product in your cart is no longer available');
      let v = (p.variants || []).find(x => x.variant_id === (line.variant_id || line.selectedVariant?.variant_id));
      if (!v && line.selectedVariant) v = (p.variants || []).find(x => x.color === line.selectedVariant.color && x.size === line.selectedVariant.size);
      if (p.variants?.length && !v) return err(res, 400, `Choose an available variant for ${p.name || 'a product'}`);
      if (v?.isAvailable === false) return err(res, 409, `${p.name || 'A product'} is no longer available`);
      const sel = v || line.selectedVariant || {},
        price = Number(sel.price ?? p.price ?? 0),
        total = price * quantity;
      subtotal += total;
      items.push({
        product_id: String(p._id),
        product_name: p.name || 'Product',
        variant_id: sel.variant_id,
        color: sel.color,
        size: sel.size,
        sku: sel.sku,
        description: sel.description ?? p.description,
        price,
        quantity,
        line_total: total,
        images: sel.images ?? p.images ?? [],
        review: null
      });
    }
    const checkoutVersion = crypto.createHash('sha256').update(JSON.stringify({
      cart: String(c._id),
      updated_at: c.updated_at instanceof Date ? c.updated_at.toISOString() : String(c.updated_at || ''),
      payment_method: paymentMethod,
      items: c.items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        variant_id: i.variant_id || i.selectedVariant?.variant_id || null
      }))
    })).digest('hex');
    const now = new Date(),
      order = {
        order_number: `ZAH-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        user_id: req.user._id,
        checkout_version: checkoutVersion,
        payment_method: paymentMethod,
        items,
        shipping_address: json(address),
        phone: req.user.phone,
        subtotal,
        shipping_fee: 99,
        total: subtotal + 99,
        status: paymentMethod === 'upi' ? 'pending_payment' : 'confirmed',
        payment_status: 'pending',
        created_at: now,
        updated_at: now
      };
    let r;
    try {
      r = await db.collection('orders').insertOne(order);
    } catch (e) {
      if (e.code !== 11000) throw e;
      const prior = await db.collection('orders').findOne({
        user_id: req.user._id,
        checkout_version: checkoutVersion
      });
      if (!prior) throw e;
      return res.status(201).json({
        success: true,
        order: json(prior)
      });
    }
    order._id = r.insertedId;
    await db.collection('carts').updateOne({
      _id: c._id
    }, {
      $set: {
        items: [],
        updated_at: new Date()
      }
    });
    res.status(201).json({
      success: true,
      order: json(order)
    });
  }));
  router.post('/api/orders/:order_id/confirm-payment', auth, idParam, asyncRoute(async (req, res) => {
    const query = {
      _id: req.objectId,
      user_id: req.user._id
    };
    const order = await db.collection('orders').findOne(query);
    if (!order) return err(res, 404, 'Order not found');
    if (order.payment_method !== 'upi') return err(res, 409, 'This order does not use UPI payment');
    if (order.status === 'confirmed') return res.json({
      success: true,
      order: json(order)
    });
    if (order.status !== 'pending_payment') return err(res, 409, 'This order cannot be confirmed');
    await db.collection('orders').updateOne({
      ...query,
      status: 'pending_payment'
    }, {
      $set: {
        status: 'confirmed',
        payment_status: 'pending',
        updated_at: new Date()
      }
    });
    res.json({
      success: true,
      order: json(await db.collection('orders').findOne(query))
    });
  }));
  router.get('/api/orders', auth, asyncRoute(async (req, res) => res.json({
    success: true,
    orders: (await db.collection('orders').find({
      user_id: req.user._id
    }).sort({
      created_at: -1
    }).limit(100).toArray()).map(json)
  })));
  router.get('/api/orders/:order_id', auth, idParam, asyncRoute(async (req, res) => {
    const o = req.objectId && (await db.collection('orders').findOne({
      _id: req.objectId,
      user_id: req.user._id
    }));
    if (!o) return err(res, 404, 'Order not found');
    res.json({
      success: true,
      order: json(o)
    });
  }));
  router.put('/api/orders/:order_id/reviews', auth, idParam, asyncRoute(async (req, res) => {
    const o = req.objectId && (await db.collection('orders').findOne({
      _id: req.objectId,
      user_id: req.user._id
    }));
    if (!o) return err(res, 404, 'Order not found');
    if (String(o.status || '').toLowerCase() !== 'delivered') return err(res, 409, 'You can review products after the order has been delivered');
    const {
        product_id,
        variant_id,
        rating
      } = req.body || {},
      title = String(req.body?.title || '').trim(),
      body = String(req.body?.body || '').trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !title || title.length > 120 || !body || body.length > 2000) return err(res, 422, 'Invalid review');
    const item = o.items.find(x => x.product_id === product_id && x.variant_id === variant_id);
    if (!item) return err(res, 400, 'This product is not part of the order');
    const now = new Date(),
      old = item.review || {},
      review = {
        rating,
        title,
        body,
        reviewer_name: req.user.name || 'Customer',
        verified: true,
        created_at: old.created_at || now,
        updated_at: now
      };
    item.review = review;
    const rid = `${o._id}:${product_id}:${variant_id || 'no-variant'}`;
    await db.collection('product_reviews').replaceOne({
      _id: rid
    }, {
      _id: rid,
      product_id,
      variant_id,
      order_id: o._id,
      user_id: req.user._id,
      ...review
    }, {
      upsert: true
    });
    await db.collection('orders').updateOne({
      _id: o._id,
      user_id: req.user._id
    }, {
      $set: {
        items: o.items,
        updated_at: now
      }
    });
    res.json({
      success: true,
      review: json(review)
    });
  }));
  return router;
};
