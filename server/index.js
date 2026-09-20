/** @format */

/* Networked-Aframe relay for Above Par-adowski multiplayer.
   Based on networked-aframe's reference easyrtc-server. It relays entity
   updates and data messages between clients in a room - no game logic or
   physics lives here. It also serves the game itself from the repo root,
   so `npm start` gives you a complete local multiplayer setup at
   http://localhost:8090/?room=test
   Deployed (e.g. on Render), the game can instead live on GitHub Pages
   with `?server=https://your-relay.onrender.com` pointing here. */

const http = require("http");
const path = require("path");
const express = require("express");
const socketIo = require("socket.io");
const easyrtc = require("open-easyrtc");

process.title = "above-par-relay";

const port = process.env.PORT || 8090;

const app = express();

// Serve the game from the repo root so local dev is one process
app.use(express.static(path.resolve(__dirname, "..")));

const webServer = http.createServer(app);

// CORS open so a GitHub Pages-hosted client can reach this relay
const socketServer = socketIo(webServer, {
  "log level": 1,
  cors: { origin: "*", methods: ["GET", "POST"] },
});

easyrtc.setOption("appIceServers", [
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
]);
easyrtc.setOption("logLevel", "warning");
easyrtc.setOption("demosEnable", false);
easyrtc.setOption("roomDefaultEnable", false);

easyrtc.listen(app, socketServer, null, (err) => {
  if (err) {
    console.error("easyrtc failed to start:", err);
    process.exit(1);
  }
  console.log("easyrtc relay initiated");
});

webServer.listen(port, () => {
  console.log("Above Par-adowski relay listening on http://localhost:" + port);
});
