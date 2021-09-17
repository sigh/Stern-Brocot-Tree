const initPage = () => {
  let sternBrocotCanvas = document.getElementById('stern-brocot-demo');
  new TreeController(sternBrocotCanvas);

  let calkinWilfCanvas = document.getElementById('calkin-wilf-demo');
  let calkinWilf = new TreeController(calkinWilfCanvas);
  calkinWilf.setTreeType('calkin-wilf');
};
