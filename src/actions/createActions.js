'use strict';

var T = require('../constants/ActionTypes');

/**
 * Action creators. They are the only place with side effects (HTTP); stores stay pure.
 * `api` is injected so tests can supply a fake.
 */
module.exports = function createActions(dispatcher, api) {
  return {
    loadProducts: function () {
      dispatcher.dispatch({ type: T.PRODUCTS_REQUESTED });
      return api.getProducts().then(function (products) {
        dispatcher.dispatch({ type: T.PRODUCTS_RECEIVED, products: products });
      }, function (err) {
        dispatcher.dispatch({ type: T.PRODUCTS_FAILED, error: err.message || String(err) });
      });
    },

    setFilter: function (changes) {
      dispatcher.dispatch({ type: T.FILTER_CHANGED, changes: changes });
    },

    addToCart: function (productId, qty) {
      dispatcher.dispatch({ type: T.CART_ADD, productId: productId, qty: qty || 1 });
    },

    setQuantity: function (productId, qty) {
      dispatcher.dispatch({ type: T.CART_SET_QTY, productId: productId, qty: qty });
    },

    removeFromCart: function (productId) {
      dispatcher.dispatch({ type: T.CART_REMOVE, productId: productId });
    },

    applyPromo: function (code) {
      return api.checkPromo(code).then(function (promo) {
        dispatcher.dispatch({ type: T.PROMO_APPLIED, promo: promo });
      }, function (err) {
        dispatcher.dispatch({ type: T.PROMO_REJECTED, error: err.message || 'Invalid code' });
      });
    },

    checkout: function (cartState, customer) {
      dispatcher.dispatch({ type: T.CHECKOUT_STARTED });
      var lines = cartState.order.map(function (id) { return { productId: id, qty: cartState.lines[id] }; });
      return api.checkout({ lines: lines, promo: cartState.promo && cartState.promo.code, customer: customer })
        .then(function (order) {
          dispatcher.dispatch({ type: T.CHECKOUT_SUCCEEDED, order: order });
        }, function (err) {
          dispatcher.dispatch({ type: T.CHECKOUT_FAILED, error: err.message || 'Checkout failed' });
        });
    }
  };
};
