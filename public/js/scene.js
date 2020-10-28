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
	constructor(
		domElement = document.getElementById('gl_context'),
		_width = window.innerWidth,
		_height = window.innerHeight,
		clearColor = 'lightblue',
		_movementCallback) {

		this.movementCallback = _movementCallback;

		//THREE scene
		this.scene = new THREE.Scene();
		this.keyState = {};

		//Utility
		this.width = _width;
		this.height = _height;

		//Add Player
		this.addSelf();

		// add lights
		this.addLights();

		//THREE Camera
		this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 5000);
		this.camera.position.set(0, 3, 6);
		this.scene.add(this.camera);

		// create an AudioListener and add it to the camera
		this.listener = new THREE.AudioListener();
		this.playerGroup.add(this.listener);

		//THREE WebGL renderer
		this.renderer = new THREE.WebGLRenderer({
			antialiasing: true
		});
		this.renderer.setClearColor(new THREE.Color(clearColor));
		this.renderer.setSize(this.width, this.height);

		// add controls:
		this.controls = new THREE.PlayerControls(this.camera, this.playerGroup);

		//Push the canvas to the DOM
		domElement.append(this.renderer.domElement);

		//Setup event listeners for events and handle the states
		window.addEventListener('resize', e => this.onWindowResize(e), false);
		window.addEventListener('keydown', e => this.onKeyDown(e), false);
		window.addEventListener('keyup', e => this.onKeyUp(e), false);

		// Helpers
		this.scene.add(new THREE.GridHelper(500, 500));
		this.scene.add(new THREE.AxesHelper(10));

		// Start the loop
		this.frameCount = 0;
		this.update();
	}


	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Lighting 💡

	addLights() {
		/ add some lights/
		this.scene.add(new THREE.AmbientLight(0xffffe6, 0.7));
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Clients 👫

	addSelf() {
		let _body = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshNormalMaterial()
		);

		createLocalVideoElement();

		let [videoTexture, videoMaterial] = makeVideoTextureAndMaterial("local");

		let _head = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			videoMaterial
		);

		// set position of head before adding to parent object
		_body.position.set(0, 0, 0);
		_head.position.set(0, 1, 0);

		// https://threejs.org/docs/index.html#api/en/objects/Group
		this.playerGroup = new THREE.Group();
		this.playerGroup.position.set(0, 0.5, 0);
		this.playerGroup.add(_body);
		this.playerGroup.add(_head);
		this.playerVideoTexture = videoTexture;

		// add group to scene
		this.scene.add(this.playerGroup);
	}

	// add a client meshes, a video element and  canvas for three.js video texture
	addClient(_id) {

		let _body = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshNormalMaterial()
		);


		createClientVideoElement(_id);

		let [videoTexture, videoMaterial] = makeVideoTextureAndMaterial(_id);

		let _head = new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			videoMaterial
		);

		// set position of head before adding to parent object
		_body.position.set(0, 0, 0);
		_head.position.set(0, 1, 0);

		// https://threejs.org/docs/index.html#api/en/objects/Group
		var group = new THREE.Group();
		group.add(_body);
		group.add(_head);

		// add group to scene
		this.scene.add(group);

		clients[_id].group = group;
		clients[_id].texture = videoTexture;
		clients[_id].desiredPosition = new THREE.Vector3();
		clients[_id].desiredRotation = new THREE.Quaternion();
		clients[_id].oldPos = group.position
		clients[_id].oldRot = group.quaternion;
		clients[_id].movementAlpha = 0;
	}

	removeClient(_id) {
		this.scene.remove(clients[_id].group);

		removeClientVideoElementAndCanvas(_id);
	}

	// overloaded function can deal with new info or not
	updateClientPositions(_clientProps) {

		for (let _id in _clientProps) {
			// we'll update ourselves separately to avoid lag...
			if (_id != id) {
				clients[_id].desiredPosition = new THREE.Vector3().fromArray(_clientProps[_id].position);
				clients[_id].desiredRotation = new THREE.Quaternion().fromArray(_clientProps[_id].rotation)
			}
		}
	}

	// snap to position and rotation if we get close
	updatePositions() {
		let snapDistance = 0.5;
		let snapAngle = 0.2; // radians
		for (let _id in clients) {

			clients[_id].group.position.lerp(clients[_id].desiredPosition, 0.2);
			clients[_id].group.quaternion.slerp(clients[_id].desiredRotation, 0.2);
			if (clients[_id].group.position.distanceTo(clients[_id].desiredPosition) < snapDistance) {
				clients[_id].group.position.set(clients[_id].desiredPosition.x, clients[_id].desiredPosition.y, clients[_id].desiredPosition.z);
			}
			if (clients[_id].group.quaternion.angleTo(clients[_id].desiredRotation) < snapAngle) {
				clients[_id].group.quaternion.set(clients[_id].desiredRotation.x, clients[_id].desiredRotation.y, clients[_id].desiredRotation.z, clients[_id].desiredRotation.w);
			}
		}
	}
	
	updateClientVolumes() {
		for (let _id in clients) {
			let audioEl = document.getElementById(_id+"_audio");
			if (audioEl) {
				let distSquared = this.camera.position.distanceToSquared(clients[_id].group.position);

				// console.log('Dist:',this.camera.position.distanceTo(clients[_id].group.position));
				// console.log('DistSquared:',distSquared);
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

	getPlayerPosition() {
		// TODO: use quaternion or are euler angles fine here?
		return [
			[this.playerGroup.position.x, this.playerGroup.position.y, this.playerGroup.position.z],
			[this.playerGroup.quaternion._x, this.playerGroup.quaternion._y, this.playerGroup.quaternion._z, this.playerGroup.quaternion._w]];
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Rendering 🎥

	update() {
		requestAnimationFrame(() => this.update());
		this.frameCount ++;

		// send movement stats to the socket server if any of the keys are pressed
		let sendStats = false;
		for (let i in this.keyState) {
			if (this.keyState[i]) {
				sendStats = true;
				break;
			}
		}
		if (sendStats) { this.movementCallback(); }

		if (this.frameCount % 20 === 0) {
			this.updateClientVolumes();
		}
		this.updatePositions();
		this.controls.update();
		this.render();
	}

	render() {
		// Update video canvases for each client
		this.updateVideoTextures();
		this.renderer.render(this.scene, this.camera);
	}

	updateVideoTextures() {
		// update ourselves first:
		let localVideo = document.getElementById("local_video");
		let localVideoCanvas = document.getElementById("local_canvas");
		this.redrawVideoCanvas(localVideo, localVideoCanvas, this.playerVideoTexture)


		for (let _id in clients) {
			let remoteVideo = document.getElementById(_id);
			let remoteVideoCanvas = document.getElementById(_id + "_canvas");
			this.redrawVideoCanvas(remoteVideo, remoteVideoCanvas, clients[_id].texture);
		}
	}

	// this function redraws on a 2D <canvas> from a <video> and indicates to three.js
	// that the _videoTex should be updated
	redrawVideoCanvas(_videoEl, _canvasEl, _videoTex) {
		let _canvasDrawingContext = _canvasEl.getContext('2d');

		// check that we have enough data on the video element to redraw the canvas
		if (_videoEl.readyState === _videoEl.HAVE_ENOUGH_DATA) {
			// if so, redraw the canvas from the video element
			_canvasDrawingContext.drawImage(_videoEl, 0, 0, _canvasEl.width, _canvasEl.height);
			// and indicate to three.js that the texture needs to be redrawn from the canvas
			_videoTex.needsUpdate = true;
		}
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Event Handlers 🍽

	onWindowResize(e) {
		this.width = window.innerWidth;
		this.height = Math.floor(window.innerHeight - (window.innerHeight * 0.3));
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
// Utilities 🚂

// created <video> element for local mediastream
function createLocalVideoElement() {
	const videoElement = document.createElement("video");
	videoElement.id = "local_video";
	videoElement.autoplay = true;
	videoElement.width = videoWidth;
	videoElement.height = videoHeight;
	videoElement.style = "visibility: hidden;";

	// there seems to be a weird behavior where a muted video 
	// won't autoplay in chrome...  so instead of muting the video, simply make a
	// video only stream for this video element :|
	let videoStream = new MediaStream([localMediaStream.getVideoTracks()[0]]);

	videoElement.srcObject = videoStream;
	document.body.appendChild(videoElement);
}

// created <video> element using client ID
function createClientVideoElement(_id) {
	console.log("Creating <video> element for client with id: " + _id);

	const videoElement = document.createElement("video");
	videoElement.id = _id;
	videoElement.width = videoWidth;
	videoElement.height = videoHeight;
	videoElement.autoplay = true;
	// videoElement.muted = true; // TODO Positional Audio
	videoElement.style = "visibility: hidden;";

	document.body.appendChild(videoElement);
}

// remove <video> element and corresponding <canvas> using client ID
function removeClientVideoElementAndCanvas(_id) {
	console.log("Removing <video> element for client with id: " + _id);

	let videoEl = document.getElementById(_id).remove();
	if (videoEl != null) { videoEl.remove(); }
	let canvasEl = document.getElementById(_id + "_canvas");
	if (canvasEl != null) { canvasEl.remove(); }
}

// Adapted from: https://github.com/zacharystenger/three-js-video-chat
function makeVideoTextureAndMaterial(_id) {
	// create a canvas and add it to the body
	let rvideoImageCanvas = document.createElement('canvas');
	document.body.appendChild(rvideoImageCanvas);

	rvideoImageCanvas.id = _id + "_canvas";
	rvideoImageCanvas.width = videoWidth;
	rvideoImageCanvas.height = videoHeight;
	rvideoImageCanvas.style = "visibility: hidden;";

	// get canvas drawing context
	let rvideoImageContext = rvideoImageCanvas.getContext('2d');

	// background color if no video present
	rvideoImageContext.fillStyle = '#000000';
	rvideoImageContext.fillRect(0, 0, rvideoImageCanvas.width, rvideoImageCanvas.height);

	// make texture
	let videoTexture = new THREE.Texture(rvideoImageCanvas);
	videoTexture.minFilter = THREE.LinearFilter;
	videoTexture.magFilter = THREE.LinearFilter;

	// make material from texture
	var movieMaterial = new THREE.MeshBasicMaterial({ map: videoTexture, overdraw: true, side: THREE.DoubleSide });

	return [videoTexture, movieMaterial];
}