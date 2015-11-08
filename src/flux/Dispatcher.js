'use strict';

/**
 * A Flux dispatcher: one central hub that broadcasts every action to every registered store.
 *
 * - Dispatches are synchronous and cannot be nested (dispatching mid-dispatch is a bug).
 * - waitFor(tokens) lets a store run after the stores it depends on (e.g. CartStore waits for
 *   ProductStore so prices are current), with cycle detection.
 */
function Dispatcher() {
  this._callbacks = {};
  this._isPending = {};
  this._isHandled = {};
  this._isDispatching = false;
  this._pendingPayload = null;
  this._lastId = 1;
}

Dispatcher.prototype.register = function (callback) {
  var id = 'ID_' + this._lastId++;
  this._callbacks[id] = callback;
  return id;
};

Dispatcher.prototype.unregister = function (id) {
  if (!this._callbacks[id]) throw new Error('Dispatcher.unregister: ' + id + ' is not registered');
  delete this._callbacks[id];
};

Dispatcher.prototype.waitFor = function (ids) {
  if (!this._isDispatching) throw new Error('Dispatcher.waitFor: must be called while dispatching');
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    if (this._isPending[id]) {
      if (!this._isHandled[id]) throw new Error('Dispatcher.waitFor: circular dependency detected while waiting for ' + id);
      continue;
    }
    if (!this._callbacks[id]) throw new Error('Dispatcher.waitFor: ' + id + ' is not registered');
    this._invoke(id);
  }
};

Dispatcher.prototype.dispatch = function (payload) {
  if (this._isDispatching) throw new Error('Dispatcher.dispatch: cannot dispatch in the middle of a dispatch (' + payload.type + ')');
  if (!payload || !payload.type) throw new Error('Dispatcher.dispatch: actions need a type');
  this._isDispatching = true;
  this._pendingPayload = payload;
  var ids = Object.keys(this._callbacks);
  ids.forEach(function (id) {
    this._isPending[id] = false;
    this._isHandled[id] = false;
  }, this);
  try {
    ids.forEach(function (id) {
      if (!this._isPending[id]) this._invoke(id);
    }, this);
  } finally {
    this._isDispatching = false;
    this._pendingPayload = null;
  }
};

Dispatcher.prototype.isDispatching = function () {
  return this._isDispatching;
};

Dispatcher.prototype._invoke = function (id) {
  this._isPending[id] = true;
  this._callbacks[id](this._pendingPayload);
  this._isHandled[id] = true;
};

module.exports = Dispatcher;
