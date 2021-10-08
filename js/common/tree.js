class TreeState {
  constructor(m0, n0, m1, n1) {
    this.m0 = m0;
    this.m1 = m1;
    this.n0 = n0;
    this.n1 = n1;
  }

  static initialState() {
    return new TreeState(0n, 1n, 1n, 0n);
  }

  static getValueFn(treeType) {
    switch (treeType) {
      case 'stern-brocot':
        return (s) => [s.m0+s.m1, s.n0+s.n1];
      case 'calkin-wilf':
        return (s) => [s.m0+s.n0, s.m1+s.n1];
    }
  }

  clone() {
    return new TreeState(this.m0, this.n0, this.m1, this.n1);
  }

  // Go left k times.
  goToLeftChild(k) {
    this.m1 += this.m0*k;
    this.n1 += this.n0*k;
    return this;
  }
  // Go right k times.
  goToRightChild(k) {
    this.m0 += this.m1*k;
    this.n0 += this.n1*k;
    return this;
  }

  // Go to the parent node.
  goToParent() {
    if (this.m0+this.n0 < this.m1+this.n1) {
      this.m1 -= this.m0;
      this.n1 -= this.n0;
    } else {
      this.m0 -= this.m1;
      this.n0 -= this.n1;
    }
    return this;
  }

  // Adjacent states on the same layer.
  // From https://www.researchgate.net/publication/221440223_Recounting_the_Rationals_Twice

  goToNextSibling() {
    const j = (this.n0+this.m0-1n) / (this.n1+this.m1);
    const k = (j<<1n)+1n;
    [this.m0, this.n0, this.m1, this.n1] = [
      this.m1,
      this.n1,
      this.m1*k-this.m0,
      this.n1*k-this.n0];
    return this;
  };
  goToPrevSibling() {
    const j = (this.n1+this.m1-1n) / (this.n0+this.m0);
    const k = (j<<1n)+1n;
    [this.m0, this.n0, this.m1, this.n1] = [
      this.m0*k-this.m1,
      this.n0*k-this.n1,
      this.m0,
      this.n0];
    return this;
  };
}

class NodeId {

  static ONE = new NodeId(new RLEPath());

  constructor(rlepath) {
    this._rlepath = rlepath;
  }

  static fromBigInt(n) {
    const rle = RLEPath.fromBigInt(n);
    // Remove the leading bit with the tools we have.
    rle.reverse();
    rle.rightShift(1n);
    rle.reverse();
    return this.fromRLEPath(rle);
  }

  static fromRLEPath(rlepath) {
    return new NodeId(rlepath);
  }

  static fromContinuedFraction(treeType, cf) {
    // To get to the tree path, we need to decrement the last cf value by 1.
    const rle = cf.slice();
    rle[rle.length-1]--;

    const depth = rle.reduce((a,b) => a+b);

    const rlepath = new RLEPath(rle);

    // The Calkin-Wilf tree has the reverse path.
    if (treeType == 'calkin-wilf') {
      rlepath.reverse();
    }

    return NodeId.fromRLEPath(rlepath);
  }

  toContinuedFraction(treeType) {
    if (this.depth() == 0) return [1n];

    let cf = [];
    for (const [bit, count] of this._rlepath.items()) {
      cf.push(count);
    }

    if (treeType == 'calkin-wilf') {
      if (cf.length%2 == 0) cf.push(0);
      cf.reverse();
      if (cf[cf.length-1] == 0) cf.pop();
    }

    cf[cf.length-1]++;
    return cf;
  }

  getRLEPath() {
    return this._rlepath.clone();
  }

  leftChild() {
    let rlepath = this._rlepath.clone();
    rlepath.appendBit(0);
    return NodeId.fromRLEPath(rlepath);
  }
  rightChild() {
    let rlepath = this._rlepath.clone();
    rlepath.appendBit(1);
    return NodeId.fromRLEPath(rlepath);
  }
  parent() {
    if (this.depth() == 0) throw('Already at top of tree.');

    const rlepath = this._rlepath.clone();
    rlepath.rightShift(1n);

    return NodeId.fromRLEPath(rlepath);
  }
  isRightChild() {
    const rlepath = this._rlepath;
    return rlepath.lastBit() == 1;
  }

