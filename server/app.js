'use strict';

var path = require('path');
var crypto = require('crypto');
var express = require('express');
var pricing = require('./pricing');
var seed = require('./products.json');

function createApp() {
  var app = express();
  var catalog = {};
  seed.forEach(function (p) { catalog[p.id] = Object.assign({}, p); });
  var orders = [];

  app.use(express.json({ limit: '16kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/products', function (req, res) {
    res.json(Object.keys(catalog).map(function (id) { return catalog[id]; }));
  });

  app.get('/api/promos/:code', function (req, res) {
    var promo = pricing.findPromo(req.params.code);
    if (!promo) return res.status(404).json({ error: 'That code is not valid' });
    res.json(promo);
  });

  app.post('/api/orders', function (req, res) {
    var body = req.body || {};
    if (!Array.isArray(body.lines)) return res.status(422).json({ error: 'lines are required' });
    if (!body.customer || !/^[^@\s]+@[^@\s]+$/.test(body.customer.email || '')) return res.status(422).json({ error: 'a valid email is required' });
    var quote = pricing.price(body.lines, catalog, body.promo);
    if (quote.errors.length) return res.status(409).json({ error: quote.errors.join('; '), errors: quote.errors });

    quote.items.forEach(function (i) { catalog[i.productId].stock -= i.qty; });
    var order = {
      id: 'FS-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
      lines: quote.items.map(function (i) { return { productId: i.productId, qty: i.qty, unitPrice: i.unitPrice }; }),
      subtotal: quote.subtotal, discount: quote.discount, shipping: quote.shipping, tax: quote.tax, total: quote.total,
      email: body.customer.email, createdAt: new Date().toISOString()
    };
    orders.push(order);
    res.status(201).json(order);
  });

  app.get('/api/orders/:id', function (req, res) {
    var o = orders.find(function (x) { return x.id === req.params.id; });
    if (!o) return res.status(404).json({ error: 'not found' });
    res.json(o);
  });

  return app;
}

module.exports = createApp;
