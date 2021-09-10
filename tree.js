let canvas = document.getElementById('tree-vis');

const DIM = 64;
const SIZE = 400;

const drawNode = (ctx, x, y, scale, text) => {
  let size = Math.floor(DIM*scale);
  ctx.font = `${size}px sans`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
};

const drawTree = (ctx) => {
  let drawTreeRec = (x, y, d, a, b) => {
    let c = [a[0] + b[0], a[1] + b[1]];

    let scale = Math.pow(2, -d);

    drawNode(ctx, x, y, scale, `${c[0]}/${c[1]}`);

    if (scale*60 > 1) {
      drawTreeRec(x-scale*DIM, y+scale*DIM, d+1, a, c);
      drawTreeRec(x+scale*DIM, y+scale*DIM, d+1, b, c);
    }
  };
  drawTreeRec(SIZE/2, DIM, 0, [0,1], [1,0]);
};
drawTree(canvas.getContext('2d'), 1);

const clearCanvas = (ctx) => {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
};

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

const redraw = deferUntilAnimationFrame(() => {
  let ctx = canvas.getContext('2d');
  clearCanvas(ctx);
  drawTree(ctx);
});

class Viewport {
  constructor(canvas) {
    this._logScale = 0;
    this._center = {x: 0.5, y: 0.5};

    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');

    this._setUpMouseWheel(canvas);
  }

  _setUpMouseWheel(canvas) {
    canvas.onwheel = (e) => {
      e.preventDefault();

      const pixelScale = this._pixelScale();
      const canvasCenter = this._canvasCenter();

      const dx = pixelScale * (e.clientX - canvasCenter.x);
      const dy = pixelScale * (e.clientY - canvasCenter.y);

      let ds = e.deltaY * 0.01;
      ds = ds > 0.5 ? 0.5 :
           ds < -0.5 ? -0.5 :
           ds;

      this._logScale = Math.max(0, this._logScale + ds);

      this._center.x -= dx*ds;
      this._center.y += dy*ds;

      this._update();
    };
  }

  _pixelScale() {
    return Math.pow(2, this._logScale) / (this._canvas.clientHeight);
  }

  _canvasCenter() {
    const bb = this._canvas.getBoundingClientRect();
    return {x: bb.x + bb.width/2, y: bb.y + bb.height/2};
  }

  _update() {
    this._ctx.setTransform(1, 0, 0, 1, 0, 0);
    let scale = Math.pow(2, this._logScale);
    this._ctx.scale(scale,scale);
    redraw();
  }
}

let viewport = new Viewport(canvas);
