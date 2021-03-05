let myMesh;

function createEnvironment(scene) {
  console.log("Adding environment");

  console.log(scene);

  scene.fog = new THREE.FogExp2( 0x232323, 0.025 );

  let texture = new THREE.TextureLoader().load("../assets/texture.png");
  let myGeometry = new THREE.SphereGeometry(3, 12, 12);
  let myMaterial = new THREE.MeshBasicMaterial({ map: texture });
  myMesh = new THREE.Mesh(myGeometry, myMaterial);
  myMesh.position.set(5, 2, 5);
  scene.add(myMesh);
}


function updateEnvironment(scene) {
  // myMesh.position.x += 0.01;
}