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

  // Relay used when the page host can't be one (e.g. GitHub Pages).
  const DEFAULT_RELAY = "https://above-par-relay.onrender.com";

  document.addEventListener("DOMContentLoaded", () => {
    const scene = document.querySelector("a-scene");
    const isStaticHost = /github\.io$/.test(document.location.hostname);
    const server =
      params.get("server") ||
      (isStaticHost && DEFAULT_RELAY) ||
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
        // flat + toneMapped off: unshaded, so the color reads at full
        // strength from any angle under the scene's exposure
        ball.setAttribute("material", {
          shader: "flat",
          color: playerColor,
          toneMapped: false,
        });
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
      startMoments(scene);
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

  // "Moments": the little events that make a room feel shared. Strokes
  // become a distance-faded click from where the ball is; holing out
  // becomes a toast on everyone else's screen. Presence only - nothing
  // here touches anyone's physics or score.
  const momentsCamPos = new THREE.Vector3();
  const momentsBallPos = new THREE.Vector3();

  function toast(text, color) {
    const holder = document.querySelector("#mp-toasts");
    if (!holder) return;
    const div = document.createElement("div");
    div.className = "mp-toast";
    div.textContent = text; // remote names stay inert
    if (/^#[0-9a-fA-F]{6}$/.test(color || "")) div.style.color = color;
    holder.appendChild(div);
    setTimeout(() => div.remove(), 5000);
  }

  function startMoments(scene) {
    // a small pool so overlapping strokes don't cut each other off
    const pool = [new Audio(), new Audio(), new Audio()];
    pool.forEach((a) => (a.src = "./assets/audio/ballHit.mp3"));
    let poolIndex = 0;

    NAF.connection.subscribeToDataChannel("mp-stroke", (id, type, data) => {
      const pos = data && data.pos;
      if (!Array.isArray(pos) || pos.length !== 3) return;
      if (!pos.every((v) => typeof v === "number" && isFinite(v))) return;
      const cam = scene.camera;
      if (!cam) return;
      cam.getWorldPosition(momentsCamPos);
      const dist = momentsCamPos.distanceTo(momentsBallPos.fromArray(pos));
      const a = pool[poolIndex++ % pool.length];
      a.volume = Math.max(0.05, Math.min(0.6, 1 - dist / 40));
      a.currentTime = 0;
      a.play().catch(() => {});
    });

    NAF.connection.subscribeToDataChannel("mp-holeout", (id, type, data) => {
      const name = String((data && data.name) || "golfer").slice(0, 16);
      const hole = parseInt(data && data.hole);
      const strokes = parseInt(data && data.strokes);
      if (!hole || hole < 1 || hole > 18) return;
      if (!strokes || strokes < 1 || strokes > 99) return;
      toast(
        `${name} sank hole ${hole} in ${strokes} ` +
          (strokes === 1 ? "stroke!" : "strokes!"),
        data.color
      );
    });

    document.addEventListener("ap-stroke", (e) => {
      if (!NAF.connection.isConnected()) return;
      NAF.connection.broadcastDataGuaranteed("mp-stroke", {
        pos: e.detail.pos,
      });
    });
    document.addEventListener("ap-hole-made", (e) => {
      if (!NAF.connection.isConnected()) return;
      NAF.connection.broadcastDataGuaranteed("mp-holeout", {
        name: playerName,
        color: playerColor,
        hole: e.detail.hole,
        strokes: e.detail.strokes,
      });
    });
  }

  function startScoreboard(scene) {
    const board = document.querySelector("#mp-scoreboard");
    const scores = {}; // clientId (or "me") -> {name, hole, strokes, total}

    const resultsEl = document.querySelector("#mp-results");

    // Once the local round is over, the corner scoreboard grows into a
    // proper results board next to the endgame card, crowning the winner
    // when the whole field is done
    const renderResults = () => {
      if (!resultsEl) return;
      const putt = scene.components["putt"];
      if (!putt || !putt.gameOver) {
        resultsEl.classList.add("hide");
        return;
      }
      resultsEl.classList.remove("hide");
      resultsEl.textContent = "";
      const all = Object.values(scores).sort((a, b) => a.total - b.total);
      const allDone = all.length > 0 && all.every((s) => s.done);
      const title = document.createElement("div");
      title.className = "mp-results-title";
      title.textContent = allDone
        ? "FINAL SCORES"
        : "SCORES · WAITING FOR THE FIELD";
      resultsEl.appendChild(title);
      all.forEach((s, i) => {
        const row = document.createElement("div");
        row.className = "mp-row";
        row.textContent = s.done
          ? `${allDone && i === 0 ? "WINNER · " : ""}${s.name} · ${s.total}`
          : `${s.name} · ${s.total} thru ${Math.max(0, s.hole - 1)}`;
        if (/^#[0-9a-fA-F]{6}$/.test(s.color || "")) row.style.color = s.color;
        resultsEl.appendChild(row);
      });
    };

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
      renderResults();
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
        done: !!putt.gameOver,
      };
      scores["me"] = mine;
      if (NAF.connection.isConnected()) {
        NAF.connection.broadcastDataGuaranteed("mp-score", mine);
      }
      render();
    }, 2000);
  }
})();
