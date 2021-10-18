const makeMatrixIterationItem = (nodeId, index) => {
  const state = NodeIdAndState.fromNodeId(nodeId).state;
  const valueFn = TreeState.getValueFn('stern-brocot');
  const frac = valueFn(state);

  const longSection = [];
  longSection.push(
    IterationRenderer.renderMatrix(state.n0, state.n1, state.m0, state.m1));

  if (index != 1) {
    longSection.push(IterationRenderer.renderSymbol('='));

    if (frac[0] == 1) {
      longSection.push(IterationRenderer.renderMatrix(
        state.n0, (state.n1-1n)+'+1', state.m0, state.m1));
    } else {
      state.goToPrevSibling();
      longSection.push(IterationRenderer.renderMatrix(
        state.n0, state.n1, state.m0, state.m1));
      const j = (state.n0+state.m0-1n)/(state.n1+state.m1);
      longSection.push(IterationRenderer.renderMatrix(
        0, -1, 1, '2\u00B7'+j+'+1'));
    }
  }

  return [longSection, IterationRenderer.renderFrac(frac)];
};

const makeBasicIterationItem = (nodeId, index) => {
  const state = NodeIdAndState.fromNodeId(nodeId).state;
  const valueFn = TreeState.getValueFn('stern-brocot');
  const frac = valueFn(state);

  const longSection = [];
  longSection.push(IterationRenderer.renderFrac(frac));
  longSection.push([
    IterationRenderer.renderSymbol('\u2192'),
    IterationRenderer.renderRLE(nodeId.getRLEPath()),
    IterationRenderer.renderSymbol('\u2192'),
  ]);
  longSection.push(IterationRenderer.renderBinaryIndex(index));

  return [longSection, IterationRenderer.renderInteger(index)];
};

const makeFinalIterationItem = (nodeId, index) => {
  const state = NodeIdAndState.fromNodeId(nodeId).state;
  const valueFn = TreeState.getValueFn('calkin-wilf');
  const frac = valueFn(state);

  state.goToPrevSibling();

  const longSection = [];
  longSection.push(IterationRenderer.renderFrac(frac));

  if (index != 1) {
    longSection.push(IterationRenderer.renderSymbol('='));

    let a, b;
    if (frac[0] == 1) {
      [b, a] = frac;
      a--;
    } else {
      [a,b] = valueFn(state);
    }

    longSection.push(IterationRenderer.renderFrac([
      b,
      ['2\u00B7', b, '\u00B7', (a/b), ' + ', b, ' - ', a],
    ]));
  }

  return [longSection, IterationRenderer.renderInteger(index)];
};

const initPage = () => {
  // Grid.
  const gridCanvas = document.getElementById('grid-vis');
  const grid = new GridController(gridCanvas);
  grid.update();

  // Initial demo.
  const sternBrocotDemo = document.getElementById('stern-brocot-demo');
  new TreeController(sternBrocotDemo);

  // Basic mapping.
  const basicMappingCanvas = document.getElementById('basic-mapping-tree');
  const basicMappingTree = new TreeController(basicMappingCanvas);
  const basicMappingIteratorDiv = document.getElementById('basic-mapping-iterator');
  new IterationController(basicMappingTree, basicMappingIteratorDiv, makeBasicIterationItem);

  const matrixMappingCanvas = document.getElementById('matrix-mapping-tree');
  const matrixMappingTree = new TreeController(matrixMappingCanvas);
  const matrixMappingIteratorDiv = document.getElementById('matrix-mapping-iterator');
  new IterationController(matrixMappingTree, matrixMappingIteratorDiv,
                          makeMatrixIterationItem, 60);

  const calkinWilfDemo = document.getElementById('calkin-wilf-demo');
  const calkinWilfTree = new TreeController(calkinWilfDemo);
  calkinWilfTree.setTreeType('calkin-wilf');

  const finalMappingCanvas = document.getElementById('final-mapping-tree');
  const finalMappingTree = new TreeController(finalMappingCanvas);
  finalMappingTree.setTreeType('calkin-wilf');
  const finalMappingIteratorDiv = document.getElementById('final-mapping-iterator');
  new IterationController(finalMappingTree, finalMappingIteratorDiv, makeFinalIterationItem);
};
