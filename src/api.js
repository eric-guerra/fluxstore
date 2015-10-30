'use strict';

function request(method, url, body) {
  return fetch(url, {
    method: method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  }).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
      return data;
    });
  });
}

module.exports = {
  getProducts: function () { return request('GET', '/api/products'); },
  checkPromo: function (code) { return request('GET', '/api/promos/' + encodeURIComponent(code)); },
  checkout: function (order) { return request('POST', '/api/orders', order); }
};
