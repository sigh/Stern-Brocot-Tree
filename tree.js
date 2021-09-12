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

  _drawBar(ctx, x, y, length, fontSize) {
    ctx.lineWidth = fontSize / 20;
    y -= ctx.lineWidth;

    ctx.beginPath();
    ctx.moveTo(x - length*0.5, y);
    ctx.lineTo(x + length*0.5, y);
    ctx.stroke();
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

    const textScale = Number(scaledD/2n) * 0.4;
    const fontSize = Math.floor(viewport.toCanvasY(textScale));

    if (yMinCoord > 0) {
      let ctx = this._ctx;
      ctx.font = fontSize + 'px Serif';

      const x = xMin + scaledD/2n;
      const canvasX = viewport.toCanvasX(x - origin.x);

      const dy = viewport.toCanvasY(-scaledD / 2n);
      const canvasYMin = viewport.toCanvasY(scale - yMin - origin.y);

      ctx.fillText(r[0], canvasX, canvasYMin + dy*0.7);
      ctx.fillText(r[1], canvasX, canvasYMin + dy*0.3);

      if (fontSize > 2) {
        const width = Math.max(ctx.measureText(r[0]).width,
                               ctx.measureText(r[1]).width);
        this._drawBar(ctx, canvasX, canvasYMin + dy*0.5, width, fontSize);
      }
    }

    // Don't continue further if:
    //  - The text will become too small to show.
    //  - We are past the bottom of the viewport.
    return (fontSize >= 2) && (yMinCoord < viewport.SIZE);
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

  constructor(canvas, onUpdate) {
    this._onUpdate = onUpdate;
    this.scale = BigInt(this.SIZE);
    this.origin = {x: 0n, y: 0n};

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
      if (ds == 0 || (ds < 0 && this.scale < this.SIZE)) return;

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

