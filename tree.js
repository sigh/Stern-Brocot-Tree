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
    if (nodeHeight < 2) return [0, 0, 0, 0];

    const n = r[0].toString();
    const d = r[1].toString();

    // Determine the font size so that the numbers fit within the node.
    const length = Math.max(n.length, d.length);
    const textScale = 0.4 * Math.min(6/length, 1);
    const fontSize = nodeHeight * textScale;

    let ctx = this._ctx;

    ctx.font = fontSize + 'px Serif';
    const width = ctx.measureText(n.length > d.length ? n : d).width;

    let rect = [canvasX-width/2, canvasY-fontSize*1.1, width, fontSize*2.2];
    ctx.clearRect(...rect);

    ctx.fillText(n, canvasX, canvasY - fontSize/2);
    ctx.fillText(d, canvasX, canvasY + fontSize/2);

    // Render the bar of the fraction, but only if the font is big enough for
    // it to be noticable.
    if (fontSize > 2) {
      this._drawBar(ctx, canvasX, canvasY, width, fontSize/20);
    }

    return rect;
  }

  _drawBranches(ctx, canvasX, canvasY, nodeHeight) {
    if (nodeHeight < 2) return;
    ctx.lineWidth = nodeHeight/100;
    ctx.beginPath();
    ctx.moveTo(canvasX - nodeHeight*0.5, canvasY + nodeHeight*0.75);
    ctx.lineTo(canvasX, canvasY);
    ctx.lineTo(canvasX + nodeHeight*0.5, canvasY + nodeHeight*0.75);
    ctx.stroke();
  }

  drawNode(expD, i, r, selected) {
    const viewport = this._viewport;
    const scale = viewport.scale;
    const origin = viewport.origin;

    const scaledD = scale / expD;

    const xMin = i * scale / expD;
    const xMax = xMin + scaledD;
    if (viewport.toCanvasX(xMin - origin.x) >= this._canvas.width ||
        xMax - origin.x <= 0n) {
      // This entire subtree is outside of the viewport, so stop.
      return null;
    }

    const yMin = scaledD/2n;
    const yMinCoord = viewport.toCanvasY(scale - yMin - origin.y);
    const nodeHeight = viewport.toCanvasY(scaledD/2n);

    let rect = [0, 0, 0, 0];

    if (yMinCoord > -nodeHeight) {
      const x = xMin + scaledD/2n;
      const canvasX = viewport.toCanvasX(x - origin.x);

      const canvasYMin = viewport.toCanvasY(scale - yMin - origin.y);
      const canvasYMid = canvasYMin - nodeHeight*0.5;

      let ctx = this._ctx;
      this._drawBranches(ctx, canvasX, canvasYMid, nodeHeight);

      if (yMinCoord > 0) {
        if (selected) {
          ctx.save();
          ctx.fillStyle = '#0066dd';
          ctx.strokeStyle = '#0066dd';
        }
        rect = this._drawFraction(r, canvasX, canvasYMid, nodeHeight);
        if (selected) ctx.restore();
      }
    }

    if (rect[3] !== 0) return rect;

    // Don't continue further if:
    //  - The node size is too small.
    //  - We are past the bottom of the viewport.
    if ((nodeHeight > 0.5) && (yMinCoord < this._canvas.height)) {
      return rect;
    } else {
      return null;
    }
  }

}

class Tree {
  constructor(renderer) {
    this._renderer = renderer;
    this._hitboxes = {};
    this._selectedNode = 0;
  }

  _resetTree() {
    this._renderer.clearCanvas();
    this._hitboxes = {};
  }

  _addNodeHitbox(nodeId, rect) {
    if (rect[3] === 0) return;
    this._hitboxes[nodeId] = rect;
  }

  drawSternBrocotTree() {
    this._resetTree();

    let drawTreeRec = (d, expD, i, a, b) => {
      const nodeId = i+expD;
      const c = [a[0] + b[0], a[1] + b[1]];
      const rect = this._renderer.drawNode(expD, i, c, nodeId === this._selectedNode);
      if (rect !== null) {
        this._addNodeHitbox(nodeId, rect);
        i <<= 1n;
        expD <<= 1n;
        d++;
        drawTreeRec(d, expD, i,    a, c);
        drawTreeRec(d, expD, i+1n, c, b);
      }
    };
    drawTreeRec(0n, 1n, 0n, [0n,1n], [1n,0n]);
  }

  drawCalkinWilfTree() {
    this._resetTree();

    let drawTreeRec = (d, expD, i, a) => {
      const nodeId = i+expD;
      const b = a[0] + a[1];
      const rect = this._renderer.drawNode(expD, i, a, nodeId === this._selectedNode);
      if (rect !== null) {
        this._addNodeHitbox(nodeId, rect);
        i <<= 1n;
        expD <<= 1n;
        d++;
        drawTreeRec(d, expD, i,    [a[0], b]);
        drawTreeRec(d, expD, i+1n, [b, a[1]]);
      }
    };
    drawTreeRec(0n, 1n, 0n, [1n,1n]);
  }

  _isInsideNode(coord, nodeId) {
    const rect = this._hitboxes[nodeId];
    if (rect === undefined) return false;

    return (coord.canvasX > rect[0] && coord.canvasY > rect[1]
        && coord.canvasX < rect[0] + rect[2]
        && coord.canvasY < rect[1] + rect[3]);
  }

