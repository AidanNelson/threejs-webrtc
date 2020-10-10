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

// this is how we will store client locations:
let clientLocations = new Map();
// {
//   id: "myCoolRoomId"
// }


//https://cmsdk.com/javascript/nodejs-socket-io-get-all-clients-on-room.html
function getClientsInRoom(socketId, room) {
  // get array of socket ids in this room
  var socketIds = io.sockets.adapter.rooms[room];
  var clientsInRoom = {};
  if (socketIds && socketIds.length > 0) {
      //socketsCount = socketIds.lenght;
      // push every client to the result array
      for (var i = 0, len = socketIds.length; i < len; i++) {
          // check if the socket is not the requesting
          // socket
          let id = Object.keys(socketIds.sockets)[i];
          if (id != socketId) {
              clientsInRoom[id] = clients[id];
          }
      }
  }
  return clientsInRoom;
}

//Socket setup
io.on('connection', client => {

  console.log('User ' + client.id + ' connected, there are ' + io.engine.clientsCount + ' clients connected');


  client.on('join-room', (data) => {
    let roomId = data.roomId;
    client.join(roomId);
    clientLocations.set(client.id, roomId);
    console.log(`Adding client to room ${roomId}`);

    var clientsInRoom = getClientsInRoom(client.id, roomId);

    
    //Add a new client indexed by his id
    clients[client.id] = {
      position: [0, 0.5, 0],
      rotation: [0, 0, 0, 1] // stored as XYZW values of Quaternion
    }
        


    //Make sure to send the client it's ID and a list of ICE servers for WebRTC network traversal 
    client.emit('introduction', client.id, io.engine.clientsCount, Object.keys(clientsInRoom), iceServers);

    // also give the client all existing clients positions:
    client.emit('userPositions', clientsInRoom);

    //Update everyone that the number of users has changed
    io.to(roomId).emit('newUserConnected', io.engine.clientsCount, client.id, Object.keys(clientsInRoom));
    })

  client.on('move', (data) => {
    if (clients[client.id]) {
      clients[client.id].position = data[0];
      clients[client.id].rotation = data[1];
    }
    let clientLocation = clientLocations.get(client.id);
    var clientsInRoom = getClientsInRoom(client.id, clientLocation);

    io.to(clientLocation).emit('userPositions', clientsInRoom);
  });

  //Handle the disconnection
  client.on('disconnect', () => {



    //Delete this client from the object
    delete clients[client.id];
    let clientLocation = clientLocations.get(client.id);
    var clientsInRoom = getClientsInRoom(client.id, clientLocation);
    io.to(clientLocation).emit('userDisconnected', io.engine.clientsCount, client.id, Object.keys(clientsInRoom));
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