  next() {
    return NodeId.fromRLEPath(this._rlepath.clone().inc());
  }
  prev() {
    return NodeId.fromRLEPath(this._rlepath.clone().dec());
  }

  depth() { return this._rlepath.size(); }

  equals(other) {
    return (other
         && this._rlepath.equals(other._rlepath));
  }

  relativeNodeTo(other) {
    if (!other) return null;
    if (!other._rlepath.hasPrefix(this._rlepath)) return null;

    const n = other.depth() - this.depth();
    const rlepath = other._rlepath.suffix(n);
    return NodeId.fromRLEPath(rlepath);
  }
}

class NodeIdAndState {
  nodeId;
  state;

  constructor(nodeId, state) {
    this.nodeId = nodeId;
    this.state = state;
  }

  static fromNodeId(nodeId) {
    let state = TreeState.initialState();

    // Find the path to the node and follow it.
    const path = nodeId.getRLEPath();
    for (const [bit, count] of path.items()) {
      if (bit) {
        state.goToLeftChild(count);
      } else {
        state.goToRightChild(count);
      }
    }

    return new NodeIdAndState(nodeId, state);
  }

  clone() {
    return new NodeIdAndState(this.nodeId, this.state.clone());
  }

  depth() {
    return this.nodeId.depth();
  }

  isRightChild() {
    return this.nodeId.isRightChild();
  }
  isFirstNode() {
    // m0/n0 = 0/1
    return this.state.m0 == 0;
  }
  isLastNode() {
    // m1/n1 = 1/0
    return this.state.n1 == 0;
  }

  goToParent() {
    this.nodeId = this.nodeId.parent();
    this.state.goToParent();
    return this;
  }
  goToLeftChild() {
    this.nodeId = this.nodeId.leftChild();
    this.state.goToLeftChild(1n);
    return this;
  }
  goToRightChild() {
    this.nodeId = this.nodeId.rightChild();
    this.state.goToRightChild(1n);
    return this;
  }
  goToNextSibling() {
    this.nodeId = this.nodeId.next();
    this.state.goToNextSibling();
    return this;
  }
  goToPrevSibling() {
    this.nodeId = this.nodeId.prev();
    this.state.goToPrevSibling();
    return this;
  }
}

class TreeController extends BaseEventTarget {
  constructor(canvas) {
    super();

    this._update = deferUntilAnimationFrame(this._update.bind(this));
    this._updateSelection = deferUntilAnimationFrame(this._updateSelection.bind(this));

    this._treeType = 'stern-brocot';
    this._hoverNodeId = null;
    this._stickyNodeId = null;

    this._canvas = canvas;
    let viewport = new Viewport(canvas);
    viewport.addEventListener('click', () => {
      this._stickyNodeId = this._hoverNodeId;
      this.dispatchEvent('selectionChange');
      this._update();
    });
    viewport.addEventListener('mousemove', (coord) => {
      this._updateSelection(coord);
    });
    this._canvas.style.cursor = 'grab';

    this._treeViewport = new TreeViewport(viewport);
    this._treeViewport.addEventListener('update', () => this._update());

    this._renderer = new Renderer(canvas, this._treeViewport);

    this._update();
  }

  _draw() {
    this._renderer.resetCanvas();

    this._renderer.drawTree(
      this.selectedNodeId() || 0n,
      TreeState.getValueFn(this._treeType));
  }

  _update() {
    this._draw();
    this.dispatchEvent('update');
  }

  _updateSelection(coord) {
    const nodeId = coord.obj;

    if (!nodeId && !this._hoverNodeId) return;
    if (nodeId && nodeId.equals(this._hoverNodeId)) return;
    this._hoverNodeId = nodeId;


    this._canvas.style.cursor = nodeId ? 'pointer' : 'grab'
    this._update();
    this.dispatchEvent('selectionChange');
  }

  treeType() {
    return this._treeType;
  }

  setTreeType(treeType) {
    this._treeType = treeType;
    this._update();
    if (this.selectedNodeId()) this.dispatchEvent('selectionChange');
  }

