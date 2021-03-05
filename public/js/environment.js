let myMesh;
let water;




function createEnvironment(scene) {
  console.log("Adding environment");

  let texture = new THREE.TextureLoader().load("../assets/texture.png");
  let myGeometry = new THREE.SphereGeometry(3, 12, 12);
  let myMaterial = new THREE.MeshBasicMaterial({ map: texture });
  myMesh = new THREE.Mesh(myGeometry, myMaterial);
  myMesh.position.set(5, 2, 5);
  scene.add(myMesh);

  addWater(scene);
}


function updateEnvironment(scene) {
  // myMesh.position.x += 0.01;
  water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
}


function addWater(scene){
  // Water

  const waterGeometry = new THREE.PlaneGeometry( 10000, 10000 );

  water = new THREE.Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load( '../assets/waternormals.jpeg', function ( texture ) {

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

      } ),
      alpha: 1.0,
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 100,
      fog: scene.fog !== undefined
    }
  );

  water.rotation.x = - Math.PI / 2;
  scene.add( water );
}