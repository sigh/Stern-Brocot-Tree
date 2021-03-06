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

const safeEval = (expression) => {
  return Function('"use strict";return (' + expression + ')')();
}

// Taken from https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
// The provided EventTarget is for DOM events.
class BaseEventTarget {
  listeners = {};

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

class SimpleSpatialIndex {
  static SLOT_MOD = (1<<8)-1;

  _bucketSize;
  _rows;
  _cols;
  _grid;
  _slots = [];

  static Item = class {
    obj = null;
    x0 = 0; y0 = 0; x1 = 0; y1 = 0;

    constructor(...args) {
      [this.obj, this.x0, this.y0, this.x1, this.y1] = args;
    }
  }

  constructor(width, height, bucketSize) {
    this._bucketSize = bucketSize;
    this._rows = Math.ceil(width/bucketSize);
    this._cols = Math.ceil(height/bucketSize);
    this._grid = new Uint8Array(this._rows*this._cols);
  }

  insert(obj, x, y, w, h) {
    const b = this._bucketSize;
    const rows = this._rows;
    const cols = this._cols;

    const minI = clamp(Math.floor(x/b),    0, rows);
    const maxI = clamp(Math.ceil((x+w)/b), 0, rows);
    const minJ = clamp(Math.floor(y/b),    0, cols);
    const maxJ = clamp(Math.ceil((y+h)/b), 0, cols);

    const slotNum = (this._slots.length % SimpleSpatialIndex.SLOT_MOD)+1;
    this._slots.push(new this.constructor.Item(obj, x, y, x+w, y+h));

    for (let i = minI; i < maxI; i++) {
      this._grid.fill(slotNum, i*cols + minJ, i*cols + maxJ);
    }
  }

  _objInSlot(x, y, s) {
    const r = this._slots[s];

    if (x >= r.x0 && y >= r.y0 && x < r.x1 && y < r.y1) return r.obj;
    return undefined;
  }

  // Get the node at x,y (first match).
  get(x, y) {
    const b = this._bucketSize;

    const i = Math.floor(x/b);
    const j = Math.floor(y/b);

    let slotNum = this._grid[i*this._cols+j];
    if (!slotNum) return undefined;

    slotNum -= 1;
    for (let s = slotNum; s < this._slots.length; s += SimpleSpatialIndex.SLOT_MOD) {
      const obj = this._objInSlot(x, y, s);
      if (obj !== undefined) return obj;
    }

    return undefined;
  }

  size() {
    return this._slots.length;
  }
}
