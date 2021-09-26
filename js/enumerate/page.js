const initPage = () => {
  // Initial demo.
  const sternBrocotDemo = document.getElementById('stern-brocot-demo');
  new TreeController(sternBrocotDemo);

  // Show mapping.
  const basicMappingCanvas = document.getElementById('basic-mapping-tree');
  const basicMappingTree = new TreeController(basicMappingCanvas);
  const basicMappingIteratorDiv = document.getElementById('basic-mapping-iterator');
  new IterationController(basicMappingTree, basicMappingIteratorDiv);

  const calkinWilfDemo = document.getElementById('calkin-wilf-demo');
  const calkinWilfTree = new TreeController(calkinWilfDemo);
  calkinWilfTree.setTreeType('calkin-wilf');
};
