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

  drawNode(d, i, r, selected) {
    const viewport = this._viewport;
    const scale = viewport.scale;
    const origin = viewport.origin;

    const layerHeight = scale >> (d+1n);

    const xMin = (i * scale) >> d;
    const xMax = xMin + layerHeight*2n;
    if (viewport.toCanvasX(xMin - origin.x) >= this._canvas.width ||
        xMax - origin.x <= 0n) {
      // This entire subtree is outside of the viewport, so stop.
      return null;
    }

    const yMin = layerHeight;
    const yMinCoord = viewport.toCanvasY(scale - yMin - origin.y);
    const nodeHeight = viewport.toCanvasY(layerHeight);

    let rect = [0, 0, 0, 0];

    if (yMinCoord > -nodeHeight) {
      const x = xMin + layerHeight;
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
  }

  _resetTree() {
    this._renderer.clearCanvas();
    this._hitboxes = {};
  }

  _addNodeHitbox(nodeId, rect) {
    if (rect[3] === 0) return;
    this._hitboxes[nodeId] = rect;
  }

  draw(type, selectedNodeId) {
    this._resetTree();

    let nextStateFn = null;
    let valueFn = null;
    let initState = null;

    switch (type) {
      case 'stern-brocot':
        initState = [[0n,1n], [1n,0n]]
        nextStateFn = (s0, s1) => [s0[0] + s1[0], s0[1] + s1[1]];
        valueFn = (s0, s1, s2) => s2;
        break;
      case 'calkin-wilf':
        initState = [1n, 1n];
        nextStateFn = (s0, s1) => s0 + s1;
        valueFn = (s0, s1, s2) => [s0, s1];
        break;
      default:
        throw('Unknown tree type: ' + type);
    };

    const drawTreeRec = (d, expD, i, s0, s1) => {
      const nodeId = i+expD;
      const s2 = nextStateFn(s0, s1);
      const v = valueFn(s0, s1, s2);
      const rect = this._renderer.drawNode(d, i, v, nodeId === selectedNodeId);
      if (rect !== null) {
        this._addNodeHitbox(nodeId, rect);
        i <<= 1n;
        expD <<= 1n;
        d++;
        drawTreeRec(d, expD, i,    s0, s2);
        drawTreeRec(d, expD, i+1n, s2, s1);
      }
    };
    drawTreeRec(0n, 1n, 0n, ...initState);
  }

  isInsideNodeId(coord, nodeId) {
    const rect = this._hitboxes[nodeId];
    if (rect === undefined) return false;

    return (coord.canvasX > rect[0] && coord.canvasY > rect[1]
        && coord.canvasX < rect[0] + rect[2]
        && coord.canvasY < rect[1] + rect[3]);
  }

  findNodeIdAtCoord(coord) {
    const scale = coord.scale;

    // Make sure we are within the tree.
    if (coord.x <= 0n || coord.x >= scale || coord.y <= 0 || coord.y >= scale) {
      return null;
    }

    // Find the depth.
    const expD = scale/coord.y;
    const d = BigInt(expD.toString(2).length - 1);

    // Find the index within the layer.
    const i = (coord.x << d) / scale;

    // Find the node.
    const nodeId = i + (1n << d);

    if (this.isInsideNodeId(coord, nodeId)) {
      return nodeId;
    }
    return null;
  }
}

class Viewport {
  SIZE = Math.pow(2, 16);
  MIN_SCALE = BigInt(Math.floor(this.SIZE * 0.95));

  constructor(canvas) {
    this._onUpdate = null;
    this._canvas = canvas;

    this.scale = this.MIN_SCALE;

    // Offset origin so the tree is centered.
    const offset =
      -(BigInt(Math.floor(this._pixelScale()*canvas.width)) - this.MIN_SCALE) / 2n;
    this.origin = {x: offset, y: 0n};

    this._setUpMouseWheel(canvas);
    this._setUpMouseDrag(canvas);
  }

  setUpdateCallback(onUpdate) {
    this._onUpdate = onUpdate;
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
  constructor() {
    this._onUpdate = null;
    this._treeSelect = document.getElementById('tree-type');
    this._treeSelect.onchange = () => this._update();
  }

  setUpdateCallback(onUpdate) {
    this._onUpdate = onUpdate;
  }

  treeType() {
    return this._treeSelect.value;
  }

  _update() {
    if (this._onUpdate) this._onUpdate();
  }
}

class NodeInfoView {
  constructor() {
    this._container = document.getElementById('node-info');

    this._currentNode = null;
    this._currentTreeType = null;
  }

  _runLengthEncode(nodeIdStr) {
    let currVal = 1;
    let encoded = [0];
    let encodedPos = 0;
    for (let i = 1; i < nodeIdStr.length; i++) {
      if (nodeIdStr[i] != currVal) {
        currVal = 1 - currVal;
        encoded.push(0);
        encodedPos++;
      }
      encoded[encodedPos]++;
    }
    return encoded;
  }

  _toContinuedFraction(rle,treeType) {
    let cf = Array.from(rle);

    if (treeType == 'calkin-wilf') {
      if (cf.length%2 == 0) cf.push(0);
      cf.reverse();
      if (cf[cf.length-1] == 0) cf.pop();
    }

    cf[cf.length-1]++;
    return cf;
  }

  _evalContinuedFrac(cf) {
    let [a, b] = [1n, 0n];
    for (let i = cf.length-1; i>=0 ; i--) {
      [a, b] = [a*BigInt(cf[i]) + b, a];
    }
    return [a,b];
  }

  _makeTextElem(type, text) {
    let elem = document.createElement(type);
    elem.textContent = text;
    return elem;
  }