  selectedNodeId() {
    return this._stickyNodeId || this._hoverNodeId;
  }

  resetPosition() {
    this._treeViewport.resetView();
  }

  resizeCanvas(size) {
    this._canvas.height = size.height;
    this._canvas.width = size.width;
    this._update();
  }

  getHeight() {
    return this._canvas.height;
  }

  selectNodeById(nodeId) {
    this._stickyNodeId = nodeId;
    this._update();
    this.dispatchEvent('selectionChange');
  }

  selectNodeByContinuedFraction(cf) {
    const nodeId = NodeId.fromContinuedFraction(this._treeType, cf);
    this.selectNodeById(nodeId);
  }

  moveToSelectedNode() {
    if (this._stickyNodeId) {
      this._treeViewport.moveToNodeId(this._stickyNodeId);
    }
  }
}

class Renderer {
  constructor(canvas, treeViewport) {
    this._canvas = canvas;

    this._ctx = canvas.getContext('2d');

    this._treeViewport = treeViewport;
  }

  resetCanvas() {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._ctx.textAlign = 'center';
    this._ctx.textBaseline = 'middle';

    this._treeViewport.resetSpatialIndex();
    this.counters = {
      nodesDrawn: 0,
      initialNodes: 0,
    }
  };

  _drawBar(ctx, x, y, length, width) {
    ctx.lineWidth = width;
    y -= ctx.lineWidth;

    ctx.beginPath();
    ctx.moveTo(x - length*0.5, y);
    ctx.lineTo(x + length*0.5, y);
    ctx.stroke();
  }

  _drawFraction(r, canvasX, canvasY, nodeHeight, color) {
    if (nodeHeight < 2) return [0, 0, 0, 0];

    let ctx = this._ctx;

    if (color) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
    }

    const n = r[0].toString();
    const d = r[1].toString();

    // Determine the font size so that the numbers fit within the node.
    const length = Math.max(n.length, d.length);
    const textScale = 0.4 * Math.min(6/length, 1);
    const fontSize = nodeHeight * textScale;

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

    if (color) {
      ctx.restore();
    }

