'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var createApp = require('../server/app');
var pricing = require('../server/pricing');

function start() {
  return new Promise(function (resolve) {
    var server = createApp().listen(0, function () {
      var base = 'http://localhost:' + server.address().port;
      resolve({
        close: function () { return new Promise(function (r) { server.close(r); }); },
        post: async function (path, body) {
          var res = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
          return { status: res.status, body: await res.json() };
        },
        get: async function (path) {
          var res = await fetch(base + path);
          return { status: res.status, body: await res.json() };
        }
      });
    });
  });
}

test('server pricing matches client rules and rejects tampering', function () {
  var catalog = { a: { id: 'a', name: 'A', price: 1000, stock: 5 }, b: { id: 'b', name: 'B', price: 250, stock: 1 } };
  var q = pricing.price([{ productId: 'a', qty: 3 }], catalog, 'fiveoff');
  assert.deepEqual(q.errors, []);
  assert.deepEqual([q.subtotal, q.discount, q.shipping, q.tax, q.total], [3000, 500, 599, 206, 3000 - 500 + 599 + 206]);
  assert.match(pricing.price([{ productId: 'b', qty: 1 }], catalog, 'FIVEOFF').errors[0], /needs a subtotal/);
  assert.match(pricing.price([{ productId: 'b', qty: 2 }], catalog).errors[0], /only 1 B left/);
  assert.match(pricing.price([{ productId: 'a', qty: 1.5 }], catalog).errors[0], /invalid quantity/);
  assert.match(pricing.price([{ productId: 'a', qty: 1 }, { productId: 'a', qty: 1 }], catalog).errors[0], /duplicate/);
  assert.deepEqual(pricing.price([], catalog).errors, ['cart is empty']);
  assert.equal(pricing.price([{ productId: 'a', qty: 1 }], catalog, 'SHIPFREE').shipping, 0);
});

test('order API decrements stock and enforces limits', async function (t) {
  var api = await start();
  t.after(api.close);
  var created = await api.post('/api/orders', { lines: [{ productId: 'p3', qty: 2, price: 1 }], customer: { email: 'x@y.co' } });
  assert.equal(created.status, 201);
  assert.equal(created.body.subtotal, 25800, 'client-supplied price is ignored');
  assert.match(created.body.id, /^FS-[0-9A-F]{6}$/);

  var products = (await api.get('/api/products')).body;
  assert.equal(products.find(function (p) { return p.id === 'p3'; }).stock, 1);

  var oversold = await api.post('/api/orders', { lines: [{ productId: 'p3', qty: 2 }], customer: { email: 'x@y.co' } });
  assert.equal(oversold.status, 409);
  assert.equal((await api.post('/api/orders', { lines: [], customer: {} })).status, 422);
  assert.equal((await api.get('/api/promos/nope')).status, 404);
  assert.equal((await api.get('/api/promos/welcome10')).body.kind, 'percent');
});
