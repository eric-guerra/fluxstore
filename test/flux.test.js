'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var Dispatcher = require('../src/flux/Dispatcher');
var ProductStore = require('../src/stores/ProductStore');
var CartStore = require('../src/stores/CartStore');
var createActions = require('../src/actions/createActions');
var products = require('../server/products.json');

function setup(apiOverrides) {
  var d = new Dispatcher();
  var productStore = new ProductStore(d);
  var cartStore = new CartStore(d, productStore);
  var api = Object.assign({
    getProducts: function () { return Promise.resolve(JSON.parse(JSON.stringify(products))); },
    checkPromo: function (code) {
      return code === 'WELCOME10' ? Promise.resolve({ code: code, kind: 'percent', value: 10, label: '10% off' }) : Promise.reject(new Error('That code is not valid'));
    },
    checkout: function (order) {
      return Promise.resolve({ id: 'FS-TEST', total: 1, lines: order.lines.map(function (l) { return { productId: l.productId, qty: l.qty }; }) });
    }
  }, apiOverrides);
  var actions = createActions(d, api);
  return { d: d, products: productStore, cart: cartStore, actions: actions };
}

test('dispatcher runs waitFor dependencies first and detects cycles', function () {
  var d = new Dispatcher();
  var order = [];
  var a, b;
  b = d.register(function () { d.waitFor([a]); order.push('b'); });
  a = d.register(function () { order.push('a'); });
  d.dispatch({ type: 'X' });
  assert.deepEqual(order, ['a', 'b']);

  var d2 = new Dispatcher();
  var x, y;
  x = d2.register(function () { d2.waitFor([y]); });
  y = d2.register(function () { d2.waitFor([x]); });
  assert.throws(function () { d2.dispatch({ type: 'X' }); }, /circular/);
  assert.equal(d2.isDispatching(), false, 'dispatcher recovers after an error');

  var d3 = new Dispatcher();
  d3.register(function () { d3.dispatch({ type: 'NESTED' }); });
  assert.throws(function () { d3.dispatch({ type: 'X' }); }, /middle of a dispatch/);
  assert.throws(function () { d3.waitFor(['ID_1']); }, /while dispatching/);
});

test('product loading, filtering and sorting', async function () {
  var s = setup();
  var emitted = 0;
  s.products.addChangeListener(function () { emitted++; });
  await s.actions.loadProducts();
  assert.equal(s.products.getState().loading, false);
  assert.equal(emitted, 2, 'requested + received');
  assert.deepEqual(s.products.categories(), ['Brewing', 'Coffee', 'Grinders', 'Supplies']);

  assert.deepEqual(s.products.visible().slice(0, 3).map(function (p) { return p.id; }), ['p3', 'p5', 'p1'], 'featured first, then by name');

  s.actions.setFilter({ category: 'Coffee', inStockOnly: true });
  assert.deepEqual(s.products.visible().map(function (p) { return p.id; }), ['p5']);

  s.actions.setFilter({ category: 'all', inStockOnly: false, query: 'GRIND', sort: 'price-asc' });
  assert.deepEqual(s.products.visible().map(function (p) { return p.id; }), ['p3'], 'matches name or description');

  s.actions.setFilter({ query: '', sort: 'price-asc' });
  assert.equal(s.products.visible()[0].id, 'p4', 'cheapest first');
});

test('load failure is surfaced', async function () {
  var s = setup({ getProducts: function () { return Promise.reject(new Error('offline')); } });
  await s.actions.loadProducts();
  assert.equal(s.products.getState().error, 'offline');
});

test('cart clamps to stock and computes totals', async function () {
  var s = setup();
  await s.actions.loadProducts();
  s.actions.addToCart('p3');
  s.actions.addToCart('p3', 5); // only 3 in stock
  s.actions.addToCart('p6');    // sold out
  s.actions.addToCart('nope');
  assert.deepEqual(s.cart.getState().lines, { p3: 3 });

  s.actions.setQuantity('p4', 2); // not in cart yet: set adds it
  s.actions.setQuantity('p3', 1);
  var sum = s.cart.summary();
  assert.equal(sum.count, 3);
  assert.equal(sum.subtotal, 12900 + 2 * 699);
  assert.equal(sum.shipping, 0, 'free shipping over $50');
  assert.equal(sum.tax, Math.round(14298 * 0.0825));
  assert.equal(sum.total, 14298 + sum.tax);

  s.actions.removeFromCart('p3');
  sum = s.cart.summary();
  assert.equal(sum.shipping, 599);
  assert.equal(sum.freeShippingRemaining, 5000 - 1398);
  assert.deepEqual(s.cart.getState().order, ['p4']);
});

test('promo codes', async function () {
  var s = setup();
  await s.actions.loadProducts();
  s.actions.addToCart('p1');
  await s.actions.applyPromo('WELCOME10');
  assert.equal(s.cart.summary().discount, 450);
  await s.actions.applyPromo('BOGUS');
  assert.equal(s.cart.getState().promo, null);
  assert.equal(s.cart.getState().promoError, 'That code is not valid');
});

test('checkout clears the cart and decrements product stock in the same dispatch', async function () {
  var s = setup();
  await s.actions.loadProducts();
  s.actions.addToCart('p7', 2);
  await s.actions.checkout(s.cart.getState(), { email: 'a@b.co' });
  assert.equal(s.cart.getState().lastOrder.id, 'FS-TEST');
  assert.deepEqual(s.cart.getState().lines, {});
  assert.equal(s.products.get('p7').stock, 0);
});

test('a refreshed catalog drops discontinued items and re-clamps quantities', async function () {
  var calls = 0;
  var s = setup({
    getProducts: function () {
      calls++;
      var list = JSON.parse(JSON.stringify(products));
      if (calls > 1) {
        list = list.filter(function (p) { return p.id !== 'p2'; });
        list.find(function (p) { return p.id === 'p1'; }).stock = 1;
      }
      return Promise.resolve(list);
    }
  });
  await s.actions.loadProducts();
  s.actions.addToCart('p1', 4);
  s.actions.addToCart('p2', 2);
  await s.actions.loadProducts();
  assert.deepEqual(s.cart.getState().lines, { p1: 1 });
});