    return rect;
  }

  _drawBranch(ctx, canvasX, canvasY, nodeHeight, dir, color) {
    if (color) {
      ctx.save();
      ctx.strokeStyle = color;
    }

    ctx.lineWidth = nodeHeight/100;
    ctx.beginPath();
    ctx.lineTo(canvasX, canvasY);
    ctx.lineTo(canvasX + dir*nodeHeight*0.5, canvasY + nodeHeight*0.75);
    ctx.stroke();

    if (color) {
      ctx.restore();
    }
  }

  // Draw a full tree of branches starting at the node at xMin.
  // Keep drawing until the nodes are too small to see. We don't bother cropping
  // since this the main loop is size independant so should always be bounded
  // in time, assuming that layerWidth has already been constrained.
  drawTreeBranches(canvasXStart, canvasY, nodeWidth) {
    let nodeHeight = nodeWidth*0.5;
    let canvasX = canvasXStart + nodeWidth*0.5;

    let ctx = this._ctx;
    let n = 1;
    while (nodeHeight > 0.5 && canvasY) {
      let canvasX = canvasXStart + nodeHeight;
      for (let j = 0; j < n; j++) {
        this._drawBranch(ctx, canvasX, canvasY, nodeHeight, -1);
        this._drawBranch(ctx, canvasX, canvasY, nodeHeight, 1);
        canvasX += nodeWidth;
      }
      n <<= 1;
      canvasY += nodeHeight*0.75;
      nodeHeight *= 0.5;
      nodeWidth *= 0.5;
    }
  }

  static SELECT_NONE = 0;
  static SELECT_FINAL = 1;
  static SELECT_LEFT = 2;
  static SELECT_RIGHT = 3;

  static _PATH_COLOR = '#9900dd';
  static _SELECTED_COLOR = '#0099ff';
  static _SEED_COLOR = 'grey'

  static MIN_NODE_WIDTH = 10;

  drawNode(nodeId, canvasXStart, canvasY, nodeWidth, frac, selectionType) {
    const nodeHeight = nodeWidth*0.5;
    const canvasX = canvasXStart + nodeWidth/2;

    // Draw the selected branch.
    if (selectionType > Renderer.SELECT_FINAL) {
      this._drawBranch(this._ctx, canvasX, canvasY, nodeHeight,
                       selectionType == Renderer.SELECT_LEFT ? -1 : 1,
                       Renderer._PATH_COLOR);
    }

    // Draw the fraction.
    let color = null;
    if (selectionType) {
      color = selectionType === Renderer.SELECT_FINAL
        ? Renderer._SELECTED_COLOR : Renderer._PATH_COLOR;
    }
    const rect = this._drawFraction(frac, canvasX, canvasY, nodeHeight, color);

    this._treeViewport.addToIndex(nodeId, ...rect);
  }

  drawSeedNode(xOffsetRatio, canvasXStart, canvasYMid, nodeWidth, v) {
    const canvasXMid = canvasXStart + nodeWidth*0.5;
    const canvasX = canvasXStart + nodeWidth*xOffsetRatio;

    const nodeHeight = nodeWidth*0.5;
    const canvasYSeed = canvasYMid - nodeHeight*0.1;

    let ctx = this._ctx;

    // Draw the branch.
    ctx.save();
    ctx.strokeStyle = Renderer._SEED_COLOR;
    ctx.setLineDash([nodeHeight/50]);

    ctx.lineWidth = nodeHeight/100;
    ctx.beginPath();
    ctx.moveTo(canvasXMid, canvasYMid);
    ctx.lineTo(canvasX, canvasYSeed);
    ctx.stroke();

    ctx.restore();

    // Draw the seed.
    this._drawFraction(v, canvasX, canvasYSeed, nodeHeight, Renderer._SEED_COLOR);
  }

  drawTree(selectedNodeId, valueFn) {
    if (!this._treeViewport.treeVisible()) return;

    // Set up the drawing stack.
    let stack = [];
    {
      const nodeWidth = this._treeViewport.nodeWidth();
      const canvasY = this._treeViewport.yStart() - nodeWidth*0.25;

      // Find all the initial drawing nodes.
      let node = this._treeViewport.referenceNode();

      let canvasXStart = this._treeViewport.xStart();
      while (canvasXStart < this._canvas.width) {
        let revSelectedPath = null;
        const relativeSelectedNodeId = node.nodeId.relativeNodeTo(selectedNodeId);
        if (relativeSelectedNodeId) {
          // Reverse the path so that we can efficiently keep truncating it.
          revSelectedPath = relativeSelectedNodeId.getRLEPath();
          revSelectedPath.reverse();
        }
        stack.push([node.clone(), canvasXStart, canvasY, nodeWidth, revSelectedPath]);
        this.counters.initialNodes++;

        if (node.isLastNode()) break;

        node.goToNextSibling();
        canvasXStart += nodeWidth;
      }
    }

    // Check if we have anything to draw!
    if (!stack.length) return;

    // Draw seed nodes.
    {
      const [node, canvasXStart, canvasY, nodeWidth, onSelectedBranch] = stack[0];
      if (node.depth() == 0) {
        const s = node.state;
        this.drawSeedNode(0, canvasXStart, canvasY, nodeWidth, [s.m0, s.n0]);
        this.drawSeedNode(1, canvasXStart, canvasY, nodeWidth, [s.m1, s.n1]);
      }
    }

    // Draw the tree branches for the top of the drawing stack.
    for (let j = 0; j < stack.length; j++) {
      const [node, canvasXStart, canvasY, nodeWidth, onSelectedBranch] = stack[j];
      this.drawTreeBranches(canvasXStart, canvasY, nodeWidth);
    }

    // Draw nodes.
    const maxCanvasX = this._canvas.width;
    const maxCanvasY = this._canvas.height;
    while (stack.length) {
      let [node, canvasXStart, canvasY, nodeWidth, revSelectedPath] = stack.pop();
      this.counters.nodesDrawn++;

      let selectionType = Renderer.SELECT_NONE;
      if (revSelectedPath) {
        if (revSelectedPath.size() == 0) {
          selectionType = Renderer.SELECT_FINAL;
          revSelectedPath = null;
        } else {
          selectionType = revSelectedPath.lastBit() ? Renderer.SELECT_RIGHT : Renderer.SELECT_LEFT;
          revSelectedPath.rightShift(1n);
        }
      }

      this.drawNode(
        node.nodeId, canvasXStart, canvasY, nodeWidth, valueFn(node.state), selectionType);


      const canvasYLimit = canvasY + nodeWidth*0.25;
      if (nodeWidth >= Renderer.MIN_NODE_WIDTH && canvasYLimit <= maxCanvasY) {
        nodeWidth *= 0.5;
        const canvasXMid = canvasXStart+nodeWidth;
        canvasY += nodeWidth*0.75;
        if (canvasXMid >= 0) {
          stack.push([node.clone().goToLeftChild(),  canvasXStart, canvasY, nodeWidth,
            selectionType === Renderer.SELECT_LEFT && revSelectedPath]);
        }
        if (canvasXMid < maxCanvasX) {
          stack.push([node.clone().goToRightChild(), canvasXMid,   canvasY, nodeWidth,
            selectionType === Renderer.SELECT_RIGHT && revSelectedPath]);
        }
      }
    }
  }
}

