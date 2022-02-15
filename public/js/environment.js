let myMesh;
let font;

function createEnvironment(scene) {
  console.log("Adding environment");

  let texture = new THREE.TextureLoader().load("../assets/texture.png");
  let myGeometry = new THREE.SphereGeometry(3, 12, 12);
  let myMaterial = new THREE.MeshBasicMaterial({ map: texture });
  myMesh = new THREE.Mesh(myGeometry, myMaterial);
  myMesh.position.set(5, 2, 5);
  scene.add(myMesh);

  // console.log(THREE.FontLoader);

  loadFont(scene);
  // createText(scene);
}


function updateEnvironment(scene) {
  myMesh.position.x += 0.01;
}


function loadFont(scene) {

  const loader = new THREE.FontLoader();
  loader.load( 'assets/helvetiker_bold.typeface.json', function ( response ) {
    font = response;
    createText(scene);
  } );

}

function createText(scene) {

  console.log(font);

  let textGeo = new THREE.TextGeometry( "hello", {

    font: font,

    size: 10,
    height: 10,
    curveSegments: 4,

    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelEnabled: false

  } );



  let mat = new THREE.MeshBasicMaterial({color: 'hotpink'})
  let textMesh1 = new THREE.Mesh( textGeo, mat );

  scene.add(textMesh1);

}