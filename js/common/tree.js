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
  constructor(rleint, depth) {
    this._depth = depth;
    this._rleint = rleint;
  }

  static fromRLEInteger(rleint, depth) {
    return new NodeId(rleint, depth);
  }

  static fromIndex(depth, index) {
    let rleint = RLEInteger.fromBigInt(index);
    return NodeId.fromRLEInteger(rleint, depth);
  }

  static _normalizeRle(rle) {
    while (rle.length && rle[rle.length-1] == 0) rle.pop();
    if (!rle.length) rle.push(0n);
    return rle;
  }

  static fromContinuedFraction(treeType, cf) {
    let rle = [];

    // Copy up to maxDepth deep into the continued fraction.
    const maxDepth = 1n << 20n;
    let depth = 0n;
    for (let i = 0; i  < cf.length; i++) {
      if (depth + cf[i] > maxDepth) break;

      depth += cf[i];
      rle.push(cf[i]);
    }

    // To get to the tree path, we need to decrement the last cf value by 1.
    rle[rle.length-1]--;
    depth--;

    let rleint = new RLEInteger(rle);
    rleint.normalize();

    // The Calkin-Wilf tree has the reverse path.
    if (treeType == 'calkin-wilf') {
      rleint.reverse(depth);
    }

    return NodeId.fromRLEInteger(rleint, depth);
  }

  getPath() {
    let rle = this._rleint.copyRLE();

    // Add leading left turns.
    if (this._depth > this._rleint.size()) {
      rle.unshift(0n, this._depth - this._rleint.size());
    }

    return rle;
  }

  getRLEInteger() {
    return this._rleint;
  }

  leftChild() {
    let rleint = this._rleint.clone();
    rleint.appendBit(0, 1n);
    return NodeId.fromRLEInteger(rleint, this._depth+1n);
  }
  rightChild() {
    let rleint = this._rleint.clone();
    rleint.appendBit(1, 1n);
    return NodeId.fromRLEInteger(rleint, this._depth+1n);
  }
  nthParent(n) {
    const newDepth = this._depth-n;
    if (newDepth < 0n) throw('Negative depth');

    let rleint = this._rleint.clone();
    rleint.rightShift(n);

    return NodeId.fromRLEInteger(rleint, newDepth);
  }
  suffix(n) {
    let rleint = this._rleint.suffix(n);
    return NodeId.fromRLEInteger(rleint, n);
  }

  next() {
    const nextRLEInt = RLEInteger.add(this._rleint, RLEInteger.ONE);
    return NodeId.fromRLEInteger(nextRLEInt, this._depth);
  }

  isLastNode() {
    // The result must be either 0 or all 1s.
    return this._depth == this._rleint.numLeadingOnes();
  }

  depth() { return this._depth; }
  index() {
    return this._rleint.toBigInt();
  }

  equals(other) {
    return (other
         && this._depth == other._depth
         && 0 === RLEInteger.cmp(this._rleint, other._rleint));
  }

  distanceTo(other) {
    return RLEInteger.sub(this._rleint, other._rleint);
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
    this._viewport = new Viewport(canvas);
    this._viewport.addEventListener('update', () => this._update());
    this._viewport.addEventListener('click', () => {
      this._stickyNodeId = this._hoverNodeId;
      this.dispatchEvent('selectionChange');
      this._update();
    });
    this._viewport.addEventListener('mousemove', (coord) => {
      this._updateSelection(coord);
    });
    this._canvas.style.cursor = 'grab';

    let renderer = new Renderer(canvas, this._viewport);
    this._tree = new TreeView(renderer);

    this._update();
  }

  _update() {
    this._tree.draw(this._treeType, this.selectedNodeId());
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
    this._viewport.resetPosition();
    this._update();
  }

  resizeCanvas(size) {
    this._canvas.height = size.height;
    this._canvas.width = size.width;
    this._update();
  }

  selectNodeByContinuedFraction(cf) {
    const node = this._tree.nodeForContinuedFraction(
      this._treeType, cf);
    this._stickyNodeId = node.nodeId;
    if (node.nodeId) {
      this._viewport.setPosition(node.origin, node.scale);
    }
    this._update();
    this.dispatchEvent('selectionChange');
  }
}

class TreeView {
  constructor(renderer) {
    this._renderer = renderer;

    this._cache = {
      nodeId: null,
      state: null,
    };

    this._resetTree();
  }

