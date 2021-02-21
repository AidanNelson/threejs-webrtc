// let myMesh;
let mySpheres = [];

function createEnvironment(scene) {
  console.log("Adding environment");

  for (let i = 0; i < 3; i++) {
    let texture = new THREE.TextureLoader().load("../assets/texture.png");
    let myGeometry = new THREE.SphereGeometry(3, 12, 12);
    let myMaterial = new THREE.MeshBasicMaterial({ map: texture });
    let myMesh = new THREE.Mesh(myGeometry, myMaterial);
    myMesh.position.set(i * 5, 2, 5);
    myMesh.name = "sphere"+i.toString();

    scene.add(myMesh);
    mySpheres.push(myMesh);
  }
}

function updateEnvironment(scene) {
  // myMesh.position.x += 0.01;

  mySpheres[0].position.x += 0.01;
  mySpheres[1].position.y += 0.01;
  mySpheres[2].rotation.x += 0.001;

}
