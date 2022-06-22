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

// socket.io
let mySocket;

// array of connected clients
let peers = {};

// Variable to store our three.js scene:
let myScene;
let drawBoard;

const reactions = {
  THUMBS_UP:{
    reactionFile: 'thumbs-up.svg'
  },
  LAUGH:{
    reactionFile: ''
  },
  TICK:{
    reactionFile: ''
  },
  CROSS:{
    reactionFile: ''
  },
  HEART:{
    reactionFile: ''
  },
  CLAP:{
    reactionFile: ''
  }
}

// set video width / height / framerate here:
const videoWidth = 80;
const videoHeight = 60;
const videoFrameRate = 15;

// Our local media stream (i.e. webcam and microphone stream)
let localMediaStream = null;

// Constraints for our local audio/video stream
let mediaConstraints = {
  audio: true,
  video: {
    width: videoWidth,
    height: videoHeight,
    frameRate: videoFrameRate,
  },
};
let userForm, userFormArea, canvasContainer, userName, startButton

////////////////////////////////////////////////////////////////////////////////
// Start-Up Sequence:
////////////////////////////////////////////////////////////////////////////////

window.onload = () => {
  console.log("Initializing socket.io...");
  mySocket = io();

  mySocket.on("connect", () => {
    console.log("My socket ID:", mySocket.id);
  });

   userForm = document.getElementById("userForm");
   userFormArea = document.getElementById("userFormArea");
   canvasContainer = document.getElementById("canvas-container");
   userName = document.getElementById("username");
   startAsStudent = document.getElementById("student");
   startAsTutor = document.getElementById("tutor");

   startAsStudent.onclick = (e)=> {
    e.preventDefault()
    handleForm(userName.value, true)
    }
   startAsTutor.onclick = (e)=> {
     e.preventDefault()
     handleForm(userName.value, false)
    }
};

const handleForm = (userName, isStudent)=>{
    mySocket.emit('addUsername',
        {userName, isStudent}
    , async (existingPeers)=> {

        userForm.style.display = "none";
        // first get user media
        localMediaStream = await getMedia(mediaConstraints);

        createLocalVideoElement();

        createControlElements(isStudent)

        // then initialize socket connection
        initSocketConnection();

        drawBoard = new DrawingBoard('drawingCanvas');

        // create the threejs scene
        console.log("Creating three.js scene...");
        myScene = new Scene(isStudent);

        processExistingPeers(existingPeers)

        // start sending position data to the server
        setInterval(function () {
          mySocket.emit("move", myScene.getPlayerPosition());
        }, 200);

    });

};

////////////////////////////////////////////////////////////////////////////////
// Local media stream setup
////////////////////////////////////////////////////////////////////////////////

// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
async function getMedia(_mediaConstraints) {
  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia(_mediaConstraints);
  } catch (err) {
    console.log("Failed to get user media!");
    console.warn(err);
  }

  return stream;
}

function processNewPeer(obj){
  const theirId = obj.socketId
  const username = obj.username
  if (theirId != mySocket.id && !(theirId in peers)) {
    console.log("A new user connected with the ID: " + theirId);

    console.log("Adding client with id " + theirId);
    peers[theirId] = {};

    createClientMediaElements(theirId);

    peers = myScene.addClient(theirId, username, peers);
    myScene.updateWhiteboardVideos(peers);
  }
}

function processExistingPeers(newPeers){
  let idsArray = Object.keys(newPeers)
  let newPeersArray = Object.values(newPeers)
  // for each existing user, add them as a client and add tracks to their peer connection
  for (let i = 0; i < idsArray.length; i++) {

    if (idsArray[i] != mySocket.id) {
      let theirId = idsArray[i];
      let theirPeer = newPeersArray[i]

      console.log("Adding client with id: ", theirId, " and peer: ", theirPeer);
      peers[theirId] = theirPeer;

      let pc = createPeerConnection(theirId, true);
      peers[theirId].peerConnection = pc;

      createClientMediaElements(theirId);

      peers = myScene.addClient(theirId, theirPeer.username, peers);
    }
  }
  myScene.updateWhiteboardVideos(peers);
}

