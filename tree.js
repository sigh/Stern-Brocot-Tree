class Renderer {
  constructor(canvas, viewport) {
    this._canvas = canvas;

    this._ctx = canvas.getContext('2d');
    this._ctx.textAlign = 'center';
    this._ctx.textBaseline = 'middle';

    this._viewport = viewport;
  }

  clearCanvas() {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
  };

  _drawBar(ctx, x, y, length, width) {
    ctx.lineWidth = width;
    y -= ctx.lineWidth;

    ctx.beginPath();
    ctx.moveTo(x - length*0.5, y);
    ctx.lineTo(x + length*0.5, y);
    ctx.stroke();
  }

  _drawFraction(r, canvasX, canvasY, nodeHeight) {
    if (nodeHeight < 2) return false;

    const n = r[0].toString();
    const d = r[1].toString();

    // Determine the font size so that the numbers fit within the node.
    const length = Math.max(n.length, d.length);
    const textScale = 0.4 * Math.min(6/length, 1);
    const fontSize = Math.floor(nodeHeight * textScale);

    if (fontSize < 2) return false;

    let ctx = this._ctx;

    ctx.font = fontSize + 'px Serif';

    ctx.fillText(n, canvasX, canvasY - fontSize/2);
    ctx.fillText(d, canvasX, canvasY + fontSize/2);

    const width = ctx.measureText(n.length > d.length ? n : d).width;
    this._drawBar(ctx, canvasX, canvasY, width, fontSize/20);

    return true;
  }

  drawNode(expD, i, r) {
    const viewport = this._viewport;
    const scale = viewport.scale;
    const origin = viewport.origin;

    const scaledD = scale / expD;

    const xMin = i * scale / expD;
    const xMax = xMin + scaledD;
    if (Number(xMin - origin.x) >= viewport.SIZE || xMax - origin.x <= 0n) {
      // This entire subtree is outside of the viewport, so stop.
      return false;
    }

    const yMin = scaledD/2n;
    const yMinCoord = scale - yMin - origin.y;
    const nodeHeight = viewport.toCanvasY(scaledD/2n);

    if (yMinCoord > 0) {

      const x = xMin + scaledD/2n;
      const canvasX = viewport.toCanvasX(x - origin.x);

      const canvasYMin = viewport.toCanvasY(scale - yMin - origin.y);
      const canvasYMid = canvasYMin - nodeHeight*0.5;

      if (!this._drawFraction(r, canvasX, canvasYMid, nodeHeight)) {
        // If the text was too small, then just draw a bar.
        this._drawBar(
          this._ctx, canvasX, canvasYMid+nodeHeight/4, nodeHeight, nodeHeight/6);
      }
    }

    // Don't continue further if:
    //  - The node size is too small.
    //  - We are past the bottom of the viewport.
    return (nodeHeight > 0.5) && (yMinCoord < viewport.SIZE);
  }
}

const drawTree = (renderer) => {
  renderer.clearCanvas();

  let drawTreeRec = (d, expD, i, a, b) => {
    let c = [a[0] + b[0], a[1] + b[1]];
    if (renderer.drawNode(expD, i, c)) {
      i *= 2n;
      expD *= 2n;
      d++;
      drawTreeRec(d, expD, i,    a, c);
      drawTreeRec(d, expD, i+1n, b, c);
    }
  };
  drawTreeRec(0n, 1n, 0n, [0n,1n], [1n,0n]);
};

class Viewport {
  SIZE = Math.pow(2, 16);
  MIN_SCALE = BigInt(Math.floor(this.SIZE * 0.95));

  constructor(canvas, onUpdate) {
    this._onUpdate = onUpdate;
    this.scale = this.MIN_SCALE;

    // Offset origin so the tree is centered.
    const offset = -(BigInt(this.SIZE) - this.MIN_SCALE) / 2n;
    this.origin = {x: offset, y: 0n};

    this._canvas = canvas;

    this._setUpMouseWheel(canvas);
    this._setUpMouseDrag(canvas);
  }

  _setUpMouseDrag(canvas) {
    let dragPos = {x: 0, y:0};
    let origin = this.origin;

    const mouseMoveHandler = (e) => {
      e.preventDefault();
      const pixelScale = this._pixelScale();
      const dx = pixelScale * (e.clientX - dragPos.x);
      const dy = pixelScale * (e.clientY - dragPos.y);
      origin.x -= BigInt(Math.floor(dx));
      origin.y -= BigInt(Math.floor(dy));
      dragPos.x = e.clientX;
      dragPos.y = e.clientY;
      this._update();
    };

    canvas.onmousedown = (e) => {
      e.preventDefault();
      dragPos.x = e.clientX;
      dragPos.y = e.clientY;
      document.addEventListener('mousemove', mouseMoveHandler);
      let mouseUpHandler = () => {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
      };
      document.addEventListener('mouseup', mouseUpHandler);
    };
  }

  _setUpMouseWheel(canvas) {
    let origin = this.origin;

    canvas.onwheel = (e) => {
      e.preventDefault();

      // Clamp the delta, and ensure that we don't zoom out too far.
      let ds = clamp(e.deltaY * 0.01, -0.5, 0.5);
      if (ds == 0 || (ds < 0 && this.scale < this.MIN_SCALE)) return;

      const canvasOrigin = this._canvasOrigin();
      const canvasX = e.clientX - canvasOrigin.x;
      const canvasY = e.clientY - canvasOrigin.y;

      // Remove offset from origin, so that it will be corretly handled when
      // scaling.
      let pixelScale = this._pixelScale();
      origin.x += BigInt(Math.floor(pixelScale * canvasX));
      origin.y += BigInt(Math.floor(pixelScale * canvasY));

      // Scale by 2**ds. Scale ds by 2**x so that we only deal with integers.
      const x = 5n;
      const dsX = BigInt(Math.floor(Math.pow(2, Number(x) + ds)));
      this.scale = this.scale * dsX >> x;
      origin.x = origin.x * dsX >> x;
      origin.y = origin.y * dsX >> x;

      // Reoffset origin after scaling.
      pixelScale = this._pixelScale();
      origin.x -= BigInt(Math.floor(pixelScale * canvasX));
      origin.y -= BigInt(Math.floor(pixelScale * canvasY));

      this._update();
    };
  }

  _pixelScale() {
    return this.SIZE / this._canvas.clientHeight;
  }

  toCanvasX(x) {
    return Number(x) * this._canvas.width / this.SIZE;
  }
  toCanvasY(y) {
    return Number(y) * this._canvas.height / this.SIZE;
  }
  res() {
    return this._res;
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

    return {x: this.origin.x + BigInt(Math.floor(pixelScale*canvasX)),
            y: this.origin.y + BigInt(Math.floor(pixelScale*canvasY))};
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
    debugDiv.textContent = `(${coord.x}, ${coord.y}) ${viewport.scale}`;
  };
};
main();