  _makeMathElem() {
    let math = document.createElement('math');
    math.setAttribute('xmlns', 'http://www.w3.org/1998/Math/MathML');
    return math;
  }

  _renderContinuedFraction(cf) {
    let container = document.createElement('div');

    let math = this._makeMathElem();
    container.appendChild(math);

    if (cf[0] > 0) {
      math.appendChild(this._makeTextElem('mn', cf[0]));
    }

    for (let i = 1; i < cf.length; i++) {
      if (cf[i-1] > 0) {
        math.appendChild(this._makeTextElem('mo', '+'));
      }
      if (i > 10) {
        math.appendChild(this._makeTextElem('mo', '...'));
        break;
      }

      let frac = document.createElement('mfrac');

      frac.appendChild(this._makeTextElem('mn', 1));
      let den = document.createElement('mrow');
      den.appendChild(this._makeTextElem('mn', cf[i]));
      frac.appendChild(den);

      math.appendChild(frac);
      math = den;
    }

    return container;
  }

  _renderFrac(a, b) {
    let container = document.createElement('div');

    let math = this._makeMathElem();
    container.appendChild(math);

    let frac = document.createElement('mfrac');
    frac.appendChild(this._makeTextElem('mn', a));
    frac.appendChild(this._makeTextElem('mn', b));

    math.appendChild(frac);

    return container;
  }

  _renderRLE(rle) {
    let div = document.createElement('div');

    for (let i = 0; i < rle.length; i++) {
      if (!rle[i]) continue;
      const letter = 'RL'[i&1];
      div.appendChild(this._makeTextElem('span', letter));
      if (rle[i] > 1) div.appendChild(this._makeTextElem('sup', rle[i]));
    }

    // If there are no elements, then output 'I' for the identity.
    if (rle.length == 1 && rle[0] == 0) {
      div.appendChild(this._makeTextElem('span', 'I'));
    }

    return div;
  }

  _addItem(container, title, item) {
    let div = document.createElement('div');
    let titleSpan = this._makeTextElem('span', title);
    titleSpan.className = 'info-title';
    item.classList.add('info-item');
    div.appendChild(titleSpan);
    div.appendChild(item);
    container.appendChild(div);
  }

  _showNode(treeType, nodeId) {
    const nodeIdStr = nodeId.toString(2);
    const rle = this._runLengthEncode(nodeIdStr);
    const cf = this._toContinuedFraction(rle, treeType);

    let container = this._container;
    let frac = this._renderFrac(...this._evalContinuedFrac(cf));
    frac.classList.add('frac-display');
    this._addItem(container, '', frac);
    this._addItem(container, 'Depth',
                  this._makeTextElem('div', nodeIdStr.length-1));
    this._addItem(container, 'Index',
                  this._makeTextElem('div', nodeId));
    this._addItem(container, 'Path',
                  this._renderRLE(rle));
    this._addItem(container, 'Continued Fraction',
                  this._renderContinuedFraction(cf));

    MathJax.typeset([container]);
  }

  showNode(treeType, nodeId) {
    if (nodeId == this._currentNode && this._currentTreeType == treeType) {
      return;
    }
    this._currentNode = nodeId;
    this._currentTreeType = treeType;

    // Clear the container.
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }

    if (!nodeId) return;

    this._showNode(treeType, nodeId);
  }
}

class Controller {
  constructor(canvas, controlPanel, nodeInfoView) {
    this.update = deferUntilAnimationFrame(this.update.bind(this));

    this._canvas = canvas;
    this._viewport = new Viewport(canvas);
    this._viewport.setUpdateCallback(() => this.update());

    let renderer = new Renderer(canvas, this._viewport);
    this._tree = new Tree(renderer);

    this._debugDiv = document.getElementById('debug-info');
    this._controlPanel = controlPanel;
    this._controlPanel.setUpdateCallback(() => {
      this._treeType = this._controlPanel.treeType();
      this.update();
    });
    this._nodeInfoView = nodeInfoView;

    this._treeType = this._controlPanel.treeType();
    this._hoverNodeId = null;
    this._selectedNodeId = null;

    this._setUpSelection();
  }

  update() {
    const highlighedNodeId = this._selectedNodeId || this._hoverNodeId;
    this._tree.draw(this._treeType, highlighedNodeId);
    this._nodeInfoView.showNode(this._treeType, highlighedNodeId);
  }

  _setUpSelection() {
    const updateDebug = deferUntilAnimationFrame((coord) => {
      this._debugDiv.textContent = `(${coord.x}, ${coord.y}) ${coord.scale}`;
    });

    const updateSelection = deferUntilAnimationFrame((coord) => {
      // Check if we are still in the same node.
      if (this._hoverNodeId) {
        if (this._tree.isInsideNodeId(coord, this._hoverNodeId)) return;
      }

      const nodeId = this._tree.findNodeIdAtCoord(coord);

      if (this._hoverNodeId == nodeId) return;
      this._hoverNodeId = nodeId;

      if (nodeId) {
        this._canvas.style = 'cursor: pointer';
      } else {
        this._canvas.style = 'cursor: auto';
      }
      this.update();
    });

    this._canvas.onmousemove = (e) => {
      const coord = this._viewport.clientXYToCoord(e.clientX, e.clientY);

      updateSelection(coord);
      updateDebug(coord);
    };

    this._canvas.onclick = (e) => {
      this._selectedNodeId = this._hoverNodeId;
      this.update();
    };
  }
}

const main = () => {
  let canvas = document.getElementById('tree-vis');
  canvas.height = document.body.clientHeight;
  canvas.width = document.body.clientWidth;

  let nodeInfoView = new NodeInfoView();
  let controlPanel = new ControlPanel();

  let controller = new Controller(canvas, controlPanel, nodeInfoView);

  controller.update();
};
main();

