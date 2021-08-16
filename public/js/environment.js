let myMesh;

function createEnvironment(scene) {
  console.log("Adding environment");

  let texture = new THREE.TextureLoader().load("../assets/texture.png");
  let myGeometry = new THREE.SphereGeometry(3, 12, 12);
  let myMaterial = new THREE.MeshBasicMaterial({ map: texture });
  // myMesh = new THREE.Mesh(myGeometry, myMaterial);
  // myMesh.position.set(5, 2, 5);
  // scene.add(myMesh);

  for (let i = -5; i < 5; i++){
    for (let j = -5; j < 5; j++){
      let mesh = new THREE.Mesh(myGeometry, myMaterial);
      mesh.position.set(i*25, Math.sin(i*j)*5, j*25);
      scene.add(mesh);
    }
  }
}


function updateEnvironment(scene) {
  // myMesh.position.x += 0.01;
}