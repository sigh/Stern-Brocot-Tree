class NodeInfoView {
  constructor(tree) {
    this._container = document.getElementById('node-info');

    tree.addEventListener('selectionChange', () => {
      this._showNode(tree.treeType(),
                     tree.selectedNodeId())
    });
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

  _renderRLE(rlepath) {
    const div = document.createElement('div');

    let isEmpty = true;
    for (const [bit, count] of rlepath.items()) {
      if (!count) continue;
      isEmpty = false;

      const letter = 'RL'[bit];
      div.appendChild(this._makeTextElem('span', letter));
      if (count > 1) div.appendChild(this._makeTextElem('sup', count));
    }

    // If there are no elements, then output 'I' for the identity.
    if (isEmpty) {
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

  _renderIndex(nodeId) {
    const div = document.createElement('div');
    const rlepath = nodeId.getRLEPath();

    if (nodeId.depth() < 64) {
      const index = rlepath.toBigInt() | (1n << nodeId.depth());
      div.append(this._makeTextElem('div', index));
    }
    if (nodeId.depth() >= 20) {
      // Ignore all but the first 64 bits of the index.
      const workingPrecision = 64n;
      let shift = nodeId.depth() - workingPrecision;
      if (shift < 0) shift = 0n;
      rlepath.rightShift(shift);

      // index = a * 2**shift + 2**depth.
      //       = 2**shift * (a + 2**(depth-shift))
      const a = rlepath.toBigInt();

      // index = 2**shift * b
      const b = Number(a) + Math.pow(2, Number(nodeId.depth() - shift));

      // index = 10**si * 10**sf * b
      const s = Number(shift) * Math.log10(2);
      const si = Math.floor(s);
      const sf = s%1;

      // index = 10**si * c
      const c = Math.pow(10, sf) * b;

      // index = 10**(si+ti) * d
      const ti = Math.floor(Math.log10(c));
      const d = c*Math.pow(10, -ti);

      div.append(this._makeTextElem('div',
        `\\(
          \\approx ${d.toFixed(5)} \\times 10^{${si+ti}}
        \\)`));
    }

    return div;
  }

  _showNode(treeType, nodeId) {
    this._clearContainer();
    if (!nodeId) return;

    const cf = nodeId.toContinuedFraction(treeType);
    const f = MathHelpers.evalContinuedFrac(cf);

    let container = this._container;
    let fracElem = this._renderFrac(...f);
    fracElem.classList.add('frac-display');
    this._addItem(container, '', fracElem);
    this._addItem(container, 'Decimal',
                  this._makeTextElem('div', MathHelpers.fracToDecimal(...f)));
    this._addItem(container, 'Depth',
                  this._makeTextElem('div', nodeId.depth()));
    this._addItem(container, 'Index',
                  this._renderIndex(nodeId));
    this._addItem(container, 'Path',
                  this._renderRLE(nodeId.getRLEPath()));
    this._addItem(container, 'Continued Fraction',
                  this._renderContinuedFraction(cf));

    MathJax.typeset([container]);
  }
}

const setUpDebug = (tree) => {
  const debugDiv = document.getElementById('debug-info');
  const renderer = tree._renderer;
  const treeViewport = tree._treeViewport;

  tree.addEventListener( 'update', () => {
    if (SHOW_DEBUG) {
      const counters = JSON.stringify(renderer.counters).replaceAll('"', '');
      debugDiv.textContent = counters + ' ' + treeViewport.referenceNode().depth();
    }
  });
};

const parsePathString = (str) => {
  str = str.trim().toLowerCase();
  if (str == 'i') return new RLEPath();

  if (!str.match(/^([lr]\d*)+$/)) return undefined;

  const path = [0];
  for (const part of str.matchAll(/[lr]\d*/g)) {
    const count = parseInt(part[0].substr(1)) || 1;
    const bit = part[0][0] == 'r' ? 1 : 0;
    if (path.length%2 == bit) {
      path[path.length-1] += count;
    } else {
      path.push(count);
    }
  }

  const rlepath = new RLEPath(path.map(i => BigInt(i)));

  return rlepath;
};

const extractCfFromString = (str) => {
  const frac = MathHelpers.parseAsFraction(str);
  if (frac && frac[0]) return MathHelpers.findContinuedFractionBigInt(...frac);

  let value;
  try {
    value = safeEval(str);
  } catch (e) {
    return undefined;
  }

  if (typeof value == 'number' && value > 0 && isFinite(value)) {
    // Determine the exact value of the floating point value.
    const numberParts = MathHelpers.getNumberParts(value);
    const exp = BigInt(numberParts.intExponent);
    const m = BigInt(numberParts.intMantissa);

    if (exp >= 0) return [m << exp];
    return MathHelpers.findContinuedFractionBigInt(m, 1n << -exp);
  } else if (Array.isArray(value)) {
    // Interpret array as continued fraction cooeficients.
    return value.map(BigInt);
  }

  return undefined;
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

    const rlepath = parsePathString(findExp.value);
    if (rlepath !== undefined) {
      tree.selectNodeById(NodeId.fromRLEPath(rlepath));
      tree.moveToSelectedNode();
      return false;
    }

    const cf = extractCfFromString(findExp.value);

    if (cf !== undefined) {
      tree.selectNodeByContinuedFraction(cf);
      tree.moveToSelectedNode();
      return false;
    }

    findExp.classList.add('input-error');
    window.setTimeout(
      () => findExp.classList.remove('input-error'),
      200);

    return false;
  };
};

let tree;
let SHOW_DEBUG = false;
const initPage = () => {
  let canvas = document.getElementById('tree-vis');

  tree = new TreeController(canvas);

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
