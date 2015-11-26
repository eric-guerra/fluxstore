'use strict';

var TAX_RATE = 0.0825;
var FREE_SHIPPING_OVER = 5000;
var SHIPPING = 599;

var PROMOS = {
  WELCOME10: { code: 'WELCOME10', kind: 'percent', value: 10, label: '10% off your order' },
  FIVEOFF: { code: 'FIVEOFF', kind: 'amount', value: 500, label: '$5 off', minSubtotal: 2500 },
  SHIPFREE: { code: 'SHIPFREE', kind: 'shipping', value: 0, label: 'Free shipping' }
};

function findPromo(code) {
  return code ? PROMOS[String(code).trim().toUpperCase()] || null : null;
}

/**
 * Authoritative pricing used at checkout. The client computes the same numbers for display,
 * but the server never trusts client-sent prices or totals.
 */
function price(lines, catalog, promoCode) {
  var errors = [];
  var items = [];
  var seen = {};
  lines.forEach(function (l) {
    var p = catalog[l.productId];
    if (!p) { errors.push('unknown product ' + l.productId); return; }
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 10) { errors.push('invalid quantity for ' + p.name); return; }
    if (seen[l.productId]) { errors.push('duplicate line for ' + p.name); return; }
    seen[l.productId] = true;
    if (l.qty > p.stock) { errors.push('only ' + p.stock + ' ' + p.name + ' left'); return; }
    items.push({ productId: p.id, name: p.name, qty: l.qty, unitPrice: p.price, lineTotal: p.price * l.qty });
  });
  if (!items.length && !errors.length) errors.push('cart is empty');

  var subtotal = items.reduce(function (s, i) { return s + i.lineTotal; }, 0);
  var promo = findPromo(promoCode);
  if (promoCode && !promo) errors.push('promo code ' + promoCode + ' is not valid');
  if (promo && promo.minSubtotal && subtotal < promo.minSubtotal) errors.push(promo.code + ' needs a subtotal of $' + promo.minSubtotal / 100);

  var discount = 0;
  if (promo && promo.kind === 'percent') discount = Math.round(subtotal * promo.value / 100);
  if (promo && promo.kind === 'amount') discount = Math.min(subtotal, promo.value);
  var afterDiscount = subtotal - discount;
  var shipping = afterDiscount >= FREE_SHIPPING_OVER || (promo && promo.kind === 'shipping') ? 0 : SHIPPING;
  var tax = Math.round(afterDiscount * TAX_RATE);
  return { errors: errors, items: items, subtotal: subtotal, discount: discount, shipping: shipping, tax: tax, total: afterDiscount + shipping + tax };
}

module.exports = { price: price, findPromo: findPromo, PROMOS: PROMOS };
