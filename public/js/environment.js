let myMesh;

function createEnvironment(scene) {
  console.log("Adding environment");

  presentationArea(scene)
  whiteBoard(scene)
}

function whiteBoard(scene) {
  const geometry = new THREE.BoxGeometry( 22, 12, 0.5 );
  const materialWhite = new THREE.MeshBasicMaterial( {color: 0xffffff} );
  const materialBlack = new THREE.MeshBasicMaterial( {color: 0x000000} );
  const canvasMaterial = getCanvasMaterial();
  const whiteboard = new THREE.Mesh( geometry, [materialBlack,materialBlack,materialBlack,materialBlack,canvasMaterial,materialBlack] );
  whiteboard.position.set(0,8, -15)

  scene.add( whiteboard );
}

function presentationArea(scene) {
  const geometry = new THREE.CylinderGeometry( 10, 10, 1, 30, 1, false );
  const material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
  const area = new THREE.Mesh( geometry, material );
  area.position.set(0,0, 0)
  scene.add( area );
}


function updateEnvironment(scene) {
  myMesh.position.x += 0.01;
}

let drawingTexture;

function getCanvasMaterial() {
  let canvas = document.getElementById('drawingCanvas');
  let ctx = canvas.getContext("2d");

  drawingTexture = new THREE.CanvasTexture(ctx.canvas);
  return new THREE.MeshBasicMaterial({
    map: drawingTexture,
  });
}
