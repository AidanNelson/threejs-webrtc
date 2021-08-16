/*
 *
 * This uses code from a THREE.js Multiplayer boilerplate made by Or Fleisher:
 * https://github.com/juniorxsound/THREE.Multiplayer
 * And a WEBRTC chat app made by Mikołaj Wargowski:
 * https://github.com/Miczeq22/simple-chat-app
 *
 * Aidan Nelson, April 2020
 *
 */

class Scene {
  constructor(_movementCallback) {
    this.movementCallback = _movementCallback;

    //THREE scene
    this.scene = new THREE.Scene();
    this.keyState = {};

    //Utility
    this.width = window.innerWidth;
    this.height = window.innerHeight - 0;

    //Add Player
    // this.addSelf();

    // let mm = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshNormalMaterial());
    // mm.position.set(0, 0, 5);
    // this.scene.add(mm);

    //THREE Camera
    this.cameraHeight = 1.5;
    this.camera = new THREE.PerspectiveCamera(
      50,
      this.width / this.height,
      0.1,
      5000
    );
    this.camera.position.set(0, 1.5, 0);
    this.camera.lookAt(0, 0, 1);
    this.scene.add(this.camera);

    // create an AudioListener and add it to the camera
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    //THREE WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      antialiasing: true,
    });
    this.renderer.setClearColor(new THREE.Color("lightblue"));
    this.renderer.setSize(this.width, this.height);

    // add controls:
    // this.controls = new THREE.PlayerControls(this.camera, this.playerGroup);
    this.controls = new Controls(this.scene, this.camera, this.renderer);

    //Push the canvas to the DOM
    let domElement = document.getElementById("canvas-container");
    domElement.append(this.renderer.domElement);

    //Setup event listeners for events and handle the states
    window.addEventListener("resize", (e) => this.onWindowResize(e), false);
    window.addEventListener("keydown", (e) => this.onKeyDown(e), false);
    window.addEventListener("keyup", (e) => this.onKeyUp(e), false);

    // Helpers
    this.scene.add(new THREE.GridHelper(500, 500));
    this.scene.add(new THREE.AxesHelper(10));

    this.addLights();
    createEnvironment(this.scene);

    // Start the loop
    this.frameCount = 0;
    this.update();
    this.updateFaceLandmarks();
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Lighting 💡

  addLights() {
    this.scene.add(new THREE.AmbientLight(0xffffe6, 0.7));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.scene.add(directionalLight);
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Clients 👫

  addSelf() {
    let videoMaterial = makeVideoMaterial("local");

    let _head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), videoMaterial);

    _head.position.set(0, 0, 0);

    // https://threejs.org/docs/index.html#api/en/objects/Group
    this.playerGroup = new THREE.Group();
    this.playerGroup.position.set(0, 0.5, 0);
    this.playerGroup.add(_head);

    // add group to scene
    this.scene.add(this.playerGroup);
  }

  // add a client meshes, a video element and  canvas for three.js video texture
  addClient(_id) {
    // let videoMaterial = makeVideoMaterial(_id);

    // let _head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), videoMaterial);
    // let _head = addFaceMesh(clients[_id].face)
    // set position of head before adding to parent object

    let body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial());

    // _head.position.set(0, 0, 0);

    // https://threejs.org/docs/index.html#api/en/objects/Group
    var group = new THREE.Group();
    // group.add(_head);
    group.add(body);

    // add group to scene
    this.scene.add(group);

    clients[_id].group = group;
    // clients[_id].head = _head;
    clients[_id].desiredPosition = new THREE.Vector3();
    clients[_id].desiredRotation = new THREE.Quaternion();
    clients[_id].movementAlpha = 0;

    this.addClientFaceMesh(_id, standardKeypoints)
  }



  removeClient(_id) {
    this.scene.remove(clients[_id].group);
  }

  updateClientFaces(_clientProps){
    console.log('updating faces');

    for (let _id in _clientProps) {
      if (_id in clients) {
        if (_id != this.mySocketID) {

          if (_clientProps[_id].facePredictions) {

            if (!clients[_id].faceMesh) {
              console.log("adding client face!");
              this.addClientFaceMesh(_id, standardKeypoints);
            } else {
              // update face points
              this.updateClientFacePoints(_id, _clientProps[_id].facePredictions);
            }
          }
        }
      }
    }

  }

  // overloaded function can deal with new info or not
  updateClientPositions(_clientProps) {
    let halfClientHeight = 1;

    for (let _id in _clientProps) {
      if (_id in clients) {
        if (_id != this.mySocketID) {
          // we'll update ourselves separately to avoid lag...
          // update position
          // clients[_id].desiredPosition = new THREE.Vector3(_clientProps[_id].position[0], _clientProps[_id].position[1], _clientProps[_id].position[2]);
          // // update rotation
          // clients[_id].desiredLookAt = new THREE.Vector3(_clientProps[_id].rotation[0], clients[_id].desiredPosition.y, _clientProps[_id].rotation[2])
          clients[_id].group.position.set(_clientProps[_id].position[0], 0, _clientProps[_id].position[2]);
          clients[_id].group.lookAt(_clientProps[_id].rotation[0], 0, _clientProps[_id].rotation[2])

          
        }
      }
    }


  }
  // TODO make this simpler...? more performant?
  interpolatePositions() {
    // PARACHUTE IS BACK...
    // While landing, let's look at the middle of the area
    // if (this.camera.position.y > 8) {
    //   let lookMiddle = new THREE.Vector3(0, this.cameraHeight, 0);
    //   this.camera.lookAt(lookMiddle);
    // }


    let snapDistance = 0.5;
    // let snapAngle = 0.2; // radians
    for (let _id in clients) {
      if (_id != this.mySocketID) {

        if (clients[_id].group) {
          console.log("Updating client position:", _id);
          clients[_id].group.position.lerp(clients[_id].desiredPosition, 0.2);
          if (clients[_id].group.position.distanceTo(clients[_id].desiredPosition) < snapDistance) {
            clients[_id].group.position.set(clients[_id].desiredPosition.x, clients[_id].desiredPosition.y, clients[_id].desiredPosition.z);
          }

          clients[_id].group.lookAt(clients[_id].desiredLookAt);
        }
      }
    }
  }

  updateClientVolumes() {
    for (let _id in clients) {
      let audioEl = document.getElementById(_id + "_audio");
      if (audioEl) {
        let distSquared = this.camera.position.distanceToSquared(
          clients[_id].group.position
        );

        if (distSquared > 500) {
          // console.log('setting vol to 0')
          audioEl.volume = 0;
        } else {
          // from lucasio here: https://discourse.threejs.org/t/positionalaudio-setmediastreamsource-with-webrtc-question-not-hearing-any-sound/14301/29
          let volume = Math.min(1, 10 / distSquared);
          audioEl.volume = volume;
          // console.log('setting vol to',volume)
        }
      }
    }
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Interaction 🤾‍♀️

  // getPlayerPosition() {
  //   // TODO: use quaternion or are euler angles fine here?
  //   return [
  //     [
  //       this.playerGroup.position.x,
  //       this.playerGroup.position.y,
  //       this.playerGroup.position.z,
  //     ],
  //     [
  //       this.playerGroup.quaternion._x,
  //       this.playerGroup.quaternion._y,
  //       this.playerGroup.quaternion._z,
  //       this.playerGroup.quaternion._w,
  //     ],
  //   ];
  // }
  getPlayerPosition() {
    var lookAtVector = new THREE.Vector3(0, 0, -1);
    lookAtVector.applyQuaternion(this.camera.quaternion);
    lookAtVector.normalize();
    lookAtVector.add(this.camera.position);
    // TODO: use quaternion or are euler angles fine here?
    return [
      [this.camera.position.x, this.camera.position.y - (this.cameraHeight - 0.5), this.camera.position.z],
      [lookAtVector.x, lookAtVector.y, lookAtVector.z],
    ];
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Rendering 🎥

  // face landmarks
  async getFaceLandmarks() {
    if (faceLandmarksModel) {
      const predictions = await faceLandmarksModel.estimateFaces({
        input: document.querySelector("video"),
        flipHorizontal: true,
      });

      if (predictions.length > 0) {
        // socket.emit("facePredictions", predictions);
        let scaledMesh = predictions[0].scaledMesh;
        // let flatArr = scaledMesh.flat();
        // let flatScaledMesh = new Float32Array(flatArr);

        // console.log(flatScaledMesh.buffer);

        // var z = new Float32Array(flatScaledMesh.buffer);
        // console.log(z);

        let keypoints = scaledMesh.map((point) => [
          -point[0],
          -point[1],
          -point[2],
        ]);

        let dataToSend = new Float32Array(keypoints.flat());
        socket.emit("facePredictions", dataToSend.buffer);
        console.log("sending face data");

        // if (this.faceMesh) {
        //   this.updateFacePoints(predictions);
        // } else {
        //   this.drawFacePoints(predictions);
        // }
      }
    }
  }

  // drawSelfFacePoints(predictions) {
  //   /*
  //     `predictions` is an array of objects describing each detected face, for example:
  
  //     [
  //       {
  //         faceInViewConfidence: 1, // The probability of a face being present.
  //         boundingBox: { // The bounding box surrounding the face.
  //           topLeft: [232.28, 145.26],
  //           bottomRight: [449.75, 308.36],
  //         },
  //         mesh: [ // The 3D coordinates of each facial landmark.
  //           [92.07, 119.49, -17.54],
  //           [91.97, 102.52, -30.54],
  //           ...
  //         ],
  //         scaledMesh: [ // The 3D coordinates of each facial landmark, normalized.
  //           [322.32, 297.58, -17.54],
  //           [322.18, 263.95, -30.54]
  //         ],
  //         annotations: { // Semantic groupings of the `scaledMesh` coordinates.
  //           silhouette: [
  //             [326.19, 124.72, -3.82],
  //             [351.06, 126.30, -3.00],
  //             ...
  //           ],
  //           ...
  //         }
  //       }
  //     ]
  //     */

  //   let vertices = [];
  //   let normals = [];

  //   //https://github.com/mrdoob/three.js/blob/master/examples/webgl_interactive_buffergeometry.html
  //   const pA = new THREE.Vector3();
  //   const pB = new THREE.Vector3();
  //   const pC = new THREE.Vector3();

  //   const cb = new THREE.Vector3();
  //   const ab = new THREE.Vector3();

  //   for (let q = 0; q < predictions.length; q++) {
  //     // const keypoints = predictions[q].scaledMesh;
  //     let scaledMesh = predictions[q].scaledMesh;
  //     let keypoints = scaledMesh.map((point) => [
  //       -point[0],
  //       -point[1],
  //       -point[2],
  //     ]);

  //     // console.log(TRIANGULATION.length / 3);
  //     for (let i = 0; i < TRIANGULATION.length / 3; i++) {
  //       const points = [
  //         TRIANGULATION[i * 3],
  //         TRIANGULATION[i * 3 + 1],
  //         TRIANGULATION[i * 3 + 2],
  //       ].map((index) => keypoints[index]);

  //       let ax = points[0][0];
  //       let ay = points[0][1];
  //       let az = points[0][2];

  //       let bx = points[1][0];
  //       let by = points[1][1];
  //       let bz = points[1][2];

  //       let cx = points[2][0];
  //       let cy = points[2][1];
  //       let cz = points[2][2];

  //       vertices.push(ax, ay, az);
  //       vertices.push(bx, by, bz);
  //       vertices.push(cx, cy, cz);

  //       // flat face normals

  //       pA.set(ax, ay, az);
  //       pB.set(bx, by, bz);
  //       pC.set(cx, cy, cz);

  //       cb.subVectors(pC, pB);
  //       ab.subVectors(pA, pB);
  //       cb.cross(ab);

  //       cb.normalize();

  //       const nx = cb.x;
  //       const ny = cb.y;
  //       const nz = cb.z;

  //       normals.push(nx);
  //       normals.push(ny);
  //       normals.push(nz);

  //       normals.push(nx);
  //       normals.push(ny);
  //       normals.push(nz);

  //       normals.push(nx);
  //       normals.push(ny);
  //       normals.push(nz);
  //     }
  //   }

  //   let verticesArray = new Float32Array(vertices);
  //   let normalsArray = new Float32Array(normals);
  //   let uvs = new Float32Array(UV_COORDS);
  //   // console.log("uvs", uvs.length);

  //   const geometry = new THREE.BufferGeometry();
  //   // geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  //   geometry.setAttribute(
  //     "position",
  //     new THREE.BufferAttribute(verticesArray, 3)
  //   );
  //   geometry.setAttribute("normal", new THREE.BufferAttribute(normalsArray, 3));
  //   // geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

  //   // let canvasEl = document.getElementById("video-canvas");
  //   // this.canvasTexture = new THREE.CanvasTexture(canvasEl);
  //   // let faceMat = new THREE.MeshPhongMaterial({
  //   //   map: this.canvasTexture,
  //   //   side: THREE.DoubleSide
  //   // });
  //   const faceMat = new THREE.MeshPhongMaterial({
  //     color: 0xff23ab,
  //     side: THREE.DoubleSide,
  //   });



  //   this.faceMesh = new THREE.Mesh(geometry, faceMat);
  //   this.faceGroup = new THREE.Group();
  //   this.faceGroup.add(this.faceMesh);

  //   let vw = 320;
  //   let vh = 240;
  //   let vRatio = 320 / 240;
  //   let boxWidth = 2;
  //   let boxHeight = 2 * vRatio;

  //   let scaleFactor = boxWidth / vw;

  //   this.faceGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
  //   this.faceGroup.position.set(boxWidth / 2, boxHeight / 2, 0);

  //   this.scene.add(this.faceGroup);
  // }

  addClientFaceMesh(_id, keypoints) {

    // console.log('creating face from predictions: ', predictions);
    let vertices = [];
    let normals = [];

    //https://github.com/mrdoob/three.js/blob/master/examples/webgl_interactive_buffergeometry.html
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const pC = new THREE.Vector3();

    const cb = new THREE.Vector3();
    const ab = new THREE.Vector3();

    // for (let q = 0; q < predictions.length; q++) {
    //   // const keypoints = predictions[q].scaledMesh;
    //   let scaledMesh = predictions[q].scaledMesh;
    //   let keypoints = scaledMesh.map((point) => [
    //     -point[0],
    //     -point[1],
    //     -point[2],
    //   ]);

    // console.log(TRIANGULATION.length / 3);
    for (let i = 0; i < TRIANGULATION.length / 3; i++) {
      const points = [
        TRIANGULATION[i * 3],
        TRIANGULATION[i * 3 + 1],
        TRIANGULATION[i * 3 + 2],
      ].map((index) => keypoints[index]);

      let ax = points[0][0];
      let ay = points[0][1];
      let az = points[0][2];

      let bx = points[1][0];
      let by = points[1][1];
      let bz = points[1][2];

      let cx = points[2][0];
      let cy = points[2][1];
      let cz = points[2][2];

      vertices.push(ax, ay, az);
      vertices.push(bx, by, bz);
      vertices.push(cx, cy, cz);

      // flat face normals

      pA.set(ax, ay, az);
      pB.set(bx, by, bz);
      pC.set(cx, cy, cz);

      cb.subVectors(pC, pB);
      ab.subVectors(pA, pB);
      cb.cross(ab);

      cb.normalize();

      const nx = cb.x;
      const ny = cb.y;
      const nz = cb.z;

      normals.push(nx);
      normals.push(ny);
      normals.push(nz);

      normals.push(nx);
      normals.push(ny);
      normals.push(nz);

      normals.push(nx);
      normals.push(ny);
      normals.push(nz);
    }
    // }

    let verticesArray = new Float32Array(vertices);
    let normalsArray = new Float32Array(normals);
    let uvs = new Float32Array(UV_COORDS);
    // console.log("uvs", uvs.length);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(verticesArray, 3)
    );
    geometry.setAttribute("normal", new THREE.BufferAttribute(normalsArray, 3));

    const faceMat = new THREE.MeshPhongMaterial({
      color: 0xff23ab,
      side: THREE.DoubleSide,
    });



    let faceMesh = new THREE.Mesh(geometry, faceMat);
    let faceGroup = new THREE.Group();
    faceGroup.add(faceMesh);

    let vw = 320;
    let vh = 240;
    let vRatio = 320 / 240;
    let boxWidth = 2;
    let boxHeight = 2 * vRatio;

    let scaleFactor = boxWidth / vw;

    faceGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
    // faceGroup.position.set(boxWidth / 2, boxHeight / 2 + this.cameraHeight, 0);
    faceGroup.position.set(boxWidth / 2, boxHeight / 2 + 1, 0);

    clients[_id].group.add(faceGroup);
    clients[_id].faceMesh = faceMesh;
  }

  // scaleFacePoint(x,y,z){
  // let vw = 320;
  // let vh = 240;
  // let vRatio = 320/240;
  // let boxWidth = 2;
  // let boxHeight = 2 * vRatio;

  // let scaleFactor = boxWidth / vw;



  // this.faceGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
  // this.faceGroup.position.set(boxWidth/2, boxHeight / 2, 0);
  // }

  // updateSelfFacePoints(predictions) {
  //   const vertices = this.faceMesh.geometry.attributes.position.array;

  //   let verticesIndex = 0;

  //   for (let q = 0; q < predictions.length; q++) {
  //     // console.log(predictions[q].boundingBox);
  //     // drawVideoToCanvas(predictions[q].boundingBox);
  //     // this.canvasTexture.needsUpdate = true;

  //     // let videoWidth = 320;
  //     // let videoHeight = 240;
  //     // let midwayPt = predictions[0].annotations.midwayBetweenEyes;
  //     // let scaledX = parseFloat(midwayPt[0]) * 0.0625;
  //     // let scaledY = parseFloat(midwayPt[1]) * 0.0625;
  //     // let scaledZ = parseFloat(midwayPt[2]) * 0.0625;
  //     // this.camera.position.set(scaledX,scaledY,scaledZ);


  //     // console.log("centerPt:", midwayPt);
  //     // console.log('centerPt SCALED:' + midX + "/" + midY)

  //     let scaledMesh = predictions[q].scaledMesh;
  //     let keypoints = scaledMesh.map((point) => [
  //       -point[0],
  //       -point[1],
  //       -point[2],
  //     ]);

  //     let ptBetweenEyes = keypoints[68];
  //     console.log(ptBetweenEyes);



  //     for (let i = 0; i < TRIANGULATION.length / 3; i++) {
  //       const points = [
  //         TRIANGULATION[i * 3],
  //         TRIANGULATION[i * 3 + 1],
  //         TRIANGULATION[i * 3 + 2],
  //       ].map((index) => keypoints[index]);
  //       // console.log(points);

  //       let ax = points[0][0];
  //       let ay = points[0][1];
  //       let az = points[0][2];

  //       let bx = points[1][0];
  //       let by = points[1][1];
  //       let bz = points[1][2];

  //       let cx = points[2][0];
  //       let cy = points[2][1];
  //       let cz = points[2][2];

  //       vertices[verticesIndex + 0] = ax;
  //       vertices[verticesIndex + 1] = ay;
  //       vertices[verticesIndex + 2] = az;

  //       vertices[verticesIndex + 3] = bx;
  //       vertices[verticesIndex + 4] = by;
  //       vertices[verticesIndex + 5] = bz;

  //       vertices[verticesIndex + 6] = cx;
  //       vertices[verticesIndex + 7] = cy;
  //       vertices[verticesIndex + 8] = cz;

  //       verticesIndex += 9;
  //     }
  //   }

  //   let toSend = new Float32Array(vertices);
  //   // console.log(toSend);

  //   this.faceMesh.geometry.attributes.position.needsUpdate = true;
  // }

  updateClientFacePoints(_id, keypointsBuffer) {
    const vertices = clients[_id].faceMesh.geometry.attributes.position.array;

    let verticesIndex = 0;

    let keypointsFlatTypedArray = new Float32Array(keypointsBuffer);
    let keypointsFlatArray = [...keypointsFlatTypedArray];

    let keypoints = [];
    // https://stackoverflow.com/questions/20257889/unflatten-arrays-into-groups-of-fours/20257996
    while (keypointsFlatArray.length > 0) {
      keypoints.push(keypointsFlatArray.splice(0,3));
    }

    for (let i = 0; i < TRIANGULATION.length / 3; i++) {
      const points = [
        TRIANGULATION[i * 3],
        TRIANGULATION[i * 3 + 1],
        TRIANGULATION[i * 3 + 2],
      ].map((index) => keypoints[index]);
      // console.log(points);

      let ax = points[0][0];
      let ay = points[0][1];
      let az = points[0][2];

      let bx = points[1][0];
      let by = points[1][1];
      let bz = points[1][2];

      let cx = points[2][0];
      let cy = points[2][1];
      let cz = points[2][2];

      vertices[verticesIndex + 0] = ax;
      vertices[verticesIndex + 1] = ay;
      vertices[verticesIndex + 2] = az;

      vertices[verticesIndex + 3] = bx;
      vertices[verticesIndex + 4] = by;
      vertices[verticesIndex + 5] = bz;

      vertices[verticesIndex + 6] = cx;
      vertices[verticesIndex + 7] = cy;
      vertices[verticesIndex + 8] = cz;

      verticesIndex += 9;
    }
    clients[_id].faceMesh.geometry.attributes.position.needsUpdate = true;
  }

  updateFaceLandmarks() {

    this.getFaceLandmarks();
    requestAnimationFrame(() => this.updateFaceLandmarks());

  }

  update() {
    requestAnimationFrame(() => this.update());
    this.frameCount++;

    updateEnvironment();



    if (this.frameCount % 25 === 0) {
      this.updateClientVolumes();
      this.movementCallback();
    }

    // if (this.frameCount % 30 == 0) {
    //   this.getFaceLandmarks();
    // }

    // this.interpolatePositions();
    this.controls.update();
    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Event Handlers 🍽

  onWindowResize(e) {
    this.width = window.innerWidth;
    this.height = Math.floor(window.innerHeight - window.innerHeight * 0.3);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  // keystate functions from playercontrols
  onKeyDown(event) {
    event = event || window.event;
    this.keyState[event.keyCode || event.which] = true;
  }

  onKeyUp(event) {
    event = event || window.event;
    this.keyState[event.keyCode || event.which] = false;
  }
}

//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
// Utilities

function makeVideoMaterial(_id) {
  let videoElement = document.getElementById(_id + "_video");
  let videoTexture = new THREE.VideoTexture(videoElement);

  let videoMaterial = new THREE.MeshBasicMaterial({
    map: videoTexture,
    overdraw: true,
    side: THREE.DoubleSide,
  });

  return videoMaterial;
}


function drawVideoToCanvas(bb) {
  let videoElement = document.getElementById("local_video");

  if (videoElement) {
    const drawingCanvas = document.getElementById("video-canvas");
    const drawingContext = drawingCanvas.getContext("2d");

    let topLeft = bb.topLeft;
    let bottomRight = bb.bottomRight;
    let sx = topLeft[0];
    let sy = topLeft[1];
    // let sWidth = bottomRight[0] - topLeft[0];
    // let sHeight = bottomRight[1] - topLeft[1];
    let sWidth = 100;
    let sHeight = 100;

    drawingContext.drawImage(
      videoElement,
      sx,
      sy,
      sWidth,
      sHeight,
      0,
      0,
      256,
      256
    );
  }
}



