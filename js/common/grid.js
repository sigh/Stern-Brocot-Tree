class GridRenderer extends CanvasRenderer {
  constructor(canvas, viewport) {
    super(canvas);
    this._viewport = viewport;
  }

  drawGrid() {
    const viewport = this._viewport;
    const minU = viewport.fromCanvasX(0);
    const minV = viewport.fromCanvasY(0);
    const maxU = viewport.fromCanvasX(viewport.maxCanvasX());
    const maxV = viewport.fromCanvasY(viewport.maxCanvasY());

    const size = 100;
    const nodeHeight = size*viewport.scale;

    // if (nodeHeight < 2) return;

    for (let n = Math.max(1, Math.floor(minU/size)); n-1 < maxU/size; n++) {
      for (let d = Math.max(1, Math.floor(minV/size)); d-1 < maxV/size; d++) {
        const isLowestForm = MathHelpers.gcd(n, d) == 1;
        const color = isLowestForm ? 'black' : 'lightgrey';

        this._drawFraction(
          [n, d],
          this._viewport.toCanvasX(n*size),
          this._viewport.toCanvasY(d*size),
          size*viewport.scale,
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