////////////////////////////////////////////////////////////////////////////////
// Socket.io
////////////////////////////////////////////////////////////////////////////////
function initSocketConnection() {
  onNewUser()
  onUserDisconnected()
  onSignal()
  onPositions()
  onPeerDrawPath()
  onHandRaised()
  spreadReaction()
  onFocused()
}

function emitReaction(id, reaction){
  console.log('click 2', reaction)
  mySocket.emit('receiveReaction', {id, reaction})
}

function spreadReaction(){
  
  mySocket.on("spreadReaction", (obj) => {
    console.log('client received  reaction', obj)
      myScene.handleReaction(obj)
  });
}

function onNewUser (){
  mySocket.on("newUser", (obj)=>{
    processNewPeer(obj)
  })
}

function onHandRaised(){
  mySocket.on("onHandRaised", (id) => {
    myScene.raiseHand(id);
  });
}

function onRaiseHand(){
  mySocket.emit('onRaiseHand', mySocket.id)
}

function onFocus(){
  mySocket.emit('focusMode');
}

function onFocused(){
  // Update when one of the users moves in space
  mySocket.on("focused", () => {
    myScene.setPlayerPositionToCenter()
  });
}

function onUserDisconnected(){
  mySocket.on("userDisconnected", (clientCount, _id, _ids) => {
    // Update the data from the server
    if (_id != mySocket.id) {
      console.log("A user disconnected with the id: " + _id);
      myScene.removeClient(_id);
      removeClientVideoElementAndCanvas(_id);
      delete peers[_id];
    }
    myScene.updateWhiteboardVideos(peers);
  });
}

function onSignal(){
  mySocket.on("signal", (to, from, data) => {
    // console.log("Got a signal from the server: ", to, from, data);

    // to should be us
    if (to != mySocket.id) {
      console.log("Socket IDs don't match");
    }

    // Look for the right simplepeer in our array
    let peer = peers[from];
    if (peer.peerConnection) {
      peer.peerConnection.signal(data);
    } else {
      console.log("Never found right simplepeer object");
      // Let's create it then, we won't be the "initiator"
      // let theirSocketId = from;
      let peerConnection = createPeerConnection(from, false);

      peers[from].peerConnection = peerConnection;

      // Tell the new simplepeer that signal
      peerConnection.signal(data);
    }
  });
}

function onPositions(){
  // Update when one of the users moves in space
  mySocket.on("positions", (_clientProps) => {
    myScene.updateClientPositions(_clientProps);
  });
}

function onPeerDrawPath(){
  // Update when one of the users moves in space
  mySocket.on("peerDrawPath", (path) => {
    drawBoard.updateCanvas(path);
  });
}

////////////////////////////////////////////////////////////////////////////////
// Clients / WebRTC
////////////////////////////////////////////////////////////////////////////////

// this function sets up a peer connection and corresponding DOM elements for a specific client
function createPeerConnection(theirSocketId, isInitiator = false) {
  console.log('Connecting to peer with ID', theirSocketId);
  console.log('initiating?', isInitiator);

  let peerConnection = new SimplePeer({ initiator: isInitiator })
  // simplepeer generates signals which need to be sent across socket
  peerConnection.on("signal", (data) => {
    // console.log('signal');
    mySocket.emit("signal", theirSocketId, mySocket.id, data);
  });

  // When we have a connection, send our stream
  peerConnection.on("connect", () => {
    // Let's give them our stream
    peerConnection.addStream(localMediaStream);
    console.log("Send our stream");
  });

  // Stream coming in to us
  peerConnection.on("stream", (stream) => {
    console.log("Incoming Stream");

    updateClientMediaElements(theirSocketId, stream);
  });

  peerConnection.on("close", () => {
    console.log("Got close event");
    // Should probably remove from the array of simplepeers
  });

  peerConnection.on("error", (err) => {
    console.log(err);
  });

  return peerConnection;
}

// temporarily pause the outgoing stream
function disableOutgoingStream() {
  localMediaStream.getTracks().forEach((track) => {
    track.enabled = false;
  });
}
// enable the outgoing stream
function enableOutgoingStream() {
  localMediaStream.getTracks().forEach((track) => {
    track.enabled = true;
  });
}

////////////////////////////////////////////////////////////////////////////////
// Three.js
////////////////////////////////////////////////////////////////////////////////

function onPlayerMove() {
  // console.log('Sending movement update to server.');

}

//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
// Utilities 🚂

