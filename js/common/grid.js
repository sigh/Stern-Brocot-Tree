class GridController {
  _viewport;

  constructor(canvas) {
    // super();

    this._viewport = new Viewport(canvas);
    this._viewport.addEventListener('update', () => this._update());

    this._renderer = new Renderer(canvas, this._viewport);
  }

  _drawGrid() {
    this._renderer.resetCanvas();

    const viewport = this._viewport;
    const minU = viewport.fromCanvasX(0);
    const minV = viewport.fromCanvasY(0);
    const maxU = viewport.fromCanvasX(viewport.maxCanvasX());
    const maxV = viewport.fromCanvasY(viewport.maxCanvasY());

    const size = 100;
    const nodeHeight = size*viewport.scale;

    if (nodeHeight < 10) return;

    for (let n = Math.max(1, Math.floor(minU/size)); n-1 < maxU/size; n++) {
      for (let d = Math.max(1, Math.floor(minV/size)); d-1 < maxV/size; d++) {
        const isLowestForm = MathHelpers.gcd(n, d) == 1;
        this._renderer._drawFraction(
          [n, d],
          this._viewport.toCanvasX(n*size),
          this._viewport.toCanvasY(d*size),
          size*viewport.scale,
          isLowestForm ? 'black' : 'lightgrey');
      }
    }
  }

  _update() {
    this._drawGrid();
  }
}


let tree;
const initPage = () => {
  const canvas = document.getElementById('grid-vis');
  tree = new GridController(canvas);
  tree._update();
}

