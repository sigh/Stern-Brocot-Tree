class IterationRenderer {

  static _makeTextElem(type, text) {
    let elem = document.createElement(type);
    elem.textContent = text;
    return elem;
  }

  // TODO: combine with path rendering in blah.
  static renderRLE(rlepath) {
    const span = document.createElement('span');

    let isEmpty = true;
    for (const [bit, count] of rlepath.items()) {
      if (!count) continue;
      isEmpty = false;

      const letter = 'RL'[bit];
      span.appendChild(this._makeTextElem('i', letter));
      if (count > 1) span.appendChild(this._makeTextElem('sup', count));
    }

    // If there are no elements, then output 'I' for the identity.
    if (isEmpty) {
      span.appendChild(this._makeTextElem('i', 'I'));
    }

    return span;
  }

  static renderFrac(frac) {
    const div = document.createElement('div');
    div.className = 'frac';
    div.append(this._renderArrayAsDiv([frac[0]]));
    div.append(this._renderArrayAsDiv([frac[1]]));
    return div;
  }

  static renderSymbol(symbol) {
    const span = this._makeTextElem('span', symbol);
    span.className = 'iterator-symbol';
    return span;
  }

  static renderBinaryIndex(index) {
    const indexSpan = document.createElement('span');
    const first1 = this._makeTextElem('span', 1);
    first1.style.color = 'grey'
    indexSpan.append(first1);
    indexSpan.append(this._makeTextElem('span'), index.toString(2).substr(1));
    indexSpan.append(this._makeTextElem('sub', '2'));
    return indexSpan;
  }

  static renderInteger(n) {
    return this._makeTextElem('span', n);
  }

  static renderMatrix(a, b, c, d) {
    const matrix = document.createElement('div');
    matrix.className = 'matrix';
    matrix.append(this._makeTextElem('span', a));
    matrix.append(this._makeTextElem('span', b));
    matrix.append(this._makeTextElem('span', c));
    matrix.append(this._makeTextElem('span', d));

    return matrix;
  }

  static _renderArrayAsDiv(parts) {
    const div = document.createElement('div');
    for (const part of parts) {
      if (Array.isArray(part)) {
        div.append(this._renderArrayAsDiv(part));
      } else {
        div.append(part);
      }
    }
    return div;
  }

  static makeItem(nodeId, index, makeItemFn) {
    const [longSectionParts, endPart] = makeItemFn(nodeId, index);

    const div = document.createElement('div');
    div.classList.add('iterator-item');

    const longSection = this._renderArrayAsDiv(longSectionParts);

    const fadeOut = document.createElement('div');
    fadeOut.classList.add('fade-out');
    longSection.append(fadeOut);

    div.append(longSection);
    div.append(endPart);

    div.style.height = this._itemHeight;

    return div;
  }
}

class IterationController {
  _height;
  WIDTH = 250;
  _itemHeight = 50;

  constructor(tree, outerContainer, makeItemFn, itemHeight) {
    this._tree = tree;
    this._makeItemFn = makeItemFn;

    if (itemHeight) this._itemHeight = itemHeight;

    this._height = tree.getHeight();
    outerContainer.style.height = this._height + 'px';
    outerContainer.style.width = this.WIDTH + 'px';

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
      // TODO: Check if this scroll direction works regardless of user settings.
      this._offset -= dy;
      if (this._offset > this._itemHeight) this._offset = this._itemHeight;

      this._update();
    };
  }

  _makeItem(index) {
    const nodeId = NodeId.fromBigInt(index);
    const newItem = IterationRenderer.makeItem(nodeId, index, this._makeItemFn);
    newItem.style.height = this._itemHeight + 'px';

    newItem.onmouseover = () => {
      this._tree.selectNodeById(NodeId.fromBigInt(index));
    };

    return newItem;
  }

  _update() {
    const newItems = [];

    // Add items to the bottom as required.
    while (this._items.length * this._itemHeight < this._height-this._offset) {
      const newItem = this._makeItem(this._minIndex + BigInt(this._items.length));
      newItems.push(newItem);
      this._items.push(newItem);
      this._container.append(newItem);
    }

    // Remove items from the top if required.
    while (this._offset < -this._itemHeight) {
      const item = this._items.shift();
      this._container.removeChild(item);
      this._offset += this._itemHeight;
      this._minIndex++;
    }

    // Add items to the top as requried.
    while (this._offset > 0 && this._minIndex > 1n) {
      this._minIndex--;
      const newItem = this._makeItem(this._minIndex);
      newItems.push(newItem);
      this._items.unshift(newItem);
      this._container.prepend(newItem);
      this._offset -= this._itemHeight;
    }

    // Remove items from the bottom if required.
    while ((this._items.length-1) * this._itemHeight > this._height-this._offset) {
      const item = this._items.pop();
      this._container.removeChild(item);
    }

    this._container.style.transform = `translateY(${this._offset}px)`;
  }
}