function createControlElements(isStudent){
  document.getElementById('controlsBox').classList.remove('hidden')
  document.getElementById('controlsBox').classList.add('shown-f')
  document.getElementById('emojisPanel').classList.remove('hidden')
  document.getElementById('emojisPanel').classList.add('active')

  const reactIcon = document.getElementById('reactIcon')
  const focusModeIcon = document.getElementById('focusModeIcon')
  const drawBoardIcon = document.getElementById('drawBoardIcon');
  const emojisPanel = document.getElementById('emojisPanel');
  const smileEmojiIcon = document.getElementById('smileEmojiIcon');
  const raiseHandIcon = document.getElementById('raiseHandIcon')

  reactIcon.addEventListener('click', ()=>{
    if (emojisPanel.classList.contains('active')) {
      emojisPanel.classList.remove("active");
      emojisPanel.classList.add("disable");
      emojisPanel.classList.add("hidden");
    } else {
      emojisPanel.classList.remove("disable");
      emojisPanel.classList.add("active");
      emojisPanel.classList.remove("hidden");
      smileEmojiIcon.addEventListener('click', ()=>{
        emitReaction(mySocket.id, reactions.THUMBS_UP)
      })
    }
  })
  raiseHandIcon.addEventListener('click', ()=>{
    onRaiseHand()
  })

  smileEmojiIcon.addEventListener('click', ()=>{
   // onReaction()
  })

  focusModeIcon.addEventListener('click', ()=>{
    onFocus()
  })

  drawBoardIcon.addEventListener('click', () => {
    const drawBoard = document.getElementById('screen');
    if (drawBoard.getAttribute('class') === 'showDrawBoard') {
      console.log("hiding draw board");
      drawBoard.removeAttribute('class');
      drawBoardIcon.setAttribute('src', '../assets/showDrawBoard.svg');
      drawBoardIcon.setAttribute('alt', 'Show Drawing Board');
    } else {
      console.log("showing draw board");
      drawBoardIcon.setAttribute('src', '../assets/hideDrawBoard.svg');
      drawBoardIcon.setAttribute('alt', 'Hide Drawing Board');
      drawBoard.setAttribute('class', 'showDrawBoard');
    }
  })

  if (!isStudent){
    raiseHandIcon.classList.add('hidden');
    focusModeIcon.classList.add('shown');
  }else{
    focusModeIcon.classList.add('hidden');
    raiseHandIcon.classList.add('shown');
  }
}

// created <video> element for local mediastream
function createLocalVideoElement() {
  const videoElement = document.createElement("video");
  videoElement.id = "local_video";
  videoElement.autoplay = true;
  videoElement.width = videoWidth;
  videoElement.height = videoHeight;
  // videoElement.style = "visibility: hidden;";

  if (localMediaStream) {
    let videoStream = new MediaStream([localMediaStream.getVideoTracks()[0]]);

    videoElement.srcObject = videoStream;
  }
  document.body.appendChild(videoElement);
}

// created <video> element using client ID
function createClientMediaElements(_id) {
  console.log("Creating <html> media elements for client with ID: " + _id);

  const videoElement = document.createElement("video");
  videoElement.id = _id + "_video";
  videoElement.autoplay = true;
  // videoElement.style = "visibility: hidden;";

  document.body.appendChild(videoElement);

  // create audio element for client
  let audioEl = document.createElement("audio");
  audioEl.setAttribute("id", _id + "_audio");
  audioEl.controls = "controls";
  audioEl.volume = 1;
  document.body.appendChild(audioEl);

  audioEl.addEventListener("loadeddata", () => {
    audioEl.play();
  });
}

function updateClientMediaElements(_id, stream) {

  let videoStream = new MediaStream([stream.getVideoTracks()[0]]);
  let audioStream = new MediaStream([stream.getAudioTracks()[0]]);

  const videoElement = document.getElementById(_id + "_video");
  videoElement.srcObject = videoStream;

  let audioEl = document.getElementById(_id + "_audio");
  audioEl.srcObject = audioStream;
}

// remove <video> element and corresponding <canvas> using client ID
function removeClientVideoElementAndCanvas(_id) {
  console.log("Removing <video> element for client with id: " + _id);

  let videoEl = document.getElementById(_id + "_video");
  if (videoEl != null) {
    videoEl.remove();
  }
}
