const express = require('express');
module.exports = function createAdminRoutes(context) {
  const {
    db,
    asyncRoute,
    err,
    json,
    admin,
    idParam
  } = context;
  const router = express.Router();
  router.get('/api/admin/dashboard', admin, asyncRoute(async (req, res) => {
    const [products, active, orders, pending, rev, recent] = await Promise.all([db.collection('products').countDocuments({}), db.collection('products').countDocuments({
      isActive: {
        $ne: false
      }
    }), db.collection('orders').countDocuments({}), db.collection('orders').countDocuments({
      status: {
        $nin: ['delivered', 'cancelled']
      }
    }), db.collection('orders').aggregate([{
      $match: {
        status: {
          $ne: 'cancelled'
        },
        payment_status: {
          $in: ['paid', 'succeeded', 'completed']
        }
      }
    }, {
      $group: {
        _id: null,
        total: {
          $sum: '$total'
        }
      }
    }]).toArray(), db.collection('orders').find().sort({
      created_at: -1
    }).limit(5).toArray()]);
    const ids = [...new Map(recent.filter(x => x.user_id).map(x => [String(x.user_id), x.user_id])).values()],
      users = ids.length ? await db.collection('users').find({
        _id: {
          $in: ids
        }
      }, {
        projection: {
          name: 1,
          email: 1
        }
      }).toArray() : [],
      map = Object.fromEntries(users.map(u => [String(u._id), {
        name: u.name || '',
        email: u.email || ''
      }]));
    res.json({
      success: true,
      stats: {
        products,
        active_products: active,
        orders,
        pending_orders: pending,
        revenue: rev[0]?.total || 0
      },
      recent_orders: recent.map(o => ({
        ...json(o),
        customer: map[String(o.user_id)] || {
          name: '',
          email: ''
        }
      }))
    });
  }));
  router.get('/api/admin/orders', admin, asyncRoute(async (req, res) => {
    const q = req.query.status_filter ? {
        status: req.query.status_filter
      } : {},
      orders = await db.collection('orders').find(q).sort({
        created_at: -1
      }).limit(500).toArray(),
      ids = [...new Map(orders.filter(x => x.user_id).map(x => [String(x.user_id), x.user_id])).values()],
      users = ids.length ? await db.collection('users').find({
        _id: {
          $in: ids
        }
      }, {
        projection: {
          name: 1,
          email: 1
        }
      }).toArray() : [],
      map = Object.fromEntries(users.map(u => [String(u._id), {
        name: u.name || 'Customer',
        email: u.email || ''
      }]));
    res.json({
      success: true,
      orders: orders.map(o => ({
        ...json(o),
        customer: map[String(o.user_id)] || {
          name: 'Customer',
          email: ''
        }
      }))
    });
  }));
  router.get('/api/admin/orders/:order_id', admin, idParam, asyncRoute(async (req, res) => {
    const o = req.objectId && (await db.collection('orders').findOne({
      _id: req.objectId
    }));
    if (!o) return err(res, 404, 'Order not found');
    const u = await db.collection('users').findOne({
      _id: o.user_id
    }, {
      projection: {
        name: 1,
        email: 1,
        phone: 1,
        created_at: 1
      }
    });
    res.json({
      success: true,
      order: json(o),
      customer: json({
        _id: u ? String(u._id) : null,
        name: u?.name || 'Customer',
        email: u?.email || '',
        phone: u?.phone || o.phone,
        created_at: u?.created_at || null
      })
    });
  }));
  router.get('/api/admin/customers/:customer_id/orders', admin, idParam, asyncRoute(async (req, res) => {
    const u = req.objectId && (await db.collection('users').findOne({
      _id: req.objectId
    }, {
      projection: {
        name: 1,
        email: 1,
        phone: 1,
        created_at: 1
      }
    }));
    if (!u) return err(res, 404, 'Customer not found');
    res.json({
      success: true,
      customer: json(u),
      orders: (await db.collection('orders').find({
        user_id: u._id
      }).sort({
        created_at: -1
      }).toArray()).map(json)
    });
  }));
  router.patch('/api/admin/orders/:order_id', admin, idParam, asyncRoute(async (req, res) => {
    const allowed = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      payments = ['pending', 'paid', 'failed', 'refunded'];
    if (!allowed.includes(req.body?.status)) return err(res, 400, 'Invalid order status');
    if (req.body.payment_status && !payments.includes(req.body.payment_status)) return err(res, 400, 'Invalid payment status');
    const set = {
      status: req.body.status,
      updated_at: new Date()
    };
    if (req.body.payment_status) set.payment_status = req.body.payment_status;
    const r = await db.collection('orders').updateOne({
      _id: req.objectId
    }, {
      $set: set
    });
    if (!r.matchedCount) return err(res, 404, 'Order not found');
    res.json({
      success: true,
      order: json(await db.collection('orders').findOne({
        _id: req.objectId
      }))
    });
  }));
  return router;
};