class TreeViewport extends BaseEventTarget {
  _viewport;
  // Reference node is the top-left most node of the viewport.
  _referenceNode;

  LAYER_WIDTH = 100;
  LAYER_HEIGHT = this.LAYER_WIDTH/2;
  DEFAULT_TREE_HEIGHT = 0.95;  // As a percentage of the canvas height.

  constructor(viewport) {
    super();

    this._viewport = viewport;
    viewport.addEventListener('update', () => this._update());

    this.resetView();
  }

  _update() {
    this._clampPosition();
    this._maybeUpdateReferenceNode();

    // Don't allow zooming out too far.
    const viewport = this._viewport;
    if (this._referenceNode.depth() == 0
        && this.nodeWidth() < viewport.maxCanvasY() * this.DEFAULT_TREE_HEIGHT) {
      viewport.allowZoomOut = false;
    } else {
      viewport.allowZoomOut = true;
    }

    this.dispatchEvent('update');
  }

  _clampPosition() {
    const buffer = 40;
    const viewport = this._viewport;

    const treeYMin = this._treeYMin();
    const yMax = viewport.maxCanvasY();
    if (treeYMin < yMax - buffer) {
      const delta = (yMax - buffer)-treeYMin;
      viewport.origin.v += delta/viewport.scale;
    }
  }

  _maybeUpdateReferenceNode() {
    const viewport = this._viewport;
    const nodeWidth = this.nodeWidth();

    // Check if we've moved up enough that we should start at the next layer.
    // Limit scale, so that the initial nodes are not too small.
    while (viewport.scale > 1 && viewport.origin.v < -this.LAYER_HEIGHT*1.5) {
      this._referenceNode.goToLeftChild();

      // Rescale to the size, keeping the top left corner of the node in the
      // same place.
      viewport.rescale(0.5, this.xStart(), this.yStart());
      // The child is now in the parent's place, so adjust accordingly.
      this._viewport.origin.v += this.LAYER_HEIGHT;
    }

    // Check if we've moved down enough that we need to display the parent.
    // Obviously, avoid going above the above the first node.
    //   Also do this if our scale is too small, to stay within reasonable
    //   bounds.
    while (this._referenceNode.depth() > 0 && (
        (viewport.scale < 0.2 || viewport.origin.v > -this.LAYER_HEIGHT))) {
      const isRightChild = this._referenceNode.isRightChild();
      this._referenceNode.goToParent();

      // Rescale to the size, keeping the top left corner of the node in the
      // same place.
      viewport.rescale(2, this.xStart(), this.yStart());
      // The parent is now where the child was, so adjust.
      this._viewport.origin.v -= this.LAYER_HEIGHT*0.5;
      // If it was a right child, the start needs to be shifted also.
      if (isRightChild) {
        this._viewport.origin.u += this.LAYER_WIDTH*0.5;
      }
    }

    // Check if we've moved far left enough that we need to go to the next
    // sibling.
    while (!this._referenceNode.isLastNode() && viewport.origin.u > this.LAYER_WIDTH) {
      this._referenceNode.goToNextSibling();
      this._viewport.origin.u -= this.LAYER_WIDTH;
    }
    // Check if we've moved right right enough that we need to go to the next
    // sibling.
    while (!this._referenceNode.isFirstNode() && viewport.origin.u < 0) {
      this._referenceNode.goToPrevSibling();
      this._viewport.origin.u += this.LAYER_WIDTH;
    }
  }

