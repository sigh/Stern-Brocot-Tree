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
