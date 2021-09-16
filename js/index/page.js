class NodeInfoView {
  constructor(tree) {
    this._container = document.getElementById('node-info');

    tree.addEventListener('selectionChange', () => {
      this._showNode(tree.treeType(),
                          tree.selectedNodeId())
    });
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

  _clearContainer() {
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }
  }

  _showNode(treeType, nodeId) {
    this._clearContainer();
    if (!nodeId) return;

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
}

const setUpDebug = (tree) => {
  let debugDiv = document.getElementById('debug-info');
  let treeView = tree._tree;

  tree.addEventListener( 'update', () => {
    debugDiv.textContent = `
      ${treeView._hitboxes.size}/${treeView._nodesProcessed}
      ${treeView._numDrawStarts}
    `;
  });
};

const setUpControlPanel = (tree) => {
  // Set up tree type selector.
  let treeSelect = document.getElementById('tree-type');
  treeSelect.onchange = () => {
    tree.setTreeType(treeSelect.value);
  };
  treeSelect.onchange();

  // Set up reset button.
  let reset = document.getElementById('reset-zoom');
  reset.onclick = () => {
    tree.resetPosition();
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

    tree.selectNodeByContinuedFraction(cf);

    return false;
  };
};

const initPage = () => {
  let canvas = document.getElementById('tree-vis');

  let tree = new TreeController(canvas);

  let nodeInfoView = new NodeInfoView(tree);

  setUpControlPanel(tree);
  setUpDebug(tree);

  window.onresize = () => {
    tree.resizeCanvas({
      width: document.body.clientWidth,
      height: document.body.clientHeight,
    });
  };
  window.onresize();
  tree.resetPosition();
}
