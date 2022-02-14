let myMesh;

function createEnvironment(scene) {
  console.log("Adding environment");

  let myLight = new THREE.DirectionalLight(0xfffffa, 1);
  myLight.position.set(0,30,50);
  myLight.lookAt(0,0,0);
  scene.add(myLight);

  let texture = new THREE.TextureLoader().load("../assets/texture.png");
  let myGeometry = new THREE.SphereGeometry(3, 12, 12);
  let myMaterial = new THREE.MeshPhongMaterial({ map: texture });
  myMesh = new THREE.Mesh(myGeometry, myMaterial);
  myMesh.position.set(5, 2, 5);
  scene.add(myMesh);

  for (let i = 0; i < 10; i++) {
    let geometry = new THREE.SphereGeometry(3, 12, 12);
    let material = new THREE.MeshPhongMaterial({color: "hotpink"});
    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      Math.random() * 10,
      Math.random() * 10,
      Math.random() * 10
    );
    scene.add(mesh);
  }
}


function updateEnvironment(scene) {
  myMesh.position.x += 0.01;
}