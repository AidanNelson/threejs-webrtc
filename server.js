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

//////EXPRESS////////
const express = require('express');
const app = express();

////////HTTP/////////
const http = require('http').createServer(app);

//Port and server setup
const port = process.env.PORT || 1989;

//Server
const server = app.listen(port);
console.log('Server is running localhost on port: ' + port);

/////SOCKET.IO///////
const io = require('socket.io').listen(server);
app.use(express.static('public'));

// Network Traversal
// Could also use network traversal service here (Twilio, for example):
let iceServers = [{url:'stun:stun.l.google.com:19302'},
{url:'stun:stun1.l.google.com:19302'},
{url:'stun:stun2.l.google.com:19302'},
{url:'stun:stun3.l.google.com:19302'},
{url:'stun:stun4.l.google.com:19302'},];

let clients = {};

//Socket setup
io.on('connection', client => {

  console.log('User ' + client.id + ' connected, there are ' + io.engine.clientsCount + ' clients connected');

  //Add a new client indexed by his id
  clients[client.id] = {
    position: [0, 0.5, 0],
    rotation: [0, 0, 0, 1] // stored as XYZW values of Quaternion
  }

  //Make sure to send the client it's ID and a list of ICE servers for WebRTC network traversal 
  client.emit('introduction', client.id, io.engine.clientsCount, Object.keys(clients), iceServers);

  // also give the client all existing clients positions:
  client.emit('userPositions', clients);

  //Update everyone that the number of users has changed
  io.sockets.emit('newUserConnected', io.engine.clientsCount, client.id, Object.keys(clients));

  client.on('move', (data) => {
    if (clients[client.id]) {
      clients[client.id].position = data[0];
      clients[client.id].rotation = data[1];
    }
    io.sockets.emit('userPositions', clients);
  });

  //Handle the disconnection
  client.on('disconnect', () => {

    //Delete this client from the object
    delete clients[client.id];
    io.sockets.emit('userDisconnected', io.engine.clientsCount, client.id, Object.keys(clients));
    console.log('User ' + client.id + ' diconnected, there are ' + io.engine.clientsCount + ' clients connected');

  });

  // from simple chat app:
  // WEBRTC Communications
  client.on("call-user", (data) => {
    console.log('Server forwarding call from ' + client.id + " to " + data.to);
    client.to(data.to).emit("call-made", {
      offer: data.offer,
      socket: client.id
    });
  });

  client.on("make-answer", data => {
    client.to(data.to).emit("answer-made", {
      socket: client.id,
      answer: data.answer
    });
  });

  client.on("reject-call", data => {
    client.to(data.from).emit("call-rejected", {
      socket: client.id
    });
  });

  // ICE Setup
  client.on('addIceCandidate', data => {
    client.to(data.to).emit("iceCandidateFound", {
      socket: client.id,
      candidate: data.candidate
    });
  });
});