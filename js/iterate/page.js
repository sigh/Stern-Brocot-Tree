const makeMatrixItem = (nodeId, index) => {
  const state = NodeIdAndState.fromNodeId(nodeId).state;
  const valueFn = TreeState.getValueFn('stern-brocot');
  const frac = valueFn(state);

  const longSection = [];
  longSection.push(
    IterationRenderer.renderMatrix(state.n0, state.n1, state.m0, state.m1));

  if (!(frac[0] == 1 && frac[1] == 1)) {
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

const makeBasicItem = (nodeId, index) => {
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

let tree;
const initPage = () => {
  const canvas = document.getElementById('tree-vis');
  tree = new TreeController(canvas);
  tree.resetPosition();

  const iteratorDiv = document.getElementById('iterator-vis');
  new IterationController(tree, iteratorDiv, makeBasicItem);
}

