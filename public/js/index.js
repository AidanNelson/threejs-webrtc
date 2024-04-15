/*
 *
 * This file sets up our web app with 3D scene and communications.
 *
 */

import * as THREE from "three";
import { Communications } from "./communications.js";
import { FirstPersonControls } from "./libs/firstPersonControls.js";

// lerp value to be used when interpolating positions and rotations
let lerpValue = 0;

let camera, renderer, scene;
let controls;
let listener;
let communications;

let frameCount = 0;
let peers = {};

function init() {
  scene = new THREE.Scene();

  communications = new Communications();

  communications.on("peerJoined", (id) => {
    addPeer(id);
  });
  communications.on("peerLeft", (id) => {
    removePeer(id);
  });
  communications.on("positions", (positions) => {
    updatePeerPositions(positions);
  });

  // it may take a few seconds for this communications class to be initialized
  setTimeout(() => {
    communications.sendData("hello");
  }, 2000);
  communications.on("data", (msg) => {
    console.log("Received message:", msg);
    if (msg.type == "box") {
      onNewBox(msg);
    }
  });

  let width = window.innerWidth;
  let height = window.innerHeight * 0.9;

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 5000);
  camera.position.set(0, 3, 6);
  scene.add(camera);

  // create an AudioListener and add it to the camera
  listener = new THREE.AudioListener();
  camera.add(listener);

  //THREE WebGL renderer
  renderer = new THREE.WebGLRenderer({
    antialiasing: true,
  });
  renderer.setClearColor(new THREE.Color("lightblue"));
  renderer.setSize(width, height);

  // add controls:
  controls = new FirstPersonControls(scene, camera, renderer);

  // add controls for adding boxes on a key press
  window.addEventListener("keyup", (ev) => {
    if (ev.key === "b") {
      addBox();
    }
  });

  //Push the canvas to the DOM
  let domElement = document.getElementById("canvas-container");
  domElement.append(renderer.domElement);

  //Setup event listeners for events and handle the states
  window.addEventListener("resize", (e) => onWindowResize(e), false);

  // Helpers
  scene.add(new THREE.GridHelper(500, 500));
  scene.add(new THREE.AxesHelper(10));

  addLights();

  // Start the loop
  update();
}

init();

//////////////////////////////////////////////////////////////////////
// Lighting 💡
//////////////////////////////////////////////////////////////////////

function addLights() {
  scene.add(new THREE.AmbientLight(0xffffe6, 0.7));
}

//////////////////////////////////////////////////////////////////////
// Clients 👫
//////////////////////////////////////////////////////////////////////

// add a client meshes, a video element and  canvas for three.js video texture
function addPeer(id) {
  let videoElement = document.getElementById(id + "_video");
  let videoTexture = new THREE.VideoTexture(videoElement);

  let videoMaterial = new THREE.MeshBasicMaterial({
    map: videoTexture,
    overdraw: true,
    side: THREE.DoubleSide,
  });
  let otherMat = new THREE.MeshNormalMaterial();

  let head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [
    otherMat,
    otherMat,
    otherMat,
    otherMat,
    otherMat,
    videoMaterial,
  ]);

  // set position of head before adding to parent object
  head.position.set(0, 0, 0);

  // https://threejs.org/docs/index.html#api/en/objects/Group
  var group = new THREE.Group();
  group.add(head);

  // add group to scene
  scene.add(group);

  peers[id] = {};
  peers[id].group = group;

  peers[id].previousPosition = new THREE.Vector3();
  peers[id].previousRotation = new THREE.Quaternion();
  peers[id].desiredPosition = new THREE.Vector3();
  peers[id].desiredRotation = new THREE.Quaternion();
}

function removePeer(id) {
  scene.remove(peers[id].group);
}

// overloaded function can deal with new info or not
function updatePeerPositions(positions) {
  lerpValue = 0;
  for (let id in positions) {
    if (!peers[id]) continue;
    peers[id].previousPosition.copy(peers[id].group.position);
    peers[id].previousRotation.copy(peers[id].group.quaternion);
    peers[id].desiredPosition = new THREE.Vector3().fromArray(
      positions[id].position
    );
    peers[id].desiredRotation = new THREE.Quaternion().fromArray(
      positions[id].rotation
    );
  }
}

function interpolatePositions() {
  lerpValue += 0.1; // updates are sent roughly every 1/5 second == 10 frames
  for (let id in peers) {
    if (peers[id].group) {
      peers[id].group.position.lerpVectors(
        peers[id].previousPosition,
        peers[id].desiredPosition,
        lerpValue
      );
      peers[id].group.quaternion.slerpQuaternions(
        peers[id].previousRotation,
        peers[id].desiredRotation,
        lerpValue
      );
    }
  }
}

function updatePeerVolumes() {
  for (let id in peers) {
    let audioEl = document.getElementById(id + "_audio");
    if (audioEl && peers[id].group) {
      let distSquared = camera.position.distanceToSquared(
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
// Interaction 🤾‍♀️
//////////////////////////////////////////////////////////////////////

function getPlayerPosition() {
  return [
    [camera.position.x, camera.position.y, camera.position.z],
    [
      camera.quaternion._x,
      camera.quaternion._y,
      camera.quaternion._z,
      camera.quaternion._w,
    ],
  ];
}

//////////////////////////////////////////////////////////////////////
// Rendering 🎥
//////////////////////////////////////////////////////////////////////

function update() {
  requestAnimationFrame(() => update());
  frameCount++;

  if (frameCount % 25 === 0) {
    updatePeerVolumes();
  }

  if (frameCount % 10 === 0) {
    let position = getPlayerPosition();
    communications.sendPosition(position);
  }

  interpolatePositions();

  controls.update();

  renderer.render(scene, camera);
}

//////////////////////////////////////////////////////////////////////
// Event Handlers 🍽
//////////////////////////////////////////////////////////////////////

function onWindowResize(e) {
  let width = window.innerWidth;
  let height = Math.floor(window.innerHeight * 0.9);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function addBox() {
  let msg = {
    type: "box",
    data: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    },
  };
  communications.sendData(msg);
}

function onNewBox(msg) {
  let geo = new THREE.BoxGeometry(1, 1, 1);
  let mat = new THREE.MeshBasicMaterial();
  let mesh = new THREE.Mesh(geo, mat);

  let pos = msg.data;
  mesh.position.set(pos.x, pos.y, pos.z);

  scene.add(mesh);
}
