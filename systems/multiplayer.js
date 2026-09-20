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

  // Each player gets a color shared by their head, ball, name tag and
  // scoreboard row. ?color=%23ff00aa overrides; otherwise picked from the
  // palette by a hash of the connection id.
  const PALETTE = [
    "#f0693f", // orange
    "#3b82f6", // blue
    "#22c55e", // green
    "#eab308", // yellow
    "#a855f7", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#ef4444", // red
  ];
  const colorParam = params.get("color");
  const customColor =
    colorParam && /^#[0-9a-fA-F]{6}$/.test(colorParam) ? colorParam : null;
  let playerColor = customColor || PALETTE[0];

  const pickColor = (clientId) => {
    if (customColor) return customColor;
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
      hash = (hash * 31 + clientId.charCodeAt(i)) >>> 0;
    }
    return PALETTE[hash % PALETTE.length];
  };

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

  // Synced across the room via the template schemas; on remote replicas it
  // writes the player's name onto the name tag and tints the meshes marked
  // .mp-tint (head, ball) with the player's color. Template children can
  // attach a beat after the component data arrives, so tinting retries.
  AFRAME.registerComponent("player-info", {
    schema: { name: { default: "golfer" }, color: { default: "#f0693f" } },
    update: function () {
      this.apply(0);
    },
    apply: function (attempt) {
      const tag = this.el.querySelector(".nametag");
      if (tag) {
        tag.setAttribute("troika-text", "value", this.data.name);
        tag.setAttribute("troika-text", "color", this.data.color);
      }
      const tintables = this.el.querySelectorAll(".mp-tint");
      tintables.forEach((child) =>
        child.setAttribute("material", "color", this.data.color)
      );
      if (!tintables.length && attempt < 10) {
        setTimeout(() => this.apply(attempt + 1), 300);
      }
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

    // Sync name + color along with the transforms
    NAF.schemas.add({
      template: "#mp-avatar-template",
      components: ["position", "rotation", "player-info"],
    });
    NAF.schemas.add({
      template: "#mp-ball-template",
      components: ["position", "rotation", "player-info"],
    });

    scene.setAttribute(
      "networked-scene",
      `app:aboveparadowski;room:${room};adapter:wseasyrtc;` +
        `serverURL:${server};audio:false;debug:false;connectOnLoad:true;`
    );

    const spawnProxy = (template, selector) => {
      const proxy = document.createElement("a-entity");
      proxy.setAttribute(
        "networked",
        `template:${template};attachTemplateToLocal:false;`
      );
      proxy.setAttribute("mp-follow", `selector:${selector};`);
      proxy.setAttribute(
        "player-info",
        `name:${playerName};color:${playerColor};`
      );
      scene.appendChild(proxy);
      return proxy;
    };

    // Your own ball gets your color too, so you can spot it among the
    // others. The game recreates the ball element every hole/respawn,
    // so re-tint whenever a fresh one appears.
    const tintOwnBall = () => {
      const ball = document.querySelector("#ball");
      if (ball && ball.dataset.mpTint !== playerColor) {
        // toneMapped off so the color reads true under the scene's exposure
        ball.setAttribute("material", "color", playerColor);
        ball.setAttribute("material", "toneMapped", false);
        ball.dataset.mpTint = playerColor;
      }
    };

    // NAF dispatches its lifecycle events on document.body
    document.body.addEventListener("connected", () => {
      playerColor = pickColor(NAF.clientId || playerName);
      console.log(
        `[multiplayer] connected to room "${room}" as ${playerName} (${playerColor})`
      );
      // Head and ball only - clubs stay local so they don't clutter
      // other players' greens
      spawnProxy("#mp-avatar-template", "#head");
      spawnProxy("#mp-ball-template", "#ball");
      setInterval(tintOwnBall, 800);
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
      board.textContent = "";
      Object.values(scores)
        .sort((a, b) => a.total - b.total)
        .forEach((s) => {
          const row = document.createElement("div");
          row.className = "mp-row";
          // names come from other players - textContent keeps them inert
          row.textContent =
            `${s.name} · HOLE ${s.hole} · +${s.strokes} · TOTAL ${s.total}`;
          if (/^#[0-9a-fA-F]{6}$/.test(s.color || "")) row.style.color = s.color;
          board.appendChild(row);
        });
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
        color: playerColor,
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