  _treeYMin() {
    return this._viewport.toCanvasY(this.LAYER_HEIGHT*2);
  }
  treeVisible() {
    return this._treeYMin() > 0;
  }

  referenceNode() {
    return this._referenceNode.clone();
  }

  // Return the min x for a node in canvas coordinates.
  xStart() {
    return this._viewport.toCanvasX(0);
  }

  nodeWidth() {
    const viewport = this._viewport;
    return this.LAYER_WIDTH*viewport.scale;
  }

  yStart() {
    return this._viewport.toCanvasY(this.LAYER_WIDTH*0.5);
  }

  static _SPATIAL_INDEX_BUCKET_SIZE = 10;
  resetSpatialIndex() {
    this._viewport.resetSpatialIndex(this.constructor._SPATIAL_INDEX_BUCKET_SIZE);
  }
  addToIndex(...args) {
    this._viewport.addToIndex(...args);
  }

  resetView() {
    this.moveToNodeId(NodeId.ONE);
  }
  moveToNodeId(node) {
    // Focus on parent so we have context.
    this._referenceNode = NodeIdAndState.fromNodeId(node);
    if (this._referenceNode.depth()) this._referenceNode.goToParent();

    this._focusOnReferenceNode();

    this._update();
  }

  _focusOnReferenceNode() {
    const viewport = this._viewport;

    const width = viewport.maxCanvasX();
    const height = viewport.maxCanvasY();


    // Scale things so that the tree (from the reference node) takes up almost
    // all the screen height.
    const initialScale = this.DEFAULT_TREE_HEIGHT * height/(this.LAYER_HEIGHT*2);

    // Reset position.
    viewport.scale = initialScale;
    viewport.origin.u = 0
    viewport.origin.v = 0;

    // Center the tree.
    viewport.origin.u = -viewport.fromCanvasX(width)/2+this.LAYER_WIDTH/2;
  }
}

class Viewport extends BaseEventTarget {
  // x-y is canvas coordinates.
  // u-v are scaled/world coordinates.
  origin = {u: 0, v: 0};
  // Larger scale = more zoomed in.
  scale = 1;

  _canvas;
  _dragDistance;
  _spatialIndex;

  constructor(canvas) {
    super();

    this._canvas = canvas;

    this._actionDetector = new PointerActionDetector(canvas);
    this._actionDetector.addEventListener(
      'click', () => this.dispatchEvent('click'));

    this._setUpMouseWheel(canvas);
    this._setUpDrag();
    this._setUpMouseMove(canvas);

    this._dragDistance = 0;

    this._spatialIndex = null;
  }

  _setUpMouseMove(canvas) {
    canvas.onmousemove = (e) => {
      const coord = this._clientXYToCoord(e.clientX, e.clientY);
      this.dispatchEvent('mousemove', coord);
    };
  }

  static _pointerCoords(e) {
    const coords = e.touches ? e.touches[0] : e;
    return {
      x: coords.clientX,
      y: coords.clientY,
    };
  }

  _setUpDrag() {
    const origin = this.origin;

    this._actionDetector.addEventListener('drag', c => {
      const dx = c.dx;
      const dy = c.dy;
      const du = dx / this.scale;
      const dv = dy / this.scale;
      origin.u -= du;
      origin.v += dv;
      this._update();
    });
  }

  rescale(ds, canvasX, canvasY) {
    const origin = this.origin;

    // Remove offset from origin, so that it will be corretly handled when
    // scaling.
    origin.u += canvasX/this.scale
    origin.v -= canvasY/this.scale;

    this.scale = this.scale * ds;

    // Reoffset origin after scaling.
    origin.u -= canvasX/this.scale;
    origin.v += canvasY/this.scale;
  }

