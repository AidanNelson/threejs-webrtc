/*
 *
 * This uses code from a THREE.js Multiplayer boilerplate made by Or Fleisher:
 * https://github.com/juniorxsound/THREE.Multiplayer
 * Aidan Nelson, April 2020
 *
 */


class Scene {
  constructor(isStudent=false) {
    //THREE scene
    this.scene = new THREE.Scene();

    

    //Utility
    this.width = window.innerWidth;
    this.height = window.innerHeight; // * 0.9;

    // lerp value to be used when interpolating positions and rotations
    this.lerpValue = 0;

    //THREE Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      this.width / this.height,
      0.1,
      5000
    );
    this.isStudent = isStudent

    const {x,y} =  this.getRandomPositionInsideCircle()
    isStudent ? this.camera.position.set(0, 3, 6) : this.camera.position.set(x, 3, y);
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
    this.controls = new FirstPersonControls(this.scene, this.camera, this.renderer);

    //Push the canvas to the DOM
    let domElement = document.getElementById("canvas-container");
    domElement.append(this.renderer.domElement);

    //Setup event listeners for events and handle the states
    window.addEventListener("resize", (e) => this.onWindowResize(e), false);

    // Helpers
    this.scene.add(new THREE.GridHelper(500, 500));
    this.scene.add(new THREE.AxesHelper(10));

    this.addLights();
    createEnvironment(this.scene);

    // Start the loop
    this.frameCount = 0;
    this.update();
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Lighting 💡

  addLights() {
    this.scene.add(new THREE.AmbientLight(0xffffe6, 0.7));
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Clients 👫

  // add a client meshes, a video element and  canvas for three.js video texture
  addClient(id, username, peers) {
    console.log("HEEEY", username)
    let videoMaterial = makeVideoMaterial(id);
    let labelMaterial = makeLabelMaterial(username)
    let handMaterial = makeHandMaterial()
    //let emojiMaterial = makeEmojiMaterial()
    let otherMat = new THREE.MeshNormalMaterial();

    let head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.2), [otherMat,otherMat,otherMat,otherMat,otherMat,videoMaterial]);
    let body = new THREE.Mesh(new THREE.SphereGeometry( 0.7, 32, 16 ), otherMat);

    // set position of head before adding to parent object
    head.position.set(0, 0.3, 0);
    head.userData.socketId = id;
    head.userData.objectType = "head";

    body.position.set(0, -0.8, 0);
    body.userData.socketId = id;
    body.userData.objectType = "body";

    // ADD HAND material to head
    handMaterial.position.setX(1)
    handMaterial.userData.socketId = id;
    handMaterial.userData.objectType = "hand";
    head.add(handMaterial)

    // ADD EMOJI material to head
    /*
    emojiMaterial.position.setX(-1)
    emojiMaterial.userData.socketId = id;
    emojiMaterial.userData.objectType = "emoji";
    console.log('EMOJI MAT', emojiMaterial)
    head.add(emojiMaterial)
    */

    // ADD TEXT material (label) to head
    labelMaterial.position.setY(1)
    head.add(labelMaterial)

    // https://threejs.org/docs/index.html#api/en/objects/Group
    var group = new THREE.Group();
    group.add(head);
    group.add(body);

    // add group to scene
    this.scene.add(group);

    peers[id].group = group;
    peers[id].videoMaterial = videoMaterial;

