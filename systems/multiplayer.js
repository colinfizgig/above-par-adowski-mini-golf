/** @format */

/* global AFRAME, THREE, NAF */

/* Multiplayer via networked-aframe: parallel-play golf. Each client runs its
   own complete game (ball, physics, scoring) exactly as in single player;
   the network only shares presence - every player's head, club and ball are
   mirrored to the room as visual replicas with no physics, plus score
   events for a shared leaderboard.

   Activated by URL params, otherwise completely inert:
     ?room=<name>            join (or create) a room
     &name=<player name>     shown on your name tag and the scoreboard
     &server=<origin>        relay server (defaults to the page's own origin,
                             which works when the game is served by server/) */

(function () {
  const params = new URLSearchParams(document.location.search);
  const room = params.get("room");
  const playerName = (params.get("name") || "golfer").slice(0, 16);

  // Mirrors a source element's world transform onto this (scene-root)
  // proxy entity, which is what NAF actually syncs. The ball element gets
  // destroyed and recreated by the game, so the proxy re-queries each tick
  // and parks underground while its source is missing.
  AFRAME.registerComponent("mp-follow", {
    schema: { selector: { type: "string" } },
    tick: function () {
      const src = document.querySelector(this.data.selector);
      if (!src || !src.object3D) {
        this.el.object3D.position.set(0, -100, 0);
        return;
      }
      src.object3D.getWorldPosition(this.el.object3D.position);
      src.object3D.getWorldQuaternion(this.el.object3D.quaternion);
      this.el.object3D.matrixNeedsUpdate = true;
    },
  });

  // Synced across the room via the avatar template's schema; on remote
  // replicas it writes the player's name onto the name tag
  AFRAME.registerComponent("player-info", {
    schema: { name: { default: "golfer" } },
    update: function () {
      const tag = this.el.querySelector(".nametag");
      if (tag) tag.setAttribute("troika-text", "value", this.data.name);
    },
  });

  const faceCamTarget = new THREE.Vector3();
  AFRAME.registerComponent("face-camera", {
    tick: function () {
      const cam = this.el.sceneEl.camera;
      if (!cam) return;
      cam.getWorldPosition(faceCamTarget);
      this.el.object3D.lookAt(faceCamTarget);
    },
  });

  if (!room) return; // single player: nothing below runs

  document.addEventListener("DOMContentLoaded", () => {
    const scene = document.querySelector("a-scene");
    const server =
      params.get("server") ||
      document.location.protocol + "//" + document.location.host;

    // Sync the player's name along with the avatar's transform
    NAF.schemas.add({
      template: "#mp-avatar-template",
      components: ["position", "rotation", "player-info"],
    });

    scene.setAttribute(
      "networked-scene",
      `app:aboveparadowski;room:${room};adapter:wseasyrtc;` +
        `serverURL:${server};audio:false;debug:false;connectOnLoad:true;`
    );

    const spawnProxy = (template, selector, withName) => {
      const proxy = document.createElement("a-entity");
      proxy.setAttribute(
        "networked",
        `template:${template};attachTemplateToLocal:false;`
      );
      proxy.setAttribute("mp-follow", `selector:${selector};`);
      if (withName) proxy.setAttribute("player-info", `name:${playerName};`);
      scene.appendChild(proxy);
      return proxy;
    };

    // NAF dispatches its lifecycle events on document.body
    document.body.addEventListener("connected", () => {
      console.log(`[multiplayer] connected to room "${room}" as ${playerName}`);
      spawnProxy("#mp-avatar-template", "#head", true);
      spawnProxy("#mp-club-template", "#club-wrapper");
      spawnProxy("#mp-ball-template", "#ball");
      startScoreboard(scene);
    });

    document.body.addEventListener("connectError", (e) => {
      console.warn("[multiplayer] could not reach the relay server", e);
      const hint = document.querySelector("#desktop-hint");
      if (hint) {
        hint.textContent =
          "Multiplayer server unreachable - playing solo this round";
        hint.classList.remove("hide");
      }
    });
  });

  function startScoreboard(scene) {
    const board = document.querySelector("#mp-scoreboard");
    const scores = {}; // clientId (or "me") -> {name, hole, strokes, total}

    const render = () => {
      if (!board) return;
      board.classList.remove("hide");
      const rows = Object.values(scores)
        .sort((a, b) => a.total - b.total)
        .map(
          (s) =>
            `<div class="mp-row">${s.name} &middot; ` +
            `HOLE ${s.hole} &middot; +${s.strokes} &middot; ` +
            `TOTAL ${s.total}</div>`
        );
      board.innerHTML = rows.join("");
    };

    NAF.connection.subscribeToDataChannel(
      "mp-score",
      (senderId, type, data) => {
        scores[senderId] = data;
        render();
      }
    );

    document.body.addEventListener("clientDisconnected", (e) => {
      delete scores[e.detail.clientId];
      render();
    });

    // Broadcast our score every couple of seconds; it doubles as the way
    // late joiners learn about us
    setInterval(() => {
      const putt = scene.components["putt"];
      if (!putt) return;
      const total = putt.scores.reduce((a, b) => parseInt(a) + parseInt(b));
      const mine = {
        name: playerName,
        hole: putt.activeHoleIndex + 1,
        strokes: putt.activeHoleScore,
        total: total,
      };
      scores["me"] = mine;
      if (NAF.connection.isConnected()) {
        NAF.connection.broadcastDataGuaranteed("mp-score", mine);
      }
      render();
    }, 2000);
  }
})();
