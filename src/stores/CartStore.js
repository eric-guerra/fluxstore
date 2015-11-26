'use strict';

var Store = require('../flux/Store');
var T = require('../constants/ActionTypes');

var TAX_RATE = 0.0825;
var FREE_SHIPPING_OVER = 5000; // cents
var SHIPPING = 599;

/**
 * Cart lines and promo state. Depends on ProductStore (via waitFor) to clamp quantities to stock
 * and price lines, so it always sees the latest catalog within the same dispatch.
 */
function CartStore(dispatcher, productStore) {
  this.products = productStore;
  Store.call(this, dispatcher, { lines: {}, order: [], promo: null, promoError: null, checkingOut: false, lastOrder: null, checkoutError: null });
}

CartStore.prototype = Object.create(Store.prototype);
CartStore.prototype.constructor = CartStore;

function clamp(qty, stock) {
  return Math.max(0, Math.min(qty, stock, 10));
}

function withLine(state, productId, qty) {
  var lines = Object.assign({}, state.lines);
  var order = state.order.slice();
  if (qty <= 0) {
    delete lines[productId];
    order = order.filter(function (id) { return id !== productId; });
  } else {
    if (!lines[productId]) order.push(productId);
    lines[productId] = qty;
  }
  return Object.assign({}, state, { lines: lines, order: order });
}

CartStore.prototype.reduce = function (state, action) {
  this.dispatcher.waitFor([this.products.dispatchToken]);
  var product;
  switch (action.type) {
    case T.CART_ADD:
      product = this.products.get(action.productId);
      if (!product) return state;
      return withLine(state, action.productId, clamp((state.lines[action.productId] || 0) + (action.qty || 1), product.stock));
    case T.CART_SET_QTY:
      product = this.products.get(action.productId);
      if (!product) return state;
      return withLine(state, action.productId, clamp(action.qty, product.stock));
    case T.CART_REMOVE:
      return withLine(state, action.productId, 0);
    case T.PRODUCTS_RECEIVED: {
      // Fresh catalog: drop discontinued items and clamp to new stock levels.
      var self = this;
      var next = state;
      state.order.forEach(function (id) {
        var p = self.products.get(id);
        next = withLine(next, id, p ? clamp(state.lines[id], p.stock) : 0);
      });
      return next;
    }
    case T.PROMO_APPLIED:
      return Object.assign({}, state, { promo: action.promo, promoError: null });
    case T.PROMO_REJECTED:
      return Object.assign({}, state, { promo: null, promoError: action.error });
    case T.CHECKOUT_STARTED:
      return Object.assign({}, state, { checkingOut: true, checkoutError: null });
    case T.CHECKOUT_SUCCEEDED:
      return { lines: {}, order: [], promo: null, promoError: null, checkingOut: false, lastOrder: action.order, checkoutError: null };
    case T.CHECKOUT_FAILED:
      return Object.assign({}, state, { checkingOut: false, checkoutError: action.error });
    default:
      return state;
  }
};

/** Derived totals in cents. Mirrors server/pricing.js, which is authoritative at checkout. */
CartStore.prototype.summary = function () {
  var s = this.getState();
  var self = this;
  var items = s.order.map(function (id) {
    var p = self.products.get(id);
    return { product: p, qty: s.lines[id], lineTotal: p.price * s.lines[id] };
  });
  var subtotal = items.reduce(function (sum, i) { return sum + i.lineTotal; }, 0);
  var discount = 0;
  if (s.promo) {
    if (s.promo.kind === 'percent') discount = Math.round(subtotal * s.promo.value / 100);
    if (s.promo.kind === 'amount') discount = Math.min(subtotal, s.promo.value);
  }
  var afterDiscount = subtotal - discount;
  var shipping = items.length === 0 || afterDiscount >= FREE_SHIPPING_OVER || (s.promo && s.promo.kind === 'shipping') ? 0 : SHIPPING;
  var tax = Math.round(afterDiscount * TAX_RATE);
  return {
    items: items,
    count: items.reduce(function (n, i) { return n + i.qty; }, 0),
    subtotal: subtotal,
    discount: discount,
    shipping: shipping,
    tax: tax,
    total: afterDiscount + shipping + tax,
    freeShippingRemaining: Math.max(0, FREE_SHIPPING_OVER - afterDiscount)
  };
};

module.exports = CartStore;