  _resetTree() {
    this._renderer.resetCanvas();
    this.counters = {
      nodesDrawn: 0,
      nodesTraversed: 0,
      mainLineNodes: 0,
      initialNodes: 0,
    }
  }

  draw(type, selectedNodeId) {
    this._resetTree();

    this._drawTree(selectedNodeId || 0n, TreeState.getValueFn(type));
  }

  // Maximum number of nodes to explore from the cache values, if the
  // cache is not an exact hit.
  static _LOG_MAX_CACHE_DELTA = 3n;

  _lookupCache(nodeId) {
    let cache = {...this._cache};

    if (!cache.nodeId) return [];

    let state = cache.state.clone();
    let cachedNodeId = cache.nodeId;

    const m = 1n << this.constructor._LOG_MAX_CACHE_DELTA;
    let diffD = nodeId.depth() - cachedNodeId.depth();

    if (diffD < 0) {
      // We are shallower than the cache.
      // Adjust cache to our depth - but don't go too far.
      const diffAdjustment = -diffD;
      if (diffAdjustment > m) return [];

      for (let j = 0; j < diffAdjustment; j++) {
        this.counters.nodesTraversed++;
        state.goToParent();
      }
      cachedNodeId = cachedNodeId.nthParent(diffAdjustment);
      diffD = 0n;
    }

    // Cache depth is at our level or shallower.
    // Normalize I to the cache depth and find the appropriate bounds.
    const targetNodeId = nodeId.nthParent(diffD);

    // Check that we aren't too far from the cache.
    const [distanceRLEI, dir] = targetNodeId.distanceTo(cachedNodeId);
    if (distanceRLEI.size() > m) return [];

    // Find the target state by looking in the right direction.
    const distance = distanceRLEI.toBigInt();
    if (dir > 0) {
      for (let j = 0; j < distance; j++) {
        this.counters.nodesTraversed++;
        state.goToNextSibling();
      }
    }
    if (dir < 0) {
      for (let j = 0; j < distance; j++) {
        this.counters.nodesTraversed++;
        state.goToPrevSibling();
      }
    }

    const relativeNodeId = nodeId.suffix(nodeId.depth()-targetNodeId.depth());
    return [relativeNodeId, state];
  }

  // Find inital node at depth == minD starting at targetX.
  _findInitialNode(depth, expMinD, x) {
    const targetI = this._renderer.indexAtX(depth, expMinD, x);
    const nodeId = NodeId.fromIndex(depth, targetI);

    let [relativeNodeId, state] = this._lookupCache(nodeId);

    // We didn't populate from the cache, so we have to start from the start.
    if (relativeNodeId === undefined) {
      relativeNodeId = nodeId;
      state = TreeState.initialState();
    }

    // Find the path to the node and follow it.
    const path = relativeNodeId.getPath();
    for (let j = 0; j < path.length; j++) {
      this.counters.mainLineNodes++;

      if (j%2) {
        state.goToLeftChild(path[j]);
      } else {
        state.goToRightChild(path[j]);
      }
    }

    // Repopulate the cache.
    let cache = this._cache;
    cache.nodeId = nodeId;
    cache.state = state.clone();

    return [nodeId, state];
  }

