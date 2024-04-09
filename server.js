/*
 *
 * This is the server which runs all Websocket and WebRTC communications for our application.
 *
 */

// Set up an express application to run the server
const express = require("express");
const app = express();

// tell our express application to serve the 'public' folder
app.use(express.static("public"));

// tell the server to listen on a given port
const port = process.env.PORT || 8080;
const server = app.listen(port);
console.log("Webserver is running on http://localhost:" + port);

// We will use the socket.io library to manage Websocket connections
const io = require("socket.io")().listen(server);

// We will use this object to store information about active peers
let peers = {};

function main() {
  setupSocketServer();

  // periodically update all peers with their positions
  setInterval(function () {
    io.sockets.emit("positions", peers);
  }, 100);
}

main();

function setupSocketServer() {
  // Set up each socket connection
  io.on("connection", (socket) => {
    console.log(
      "Peer joined with ID",
      socket.id,
      ". There are " + io.engine.clientsCount + " peer(s) connected."
    );

    // add a new peer indexed by their socket id
    peers[socket.id] = {
      position: [0, 0.5, 0],
      rotation: [0, 0, 0, 1], // stored as XYZW values of Quaternion
    };

    // send the new peer a list of all other peers
    socket.emit("introduction", Object.keys(peers));

    // also give the peer all existing peers positions:
    socket.emit("userPositions", peers);

    // tell everyone that a new user connected
    io.emit("peerConnection", socket.id);

    // whenever the peer moves, update their movements in the peers object
    socket.on("move", (data) => {
      if (peers[socket.id]) {
        peers[socket.id].position = data[0];
        peers[socket.id].rotation = data[1];
      }
    });

    // setup a generic ping-pong which can be used to share arbitrary info between peers
    socket.on("data", (data) => {
      io.sockets.emit("data", data);
    });

    // Relay simple-peer signals back and forth
    socket.on("signal", (to, from, data) => {
      if (to in peers) {
        io.to(to).emit("signal", to, from, data);
      } else {
        console.log("Peer not found!");
      }
    });

    // handle disconnections
    socket.on("disconnect", () => {
      delete peers[socket.id];
      io.sockets.emit("peerDisconnection", socket.id);
      console.log(
        "Peer " +
          socket.id +
          " diconnected, there are " +
          io.engine.clientsCount +
          " peer(s) connected."
      );
    });
  });
}