  findNode(coord) {
    const scale = coord.scale;

    // Make sure we are within the tree.
    if (coord.x <= 0n || coord.x >= scale || coord.y <= 0 || coord.y >= scale) {
      return null;
    }

    // Check if we are within the currently selected node.
    if (this._selectedNode) {
      if (this._isInsideNode(coord, this._selectedNode)) {
        return this._selectedNode;
      }
    }

    // Find the depth.
    const expD = scale/coord.y;
    const d = BigInt(expD.toString(2).length - 1);

    // Find the index within the layer.
    const i = (coord.x << d) / scale;

    // Find the node.
    const nodeId = i + (1n << d);

    if (this._isInsideNode(coord, nodeId)) {
      return nodeId;
    }
    return null;
  }

  selectNode(nodeId) {
    this._selectedNode = nodeId || 0n;
  }
}

class Viewport {
  SIZE = Math.pow(2, 16);
  MIN_SCALE = BigInt(Math.floor(this.SIZE * 0.95));

  constructor(canvas, onUpdate, onHover) {
    this._onUpdate = onUpdate;
    this._onHover = onHover;
    this._canvas = canvas;

    this.scale = this.MIN_SCALE;

    // Offset origin so the tree is centered.
    const offset =
      -(BigInt(Math.floor(this._pixelScale()*canvas.width)) - this.MIN_SCALE) / 2n;
    this.origin = {x: offset, y: 0n};

    this._setUpMouseWheel(canvas);
    this._setUpMouseDrag(canvas);
    this._setUpHover(canvas);
  }

  _setUpHover(canvas) {
    canvas.onmousemove = (e) => {
      const coord = this.clientXYToCoord(e.clientX, e.clientY);
      this._onHover(coord);
    };
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

      const canvasOrigin = this._canvasOrigin();
      const canvasX = e.clientX - canvasOrigin.x;
      const canvasY = e.clientY - canvasOrigin.y;

      // Remove offset from origin, so that it will be corretly handled when
      // scaling.
      let pixelScale = this._pixelScale();
      origin.x += BigInt(Math.floor(pixelScale * canvasX));
      origin.y += BigInt(Math.floor(pixelScale * canvasY));

      // Clamp the delta, and ensure that we don't zoom out too far.
      const ds = clamp(e.deltaY * 0.01, -0.5, 0.5);

      // Scale by 2**ds. Scale ds by 2**x so that we only deal with integers.
      const x = 5n;
      let dsX = BigInt(Math.floor(Math.pow(2, Number(x) + ds)));
      this.scale = this.scale * dsX >> x;
      if (this.scale < this.MIN_SCALE) {
        dsX = dsX * this.MIN_SCALE / this.scale;
        this.scale = this.MIN_SCALE;
      }
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
    return this.SIZE / this._canvas.height;
  }

  toCanvasX(x) {
    return Number(x) * this._canvas.height / this.SIZE;
  }
  toCanvasY(y) {
    return Number(y) * this._canvas.height / this.SIZE;
  }

  _canvasOrigin() {
    const bb = this._canvas.getBoundingClientRect();
    return {x: bb.x, y: bb.y};
  }

  _update() {
    // Clamp the y direction so that we can easily zoom in without running
    // off the bottom of the tree.
    this.origin.y = clamp(this.origin.y, 0n, this.scale - this.MIN_SCALE);

    this._onUpdate();
  }

  clientXYToCoord(clientX, clientY) {
    const canvasOrigin = this._canvasOrigin();
    const canvasX = clientX - canvasOrigin.x;
    const canvasY = clientY - canvasOrigin.y;
    const pixelScale = this._pixelScale();

    return {x: this.origin.x + BigInt(Math.floor(pixelScale*canvasX)),
            y: this.scale - this.origin.y - BigInt(Math.floor(pixelScale*canvasY)),
            canvasX: canvasX,
            canvasY: canvasY,
            scale: this.scale,
           };
  }
}

class ControlPanel {
  constructor(onUpdate) {
    this._onUpdate = onUpdate;
    this._treeSelect = document.getElementById('tree-type');
    this._treeSelect.onchange = () => this._update();
  }

  treeType() {
    return this._treeSelect.value;
  }

  _update() {
    this._onUpdate();
  }
}

const main = () => {
  let canvas = document.getElementById('tree-vis');
  canvas.height = document.body.clientHeight;
  canvas.width = document.body.clientWidth;

  let tree = null;
  let controlPanel = null;
  const redraw = deferUntilAnimationFrame(() => {
    tree[controlPanel.treeType()]();
  });

  let debugDiv = document.getElementById('debug-info');
  const hover = deferUntilAnimationFrame((coord) => {
    debugDiv.textContent = `(${coord.x}, ${coord.y}) ${coord.scale}`;
    const nodeId = tree.findNode(coord);
    tree.selectNode(nodeId);
    if (nodeId) {
      canvas.style = 'cursor: pointer';
    } else {
      canvas.style = 'cursor: auto';
    }
    // TODO: Don't redraw if selected node is the same.
    redraw();
  });

  let viewport = new Viewport(canvas, redraw, hover);

  controlPanel = new ControlPanel(redraw);
  let renderer = new Renderer(canvas, viewport);
  tree = new Tree(renderer);

  redraw();
};
main();