  _drawTree(selectedNodeId, valueFn) {
    let renderer = this._renderer;

    const minD = renderer.minDepth();
    const expMinD = 1n << minD;

    // Find all the initial drawing nodes.
    const initialNode = this._findInitialNode(
      minD, expMinD, renderer.minX());

    // Determine if there is a selected node prefix to start matching on.
    let truncatedSelectedId = null;
    if (selectedNodeId) {
      const selectedNodeDepth = selectedNodeId.depth();
      if (selectedNodeDepth >= minD) {
        truncatedSelectedId = selectedNodeId.nthParent(selectedNodeDepth - minD);
      }
    }

    // Set up the drawing stack.
    let stack = [];
    {
      const nodeWidth = this._renderer.nodeWidth(minD);
      const canvasY = this._renderer.canvasY(minD);

      let [nodeId, state] = initialNode;
      let canvasXStart = this._renderer.canvasXStart(nodeId);

      while (canvasXStart < this._renderer.maxCanvasX()) {
        let revSelectedPath = false;
        if (nodeId.equals(truncatedSelectedId)) {
          // We are on a selected branch.

          // Find the relative path from here to the selected node.
          let relative = selectedNodeId.suffix(selectedNodeId.depth()-minD);
          let path = relative.getPath();

          // Reverse the path so that we can efficiently keep truncating it.
          if (path.length%2==0) path.push(0n);
          path.reverse();
          revSelectedPath = path;
        }
        stack.push([nodeId, canvasXStart, canvasY, nodeWidth,
                    state.clone(), revSelectedPath]);
        this.counters.initialNodes++;

        if (nodeId.isLastNode()) break;

        nodeId = nodeId.next();
        canvasXStart += nodeWidth;
        state.goToNextSibling();
      }
    }

    // Check if we have anything to draw!
    if (!stack.length) return;

    // Draw seed nodes.
    if (minD == 0) {
      // At minD == 0, stack has exactly one element.
      const [nodeId, canvasXStart, canvasY, nodeWidth, s, onSelectedBranch] = stack[0];
      renderer.drawSeedNode(0, canvasXStart, canvasY, nodeWidth, [s.m0, s.n0]);
      renderer.drawSeedNode(1, canvasXStart, canvasY, nodeWidth, [s.m1, s.n1]);
    }

    // Draw the tree branches for the top of the drawing stack.
    for (let j = 0; j < stack.length; j++) {
      const [nodeId, canvasXStart, canvasY, nodeWidth, s, onSelectedBranch] = stack[j];
      renderer.drawTreeBranches(canvasXStart, canvasY, nodeWidth);
    }

    // Draw nodes.
    const maxCanvasX = this._renderer.maxCanvasX();
    const maxCanvasY = this._renderer.maxCanvasY();
    while (stack.length) {
      let [nodeId, canvasXStart, canvasY, nodeWidth, s, revSelectedPath] = stack.pop();
      this.counters.nodesDrawn++;

      let selectionType = Renderer.SELECT_NONE;
      if (revSelectedPath !== false) {
        let len = revSelectedPath.length;
        while (revSelectedPath[len-1] === 0n) {
          revSelectedPath.pop();
          len--;
        }
        if (len == 0) {
          selectionType = Renderer.SELECT_FINAL;
          revSelectedPath = false;
        } else {
          selectionType = len%2 ?  Renderer.SELECT_RIGHT : Renderer.SELECT_LEFT;
          revSelectedPath[len-1]--;
        }
      }

      renderer.drawNode(
        nodeId, canvasXStart, canvasY, nodeWidth, valueFn(s), selectionType);


      const canvasYLimit = canvasY + nodeWidth*0.25;
      if (nodeWidth >= Renderer.MIN_NODE_WIDTH && canvasYLimit <= maxCanvasY) {
        nodeWidth *= 0.5;
        const canvasXMid = canvasXStart+nodeWidth;
        canvasY += nodeWidth*0.75;
        if (canvasXMid >= 0) {
          stack.push([nodeId.leftChild(),  canvasXStart, canvasY, nodeWidth,
            s.clone().goToLeftChild(1n),
            selectionType === Renderer.SELECT_LEFT && revSelectedPath]);
        }
        if (canvasXMid < maxCanvasX) {
          stack.push([nodeId.rightChild(), canvasXMid,   canvasY, nodeWidth,
            s.clone().goToRightChild(1n),
            selectionType === Renderer.SELECT_RIGHT && revSelectedPath]);
        }
      }
    }
  }

  nodeForContinuedFraction(treeType, cf) {
    const nodeId = NodeId.fromContinuedFraction(treeType, cf);
    const pos = this._renderer.centeredNodePosition(nodeId);

    return {
      nodeId: nodeId,
      d: nodeId.depth(),
      scale: pos.scale,
      origin: pos.origin,
    }
  }
}

class Renderer {
  static SPATIAL_INDEX_BUCKET_SIZE = 10;

  constructor(canvas, viewport) {
    this._canvas = canvas;

    this._ctx = canvas.getContext('2d');

    this._viewport = viewport;
  }

