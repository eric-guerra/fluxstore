'use strict';

var EventEmitter = require('events').EventEmitter;
var CHANGE = 'change';

/**
 * Base store: holds state, registers with the dispatcher, and emits a single "change" event.
 * Subclasses implement `reduce(state, action)` and return the next state (or the same object for no change).
 */
function Store(dispatcher, initialState) {
  EventEmitter.call(this);
  this.setMaxListeners(50);
  this._state = initialState;
  this.dispatcher = dispatcher;
  var self = this;
  this.dispatchToken = dispatcher.register(function (action) {
    var next = self.reduce(self._state, action);
    if (next !== self._state) {
      self._state = next;
      self.emit(CHANGE);
    }
  });
}

Store.prototype = Object.create(EventEmitter.prototype);
Store.prototype.constructor = Store;

Store.prototype.getState = function () {
  return this._state;
};

Store.prototype.addChangeListener = function (cb) {
  this.on(CHANGE, cb);
  var self = this;
  return function () { self.removeListener(CHANGE, cb); };
};

Store.prototype.reduce = function (state) {
  return state;
};

module.exports = Store;
