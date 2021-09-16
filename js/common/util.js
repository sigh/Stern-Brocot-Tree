const deferUntilAnimationFrame = (fn) => {
  let lastArgs = null;
  let promise = null;
  let alreadyEnqueued = false;
  return ((...args) => {
    lastArgs = args;

    if (!alreadyEnqueued) {
      alreadyEnqueued = true;
      promise = new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          try {
            fn(...lastArgs);
          } finally {
            resolve();
            lastArgs = null;
            promise = null;
            alreadyEnqueued = false;
          }
        });
      });
    }

    return promise;
  });
};

// Clamp (which works with bigints).
const clamp = (x, min, max) => {
  return x > max ? max : x < min ? min : x;
};

// Taken from https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
// The provided EventTarget is for DOM events.
class BaseEventTarget {
  constructor() {
    this.listeners = {};
  }

  addEventListener(type, callback) {
    if (!(type in this.listeners)) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
  };

  removeEventListener(type, callback) {
    if (!(type in this.listeners)) {
      return;
    }
    var stack = this.listeners[type];
    for (var i = 0, l = stack.length; i < l; i++) {
      if (stack[i] === callback){
        stack.splice(i, 1);
        return;
      }
    }
  };

  dispatchEvent(type, data) {
    if (!(type in this.listeners)) {
      return true;
    }
    var stack = this.listeners[type].slice();

    for (var i = 0, l = stack.length; i < l; i++) {
      stack[i].call(this, data);
    }
  }
}
