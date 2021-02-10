function createEnvironment(scene) {
  console.log("Adding environment");
  loadModel(scene);

  // White directional light at half intensity shining from the top.
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  scene.add(directionalLight);
}

function updateEnvironment(scene) {
  // you can update the environment here
}

function loadModel(scene) {
  // model
  const onProgress = function (xhr) {
    if (xhr.lengthComputable) {
      const percentComplete = (xhr.loaded / xhr.total) * 100;
      console.log(Math.round(percentComplete, 2) + "% downloaded");
    }
  };

  const onError = function () {};

  const manager = new THREE.LoadingManager();

  new THREE.MTLLoader(manager)
    .setPath("../assets/oaktree/")
    .load("oakTree.mtl", function (materials) {
      materials.preload();

      new THREE.OBJLoader(manager)
        .setMaterials(materials)
        .setPath("../assets/oaktree/")
        .load(
          "oakTree.obj",
          function (object) {
            scene.add(object);
          },
          onProgress,
          onError
        );
    });
}
