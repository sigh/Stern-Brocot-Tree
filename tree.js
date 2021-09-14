class Renderer {
  constructor(canvas, viewport) {
    this._canvas = canvas;

    this._ctx = canvas.getContext('2d');

    this._viewport = viewport;
  }

  resetCanvas() {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._ctx.textAlign = 'center';
    this._ctx.textBaseline = 'middle';
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

  _drawBranches(ctx, canvasX, canvasY, nodeHeight, selectionType) {
    if (nodeHeight < 2) return;
    ctx.lineWidth = nodeHeight/100;
    ctx.beginPath();
    ctx.moveTo(canvasX - nodeHeight*0.5, canvasY + nodeHeight*0.75);
    ctx.lineTo(canvasX, canvasY);
    ctx.lineTo(canvasX + nodeHeight*0.5, canvasY + nodeHeight*0.75);
    ctx.stroke();

    if (selectionType > Renderer.SELECT_FINAL) {
      const sign = selectionType == Renderer.SELECT_LEFT ? -1 : 1;
      ctx.save();
      ctx.strokeStyle = Renderer._PATH_COLOR;
      ctx.beginPath();
      ctx.lineTo(canvasX, canvasY);
      ctx.lineTo(canvasX + sign*nodeHeight*0.5, canvasY + nodeHeight*0.75);
      ctx.stroke();
      ctx.restore();
    }
  }

  layerWidth(d) {
    return this._viewport.scale >> d;
  }

  xStart(d, i) {
    return (i * this._viewport.scale) >> d;
  }

  centeredNodePosition(d, i) {
    const viewport = this._viewport;

    // Determine what our target size is, but we may have to adjust if the
    // scale is too small.
    const targetNodeHeight = this._canvas.height/4;
    const targetLayerHeight = viewport.fromCanvasY(targetNodeHeight);
    let scale = targetLayerHeight << (d+1n);
    if (scale < viewport.MIN_SCALE) scale = viewport.MIN_SCALE;

    const layerHeight = scale >> (d+1n);

    const xMid = ((i * scale) >> d) + layerHeight;
    const yMid = layerHeight + layerHeight/2n;

    const screenMidY = viewport.fromCanvasY(this._canvas.height/2);
    const screenMidX = viewport.fromCanvasX(this._canvas.width/2);

    return {
      scale: scale,
      origin: {
        x: xMid - screenMidX,
        y: screenMidY - yMid,
      },
    }
  }

  static SELECT_NONE = 0;
  static SELECT_FINAL = 1;
  static SELECT_LEFT = 2;
  static SELECT_RIGHT = 3;

  static _PATH_COLOR = '#0000aa';
  static _SELECTED_COLOR = '#0099ff';

  // The range of depths visible in the current viewport.
  // Returns the half-open interval [minD, maxD).
  depthRange() {
    // TODO: Optimize logs.
    //  - factor them out.
    //  - keep track of log scale?
    const viewport = this._viewport;
    const scale = viewport.scale;
    const origin = viewport.origin;

    // Exclude nodes which are above the viewport.
    let minD = MathHelpers.log2BigInt(scale/origin.y) - 1n;
    if (minD < 0) minD = 0n;

    // Exclude nodes which are too small.
    const minNodeHeight = 0.5;
    const minLayerHeight = viewport.fromCanvasY(minNodeHeight);
    let maxD = MathHelpers.log2BigInt(scale/minLayerHeight) - 1n;

    // Exclude nodes which are below the viewport.
    // If targetYCoord  <= 0, then the whole tree is visible.
    const targetYMin = origin.y - viewport.fromCanvasY(this._canvas.height);
    if (targetYMin > 0) {
      const maxViewportD = MathHelpers.log2BigInt(scale/targetYMin) + 1n;
      if (maxViewportD < maxD) maxD = maxViewportD;
    }

    return [minD, maxD];
  }

  // Returns the range of x coordinates of the viewport at the current scale.
  xRange() {
    const viewport = this._viewport;
    const origin = viewport.origin;

    return [origin.x, viewport.fromCanvasX(this._canvas.width) + origin.x];
  }

  // Range of i values visible in xRange at depth d.
  // Returns the half-open interval [iMin, iMax).
  // The returned range will always be valid indexes (possible empty).
  iRange(d, expD, xRange) {
    const [xMin, xMax] = xRange;
    const scale = this._viewport.scale;

    let iMin = (xMin<<d)/scale;
    if (iMin < 0) iMin = 0n;

    let iMax = (xMax<<d)/scale + 1n;
    if (iMax > expD) iMax = expD;

    if (iMin >= iMax) {
      iMin = 0;
      iMax = 0;
    }

    return [iMin, iMax];
  }

  initialLayerWidth() {
    return this._viewport.scale;
  }

  drawNode(d, xMin, layerWidth, frac, selectionType) {
    const viewport = this._viewport;
    const scale = viewport.scale;
    const origin = viewport.origin;

    const layerHeight = layerWidth >> 1n;

    const yMin = layerHeight;
    const nodeHeight = viewport.toCanvasY(layerHeight);

    const x = xMin + layerHeight;
    const canvasX = viewport.toCanvasX(x - origin.x);

    const canvasYMin = viewport.toCanvasY(origin.y - yMin);
    const canvasYMid = canvasYMin - nodeHeight*0.5;

    // Draw the branches.
    let ctx = this._ctx;
    this._drawBranches(ctx, canvasX, canvasYMid, nodeHeight, selectionType);

    // Draw the fraction.
    if (selectionType) {
      ctx.save();
      const color = selectionType === Renderer.SELECT_FINAL
        ? Renderer._SELECTED_COLOR : Renderer._PATH_COLOR;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
    }
    let rect = this._drawFraction(frac, canvasX, canvasYMid, nodeHeight);
    if (selectionType) ctx.restore();

    return rect;
  }

}

class Tree {
  constructor(renderer) {
    this._renderer = renderer;
    this._hitboxes = new Map();
    this._nodesProcessed = 0;

    this._cache = {
      valid: false,
      treeType: null,
    };

    this._treeConfigs = {
      'stern-brocot': {
        initState: [[0n,1n], [1n,0n]],
        nextStateFn: (s0, s1) => [s0[0] + s1[0], s0[1] + s1[1]],
        valueFn: (s0, s1, s2) => s2,
      },
      'calkin-wilf': {
        initState: [1n, 1n],
        nextStateFn: (s0, s1) => s0 + s1,
        valueFn: (s0, s1, s2) => [s0, s1],
      }
    };
  }

  _resetTree() {
    this._renderer.resetCanvas();
    this._hitboxes.clear();
    this._nodesProcessed = 0;
  }

  _addNodeHitbox(d, i, rect) {
    const nodeId = i | (1n << d);
    this._hitboxes.set(nodeId, rect);
  }

  draw(type, selectedNodeId) {
    this._resetTree();

    selectedNodeId = selectedNodeId || 0n;

    const config = this._treeConfigs[type];

    if (this._cache.treeType != type) {
      this._cache.valid = false;
      this._cache.treeType = type;
    }

    this._drawTree(selectedNodeId, config);
  }

  // Find all nodes where depth == minD.
  // The final positions don't depend on the viewport so can be cached.
  _findInitialNodes(minD, expMinD, xRange, config) {
    const [minI, maxI] = this._renderer.iRange(minD, expMinD, xRange);

    let stack = [];

    // Try to initialize the stack with the cache.
    // As long as the cache completely covers the current set we can use it.
    let cache = this._cache;
    if (cache.valid && minD >= cache.minD) {
      const diffD = minD - cache.minD;
      const targetMinI = minI >> diffD;
      const targetMaxI = ((maxI-1n) >> diffD) + 1n;
      if (targetMinI >= cache.minI && targetMaxI <= cache.maxI) {
        const iWidth = 1n << diffD;
        for (let j = 0; j < cache.initialNodes.length; j++) {
          const [iStart, s0, s1] = cache.initialNodes[j];
          if (iStart >= targetMinI && iStart < targetMaxI) {
            stack.push([iStart << diffD, iWidth, s0, s1]);
          }
        }
      }
    }

    // We didn't populate from the cache, so we have to start from the start.
    if (!stack.length) {
      stack.push([0n, expMinD, ...config.initState]);
    }

    const nextStateFn = config.nextStateFn;
    let initialNodes = [];
    while (stack.length) {
      let [iStart, iWidth, s0, s1] = stack.pop();
      this._nodesProcessed++;

      if (iWidth == 1n) {
        initialNodes.push([iStart, s0, s1]);
      } else {
        iWidth >>= 1n;
        const iMid = iStart + iWidth;
        const s2 = nextStateFn(s0, s1);

        if (iMid >= minI) {
          stack.push([iStart, iWidth, s0, s2]);
        }
        if (iMid < maxI) {
          stack.push([iMid, iWidth, s2, s1]);
        }
      }
    }

    cache.valid = true;
    cache.minD = minD;
    cache.minI = minI;
    cache.maxI = maxI;
    cache.initialNodes = initialNodes;

    return initialNodes;
  }

  _drawTree(selectedNodeId, config) {
    let renderer = this._renderer;

    const [minD, maxD] = renderer.depthRange();
    const expMinD = 1n << minD;
    const xRange = renderer.xRange();
    const [minX, maxX] = xRange;

    // Find all the initial drawing nodes.
    let drawStarts = this._findInitialNodes(minD, expMinD, xRange, config);
    this._numDrawStarts = drawStarts.length;

    // Determine if there is a selected node prefix to start matching on.
    const selectedBranches = selectedNodeId.toString(2);
    const selectedNodeDepth = selectedBranches.length-1;
    let truncatedSelectedId = -1n;
    if (selectedNodeDepth >= minD) {
      truncatedSelectedId = selectedNodeId >> (BigInt(selectedNodeDepth) - minD);
      truncatedSelectedId -= expMinD;
    }

    // Set up the drawing stack.
    let stack = [];
    const layerWidth = this._renderer.layerWidth(minD);
    for (let j = 0; j < drawStarts.length; j++) {
      const [i, s0, s1] = drawStarts[j];

      // TODO: We can precompute all of these when finding iRange.
      const xStart = this._renderer.xStart(minD, i);
      const onSelectedBranch = i == truncatedSelectedId;

      stack.push([minD, i, xStart, layerWidth, s0, s1, onSelectedBranch]);
    }

    // Draw nodes.
    const valueFn = config.valueFn;
    const nextStateFn = config.nextStateFn;
    while (stack.length) {
      let [d, i, xStart, layerWidth, s0, s1, onSelectedBranch] = stack.pop();
      this._nodesProcessed++;

      const s2 = nextStateFn(s0, s1);
      const v = valueFn(s0, s1, s2);

      let selectionType = Renderer.SELECT_NONE;
      if (onSelectedBranch) {
        if (d == selectedBranches.length-1) {
          selectionType = Renderer.SELECT_FINAL;
          onSelectedBranch = false;
        } else {
          selectionType = selectedBranches[d+1n] === '0' ? Renderer.SELECT_LEFT : Renderer.SELECT_RIGHT;
        }
      }

      const rect = renderer.drawNode(d, xStart, layerWidth, v, selectionType);
      this._addNodeHitbox(d, i, rect);

      i <<= 1n;
      d++;
      layerWidth >>= 1n;
      if (d < maxD) {
        const xMid = xStart+layerWidth;
        if (xMid >= minX) {
          stack.push([d, i,    xStart, layerWidth, s0, s2, selectionType === Renderer.SELECT_LEFT]);
        }
        if (xMid < maxX) {
          stack.push([d, i+1n, xMid,   layerWidth, s2, s1, selectionType === Renderer.SELECT_RIGHT]);
        }
      }
    }
  }

  isInsideNodeId(coord, nodeId) {
    const rect = this._hitboxes.get(nodeId);
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
    const d = MathHelpers.log2BigInt(expD);

    // Find the index within the layer.
    const i = (coord.x << d) / scale;

    // Find the node.
    const nodeId = i + (1n << d);

    if (this.isInsideNodeId(coord, nodeId)) {
      return nodeId;
    }
    return null;
  }

  // The inverse nodeId finds the eqivalent node in the other tree type.
  inverseNodeId(nodeId) {
    let nodeIdChars = [...nodeId.toString(2)];

    // Reverse and remove the old leading '1'.
    nodeIdChars.reverse();
    nodeIdChars.pop();

    return BigInt('0b1' + nodeIdChars.join(''));
  }

  nodeForContinuousFraction(treeType, cf) {
    let nodeIndex = 0n;

    let isRight = true;
    let d = 0n;
    const maxD = 1n << 18n;
    for (let i = 0; i < cf.length; i++) {
      if (maxD - d < cf[i]) {
        break;
      }

      nodeIndex <<= cf[i];
      if (isRight) nodeIndex |= (1n << cf[i])-1n;
      d += cf[i];

      isRight = !isRight;
    }

    // Reduce last cf entry by 1.
    d--;
    nodeIndex >>= 1n;
    let nodeId = nodeIndex | (1n << d);

    if (treeType == 'calkin-wilf') {
      nodeId = this.inverseNodeId(nodeId);
      nodeIndex = nodeId ^ (1n << d);
    }

    const pos = this._renderer.centeredNodePosition(d, nodeIndex);

    return {
      nodeId: nodeId,
      d: d,
      scale: pos.scale,
      origin: pos.origin,
    }
  }
}

class Viewport {
  SIZE = Math.pow(2, 16);
  MIN_SCALE = BigInt(Math.floor(this.SIZE * 0.95));

  constructor(canvas) {
    this._onUpdate = null;
    this._canvas = canvas;

    this.scale = 0n;
    this.origin = {x: 0n, y: 0n, y1: 0n};
    this.resetPosition();

    this._setUpMouseWheel(canvas);
    this._setUpMouseDrag(canvas);

    this._dragDistance = 0;
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
      const dcx = e.clientX - dragPos.x;
      const dcy = e.clientY - dragPos.y;
      this._dragDistance += Math.abs(dcx) + Math.abs(dcy);  // Manhatten distance.
      const dx = pixelScale * dcx;
      const dy = pixelScale * dcy;
      origin.x -= BigInt(Math.floor(dx));
      origin.y += BigInt(Math.floor(dy));
      dragPos.x = e.clientX;
      dragPos.y = e.clientY;
      this._update();
    };

    canvas.onmousedown = (e) => {
      e.preventDefault();
      dragPos.x = e.clientX;
      dragPos.y = e.clientY;
      this._dragDistance = 0;
      document.addEventListener('mousemove', mouseMoveHandler);
      let mouseUpHandler = () => {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
      };
      document.addEventListener('mouseup', mouseUpHandler);
    };
  }

  wasDragged() {
    return this._dragDistance > 1;
  }

  _rescale(ds, canvasX, canvasY) {
    let origin = this.origin;

    // Remove offset from origin, so that it will be corretly handled when
    // scaling.
    let pixelScale = this._pixelScale();
    origin.x += BigInt(Math.floor(pixelScale * canvasX));
    origin.y -= BigInt(Math.floor(pixelScale * canvasY));

    // Scale by 2**ds. Scale ds by 2**x so that we only deal with integers.
    const f = 5n;
    let dsF = BigInt(Math.floor(Math.pow(2, Number(f) + ds)));
    this.scale = this.scale * dsF >> f;
    if (this.scale < this.MIN_SCALE) {
      dsF = dsF * this.MIN_SCALE / this.scale;
      this.scale = this.MIN_SCALE;
    }
    origin.x = origin.x * dsF >> f;
    origin.y = origin.y * dsF >> f;

    // Reoffset origin after scaling.
    pixelScale = this._pixelScale();
    origin.x -= BigInt(Math.floor(pixelScale * canvasX));
    origin.y += BigInt(Math.floor(pixelScale * canvasY));
  }

  _setUpMouseWheel(canvas) {
    canvas.onwheel = (e) => {
      e.preventDefault();

      // Clamp the delta, and ensure that we don't zoom out too far.
      const ds = clamp(e.deltaY * 0.01, -0.5, 0.5);

      const canvasOrigin = this._canvasOrigin();
      const canvasX = e.clientX - canvasOrigin.x;
      const canvasY = e.clientY - canvasOrigin.y;

      this._rescale(ds, canvasX, canvasY);

      this._update();
    };
  }

  resetPosition() {
    this.scale = this.MIN_SCALE;

    // Offset origin so the tree is centered.
    const offset =
      -(BigInt(Math.floor(this._pixelScale()*this._canvas.width)) - this.MIN_SCALE) / 2n;
    this.origin.x = offset;
    this.origin.y = this.MIN_SCALE;
  }

  setPosition(origin, scale) {
    this.origin.x = origin.x;
    this.origin.y = origin.y;
    this.scale = scale < this.MIN_SCALE ? this.MIN_SCALE : scale;
    this._clampPosition();
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

  fromCanvasY(canvasY) {
    return BigInt(Math.floor(canvasY * this.SIZE / this._canvas.height));
  }
  fromCanvasX(canvasX) {
    return BigInt(Math.floor(canvasX * this.SIZE / this._canvas.height));
  }

  _canvasOrigin() {
    const bb = this._canvas.getBoundingClientRect();
    return {x: bb.x, y: bb.y};
  }

  _clampPosition() {
    // Clamp the y direction so that we can easily zoom in without running
    // off the bottom of the tree.
    this.origin.y = clamp(this.origin.y, this.MIN_SCALE, this.scale);
  }

  _update() {
    this._clampPosition();
    this._onUpdate();
  }

  clientXYToCoord(clientX, clientY) {
    const canvasOrigin = this._canvasOrigin();
    const canvasX = clientX - canvasOrigin.x;
    const canvasY = clientY - canvasOrigin.y;
    const pixelScale = this._pixelScale();

    return {x: this.origin.x + BigInt(Math.floor(pixelScale*canvasX)),
            y: this.origin.y - BigInt(Math.floor(pixelScale*canvasY)),
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
    this._targetContinuedFraction = null;

    this._setUpFinder();
  }

  setUpdateCallback(onUpdate) {
    this._onUpdate = onUpdate;
  }

  _setUpFinder() {
    let reset = document.getElementById('reset-zoom');
    reset.onclick = () => {
      // Just reset the zoom by setting the target to 0.
      this._targetContinuedFraction = [];
      this._update();
      return false;
    };

    let findExp = document.getElementById('find-expression');
    let form = document.getElementById('find-form');
    form.onsubmit = (e) => {
      e.preventDefault();

      const value = Function('"use strict";return (' + findExp.value + ')')();

      let cf = null;

      if (typeof value == 'number') {
        // Determine the exact value of the floating point value.
        const floatParts = MathHelpers.getFloatParts(value);
        cf = floatParts.exponent >= 0
          ? floatParts.int << floatParts.exponent
          : MathHelpers.findContinuedFractionBigInt(
              floatParts.int, 1n << -floatParts.exponent);
      } else if (Array.isArray(value)) {
        // Interpret array as continued fraction cooeficients.
        cf = value.map(BigInt);
      }

      this._targetContinuedFraction = cf;

      this._update();

      return false;
    };
  }

  popTargetContinuedFraction() {
    let f = this._targetContinuedFraction;
    this._targetContinuedFraction = null;
    return f;
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
    const f = MathHelpers.evalContinuedFrac(cf);

    let container = this._container;
    let fracElem = this._renderFrac(...f);
    fracElem.classList.add('frac-display');
    this._addItem(container, '', fracElem);
    this._addItem(container, 'Decimal',
                  this._makeTextElem('div', MathHelpers.fracToDecimal(...f)));
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
    this._currentCoord = null;

    this._setUpSelection();

    const resizeCanvas = () => {
      this._canvas.height = document.body.clientHeight;
      this._canvas.width = document.body.clientWidth;
      this.update();
    };
    window.onresize = resizeCanvas;
    resizeCanvas();
    this._viewport.resetPosition();
  }

  update() {
    const targetContinuedFraction = this._controlPanel.popTargetContinuedFraction();
    if (targetContinuedFraction !== null) {
      if (targetContinuedFraction.length > 0) {
        const node = this._tree.nodeForContinuousFraction(
          this._treeType, targetContinuedFraction);
        this._selectedNodeId = node.nodeId;
        if (node.nodeId) {
          this._viewport.setPosition(node.origin, node.scale);
        }
      } else {
        // Reset the zoom.
        this._viewport.resetPosition();
      }
    }

    const highlighedNodeId = this._selectedNodeId || this._hoverNodeId;
    this._tree.draw(this._treeType, highlighedNodeId);
    this._nodeInfoView.showNode(this._treeType, highlighedNodeId);
    this._updateDebug();
  }

  _updateDebug() {
    // let coord = this._currentCoord;
    // if (coord) this._debugDiv.textContent = `(${coord.x}, ${coord.y}) ${coord.scale}`;
    this._debugDiv.textContent = `${this._tree._hitboxes.size}/${this._tree._nodesProcessed} ${this._tree._numDrawStarts}`;
  }

  _setUpSelection() {
    const updateDebug = deferUntilAnimationFrame(() => {
      this._updateDebug();
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
      this._currentCoord = coord;

      updateSelection(coord);
      updateDebug();
    };

    this._canvas.onclick = (e) => {
      if (!this._viewport.wasDragged()) {
        this._selectedNodeId = this._hoverNodeId;
        this.update();
      }
    };
  }
}

const initPage = () => {
  let canvas = document.getElementById('tree-vis');

  let nodeInfoView = new NodeInfoView();
  let controlPanel = new ControlPanel();

  let controller = new Controller(canvas, controlPanel, nodeInfoView);

  controller.update();
};
