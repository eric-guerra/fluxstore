'use strict';

var Store = require('../flux/Store');
var T = require('../constants/ActionTypes');

/** Catalog plus the active filter. Visible products are derived, never stored. */
function ProductStore(dispatcher) {
  Store.call(this, dispatcher, {
    loading: false,
    error: null,
    byId: {},
    ids: [],
    filter: { query: '', category: 'all', sort: 'featured', inStockOnly: false }
  });
}

ProductStore.prototype = Object.create(Store.prototype);
ProductStore.prototype.constructor = ProductStore;

ProductStore.prototype.reduce = function (state, action) {
  switch (action.type) {
    case T.PRODUCTS_REQUESTED:
      return Object.assign({}, state, { loading: true, error: null });
    case T.PRODUCTS_RECEIVED: {
      var byId = {};
      action.products.forEach(function (p) { byId[p.id] = p; });
      return Object.assign({}, state, { loading: false, byId: byId, ids: action.products.map(function (p) { return p.id; }) });
    }
    case T.PRODUCTS_FAILED:
      return Object.assign({}, state, { loading: false, error: action.error });
    case T.FILTER_CHANGED:
      return Object.assign({}, state, { filter: Object.assign({}, state.filter, action.changes) });
    case T.CHECKOUT_SUCCEEDED: {
      // Reflect stock consumed by the order without refetching.
      var next = Object.assign({}, state.byId);
      action.order.lines.forEach(function (l) {
        if (next[l.productId]) next[l.productId] = Object.assign({}, next[l.productId], { stock: next[l.productId].stock - l.qty });
      });
      return Object.assign({}, state, { byId: next });
    }
    default:
      return state;
  }
};

ProductStore.prototype.get = function (id) {
  return this.getState().byId[id];
};

ProductStore.prototype.categories = function () {
  var seen = {};
  var s = this.getState();
  s.ids.forEach(function (id) { seen[s.byId[id].category] = true; });
  return Object.keys(seen).sort();
};

ProductStore.prototype.visible = function () {
  var s = this.getState();
  var f = s.filter;
  var q = f.query.trim().toLowerCase();
  var list = s.ids.map(function (id) { return s.byId[id]; }).filter(function (p) {
    if (f.category !== 'all' && p.category !== f.category) return false;
    if (f.inStockOnly && p.stock <= 0) return false;
    if (q && (p.name + ' ' + p.description).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  var sorters = {
    featured: function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.name.localeCompare(b.name); },
    'price-asc': function (a, b) { return a.price - b.price; },
    'price-desc': function (a, b) { return b.price - a.price; },
    name: function (a, b) { return a.name.localeCompare(b.name); }
  };
  return list.sort(sorters[f.sort] || sorters.featured);
};

module.exports = ProductStore;
