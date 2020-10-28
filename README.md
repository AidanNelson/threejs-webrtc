This [three.js](threejs.org) template allows multiplayer three.js scenes with integrated audio/video capabilities.  It uses a node server running socket.io to provide multiplayer functionality as well as WebRTC signaling. 

![image of multiplayer 3D scene](/docs/images/threejs-webrtc.gif)

## Quickstart:

1. Download the repository to your computer: 
    ```bash
    $ git clone https://github.com/AidanNelson/threejs-webrtc.git
    ```
2. Navigate into the local folder and install Node dependencies:
    ```bash
    $ cd threejs-webrtc
    $ npm install
    ```
3. Start the server:
    ```bash
    $ npm start
    ```
4. Navigate to `http://localhost:1989` on your browser.

## Technology:

This space is built using a number of technologies, including:

* [three.js](https://threejs.org/) provides rendering / 3D environment interaction
* [socket.io](https://socket.io/) provides the three.js multiplayer functionality, and acts as a WebRTC signaling server
* [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) provides video / audio chat functionality

## Credits:

This template uses code from a number of sources, including: 

* Or Fleisher - [THREE.Multiplayer](https://github.com/juniorxsound/THREE.Multiplayer) server and client setup using socket.io with three.js
* Mikołaj Wargowski - [Simple Chat App](https://github.com/Miczeq22/simple-chat-app) using [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) with three.js
* Zachary Stenger - [Three.js Video Chat](https://github.com/zacharystenger/three-js-video-chat) using [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
