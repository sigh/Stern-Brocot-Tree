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

class SimpleSpatialIndex {
  static SLOT_MOD = (1<<8)-1;

  constructor(width, height, bucketSize) {
    this._bucketSize = bucketSize;
    this._rows = Math.ceil(width/bucketSize);
    this._cols = Math.ceil(height/bucketSize);
    this._grid = new Uint8Array(this._rows*this._cols);
    this._slots = new Array();
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
    this._slots.push([obj, x, y, x+w, y+h]);

    for (let i = minI; i < maxI; i++) {
      this._grid.fill(slotNum, i*cols + minJ, i*cols + maxJ);
    }
  }

  _objInSlot(x, y, s) {
    const [obj, x0, y0, x1, y1] = this._slots[s];

    if (x >= x0 && y >= y0 && x < x1 && y < y1) return obj;
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