  resetCanvas() {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._ctx.textAlign = 'center';
    this._ctx.textBaseline = 'middle';

    this._viewport.resetSpatialIndex(Renderer.SPATIAL_INDEX_BUCKET_SIZE);
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

  nodeWidth(d) {
    const layerWidth = this._viewport.scale >> d;
    return this._viewport.toCanvasY(layerWidth);
  }

  // Return the min x for a node in canvas coordinates.
  canvasXStart(nodeId) {
    let viewport = this._viewport;

    const x = (nodeId.index() * viewport.scale) >> nodeId.depth();
    return viewport.toCanvasX(x - viewport.origin.x);
  }

  canvasY(d) {
    let viewport = this._viewport;

    const layerWidth = viewport.scale >> d;
    const layerHeight = layerWidth >> 1n;
    const nodeHeight = viewport.toCanvasY(layerHeight);

    const yMin = layerHeight;
    const canvasYMin = viewport.toCanvasY(viewport.origin.y - yMin);

    return canvasYMin - nodeHeight*0.5;
  }

  maxCanvasX() {
    return this._canvas.width;
  }
  maxCanvasY() {
    return this._canvas.height;
  }

  centeredNodePosition(nodeId) {
    const viewport = this._viewport;
    const d = nodeId.depth();

    // Determine what our target size is, but we may have to adjust if the
    // scale is too small.
    const targetNodeHeight = this._canvas.height/4;
    const targetLayerHeight = viewport.fromCanvasY(targetNodeHeight);
    let scale = targetLayerHeight << (d+1n);
    if (scale < viewport.MIN_SCALE) scale = viewport.MIN_SCALE;

    const layerHeight = scale >> (d+1n);

    const xMid = ((nodeId.index() * scale) >> d) + layerHeight;
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
  static _SEED_COLOR = 'grey'

  // The mininmum depth visible in the viewport.
  minDepth() {
    const viewport = this._viewport;
    const scale = viewport.scale;
    const origin = viewport.origin;

    // Exclude nodes which are above the viewport.
    let minD = MathHelpers.log2BigInt(scale/origin.y) - 1n;
    if (minD < 0) minD = 0n;

    return minD;
  }

  minX() {
    return this._viewport.origin.x;
  }

  // Returns the index for the node closest to x.
  // Index will always be valid, even outside the tree.
  indexAtX(d, expD, x) {
    const scale = this._viewport.scale;

    let index = (x<<d)/scale;
    if (index < 0) index = 0n;
    if (index >= expD) index = expD-1n;

    return index;
  }

  initialLayerWidth() {
    return this._viewport.scale;
  }

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

    this._viewport.addToIndex(nodeId, ...rect);
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
}

class Viewport extends BaseEventTarget {
  SIZE = Math.pow(2, 16);
  MIN_SCALE = BigInt(Math.floor(this.SIZE * 0.9));
  INITIAL_SCALE = BigInt(Math.floor(this.SIZE * 0.97));

  constructor(canvas) {
    super();

    this._canvas = canvas;

    this.scale = 0n;
    this.origin = {x: 0n, y: 0n, y1: 0n};
    this.resetPosition();

    this._setUpMouseWheel(canvas);
    this._setUpMouseDrag(canvas);
    this._setUpMouseMove(canvas);
    this._setUpMouseClick(canvas);

    this._dragDistance = 0;

    this._spatialIndex = null;
  }

  _setUpMouseClick(canvas) {
    canvas.onclick = (e) => {
      if (this._dragDistance <= 1) {
        this.dispatchEvent('click');
      }
    };
  }

  _setUpMouseMove(canvas) {
    canvas.onmousemove = (e) => {
      const coord = this._clientXYToCoord(e.clientX, e.clientY);
      this.dispatchEvent('mousemove', coord);
    };
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

  _pixelScale() {
    return this.SIZE / this._canvas.height;
  }

  resetPosition() {
    this.scale = this.INITIAL_SCALE;

    // Offset origin so the tree is centered.
    const offset =
      -(BigInt(Math.floor(this._pixelScale()*this._canvas.width)) - this.scale) / 2n;
    this.origin.x = offset;
    this.origin.y = this.scale;
  }

  setPosition(origin, scale) {
    this.origin.x = origin.x;
    this.origin.y = origin.y;
    this.scale = scale < this.MIN_SCALE ? this.MIN_SCALE : scale;
    this._clampPosition();
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
    this.origin.y = clamp(this.origin.y, this.MIN_SCALE, this.scale + this.MIN_SCALE);
  }

  _update() {
    this._clampPosition();
    this.dispatchEvent('update');
  }

  _clientXYToCoord(clientX, clientY) {
    const canvasOrigin = this._canvasOrigin();
    const canvasX = clientX - canvasOrigin.x;
    const canvasY = clientY - canvasOrigin.y;
    const pixelScale = this._pixelScale();

    let obj;
    if (this._spatialIndex) {
      obj = this._spatialIndex.get(canvasX, canvasY);
    }

    return {x: this.origin.x + BigInt(Math.floor(pixelScale*canvasX)),
            y: this.origin.y - BigInt(Math.floor(pixelScale*canvasY)),
            canvasX: canvasX,
            canvasY: canvasY,
            scale: this.scale,
            obj: obj,
           };
  }
}
