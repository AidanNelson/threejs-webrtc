/*
 *
 * This file exports a class which sets up the Websocket and WebRTC communications for our peer.
 *
 */

export class Communications {
  constructor() {
    // socket.io
    this.socket;

    // array of connected peers
    this.peers = {};

    // Our local media stream (i.e. webcam and microphone stream)
    this.localMediaStream = null;

    this.initialize();

    this.userDefinedCallbacks = {
      peerJoined: [],
      peerLeft: [],
      positions: [],
      data: [],
    };
  }

  async initialize() {
    // first get user media
    this.localMediaStream = await this.getLocalMedia();

    // createLocalVideoElement();
    createPeerDOMElements("local");
    updatePeerDOMElements("local", this.localMediaStream);

    // then initialize socket connection
    this.initSocketConnection();
  }

  // add a callback for a given event
  on(event, callback) {
    console.log(`Setting ${event} callback.`);
    this.userDefinedCallbacks[event].push(callback);
  }

  sendPosition(position) {
    this.socket?.emit("move", position);
  }

  sendData(data) {
    this.socket?.emit("data", data);
  }

  callEventCallback(event, data) {
    this.userDefinedCallbacks[event].forEach((callback) => {
      callback(data);
    });
  }

  async getLocalMedia() {
    const videoWidth = 80;
    const videoHeight = 60;
    const videoFrameRate = 15;
    let mediaConstraints = {
      audio: true,
      video: {
        width: videoWidth,
        height: videoHeight,
        frameRate: videoFrameRate,
      },
    };

    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    } catch (err) {
      console.log("Failed to get user media!");
      console.warn(err);
    }

    return stream;
  }

  // temporarily pause the outgoing stream
  disableOutgoingStream() {
    this.localMediaStream.getTracks().forEach((track) => {
      track.enabled = false;
    });
  }
  // enable the outgoing stream
  enableOutgoingStream() {
    this.localMediaStream.getTracks().forEach((track) => {
      track.enabled = true;
    });
  }

  initSocketConnection() {
    console.log("Initializing socket.io...");
    this.socket = io();

    this.socket.on("connect", () => {
      console.log("My socket ID:", this.socket.id);
    });

    this.socket.on("data", (data) => {
      this.callEventCallback("data", data);
    });


    this.socket.on("introduction", (otherPeerIds) => {
      for (let i = 0; i < otherPeerIds.length; i++) {
        if (otherPeerIds[i] != this.socket.id) {
          let theirId = otherPeerIds[i];

          console.log("Adding peer with id " + theirId);
          this.peers[theirId] = {};

          let pc = this.createPeerConnection(theirId, true);
          this.peers[theirId].peerConnection = pc;

          createPeerDOMElements(theirId);
          this.callEventCallback("peerJoined", theirId);
        }
      }
    });

    // when a new user has entered the server
    this.socket.on("peerConnection", (theirId) => {
      if (theirId != this.socket.id && !(theirId in this.peers)) {
        this.peers[theirId] = {};
        createPeerDOMElements(theirId);
        this.callEventCallback("peerJoined", theirId);
      }
    });

    this.socket.on("peerDisconnection", (_id) => {
      if (_id != this.socket.id) {
        this.callEventCallback("peerLeft", _id);
        cleanupPeerDomElements(_id);
        delete this.peers[_id];
      }
    });

    this.socket.on("signal", (to, from, data) => {
      // console.log("Got a signal from the server: ", to, from, data);

      // to should be us
      if (to != this.socket.id) {
        console.log("Socket IDs don't match");
      }

      // Look for the right simplepeer in our array
      let peer = this.peers[from];
      if (peer.peerConnection) {
        peer.peerConnection.signal(data);
      } else {
        console.log("Never found right simplepeer object");
        // Let's create it then, we won't be the "initiator"
        // let theirSocketId = from;
        let peerConnection = this.createPeerConnection(from, false);

        this.peers[from].peerConnection = peerConnection;

        // Tell the new simplepeer that signal
        peerConnection.signal(data);
      }
    });

    // Update when one of the users moves in space
    this.socket.on("positions", (positions) => {
      this.callEventCallback("positions", positions);
    });
  }

  // this function sets up a peer connection and corresponding DOM elements for a specific peer
  createPeerConnection(theirSocketId, isInitiator = false) {
    console.log("Connecting to peer with ID", theirSocketId);
    console.log("initiating?", isInitiator);

    let peerConnection = new SimplePeer({ initiator: isInitiator });
    // simplepeer generates signals which need to be sent across socket
    peerConnection.on("signal", (data) => {
      // console.log('signal');
      this.socket.emit("signal", theirSocketId, this.socket.id, data);
    });

    // When we have a connection, send our stream
    peerConnection.on("connect", () => {
      // Let's give them our stream
      peerConnection.addStream(this.localMediaStream);
      console.log("Send our stream");
    });

    // Stream coming in to us
    peerConnection.on("stream", (stream) => {
      console.log("Incoming Stream");

      updatePeerDOMElements(theirSocketId, stream);
    });

    peerConnection.on("close", () => {
      console.log("Got close event");
      // Should probably remove from the array of peers
    });

    peerConnection.on("error", (err) => {
      console.log(err);
    });

    return peerConnection;
  }
}

// Utilities 🚂

function createPeerDOMElements(_id) {
  const videoElement = document.createElement("video");
  videoElement.id = _id + "_video";
  videoElement.autoplay = true;
  videoElement.muted = true;
  // videoElement.style = "visibility: hidden;";

  document.body.appendChild(videoElement);

  let audioEl = document.createElement("audio");
  audioEl.setAttribute("id", _id + "_audio");
  audioEl.controls = "controls";
  audioEl.volume = 0; // initialize at 0 volume.  This will be set by 3D scene.
  document.body.appendChild(audioEl);

  audioEl.addEventListener("loadeddata", () => {
    audioEl.play();
  });
}

function updatePeerDOMElements(_id, stream) {
  let videoStream = new MediaStream([stream.getVideoTracks()[0]]);
  let audioStream = new MediaStream([stream.getAudioTracks()[0]]);

  if (videoStream) {
    const videoElement = document.getElementById(_id + "_video");
    videoElement.srcObject = videoStream;
  }
  if (audioStream) {
    let audioEl = document.getElementById(_id + "_audio");
    audioEl.srcObject = audioStream;
  }
}

function cleanupPeerDomElements(_id) {
  let videoEl = document.getElementById(_id + "_video");
  if (videoEl != null) {
    videoEl.remove();
  }

  let audioEl = document.getElementById(_id + "audio");
  if (audioEl != null) {
    audioEl.remove();
  }
}
