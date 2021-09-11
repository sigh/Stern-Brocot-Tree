let canvas = document.getElementById('tree-vis');

class Renderer {
  constructor(canvas, ctx, scale, origin) {
    this._canvas = canvas;
    this._ctx = ctx;
    this._scale = scale;
    this._origin = origin;
  }

  clearCanvas() {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
  };

  drawNode(x, y, d, text) {
    const height = this._canvas.height;
    const width = this._canvas.width;

    const textScale = Math.pow(2, -d) * this._scale;
    const fontSize = Math.floor(textScale/4 * height);

    x = this._canvas.width * this._scale * (x - this._origin.x);
    y = this._canvas.height * this._scale * (1-(y-this._origin.y));

    // TODO: Get rid of this hacky optimization.
    if (x >= -width && y >= -height && x < width * 2 && y < height * 2) {
      this._ctx.font = `${fontSize}px sans`;
      this._ctx.textAlign = 'center';
      this._ctx.fillText(text, x, y);
    }

    return fontSize;
  }
}

const drawTree = (ctx, origin, scale) => {
  let renderer = new Renderer(canvas, ctx, scale, origin);
  renderer.clearCanvas();

  let drawTreeRec = (x, y, d, a, b) => {
    let c = [a[0] + b[0], a[1] + b[1]];

    let edgeScale = Math.pow(2, -d) * 0.25;

    let fontSize = renderer.drawNode(x, y, d, `${c[0]}/${c[1]}`);

    if (fontSize > 0) {
      drawTreeRec(x-edgeScale, y-edgeScale, d+1, a, c);
      drawTreeRec(x+edgeScale, y-edgeScale, d+1, b, c);
    }
  };
  drawTreeRec(0.5, 0.75, 0, [0,1], [1,0]);
};
drawTree(canvas.getContext('2d'), {x:0, y:0}, 1);

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

const redraw = deferUntilAnimationFrame((scale, origin) => {
  let ctx = canvas.getContext('2d');
  drawTree(ctx, scale, origin);
});

class Viewport {
  constructor(canvas) {
    this._logScale = 0;
    this._origin = {x: 0, y: 0};

    this._canvas = canvas;

    this._setUpMouseWheel(canvas);
    this._setUpMouseDrag(canvas);
  }

  _setUpMouseDrag(canvas) {
    let dragPos = {x: 0, y:0};
    let origin = this._origin;

    const mouseMoveHandler = (e) => {
      const pixelScale = this._pixelScale();
      const dx = pixelScale * (e.clientX - dragPos.x);
      const dy = pixelScale * (e.clientY - dragPos.y);
      origin.x -= dx;
      origin.y += dy;
      dragPos.x = e.clientX;
      dragPos.y = e.clientY;
      this._update();
    };

    canvas.onmousedown = (e) => {
      dragPos.x = e.clientX;
      dragPos.y = e.clientY;
      document.addEventListener('mousemove', mouseMoveHandler);
    };
    canvas.onmouseup = () => {
      document.removeEventListener('mousemove', mouseMoveHandler);
    };
  }

  _setUpMouseWheel(canvas) {
    let origin = this._origin;

    canvas.onwheel = (e) => {
      e.preventDefault();

      const canvasOrigin = this._canvasOrigin();
      const canvasX = e.clientX - canvasOrigin.x;
      const canvasY = e.clientY - canvasOrigin.y;

      let pixelScale = this._pixelScale();
      let dx = pixelScale * canvasX;
      let dy = pixelScale * canvasY;

      let ds = e.deltaY * 0.01;
      ds = ds > 0.5 ? 0.5 :
           ds < -0.5 ? -0.5 :
           ds;
      ds = Math.max(ds, -this._logScale);

      this._logScale += ds;

      pixelScale = this._pixelScale();
      dx -= pixelScale * canvasX;
      dy -= pixelScale * canvasY;

      // TODO: Figure out a simpler expression for dx and dy.
      origin.x += dx;
      origin.y -= dy;

      this._update();
    };
  }

  _pixelScale() {
    return Math.pow(2, -this._logScale) / (this._canvas.clientHeight);
  }

  _canvasOrigin() {
    const bb = this._canvas.getBoundingClientRect();
    return {x: bb.x, y: bb.y};
  }

  _update() {
    redraw(this._origin, Math.pow(2, this._logScale));
  }
}

let viewport = new Viewport(canvas);
