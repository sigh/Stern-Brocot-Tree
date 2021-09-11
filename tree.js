class Renderer {
  constructor(canvas, viewport) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._viewport = viewport;
  }

  clearCanvas() {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
  };

  drawNode(x, y, d, text) {
    const height = this._canvas.height;
    const width = this._canvas.width;
    const scale = this._viewport.scale;
    const origin = this._viewport.origin;

    const textScale = Math.pow(2, -d) * scale;
    const fontSize = Math.floor(textScale/4 * height);

    x = this._canvas.width * scale * (x - origin.x);
    y = this._canvas.height * scale * (1-y - origin.y);

    // TODO: Get rid of this hacky optimization.
    if (x >= -width && y >= -height && x < width * 2 && y < height * 2) {
      this._ctx.font = `${fontSize}px Serif`;
      this._ctx.textAlign = 'center';
      this._ctx.fillText(text, x, y);
    }

    return fontSize;
  }
}

const drawTree = (renderer) => {
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

class Viewport {
  constructor(canvas, onUpdate) {
    this._onUpdate = onUpdate;
    this._logScale = 0;
    this.scale = 1;
    this.origin = {x: 0, y: 0};

    this._canvas = canvas;

    this._setUpMouseWheel(canvas);
    this._setUpMouseDrag(canvas);
  }

  _setUpMouseDrag(canvas) {
    let dragPos = {x: 0, y:0};
    let origin = this.origin;

    const mouseMoveHandler = (e) => {
      const pixelScale = this._pixelScale();
      const dx = pixelScale * (e.clientX - dragPos.x);
      const dy = pixelScale * (e.clientY - dragPos.y);
      origin.x -= dx;
      origin.y -= dy;
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
    let origin = this.origin;

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
      this.scale = Math.pow(2, this._logScale);

      pixelScale = this._pixelScale();
      dx -= pixelScale * canvasX;
      dy -= pixelScale * canvasY;

      // TODO: Figure out a simpler expression for dx and dy.
      origin.x += dx;
      origin.y += dy;

      this._update();
    };
  }

  _pixelScale() {
    return 1 / this.scale / this._canvas.clientHeight;
  }

  _canvasOrigin() {
    const bb = this._canvas.getBoundingClientRect();
    return {x: bb.x, y: bb.y};
  }

  _update() {
    this._onUpdate();
  }

  clientXYToCoord(clientX, clientY) {
    const canvasOrigin = this._canvasOrigin();
    const canvasX = clientX - canvasOrigin.x;
    const canvasY = clientY - canvasOrigin.y;
    const pixelScale = this._pixelScale();

    return {x: this.origin.x + pixelScale*canvasX,
            y: this.origin.y + pixelScale*canvasY};
  }
}

const main = () => {
  let canvas = document.getElementById('tree-vis');
  let debugDiv = document.getElementById('debug-info');

  let renderer = null;
  const redraw = deferUntilAnimationFrame(() => {
    drawTree(renderer);
  });

  let viewport = new Viewport(canvas, redraw);

  renderer = new Renderer(canvas, viewport);
  redraw();

  canvas.onmousemove = (e) => {
    let coord = viewport.clientXYToCoord(e.clientX, e.clientY);
    debugDiv.textContent = `(${coord.x.toFixed(5)}, ${coord.y.toFixed(5)})`;
  };
};
main();

