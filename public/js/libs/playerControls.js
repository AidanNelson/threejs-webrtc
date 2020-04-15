// https://github.com/PiusNyakoojo/PlayerControls
THREE.PlayerControls = function (camera, player, domElement) {

	this.camera = camera;
	this.player = player;
	this.domElement = (domElement !== undefined) ? domElement : document;

	// API

	this.enabled = true;

	this.center = new THREE.Vector3(player.position.x, player.position.y, player.position.z);

	this.moveSpeed = 0.2;
	this.turnSpeed = 0.08;

	this.userZoom = true;
	this.userZoomSpeed = 1.0;

	this.userRotate = true;
	this.userRotateSpeed = 1.5;

	this.autoRotate = true;
	this.autoRotateSpeed = 0.1;
	this.YAutoRotation = false;

	this.minPolarAngle = 0;
	this.maxPolarAngle = Math.PI;

	this.minDistance = 0;
	this.maxDistance = Infinity;

	// internals

	var scope = this;

	var EPS = 0.000001;
	var PIXELS_PER_ROUND = 1800;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var zoomStart = new THREE.Vector2();
	var zoomEnd = new THREE.Vector2();
	var zoomDelta = new THREE.Vector2();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;

	var lastPosition = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
	var playerIsMoving = false;

	var keyState = {};
	var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2 };
	var state = STATE.NONE;

	// events

	var changeEvent = { type: 'change' };

	this.rotateLeft = function (angle) {

		if (angle === undefined) {

			angle = getAutoRotationAngle();

		}

		thetaDelta -= angle;

	};

	this.rotateRight = function (angle) {

		if (angle === undefined) {

			angle = getAutoRotationAngle();

		}

		thetaDelta += angle;

	};

	this.rotateUp = function (angle) {

		if (angle === undefined) {

			angle = getAutoRotationAngle();

		}

		phiDelta -= angle;

	};

	this.rotateDown = function (angle) {

		if (angle === undefined) {

			angle = getAutoRotationAngle();

		}

		phiDelta += angle;

	};

	this.zoomIn = function (zoomScale) {

		if (zoomScale === undefined) {

			zoomScale = getZoomScale();

		}

		scale /= zoomScale;

	};

	this.zoomOut = function (zoomScale) {

		if (zoomScale === undefined) {

			zoomScale = getZoomScale();

		}

		scale *= zoomScale;

	};

	this.init = function () {

		this.camera.position.x = this.player.position.x + 2;
		this.camera.position.y = this.player.position.y + 2;
		this.camera.position.z = this.player.position.x + 2;

		this.camera.lookAt(this.player.position);

	};

	this.update = function () {

		this.checkKeyStates();

		this.center = this.player.position;

		var position = this.camera.position;
		var offset = position.clone().sub(this.center);

		// angle from z-axis around y-axis

		var theta = Math.atan2(offset.x, offset.z);

		// angle from y-axis

		var phi = Math.atan2(Math.sqrt(offset.x * offset.x + offset.z * offset.z), offset.y);

		theta += thetaDelta;
		phi += phiDelta;

		// restrict phi to be between desired limits
		phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, phi));

		// restrict phi to be between EPS and PI-EPS
		phi = Math.max(EPS, Math.min(Math.PI - EPS, phi));

		var radius = offset.length() * scale;

		radius = Math.max(this.minDistance, Math.min(this.maxDistance, radius));

		offset.x = radius * Math.sin(phi) * Math.sin(theta);
		offset.y = radius * Math.cos(phi);
		offset.z = radius * Math.sin(phi) * Math.cos(theta);

		if (this.autoRotate) {

			this.camera.position.x += this.autoRotateSpeed * ((this.player.position.x + 8 * Math.sin(this.player.rotation.y)) - this.camera.position.x);
			this.camera.position.z += this.autoRotateSpeed * ((this.player.position.z + 8 * Math.cos(this.player.rotation.y)) - this.camera.position.z);

		} else {

			position.copy(this.center).add(offset);

		}

		this.camera.lookAt(this.center);

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;



		if (state === STATE.NONE && playerIsMoving) {

			this.autoRotate = true;

		} else {

			this.autoRotate = false;

		}

		if (lastPosition.distanceTo(this.player.position) > 0) {


			lastPosition.copy(this.player.position);

		} else if (lastPosition.distanceTo(this.player.position) == 0) {

			playerIsMoving = false;

		}

	};

	this.checkKeyStates = function () {

		if (keyState[38] || keyState[87]) {

			// up arrow or 'w' - move forward

			this.player.position.x -= this.moveSpeed * Math.sin(this.player.rotation.y);
			this.player.position.z -= this.moveSpeed * Math.cos(this.player.rotation.y);

			this.camera.position.x -= this.moveSpeed * Math.sin(this.player.rotation.y);
			this.camera.position.z -= this.moveSpeed * Math.cos(this.player.rotation.y);

		}

		if (keyState[40] || keyState[83]) {

			// down arrow or 's' - move backward
			playerIsMoving = true;

			this.player.position.x += this.moveSpeed * Math.sin(this.player.rotation.y);
			this.player.position.z += this.moveSpeed * Math.cos(this.player.rotation.y);

			this.camera.position.x += this.moveSpeed * Math.sin(this.player.rotation.y);
			this.camera.position.z += this.moveSpeed * Math.cos(this.player.rotation.y);

		}

		if (keyState[37] || keyState[65]) {

			// left arrow or 'a' - rotate left
			playerIsMoving = true;

			this.player.rotation.y += this.turnSpeed;

		}

		if (keyState[39] || keyState[68]) {

			// right arrow or 'd' - rotate right
			playerIsMoving = true;

			this.player.rotation.y -= this.turnSpeed;

		}
		if (keyState[81]) {

			// 'q' - strafe left
			playerIsMoving = true;

			this.player.position.x -= this.moveSpeed * Math.cos(this.player.rotation.y);
			this.player.position.z += this.moveSpeed * Math.sin(this.player.rotation.y);

			this.camera.position.x -= this.moveSpeed * Math.cos(this.player.rotation.y);
			this.camera.position.z += this.moveSpeed * Math.sin(this.player.rotation.y);

		}

		if (keyState[69]) {

			// 'e' - strage right
			playerIsMoving = true;

			this.player.position.x += this.moveSpeed * Math.cos(this.player.rotation.y);
			this.player.position.z -= this.moveSpeed * Math.sin(this.player.rotation.y);

			this.camera.position.x += this.moveSpeed * Math.cos(this.player.rotation.y);
			this.camera.position.z -= this.moveSpeed * Math.sin(this.player.rotation.y);

		}

	};

	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

	}

	function getZoomScale() {

		return Math.pow(0.95, scope.userZoomSpeed);

	}

	function onMouseDown(event) {

		if (scope.enabled === false) return;
		if (scope.userRotate === false) return;

		event.preventDefault();

		if (event.button === 0) {

			state = STATE.ROTATE;

			rotateStart.set(event.clientX, event.clientY);

		} else if (event.button === 1) {

			state = STATE.ZOOM;

			zoomStart.set(event.clientX, event.clientY);

		}

		document.addEventListener('mousemove', onMouseMove, false);
		document.addEventListener('mouseup', onMouseUp, false);

	}

	function onMouseMove(event) {

		if (scope.enabled === false) return;

		event.preventDefault();

		if (state === STATE.ROTATE) {

			rotateEnd.set(event.clientX, event.clientY);
			rotateDelta.subVectors(rotateEnd, rotateStart);

			scope.rotateLeft(2 * Math.PI * rotateDelta.x / PIXELS_PER_ROUND * scope.userRotateSpeed);
			scope.rotateUp(2 * Math.PI * rotateDelta.y / PIXELS_PER_ROUND * scope.userRotateSpeed);

			rotateStart.copy(rotateEnd);

		} else if (state === STATE.ZOOM) {

			zoomEnd.set(event.clientX, event.clientY);
			zoomDelta.subVectors(zoomEnd, zoomStart);

			if (zoomDelta.y > 0) {

				scope.zoomIn();

			} else {

				scope.zoomOut();

			}

			zoomStart.copy(zoomEnd);
		}

	}

	function onMouseUp(event) {

		if (scope.enabled === false) return;
		if (scope.userRotate === false) return;

		document.removeEventListener('mousemove', onMouseMove, false);
		document.removeEventListener('mouseup', onMouseUp, false);

		state = STATE.NONE;

	}

	function onMouseWheel(event) {

		if (scope.enabled === false) return;
		if (scope.userRotate === false) return;

		var delta = 0;

		if (event.wheelDelta) { //WebKit / Opera / Explorer 9

			delta = event.wheelDelta;

		} else if (event.detail) { // Firefox

			delta = - event.detail;

		}

		if (delta > 0) {

			scope.zoomOut();

		} else {

			scope.zoomIn();

		}

	}

	function onKeyDown(event) {

		event = event || window.event;

		keyState[event.keyCode || event.which] = true;

	}

	function onKeyUp(event) {

		event = event || window.event;

		keyState[event.keyCode || event.which] = false;

	}

	this.domElement.addEventListener('contextmenu', function (event) { event.preventDefault(); }, false);
	this.domElement.addEventListener('mousedown', onMouseDown, false);
	this.domElement.addEventListener('mousewheel', onMouseWheel, false);
	this.domElement.addEventListener('DOMMouseScroll', onMouseWheel, false); // firefox
	this.domElement.addEventListener('keydown', onKeyDown, false);
	this.domElement.addEventListener('keyup', onKeyUp, false);

};

THREE.PlayerControls.prototype = Object.create(THREE.EventDispatcher.prototype);