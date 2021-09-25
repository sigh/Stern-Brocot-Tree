class IterationController {
  _height = 500;
  _width = 250;
  ITEM_HEIGHT = 50;

  constructor(tree, outerContainer) {
    this._tree = tree;

    outerContainer.style.height = this._height;
    outerContainer.style.width = this._width;
    this._outerContainer = outerContainer;

    let container = document.createElement('div');
    outerContainer.appendChild(container);

    this._container = container;

    this._minIndex = 1n;
    this._items = [];
    this._offset = 0;

    this._setUpMouseWheel(container);

    this._update = deferUntilAnimationFrame(this._update.bind(this));
    this._update();
  }

  _setUpMouseWheel(container) {
    this._outerContainer.onwheel = (e) => {
      e.preventDefault();

      const dy = e.deltaY;
      this._offset += dy;
      if (this._offset > this.ITEM_HEIGHT) this._offset = this.ITEM_HEIGHT;

      this._update();
    };
  }

  _makeTextElem(type, text) {
    let elem = document.createElement(type);
    elem.textContent = text;
    return elem;
  }

  _pathString(rlepath) {
    const parts = [];
    let isEmpty = true;
    for (const [bit, count] of rlepath.items()) {
      if (!count) continue;
      isEmpty = false;

      parts.push('RL'[bit]);
      if (count > 1) parts.push('^', count);
    }

    // If there are no elements, then output 'I' for the identity.
    if (isEmpty) {
      parts.push('I');
    }

    return parts.join('');
  }

  _makeItemDiv(nodeId, index) {
    const div = document.createElement('div');
    div.classList.add('iterator-item');

    const state = NodeIdAndState.fromNodeId(nodeId).state;

    const valueFn = TreeState.getValueFn('stern-brocot');

    const frac = valueFn(state);
    const binaryIndex = index.toString(2);

    const pathString = this._pathString(nodeId.getRLEPath());

    const numberDiv = document.createElement('div');
    numberDiv.appendChild(this._makeTextElem('span',
      `\\(
        \\dfrac{${frac[0]}}{${frac[1]}}
        \\to ${pathString}
        \\to ${binaryIndex}_2
      \\)`));
    const fadeOut = document.createElement('div');
    fadeOut.classList.add('fade-out');
    numberDiv.appendChild(fadeOut);

    div.appendChild(numberDiv);

    div.appendChild(this._makeTextElem('span', index));
    div.style.height = this.ITEM_HEIGHT;

    return div;
  }

  _makeItem(index) {
    const nodeId = NodeId.fromBigInt(index);
    const newItem = this._makeItemDiv(nodeId, index);

    newItem.onmouseover = () => {
      tree.selectNodeById(NodeId.fromBigInt(index));
    };

    return newItem;
  }

  _update() {
    const newItems = [];

    // Add items to the bottom as required.
    while (this._items.length * this.ITEM_HEIGHT < this._height-this._offset) {
      const newItem = this._makeItem(this._minIndex + BigInt(this._items.length));
      newItems.push(newItem);
      this._items.push(newItem);
      this._container.append(newItem);
    }

    // Remove items from the top if required.
    while (this._offset < -this.ITEM_HEIGHT) {
      const item = this._items.shift();
      this._container.removeChild(item);
      this._offset += this.ITEM_HEIGHT;
      this._minIndex++;
    }

    // Add items to the top as requried.
    while (this._offset > 0 && this._minIndex > 1n) {
      this._minIndex--;
      const newItem = this._makeItem(this._minIndex);
      newItems.push(newItem);
      this._items.unshift(newItem);
      this._container.prepend(newItem);
      this._offset -= this.ITEM_HEIGHT;
    }

    // Remove items from the bottom if required.
    while ((this._items.length-1) * this.ITEM_HEIGHT > this._height-this._offset) {
      const item = this._items.pop();
      this._container.removeChild(item);
    }

    this._container.style.transform = `translateY(${this._offset}px)`;

    MathJax.typeset(newItems);
  }
}

let tree;
const initPage = () => {
  const canvas = document.getElementById('tree-vis');
  tree = new TreeController(canvas);
  tree.resetPosition();

  const iteratorDiv = document.getElementById('iterator-vis');
  new IterationController(tree, iteratorDiv);
}