  allowZoomOut = true;
  _setUpMouseWheel(canvas) {
    canvas.onwheel = (e) => {
      e.preventDefault();

      // Clamp the delta, and ensure that we don't zoom out too far.
      let ds = Math.pow(2, clamp(e.deltaY * 0.01, -0.5, 0.5));
      if (!this.allowZoomOut && ds < 1) {
        ds = 1;
      }

      const canvasOrigin = this._canvasOrigin();
      const canvasX = e.clientX - canvasOrigin.x;
      const canvasY = e.clientY - canvasOrigin.y;

      this.rescale(ds, canvasX, canvasY);

      this._update();
    };
  }

  resetSpatialIndex(bucketSize) {
    this._spatialIndex = new SimpleSpatialIndex(
      this._canvas.width,
      this._canvas.height,
      bucketSize);
  }

  addToIndex(nodeId, x, y, w, h) {
    if (this._spatialIndex) {
      this._spatialIndex.insert(nodeId, x, y, w, h);
    }
  }

  maxCanvasX() {
    return this._canvas.width;
  }
  maxCanvasY() {
    return this._canvas.height;
  }

  toCanvasX(u) {
    return (u - this.origin.u)*this.scale;
  }
  toCanvasY(v) {
    return (v + this.origin.v)*this.scale;
  }

  fromCanvasX(canvasX) {
    return canvasX/this.scale + this.origin.u;
  }
  fromCanvasY(canvasY) {
    return canvasY/this.scale - this.origin.v;
  }

  _canvasOrigin() {
    const bb = this._canvas.getBoundingClientRect();
    return {x: bb.x, y: bb.y};
  }

  _update() {
    this.dispatchEvent('update');
  }

  _clientXYToCoord(clientX, clientY) {
    const canvasOrigin = this._canvasOrigin();
    const canvasX = clientX - canvasOrigin.x;
    const canvasY = clientY - canvasOrigin.y;

    let obj;
    if (this._spatialIndex) {
      obj = this._spatialIndex.get(canvasX, canvasY);
    }

    return {x: this.fromCanvasX(this.scale*canvasX),
            y: this.fromCanvasY(this.scale*canvasY),
            canvasX: canvasX,
            canvasY: canvasY,
            scale: this.scale,
            obj: obj,
           };
  }
}

class PointerActionDetector extends BaseEventTarget {
  constructor(container) {
    super();
    this._container = container;

    this._setUpDrag(container);
  }

  static _pointerCoords(e) {
    const coords = e.touches ? e.touches[0] : e;
    return {
      x: coords.clientX,
      y: coords.clientY,
    };
  }

  _setUpDrag(container) {
    const dragPos = {x: 0, y:0};
    let dragDistance = 0;

    const dragMove = (e) => {
      const pointer = this.constructor._pointerCoords(e);
      const dx = pointer.x - dragPos.x;
      const dy = pointer.y - dragPos.y;
      dragDistance += Math.abs(dx) + Math.abs(dy);  // Manhatten distance.
      dragPos.x = pointer.x;
      dragPos.y = pointer.y;

      this.dispatchEvent('drag', {dx: dx, dy: dy});
    };

    const dragStart = (e, moveEvent, endEvent) => {
      e.preventDefault();

      const pointer = this.constructor._pointerCoords(e);
      dragPos.x = pointer.x;
      dragPos.y = pointer.y;
      dragDistance = 0;
      document.addEventListener(moveEvent, dragMove);

      const dragStop = () => {
        document.removeEventListener(moveEvent, dragMove);
        document.removeEventListener(endEvent, dragStop);
        if (dragDistance <= 1) {
          this.dispatchEvent('click');
        }
      };
      document.addEventListener(endEvent, dragStop);
    };

    container.addEventListener(
      'mousedown', e => dragStart(e, 'mousemove', 'mouseup'));
    container.addEventListener(
      'touchstart', e => dragStart(e, 'touchmove', 'touchend'));
  }

}
