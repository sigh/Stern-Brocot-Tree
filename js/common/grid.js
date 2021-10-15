class GridRenderer extends CanvasRenderer {
  constructor(canvas, viewport) {
    super(canvas);
    this._viewport = viewport;
  }

  _NODE_SIZE = 50;

  _drawBranches(n, d, x, y) {
    const ctx = this._ctx;
    const scale = this._viewport.scale;
    const size = this._NODE_SIZE;

    ctx.lineWidth = scale;

    if (n > 1) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x-size*scale, y+size*scale);
      ctx.stroke();
    }
    if (n == 1 && d%2 == 1) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y+size*scale);
      ctx.stroke();
    }
    if (d == 1 && n%2 == 0) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x+size*scale, y);
      ctx.stroke();
    }
  }

  drawGrid() {
    const viewport = this._viewport;
    const minU = viewport.fromCanvasX(0);
    const minV = viewport.fromCanvasY(0);
    const maxU = viewport.fromCanvasX(viewport.maxCanvasX());
    const maxV = viewport.fromCanvasY(viewport.maxCanvasY());

    const size = this._NODE_SIZE;
    const nodeHeight = size*viewport.scale;

    for (let n = Math.max(1, Math.floor(minU/size)); n-1 < maxU/size; n++) {
      for (let d = Math.max(1, Math.floor(minV/size)); d-1 < maxV/size; d++) {
        const midX = this._viewport.toCanvasX(n*size);
        const midY = this._viewport.toCanvasY(d*size);

        this._drawBranches(n, d, midX, midY);
      }
    }

    for (let n = Math.max(1, Math.floor(minU/size)); n-1 < maxU/size; n++) {
      for (let d = Math.max(1, Math.floor(minV/size)); d-1 < maxV/size; d++) {
        const isLowestForm = MathHelpers.gcd(n, d) == 1;
        const color = isLowestForm ? 'black' : 'lightgrey';

        const midX = this._viewport.toCanvasX(n*size);
        const midY = this._viewport.toCanvasY(d*size);

        this._drawFraction(
          [n, d],
          midX, midY,
          size*viewport.scale*0.8,
          color);
      }
    }
  }
}

class GridController {
  _viewport;

  constructor(canvas) {
    this._viewport = new Viewport(canvas);
    this._viewport.addEventListener('update', () => this._update());

    this._renderer = new GridRenderer(canvas, this._viewport);
  }


  _update() {
    const viewport = this._viewport;
    viewport.allowZoomOut = viewport.scale > 0.33;
    this._renderer.resetCanvas();
    this._renderer.drawGrid();
  }
}


let tree;
const initPage = () => {
  const canvas = document.getElementById('grid-vis');
  tree = new GridController(canvas);
  tree._update();
}

