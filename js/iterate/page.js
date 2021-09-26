let tree;
const initPage = () => {
  const canvas = document.getElementById('tree-vis');
  tree = new TreeController(canvas);
  tree.resetPosition();

  const iteratorDiv = document.getElementById('iterator-vis');
  new IterationController(tree, iteratorDiv);
}

