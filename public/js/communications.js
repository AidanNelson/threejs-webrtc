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

export class Communications {
  constructor() {
    // socket.io
    this.socket;

    // array of connected clients
    this.peers = {};

    // Our local media stream (i.e. webcam and microphone stream)
    this.localMediaStream = null;

    this.initialize();

    this.userDefinedCallbacks = { peerJoined: [], peerLeft: [], positions: [] };
  }

  async initialize() {
    // Constraints for our local audio/video stream
    // set video width / height / framerate here:


    // first get user media
    this.localMediaStream = await this.getLocalMedia();

    // createLocalVideoElement();
    createClientMediaElements("local");
    updateClientMediaElements("local", this.localMediaStream);

    // then initialize socket connection
    this.initSocketConnection();
  }

  // add a callback for a given event
  on(event, callback) {
    console.log(`Setting ${event} callback.`);
    this.userDefinedCallbacks[event].push(callback);
  }

  sendPosition(position){
    this.socket?.emit("move",position);
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

    //On connection server sends the client his ID and a list of all keys
    this.socket.on("introduction", (otherClientIds) => {
      // for each existing user, add them as a client and add tracks to their peer connection
      for (let i = 0; i < otherClientIds.length; i++) {
        if (otherClientIds[i] != this.socket.id) {
          let theirId = otherClientIds[i];

          console.log("Adding client with id " + theirId);
          this.peers[theirId] = {};

          let pc = this.createPeerConnection(theirId, true);
          this.peers[theirId].peerConnection = pc;

          createClientMediaElements(theirId);
          this.callEventCallback("peerJoined", theirId);
          // myScene.addClient(theirId);
        }
      }
    });

    // when a new user has entered the server
    this.socket.on("newUserConnected", (theirId) => {
      if (theirId != this.socket.id && !(theirId in this.peers)) {
        console.log("A new user connected with the ID: " + theirId);

        console.log("Adding client with id " + theirId);
        this.peers[theirId] = {};

        createClientMediaElements(theirId);
        this.callEventCallback("peerJoined", theirId);

        // myScene.addClient(theirId);
      }
    });

    this.socket.on("userDisconnected", (clientCount, _id, _ids) => {
      // Update the data from the server

      if (_id != this.socket.id) {
        console.log("A user disconnected with the id: " + _id);
        this.callEventCallback("peerLeft", _id);
        // myScene.removeClient(_id);
        cleanupClientMediaElements(_id);
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
    this.socket.on("positions", (_clientProps) => {
      this.callEventCallback("positions", _clientProps);
    });
  }

  // this function sets up a peer connection and corresponding DOM elements for a specific client
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

      updateClientMediaElements(theirSocketId, stream);
    });

    peerConnection.on("close", () => {
      console.log("Got close event");
      // Should probably remove from the array of simplethis.peers
    });

    peerConnection.on("error", (err) => {
      console.log(err);
    });

    return peerConnection;
  }
}

// Utilities 🚂

// created <video> element using client ID
function createClientMediaElements(_id) {
  console.log("Creating <html> media elements for client with ID: " + _id);

  const videoElement = document.createElement("video");
  videoElement.id = _id + "_video";
  videoElement.autoplay = true;
  videoElement.muted = true;
  // videoElement.style = "visibility: hidden;";

  document.body.appendChild(videoElement);

  // create audio element for client
  let audioEl = document.createElement("audio");
  audioEl.setAttribute("id", _id + "_audio");
  audioEl.controls = "controls";
  audioEl.volume = 0; // initialize at 0 volume.  This will be set by 3D scene.
  document.body.appendChild(audioEl);

  audioEl.addEventListener("loadeddata", () => {
    audioEl.play();
  });
}

function updateClientMediaElements(_id, stream) {
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

// remove <video> element and corresponding <canvas> using client ID
function cleanupClientMediaElements(_id) {
  console.log("Removing <video> element for client with id: " + _id);

  let videoEl = document.getElementById(_id + "_video");
  if (videoEl != null) {
    videoEl.remove();
  }
}
