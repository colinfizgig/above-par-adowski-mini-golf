/** @format */

/* Touch (phone/tablet) input layer for the desktop golf mode. All game logic
   and physics stay in desktop-golf - the club is still a kinematic PhysX
   body - this component only translates touch gestures into the same state
   the mouse/keyboard would produce, and shows a few on-screen buttons.

   Walk mode:
   - one-finger drag             look around
   - press & hold the ground     aim the teleporter (drag to move the marker),
                                 release to blink there
   - tap near your ball          step into the putting stance
   - GO TO BALL / MENU buttons   jump to the ball / open the pause menu

   Putting stance:
   - drag (outside the pad)      rotate the aim line
   - hold SIGHT                  sight down the line at the hole
   - SWING pad                   pull down for the backswing, flick up to
                                 putt - flick speed is the power
   - X                           step away from the ball */

AFRAME.registerComponent("touch-golf", {
  dependencies: ["desktop-golf"],

  init: function () {
    const coarse =
      window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const device = AFRAME.utils.device;
    this.enabled =
      "ontouchstart" in window &&
      (device.isMobile() ||
        (device.isTablet && device.isTablet()) ||
        coarse);
    if (!this.enabled) return;

    this.dg = this.el.components["desktop-golf"];

    // Tuning - thumbs travel far less than a mouse, so touch gets its own
    // sensitivities instead of desktop-golf's
    this.LOOK_SENS = 0.005; // px -> rad, walk-mode drag look
    this.AIM_SENS = 0.006; // px -> rad, stance aim drag
    this.SWING_SCALE = 0.009; // px -> m on the swing pad (2x mouse)
    this.TAP_MOVE = 12; // px of travel that still counts as a tap
    this.TAP_MS = 400; // tap must be quicker than this
    this.HOLD_MS = 350; // press-and-hold delay for the teleporter

    this.active = false;
    this.walkTouch = null; // the finger owning look/tap/teleport in walk
    this.aimTouch = null; // the finger aiming in the stance
    this.padTouch = null; // the finger on the swing pad
    this.holdTimer = 0;
    this._mode = "";

    this.ui = document.querySelector("#touch-ui");

    this.bindButtons();
    this.el.addEventListener("start-desktop-game", () => this.activate());
  },

  activate: function () {
    if (this.active) return;
    this.active = true;
    const dg = this.dg;
    dg.touchMode = true; // switches the hint strings
    dg.noLock = true; // there is no pointer lock on touch screens

    // Touch drag-look is ours (pitch too, not just look-controls' yaw),
    // and drag was chosen over gyro "magic window" tracking
    dg.head.setAttribute("look-controls", "touchEnabled", false);
    dg.head.setAttribute("look-controls", "magicWindowTrackingEnabled", false);

    document.body.classList.add("touch-playing");
    if (this.ui) this.ui.classList.remove("hide");

    // Phones ship 3x screens; PhysX + the full course doesn't need them
    const renderer = this.el.sceneEl.renderer;
    if (renderer && renderer.getPixelRatio() > 1.5) renderer.setPixelRatio(1.5);

    // Landscape is the played orientation (the rotate overlay covers the
    // rest). Lock only works from fullscreen, and neither works on iOS -
    // both fail quietly there.
    const root = document.documentElement;
    if (root.requestFullscreen) {
      root
        .requestFullscreen({ navigationUI: "hide" })
        .then(() => {
          if (screen.orientation && screen.orientation.lock)
            return screen.orientation.lock("landscape");
        })
        .catch(() => {});
    }

    const canvas = this.el.sceneEl.canvas;
    const opts = { passive: false };
    canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), opts);
    canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), opts);
    canvas.addEventListener("touchend", (e) => this.onTouchEnd(e), opts);
    canvas.addEventListener("touchcancel", (e) => this.onTouchCancel(e), opts);
  },

  // ---- canvas gestures --------------------------------------------------

  onTouchStart: function (e) {
    e.preventDefault(); // no scroll/zoom, no synthetic mouse events
    const dg = this.dg;
    for (const t of e.changedTouches) {
      if (dg.state === "walk" && !this.walkTouch) {
        this.walkTouch = {
          id: t.identifier,
          x: t.clientX,
          y: t.clientY,
          t0: performance.now(),
          moved: 0,
          tele: false,
        };
        clearTimeout(this.holdTimer);
        this.holdTimer = setTimeout(() => this.promoteTeleport(), this.HOLD_MS);
      } else if (dg.state === "aim" && !this.aimTouch && !dg.following) {
        this.aimTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
      }
    }
  },

  // A still press-and-hold in walk mode becomes the teleporter, aimed at
  // the finger - the same navmesh raycast the mouse cursor uses
  promoteTeleport: function () {
    const wt = this.walkTouch;
    const dg = this.dg;
    if (!wt || wt.tele || wt.moved > this.TAP_MOVE || dg.state !== "walk")
      return;
    wt.tele = true;
    dg.teleAim = true;
    // backdate past desktop-golf's quick-tap guard: the finger already
    // held for HOLD_MS, releasing now should blink
    dg.teleAimStart = performance.now() - 250;
    dg._teleHitValid = false;
    dg.lastClientX = wt.x;
    dg.lastClientY = wt.y;
  },

  onTouchMove: function (e) {
    e.preventDefault();
    const dg = this.dg;
    for (const t of e.changedTouches) {
      if (this.walkTouch && t.identifier === this.walkTouch.id) {
        const wt = this.walkTouch;
        const dx = t.clientX - wt.x;
        const dy = t.clientY - wt.y;
        wt.moved += Math.abs(dx) + Math.abs(dy);
        wt.x = t.clientX;
        wt.y = t.clientY;
        if (wt.tele) {
          // drag moves the teleport marker
          dg.lastClientX = wt.x;
          dg.lastClientY = wt.y;
        } else if (wt.moved > this.TAP_MOVE) {
          clearTimeout(this.holdTimer);
          this.dragLook(dx, dy);
        }
      } else if (this.aimTouch && t.identifier === this.aimTouch.id) {
        const dx = t.clientX - this.aimTouch.x;
        this.aimTouch.x = t.clientX;
        this.aimTouch.y = t.clientY;
        if (!dg.following && !dg.charging && dg.autoSwingSpeed === 0)
          dg.aimYawTarget -= dx * this.AIM_SENS;
      }
    }
  },

  onTouchEnd: function (e) {
    e.preventDefault();
    const dg = this.dg;
    for (const t of e.changedTouches) {
      if (this.walkTouch && t.identifier === this.walkTouch.id) {
        clearTimeout(this.holdTimer);
        const wt = this.walkTouch;
        this.walkTouch = null;
        if (wt.tele) {
          dg.teleAim = false;
          if (dg._teleHitValid) dg.teleportTo(dg._teleHit);
        } else if (
          wt.moved < this.TAP_MOVE &&
          performance.now() - wt.t0 < this.TAP_MS &&
          dg.state === "walk"
        ) {
          this.tryEnterAim();
        }
      } else if (this.aimTouch && t.identifier === this.aimTouch.id) {
        this.aimTouch = null;
      }
    }
  },

  onTouchCancel: function (e) {
    const dg = this.dg;
    for (const t of e.changedTouches) {
      if (this.walkTouch && t.identifier === this.walkTouch.id) {
        clearTimeout(this.holdTimer);
        if (this.walkTouch.tele) dg.teleAim = false; // no blink on cancel
        this.walkTouch = null;
      } else if (this.aimTouch && t.identifier === this.aimTouch.id) {
        this.aimTouch = null;
      }
    }
  },

  dragLook: function (dx, dy) {
    const lc = this.dg.head.components["look-controls"];
    if (!lc || !lc.data.enabled) return;
    lc.yawObject.rotation.y -= dx * this.LOOK_SENS;
    lc.pitchObject.rotation.x = THREE.MathUtils.clamp(
      lc.pitchObject.rotation.x - dy * this.LOOK_SENS,
      -1.45,
      1.45
    );
  },

  // Same near-the-ball rule as a desktop click
  tryEnterAim: function () {
    const dg = this.dg;
    const ball = document.querySelector("#ball");
    if (ball && dg.ballDistance(ball) > dg.PUTT_RANGE) {
      dg.setHint(
        "Too far to putt - press and hold the ground to teleport closer, " +
          "or tap GO TO BALL"
      );
      dg._wasNearBall = null;
      dg._hintHoldUntil = performance.now() + 2500;
    } else {
      dg.enterAim();
    }
  },

  // ---- on-screen buttons and the swing pad -------------------------------

  bindButtons: function () {
    const dg = this.dg;
    const opts = { passive: false };
    const on = (sel, type, fn) => {
      const el = document.querySelector(sel);
      if (el) el.addEventListener(type, fn, opts);
      return el;
    };

    on("#touch-menu", "touchend", (e) => {
      e.preventDefault();
      if (window.showMainInGame) window.showMainInGame();
    });
    on("#touch-toball", "touchend", (e) => {
      e.preventDefault();
      const p = dg.putt();
      if (p && dg.state === "walk") p.teleportToBall();
    });
    on("#touch-exit", "touchend", (e) => {
      e.preventDefault();
      dg.exitAim();
    });

    // SIGHT works like holding the right mouse button
    const sight = on("#touch-sight", "touchstart", (e) => {
      e.preventDefault();
      if (dg.state !== "aim" || dg.following) return;
      dg.peek = true;
      dg.swingDrag = false;
    });
    if (sight) {
      const release = (e) => {
        e.preventDefault();
        dg.peek = false;
      };
      sight.addEventListener("touchend", release, opts);
      sight.addEventListener("touchcancel", release, opts);
    }

    // The swing pad drives the club exactly like the mouse drag: purely
    // vertical - pull down to draw the backswing, flick up to stroke.
    // Club speed comes from how fast the target moves, so a fast flick
    // is a hard putt.
    const pad = document.querySelector("#swing-pad");
    if (!pad) return;
    pad.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        if (this.padTouch) return;
        if (dg.state !== "aim" || dg.following || dg.peekBlend >= 0.25) return;
        const t = e.changedTouches[0];
        this.padTouch = { id: t.identifier, y: t.clientY };
        dg.swingDrag = true;
      },
      opts
    );
    pad.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        if (!this.padTouch) return;
        for (const t of e.changedTouches) {
          if (t.identifier !== this.padTouch.id) continue;
          const dy = t.clientY - this.padTouch.y;
          this.padTouch.y = t.clientY;
          if (dg.state !== "aim" || dg.following) continue;
          dg.targetS = THREE.MathUtils.clamp(
            dg.targetS - dy * this.SWING_SCALE,
            dg.MIN_S,
            dg.MAX_S
          );
        }
      },
      opts
    );
    const padDone = (e) => {
      e.preventDefault();
      if (!this.padTouch) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== this.padTouch.id) continue;
        this.padTouch = null;
        dg.swingDrag = false;
      }
    };
    pad.addEventListener("touchend", padDone, opts);
    pad.addEventListener("touchcancel", padDone, opts);
  },

  // The stylesheet shows/hides the buttons per mode via this attribute
  tick: function () {
    if (!this.enabled || !this.active || !this.ui) return;
    const dg = this.dg;
    const mode =
      dg.state === "aim" ? (dg.following ? "follow" : "aim") : dg.state;
    if (mode !== this._mode) {
      this._mode = mode;
      this.ui.dataset.mode = mode;
    }
  },
});
