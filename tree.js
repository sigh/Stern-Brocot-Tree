let canvas = document.getElementById('tree-vis');

const DIM = 128;

const drawNode = (ctx, x, y, scale, text) => {
  let size = Math.floor(DIM*scale);
  ctx.font = `${size}px sans`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
};

const drawTree = (canvas) => {
  let ctx = canvas.getContext('2d');
  ctx.scale(0.5, 0.5);

  let drawTreeRec = (x, y, d, a, b) => {
    let c = [a[0] + b[0], a[1] + b[1]];

    let scale = Math.pow(2, -d);

    drawNode(ctx, x, y, scale, `${c[0]}/${c[1]}`);

    if (scale*60 > 1) {
      drawTreeRec(x-scale*DIM, y+scale*DIM, d+1, a, c);
      drawTreeRec(x+scale*DIM, y+scale*DIM, d+1, b, c);
    }
  };
  drawTreeRec(400, DIM, 0, [0,1], [1,0]);
};
drawTree(canvas);