    peers[id].previousPosition = new THREE.Vector3(0, 0,0);
    peers[id].previousRotation = new THREE.Quaternion();
    peers[id].desiredPosition = new THREE.Vector3(0, 0,0);
    peers[id].desiredRotation = new THREE.Quaternion();
    return peers
  }

  removeClient(id) {
    this.scene.remove(peers[id].group);
    this.removeWhiteboardVideo(id);
  }

  // overloaded function can deal with new info or not
  updateClientPositions(clientProperties) {
    this.lerpValue = 0;
    for (let id in clientProperties) {
      this.drawAvatar(clientProperties, id);
    }
  }

  getRandomPositionInsideCircle(){
    const r = RAD * Math.sqrt(Math.random())
    const theta = Math.random() * 2 * Math.PI
    const x = r * Math.cos(theta)
    const y = PRESENTATION_CENTER_X + r * Math.sin(theta)
    return {x,y}
  }

  drawAvatar(clientProperties, id) {
    if (id != mySocket.id) {
      peers[id].previousPosition.copy(peers[id].group.position);
      peers[id].previousRotation.copy(peers[id].group.quaternion);
      peers[id].desiredPosition = new THREE.Vector3().fromArray(
          clientProperties[id].position
      );
      peers[id].desiredRotation = new THREE.Quaternion().fromArray(
          clientProperties[id].rotation
      );
    }
  }

  raiseHand(id){
      try{
        this.scene.traverse(function(child){
          if (child.userData.socketId == id && child.userData.objectType == "hand") {  
              child.visible = !child.visible
          }
         });
       }catch(err){
         console.error(err)
       }
  }

  handleReaction(obj){
    const {id, reaction} = obj;
 
    try{
      this.scene.traverse(function(child){

        if (child.userData.socketId == id && child.userData.objectType == "head") { 
          
            // add hand to head 
            const mesh = makeEmojiMaterial(reaction.reactionFile)
            mesh.position.setX(-1)
            mesh.userData.socketId = id;
            mesh.userData.objectType = "emoji";
            child.add(mesh)
            // animate, TODO: fade out (opacity)
            animate()

            function animate(){
              requestAnimationFrame(animate)
              mesh.position.y += 0.01;              
            }
        }
       });

      
     }catch(err){
       console.error(err)
     }
  }

  removeWhiteboardVideo(id) {
    if (peers[id].whiteboard) {
      this.scene.remove(peers[id].whiteboard);
    }
  }

  updateWhiteboardVideos(peers) {
    let i = 0;
    for (let id in peers) {
      i++;
      if (peers[id].videoMaterial) {
        const geometry = new THREE.BoxGeometry(5, 5, 0.5);
        const materialBlack = new THREE.MeshBasicMaterial({color: 0x000000});
        const whiteboard = new THREE.Mesh(geometry, [materialBlack, materialBlack, materialBlack, materialBlack, peers[id].videoMaterial, materialBlack]);
        whiteboard.position.set(15, 17 - 6 * i, -25)
        this.scene.add(whiteboard);

        if (peers[id].whiteboard) {
          this.scene.remove(peers[id].whiteboard);
        }
        peers[id].whiteboard = whiteboard;
      }
    }
  }

  interpolatePositions() {
    this.lerpValue += 0.1; // updates are sent roughly every 1/5 second == 10 frames
    for (let id in peers) {
      if (peers[id].group) {
        peers[id].group.position.lerpVectors(peers[id].previousPosition,peers[id].desiredPosition, this.lerpValue);
        peers[id].group.quaternion.slerpQuaternions(peers[id].previousRotation,peers[id].desiredRotation, this.lerpValue);
      }
    }
  }

  updateClientVolumes() {
    for (let id in peers) {
      let audioEl = document.getElementById(id + "_audio");
      if (audioEl && peers[id].group) {
        let distSquared = this.camera.position.distanceToSquared(
          peers[id].group.position
        );

        if (distSquared > 500) {
          audioEl.volume = 0;
        } else {
          // from lucasio here: https://discourse.threejs.org/t/positionalaudio-setmediastreamsource-with-webrtc-question-not-hearing-any-sound/14301/29
          let volume = Math.min(1, 10 / distSquared);
          audioEl.volume = volume;
        }
      }
    }
  }

  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Interaction 🤾‍♀️

  getPlayerPosition() {
    // TODO: use quaternion or are euler angles fine here?
    return [
      [
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z,
      ],
      [
        this.camera.quaternion._x,
        this.camera.quaternion._y,
        this.camera.quaternion._z,
        this.camera.quaternion._w,
      ],
    ];
  }

  setPlayerPositionToCenter() {
    if (this.isStudent) {
      this.disableMove=true
      this.camera.position.set(0, 0.5, 0)
      this.camera.quaternion.set(0,0, 0, 1)
    }
  }
  
  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  // Rendering 🎥

  update() {
    requestAnimationFrame(() => this.update());
    this.frameCount++;

    //updateEnvironment();

    if (this.frameCount % 25 === 0) {
      this.updateClientVolumes();
    }

    this.interpolatePositions();
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
    this.height = Math.floor(window.innerHeight * 0.9);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }
}

//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
// Utilities

function makeVideoMaterial(id) {
  let videoElement = document.getElementById(id + "_video");
  let videoTexture = new THREE.VideoTexture(videoElement);

  let videoMaterial = new THREE.MeshBasicMaterial({
    map: videoTexture,
    overdraw: true,
    side: THREE.DoubleSide,
  });
  return videoMaterial;
}

function makeLabelMaterial (username) {
  return new SpriteText(username || "Anonymous", 0.2);
}

function makeHandMaterial(){
  const handTexture = new THREE.TextureLoader().load("../assets/raise-hand.png");
  const myGeometry = new THREE.BoxGeometry( .40, .40, .40 );
  const handMaterial = new THREE.MeshBasicMaterial( { map: handTexture } );
  return  new THREE.Mesh(myGeometry, handMaterial);
}

function makeEmojiMaterial(file){
  const emojiTexture = new THREE.TextureLoader().load(`../assets/${file}`);
  const myGeometry = new THREE.BoxGeometry( .40, .40, .40 );
  const emojiMaterial = new THREE.MeshBasicMaterial( { map: emojiTexture } );
  return new THREE.Mesh(myGeometry, emojiMaterial)
}
