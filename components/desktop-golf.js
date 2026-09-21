/** @format */

/* Desktop (non-VR) play mode. The club stays a kinematic PhysX body exactly
   like in VR, so contact with the ball is fully physical - this component only
   drives the club's transform from mouse/keyboard input:
   - WASD + drag-look to walk (stock movement-controls / look-controls)
   - Click to step into a golfer's side-on stance over the ball
   - Hold RIGHT mouse (or Shift) to sight down the line at the hole; mouse
     still aims while sighted. Release to return to the stance.
   - Hold LEFT mouse and drag along the line to swing (pull away from the
     target, flick toward it), or hold SPACE to charge and release to putt.
   - Esc steps away from the ball.
   Add ?nolock to the URL to keep the cursor visible (no pointer lock). */

AFRAME.registerComponent("desktop-golf", {
  schema: {},

  init: function () {
    this.state = "inactive"; // inactive | walk | aim
    this.rig = document.querySelector("#cameraRig");
    this.head = document.querySelector("#head");
    this.clubWrapper = document.querySelector("#club-wrapper");
    this.flagEl = document.querySelector("#flag");
    this.noLock = /[?&]nolock/.test(document.location.search);
    this.touchMode = false; // set by touch-golf: swaps hints to gestures

    // Swing tuning
    this.ADDRESS_S = -0.22; // club head rest position behind the ball (m)
    this.MIN_S = -0.8; // backswing limit
    this.MAX_S = 0.45; // follow-through limit
    this.DRAG_SCALE = 0.0045; // px -> m for the swing drag
    this.AIM_SENSITIVITY = 0.0035; // px -> radians
    this.CLUB_HEIGHT = 1.0; // wrapper ("hand") height above the green
    this.FACE_YAW = -Math.PI / 2; // turns the putter face square to the line

    // Stance and sighting camera. The stance sits at STANCE_ANGLE off the
    // target line (0 = straight behind the ball, 90deg = pure side-on) and
    // looks mostly down the line, so the ball AND where it's headed share
    // the screen during the swing.
    this.STANCE_ANGLE = 0.87; // ~50deg: angled behind the putter
    this.STANCE_YAW_OFF = 0.5; // ~29deg: camera yaw right of the line
    this.STANCE_PITCH = -0.6; // down enough to keep the ball in frame
    this.AIM_FOV = 95; // widen the lens in the stance (walk mode uses 80)
    this.PEEK_PITCH = -0.22; // looking down the line at the hole
    this.PEEK_BACK = 1.4; // sighting camera distance behind the ball
    this.AUTO_PEEK_MS = 900; // glance at the hole when stepping up
    this.AIM_SLEW_RATE = 2.5; // rad/s - the stance orbits, never teleports,
    // so the club's kinematic body can't sweep across the ball on a big
    // mouse move
    this.PUTT_RANGE = 3.0; // how close to the ball you must be to putt
    this.ARC_N = 24; // samples along the teleport arc
    this.ARC_WIDTH = 0.05; // ribbon width of the arc (m)

    this.aimYaw = 0;
    this.aimYawTarget = 0;
    this.stanceDist = 1.05; // how far from the ball the camera stands
    this.camYaw = 0; // last applied camera angles (follow cam starts here)
    this.camPitch = 0;
    this.following = false; // tracking the rolling ball after a stroke
    this.followTime = 0;
    this.ballStillTime = 0;
    this._prevBallPos = null;
    this.teleAim = false; // T held: aiming the teleporter
    this.teleAimStart = 0;
    this._teleHit = new THREE.Vector3();
    this._teleHitValid = false;
    this.stanceBallPos = new THREE.Vector3();
    this.stanceGroundY = 0;
    this.rigY = 0;
    this.s = this.ADDRESS_S;
    this.targetS = this.ADDRESS_S;
    this.peek = false; // sight-the-hole view held?
    this.peekBlend = 0; // 0 = stance view, 1 = sighting view
    this.autoPeekUntil = 0;
    this.swingDrag = false;
    this.charging = false;
    this.chargeStart = 0;
    this.autoSwingSpeed = 0;
    this.hover = 0;
    this.lowering = false;
    this.shotTaken = false;
    this.scoreAtAimEnter = 0;
    this.hudTimer = 0;
    this.lastClientX = 0;
    this.lastClientY = 0;
    this.downX = 0;
    this.downY = 0;
    this.downTime = 0;

    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._v3 = new THREE.Vector3();
    this._v4 = new THREE.Vector3();
    this._ndc = new THREE.Vector2();
    this._q1 = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();
    this._up = new THREE.Vector3(0, 1, 0);
    this._xAxis = new THREE.Vector3(1, 0, 0);
    this._down = new THREE.Vector3(0, -1, 0);
    this._raycaster = new THREE.Raycaster();

    this.buildAimGuide();
    this.buildTeleportMarker();

    this.el.addEventListener("start-desktop-game", () => {
      this.state = "walk";
      const hud = this.hud();
      if (hud) hud.classList.remove("hide");
      this.walkHint();
    });

    document.addEventListener("mousedown", (e) => this.onMouseDown(e));
    document.addEventListener("mouseup", (e) => this.onMouseUp(e));
    document.addEventListener("mousemove", (e) => this.onMouseMove(e));
    document.addEventListener("contextmenu", (e) => this.onContextMenu(e));
    document.addEventListener("keydown", (e) => this.onKeyDown(e));
    document.addEventListener("keyup", (e) => this.onKeyUp(e));
    document.addEventListener("pointerlockchange", () => {
      // Browser Esc releases the lock - treat that as stepping away
      if (this.state === "aim" && !document.pointerLockElement && !this.noLock)
        this.exitAim();
    });
  },

  putt: function () {
    return this.el.components["putt"];
  },

  hud: function () {
    return (this._hud = this._hud || document.querySelector("#desktop-hud"));
  },

  hintEl: function () {
    return (this._hint = this._hint || document.querySelector("#desktop-hint"));
  },

  buildTeleportMarker: function () {
    const marker = document.createElement("a-entity");
    marker.setAttribute("id", "teleport-marker");
    marker.setAttribute(
      "geometry",
      "primitive:ring;radiusInner:0.16;radiusOuter:0.22;"
    );
    marker.setAttribute(
      "material",
      "shader:flat;color:#4fc3f7;opacity:0.8;transparent:true;side:double;"
    );
    marker.object3D.rotation.x = -Math.PI / 2;
    marker.object3D.visible = false;
    this.el.appendChild(marker);
    this.teleportMarker = marker;

    // Ribbon-line arc from beside the player's "hand" to the marker,
    // like the VR blink teleporter
    this.arcPositions = new Float32Array(this.ARC_N * 2 * 3);
    const arcGeom = new THREE.BufferGeometry();
    arcGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(this.arcPositions, 3)
    );
    const indices = [];
    for (let i = 0; i < this.ARC_N - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    arcGeom.setIndex(indices);
    this.arcMesh = new THREE.Mesh(
      arcGeom,
      new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.arcMesh.frustumCulled = false;
    this.arcMesh.visible = false;
    this.el.object3D.add(this.arcMesh);
  },

  updateTeleportArc: function (hit) {
    const cam = this.el.sceneEl.camera;
    if (!cam) return;
    // launch the arc from beside the camera, like a right-hand controller,
    // so the curve is seen from the side instead of edge-on
    cam.getWorldPosition(this._v1);
    cam.getWorldQuaternion(this._q1);
    this._v2.set(1, 0, 0).applyQuaternion(this._q1);
    this._v2.y = 0;
    this._v2.normalize();
    const sx = this._v1.x + this._v2.x * 0.35;
    const sy = this._v1.y - 0.35;
    const sz = this._v1.z + this._v2.z * 0.35;

    const horiz = Math.hypot(hit.x - sx, hit.z - sz) || 0.001;
    const apex = THREE.MathUtils.clamp(horiz * 0.12 + 0.2, 0.25, 2.5);
    // ribbon width sideways to the direction of travel
    const px = (-(hit.z - sz) / horiz) * this.ARC_WIDTH * 0.5;
    const pz = ((hit.x - sx) / horiz) * this.ARC_WIDTH * 0.5;
    for (let i = 0; i < this.ARC_N; i++) {
      const t = i / (this.ARC_N - 1);
      const x = sx + (hit.x - sx) * t;
      const y = sy + (hit.y - sy) * t + apex * 4 * t * (1 - t);
      const z = sz + (hit.z - sz) * t;
      const o = i * 6;
      this.arcPositions[o] = x + px;
      this.arcPositions[o + 1] = y;
      this.arcPositions[o + 2] = z + pz;
      this.arcPositions[o + 3] = x - px;
      this.arcPositions[o + 4] = y;
      this.arcPositions[o + 5] = z - pz;
    }
    this.arcMesh.geometry.attributes.position.needsUpdate = true;
  },

  // Cast from the camera through the cursor onto the walkmesh - the same
  // mesh VR blink teleport uses
  cursorNavmeshHit: function (clientX, clientY) {
    const cam = this.el.sceneEl.camera;
    const nav = document.querySelector(".navmesh");
    if (!cam || !nav) return null;
    this._ndc.x = (clientX / window.innerWidth) * 2 - 1;
    this._ndc.y = -(clientY / window.innerHeight) * 2 + 1;
    this._raycaster.setFromCamera(this._ndc, cam);
    this._raycaster.far = 150;
    const hits = this._raycaster.intersectObject(nav.object3D, true);
    return hits.length ? hits[0].point : null;
  },

  teleportTo: function (point) {
    this.rig.object3D.position.set(point.x, point.y, point.z);
    this.rig.object3D.matrixNeedsUpdate = true;
    // re-seed the navmesh constraint at the new spot so it doesn't snap back
    const constraint = this.rig.components["simple-navmesh-constraint"];
    if (constraint) constraint.lastPosition = null;
  },

  buildAimGuide: function () {
    const guide = document.createElement("a-entity");
    guide.setAttribute("id", "aim-guide");
    guide.setAttribute("geometry", "primitive:plane;width:0.05;height:1.5;");
    guide.setAttribute(
      "material",
      "shader:flat;color:#35e87a;opacity:0.7;transparent:true;side:double;"
    );
    guide.object3D.visible = false;
    this.el.appendChild(guide);
    this.aimGuide = guide;
  },

  setHint: function (text) {
    const hint = this.hintEl();
    if (!hint) return;
    hint.textContent = text;
    hint.classList.remove("hide");
  },

  walkHint: function () {
    this.setHint(
      this.touchMode
        ? "Drag to look around - press and hold the ground to teleport - " +
            "tap near your ball to putt"
        : "WASD to walk, drag to look around - hold T to aim the teleporter " +
            "- click near your ball to putt"
    );
  },

  aimDir: function (target) {
    return target.set(-Math.sin(this.aimYaw), 0, -Math.cos(this.aimYaw));
  },

  // Points from the target line toward where the (right-handed) golfer
  // stands: the target ends up on their left, like a real stance
  stanceSideDir: function (target) {
    const dir = this.aimDir(this._v2);
    return target.set(-dir.z, 0, dir.x);
  },

  groundYAt: function (pos, fallback) {
    // Prefer the active hole's floor collider (matches the visible green);
    // the walkmesh can sit below the art and would bury the aim guide
    const p = this.putt();
    const floorObj = p && p.activeFloor ? p.activeFloor.object3D : null;
    const nav = document.querySelector(".navmesh");
    this._v3.copy(pos);
    this._v3.y += 2;
    this._raycaster.set(this._v3, this._down);
    this._raycaster.far = 6;
    if (floorObj) {
      const floorHits = this._raycaster.intersectObject(floorObj, true);
      if (floorHits.length) return floorHits[0].point.y;
    }
    if (!nav) return fallback;
    const hits = this._raycaster.intersectObject(nav.object3D, true);
    return hits.length ? hits[0].point.y : fallback;
  },

  isSighting: function () {
    return this.peek || performance.now() < this.autoPeekUntil;
  },

  onMouseDown: function (e) {
    if (this.state === "inactive") return;
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;
    if (this.state === "aim") {
      if (this.following) return;
      if (e.button === 2) {
        this.peek = true;
        this.swingDrag = false;
      } else if (e.button === 0 && this.peekBlend < 0.25) {
        this.swingDrag = true;
      }
      return;
    }
    // walk: while aiming the teleporter (T held), right-click blinks there
    if (e.button === 2 && e.target === this.el.sceneEl.canvas) {
      if (this.teleAim && this._teleHitValid) this.teleportTo(this._teleHit);
      this.downTime = 0;
      return;
    }
    // walk: remember where the press started to tell a click from a look-drag
    if (!this.teleAim && e.button === 0 && e.target === this.el.sceneEl.canvas) {
      this.downX = e.clientX;
      this.downY = e.clientY;
      this.downTime = performance.now();
    } else this.downTime = 0;
  },

  onMouseUp: function (e) {
    if (this.state === "aim") {
      if (e.button === 0) this.swingDrag = false;
      else if (e.button === 2) this.peek = false;
      return;
    }
    if (e.button !== 0) return;
    if (this.state !== "walk" || !this.downTime) return;
    const moved = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
    if (moved < 6 && performance.now() - this.downTime < 500) {
      const ball = document.querySelector("#ball");
      if (ball && this.ballDistance(ball) > this.PUTT_RANGE) {
        this.setHint(
          "Too far to putt - hold T to teleport closer, " +
            "or press N to jump to your ball"
        );
        this._wasNearBall = null; // let the proximity hint refresh
        this._hintHoldUntil = performance.now() + 2500;
      } else {
        this.enterAim();
      }
    }
    this.downTime = 0;
  },

  ballDistance: function (ball) {
    const rigPos = this.rig.object3D.position;
    const ballPos = ball.object3D.position;
    return Math.hypot(ballPos.x - rigPos.x, ballPos.z - rigPos.z);
  },

  onMouseMove: function (e) {
    if (this.state !== "aim") {
      this.lastClientX = e.clientX;
      this.lastClientY = e.clientY;
      return;
    }
    let dx, dy;
    if (document.pointerLockElement) {
      dx = e.movementX || 0;
      dy = e.movementY || 0;
    } else {
      dx = e.clientX - this.lastClientX;
      dy = e.clientY - this.lastClientY;
    }
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;
    if (this.following) return;

    if (this.swingDrag) {
      // Drag along the line as it appears on screen: with the camera angled
      // STANCE_YAW_OFF right of the line, "toward the hole" is up and a
      // little left - pull down/right for the backswing, flick up/left to putt
      const fx = -Math.sin(this.STANCE_YAW_OFF);
      const fy = -Math.cos(this.STANCE_YAW_OFF);
      this.targetS = THREE.MathUtils.clamp(
        this.targetS + (dx * fx + dy * fy) * this.DRAG_SCALE,
        this.MIN_S,
        this.MAX_S
      );
    } else if (!this.charging && this.autoSwingSpeed === 0) {
      this.aimYawTarget -= dx * this.AIM_SENSITIVITY;
    }
  },

  onContextMenu: function (e) {
    if (this.state !== "inactive") e.preventDefault();
  },

  onKeyDown: function (e) {
    if (this.state === "aim") {
      if (e.code === "Space") {
        e.preventDefault();
        if (
          !e.repeat &&
          this.autoSwingSpeed === 0 &&
          !this.charging &&
          !this.following &&
          this.peekBlend < 0.25
        ) {
          this.charging = true;
          this.chargeStart = performance.now();
        }
      } else if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        this.peek = true;
        this.swingDrag = false;
      } else if (e.code === "Escape" && this.noLock) {
        this.exitAim();
      }
    } else if (this.state === "walk") {
      if (e.code === "KeyT" && !e.repeat) {
        this.teleAim = true;
        this.teleAimStart = performance.now();
        this._teleHitValid = false;
      } else if (e.code === "Escape") {
        if (this.teleAim) this.teleAim = false;
        else if (window.showMainInGame) window.showMainInGame();
      }
    }
  },

  onKeyUp: function (e) {
    if (this.state === "walk") {
      // release T to blink to the marker (quick taps don't teleport)
      if (e.code === "KeyT" && this.teleAim) {
        this.teleAim = false;
        if (
          this._teleHitValid &&
          performance.now() - this.teleAimStart > 200
        ) {
          this.teleportTo(this._teleHit);
        }
      }
      return;
    }
    if (this.state !== "aim") return;
    if (e.code === "Space" && this.charging) {
      this.charging = false;
      const held = (performance.now() - this.chargeStart) / 1000;
      this.autoSwingSpeed = 1.2 + Math.min(1.5, held) * 2.6; // club speed m/s
    } else if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      this.peek = false;
    }
  },

  enterAim: function () {
    const p = this.putt();
    const ball = document.querySelector("#ball");
    if (!p || !ball || p.holeOver || p.gameOver) return;

    this.stanceBallPos.copy(ball.object3D.position);
    this.stanceGroundY = this.groundYAt(
      this.stanceBallPos,
      this.stanceBallPos.y - 0.0275
    );

    // Default the aim right at the flag
    const flagPos = this.flagEl.object3D.position;
    this.aimYaw = Math.atan2(
      -(flagPos.x - this.stanceBallPos.x),
      -(flagPos.z - this.stanceBallPos.z)
    );
    this.aimYawTarget = this.aimYaw;

    // Freeze the walking controls while in the stance
    this.rig.setAttribute("movement-controls", "enabled", false);
    this.rig.setAttribute("simple-navmesh-constraint", "enabled", false);
    this.head.setAttribute("look-controls", "enabled", false);

    this.pickStance();

    // Step up with a glance down the line at the hole, then settle into
    // the angled address stance. Widen the lens so ball and line share
    // the screen.
    this.peek = false;
    this.peekBlend = 1;
    this.autoPeekUntil = performance.now() + this.AUTO_PEEK_MS;
    this.following = false;
    this._prevBallPos = null;
    this.teleportMarker.object3D.visible = false;
    this.arcMesh.visible = false;
    this.teleAim = false;
    this._wasNearBall = null;
    this.head.setAttribute("camera", "fov", this.AIM_FOV);
    this.updateCameraPose();
    this.updateAimGuide();

    // Wake the club up hovering above address. physx-body spends its first
    // frame or two as a dynamic body before its tock flips it kinematic, and
    // creating it flush against the floor lets a depenetration pop punt the
    // ball. Enabling in the air is harmless; we then lower it to address.
    this.s = this.targetS = this.ADDRESS_S;
    this.swingDrag = false;
    this.charging = false;
    this.autoSwingSpeed = 0;
    this.hover = 0.4;
    this.lowering = false;
    this.clubWrapper.object3D.visible = true;
    this.updateClub();
    p.thumbstickTimeout = 0;
    p.clubPhysicsEnabled = true;
    setTimeout(() => {
      if (this.state === "aim") p.enableCollision();
    }, 150);
    setTimeout(() => {
      this.lowering = true;
    }, 400);

    this.aimGuide.object3D.visible = true;
    this.shotTaken = false;
    this.scoreAtAimEnter = p.activeHoleScore;
    this.setHint(
      this.touchMode
        ? "Drag the view to aim - hold SIGHT to see the hole - pull down " +
            "and flick up on the SWING pad to putt"
        : "Mouse aims - hold RIGHT mouse (or Shift) to sight the hole - " +
            "hold LEFT and drag along the line to swing " +
            "(or hold SPACE, release to putt) - Esc to step away"
    );
    if (!this.noLock && this.el.sceneEl.canvas.requestPointerLock) {
      // If the lock is denied, aiming still works from cursor deltas
      const lockRequest = this.el.sceneEl.canvas.requestPointerLock();
      if (lockRequest && lockRequest.catch) lockRequest.catch(() => {});
    }
    this.state = "aim";
  },

  // Unit vector from the ball toward where the camera stands: angled off
  // the line, behind the putter on the golfer's side
  stanceOffsetDir: function (target) {
    const dir = this.aimDir(this._v2);
    const side = this.stanceSideDir(target); // target holds side for a moment
    const cosA = Math.cos(this.STANCE_ANGLE);
    const sinA = Math.sin(this.STANCE_ANGLE);
    return target.set(
      -(dir.x * cosA + side.x * sinA),
      0,
      -(dir.z * cosA + side.z * sinA)
    );
  },

  // Find a stance spot that is still over the navmesh
  // (offset lives in _v4: groundYAt scribbles over _v3)
  pickStance: function () {
    const off = this.stanceOffsetDir(this._v4);
    for (const dist of [1.05, 0.9, 0.75]) {
      this._v1.copy(this.stanceBallPos).addScaledVector(off, dist);
      const y = this.groundYAt(this._v1, null);
      if (y !== null) {
        this.stanceDist = dist;
        this.rigY = y;
        return;
      }
    }
    this.stanceDist = 0.75;
    this.rigY = this.stanceGroundY;
  },

  // Blend the camera between the angled address stance and the
  // sight-the-hole view behind the ball, both orbiting with the aim
  updateCameraPose: function () {
    const dir = this.aimDir(this._v2);
    const off = this.stanceOffsetDir(this._v3);
    const t = this.peekBlend;
    const blend = t * t * (3 - 2 * t); // smoothstep

    const stanceX = this.stanceBallPos.x + off.x * this.stanceDist;
    const stanceZ = this.stanceBallPos.z + off.z * this.stanceDist;
    const backX = this.stanceBallPos.x - dir.x * this.PEEK_BACK;
    const backZ = this.stanceBallPos.z - dir.z * this.PEEK_BACK;

    this.rig.object3D.position.set(
      stanceX + (backX - stanceX) * blend,
      this.rigY,
      stanceZ + (backZ - stanceZ) * blend
    );
    // stance looks mostly down the line with the ball low in frame;
    // sighting faces straight down the line
    const yaw = this.aimYaw - this.STANCE_YAW_OFF * (1 - blend);
    this.rig.object3D.rotation.set(0, yaw, 0);
    this.rig.object3D.matrixNeedsUpdate = true;

    const pitch =
      this.STANCE_PITCH + (this.PEEK_PITCH - this.STANCE_PITCH) * blend;
    this.head.object3D.rotation.set(pitch, 0, 0);
    this.camYaw = yaw;
    this.camPitch = pitch;
  },

  updateAimGuide: function () {
    const dir = this.aimDir(this._v2);
    this.aimGuide.object3D.position.set(
      this.stanceBallPos.x + dir.x * 0.85,
      this.stanceGroundY + 0.03,
      this.stanceBallPos.z + dir.z * 0.85
    );
    this._q1.setFromAxisAngle(this._up, this.aimYaw);
    this._q2.setFromAxisAngle(this._xAxis, -Math.PI / 2);
    this.aimGuide.object3D.quaternion.copy(this._q1).multiply(this._q2);
    this.aimGuide.object3D.matrixNeedsUpdate = true;
  },

  updateClub: function () {
    const dir = this.aimDir(this._v2);
    this._v1.set(
      this.stanceBallPos.x + dir.x * this.s,
      this.stanceGroundY + this.CLUB_HEIGHT + (this.hover || 0),
      this.stanceBallPos.z + dir.z * this.s
    );
    this._q1.setFromAxisAngle(this._up, this.aimYaw + this.FACE_YAW);
    this._q2.setFromAxisAngle(this._xAxis, -Math.PI / 2);
    this._q1.multiply(this._q2);
    this.setClubWorldTransform(this._v1, this._q1);
  },

  // The club wrapper lives under a controller entity (handedness reparents it),
  // so always place it via its current parent's world transform
  setClubWorldTransform: function (worldPos, worldQuat) {
    const o = this.clubWrapper.object3D;
    const parent = o.parent;
    if (!parent) return;
    parent.updateWorldMatrix(true, false);
    o.position.copy(worldPos);
    parent.worldToLocal(o.position);
    parent.getWorldQuaternion(this._q2);
    o.quaternion.copy(this._q2.invert()).multiply(worldQuat);
    o.matrixNeedsUpdate = true;
  },

  exitAim: function () {
    if (this.state !== "aim") return;
    this.state = "walk";
    if (document.pointerLockElement) document.exitPointerLock();

    // Hand control back to the walking rig without a view snap
    const lookControls = this.head.components["look-controls"];
    if (lookControls) {
      lookControls.pitchObject.rotation.x = this.head.object3D.rotation.x;
      lookControls.yawObject.rotation.y = this.head.object3D.rotation.y;
    }
    this.head.setAttribute("look-controls", "enabled", true);
    this.rig.setAttribute("movement-controls", "enabled", true);
    this.rig.setAttribute("simple-navmesh-constraint", "enabled", true);

    this.aimGuide.object3D.visible = false;
    this.swingDrag = false;
    this.charging = false;
    this.autoSwingSpeed = 0;
    this.peek = false;
    this.peekBlend = 0;
    this.autoPeekUntil = 0;
    this.following = false;
    this.head.setAttribute("camera", "fov", 80);
    this.walkHint();
  },

  updateHUD: function (p) {
    const hud = this.hud();
    const holeEl = p.courseColliders[p.activeHoleIndex];
    if (!hud || !holeEl) return;
    const total = p.scores.reduce((a, b) => parseInt(a) + parseInt(b));
    hud.textContent =
      `HOLE ${p.activeHoleIndex + 1}/${p.courseColliders.length}` +
      ` · PAR ${holeEl.dataset.par}` +
      ` · STROKES ${p.activeHoleScore}` +
      ` · TOTAL ${total}`;
  },

  tick: function (t, dt) {
    if (this.state === "inactive") return;
    const p = this.putt();
    if (!p) return;

    this.hudTimer += dt;
    if (this.hudTimer > 250) {
      this.hudTimer = 0;
      this.updateHUD(p);
    }

    if (this.state === "walk") {
      // Park the idle club out of harm's way and keep its collider off so it
      // can't shove the ball while walking (putt.js would otherwise re-enable)
      p.thumbstickTimeout = Infinity;
      if (p.clubPhysicsEnabled) {
        p.clubPhysicsEnabled = false;
        setTimeout(() => p.removeCollision(), 0);
      }
      if (this.clubWrapper.object3D.visible)
        this.clubWrapper.object3D.visible = false;
      // Only park once the kinematic body is really gone - moving the wrapper
      // while the body still exists sweeps the collider across the course
      const headContainer = this.clubWrapper.querySelector(
        ".club-head-container"
      );
      if (!headContainer || !headContainer.components["physx-body"]) {
        this._v1.set(0, -60, 0);
        this._q1.identity();
        this.setClubWorldTransform(this._v1, this._q1);
      }
      if (p.clubShadowEl) p.clubShadowEl.object3D.visible = false;
      // teleport marker + arc only while T is held
      const hit = this.teleAim
        ? this.cursorNavmeshHit(this.lastClientX, this.lastClientY)
        : null;
      if (hit) {
        this.teleportMarker.object3D.position.set(hit.x, hit.y + 0.03, hit.z);
        this.teleportMarker.object3D.visible = true;
        this.teleportMarker.object3D.matrixNeedsUpdate = true;
        this.updateTeleportArc(hit);
        this.arcMesh.visible = true;
        this._teleHit.copy(hit);
        this._teleHitValid = true;
      } else {
        this.teleportMarker.object3D.visible = false;
        this.arcMesh.visible = false;
        this._teleHitValid = false;
      }
      // keep the hint pointing at the right next move
      const ball = document.querySelector("#ball");
      const near = ball && this.ballDistance(ball) <= this.PUTT_RANGE;
      if (performance.now() < (this._hintHoldUntil || 0)) {
        // a fresh message (e.g. the too-far warning) gets time to be read
      } else if (near !== this._wasNearBall) {
        this._wasNearBall = near;
        if (this.touchMode) {
          this.setHint(
            near
              ? "Tap your ball to putt - press and hold the ground to teleport"
              : "Press and hold the ground to teleport - GO TO BALL jumps " +
                  "straight to your ball"
          );
        } else {
          this.setHint(
            near
              ? "Click to step up to your ball - hold T to aim the teleporter"
              : "Hold T to aim the teleporter, release to blink over to your " +
                  "ball (N jumps straight to it) - get within a few steps to putt"
          );
        }
      }
      return;
    }

    // ---- aim state ----
    if (p.holeOver || p.gameOver) {
      this.exitAim();
      return;
    }

    if (this.lowering && this.hover > 0) {
      this.hover = Math.max(0, this.hover - dt * 0.0016);
    }

    if (!this.following) {
      // Slew the stance toward the aim target so the club orbits the ball
      // smoothly instead of jumping across the arc
      const yawDelta = this.aimYawTarget - this.aimYaw;
      if (Math.abs(yawDelta) > 0.0001) {
        const maxStep = (this.AIM_SLEW_RATE * dt) / 1000;
        this.aimYaw += THREE.MathUtils.clamp(yawDelta, -maxStep, maxStep);
        this.updateAimGuide();
      }

      // Blend between the address stance and the sight-the-hole view
      const sightTarget = this.isSighting() ? 1 : 0;
      this.peekBlend += (sightTarget - this.peekBlend) * Math.min(1, dt / 160);
      this.updateCameraPose();

      if (this.charging) {
        const held = (performance.now() - this.chargeStart) / 1000;
        this.targetS = Math.max(
          this.MIN_S,
          this.ADDRESS_S - Math.min(0.55, held * 0.45)
        );
      }
    }

    // Let a charge-released stroke finish even once the ball is away
    if (!this.charging && this.autoSwingSpeed > 0) {
      this.targetS += (this.autoSwingSpeed * dt) / 1000;
      if (this.targetS >= this.MAX_S) {
        this.targetS = this.MAX_S;
        this.autoSwingSpeed = 0;
      }
    }

    this.s += (this.targetS - this.s) * Math.min(1, dt / 28);
    this.updateClub();

    if (!this.following) {
      // tint the aim guide with backswing power (green -> red)
      const mesh = this.aimGuide.getObject3D("mesh");
      if (mesh) {
        const power = THREE.MathUtils.clamp(
          (this.ADDRESS_S - Math.min(this.s, this.ADDRESS_S)) / 0.55,
          0,
          1
        );
        mesh.material.color.setHSL(0.36 * (1 - power), 0.85, 0.55);
      }
    }

    if (!this.shotTaken && p.activeHoleScore !== this.scoreAtAimEnter) {
      this.shotTaken = true;
      this.startFollow();
    }

    if (this.following) this.followBall(dt);
  },

  // Watch the rolling ball from the stance: the camera turns to track it,
  // then control returns once it settles (or the hole handles it)
  startFollow: function () {
    this.following = true;
    this.followTime = 0;
    this.ballStillTime = 0;
    this._prevBallPos = null;
    this.swingDrag = false;
    this.charging = false;
    this.peek = false;
    this.aimGuide.object3D.visible = false;
    // Ghost the club so a ball rolling back downhill can't clip it for a
    // phantom extra stroke (deferred like every physics toggle)
    const p = this.putt();
    if (p && p.clubPhysicsEnabled) {
      p.clubPhysicsEnabled = false;
      p.thumbstickTimeout = Infinity;
      setTimeout(() => p.removeCollision(), 300);
    }
    this.setHint("Nice stroke - watching the ball...");
  },

  followBall: function (dt) {
    const ball = document.querySelector("#ball");
    if (!ball) {
      this.exitAim();
      return;
    }
    const ballPos = ball.object3D.position;
    this.followTime += dt;

    // has the ball settled?
    if (this._prevBallPos) {
      const speed =
        (this._prevBallPos.distanceTo(ballPos) / Math.max(dt, 1)) * 1000;
      if (speed < 0.12) this.ballStillTime += dt;
      else this.ballStillTime = 0;
    } else {
      this._prevBallPos = new THREE.Vector3();
    }
    this._prevBallPos.copy(ballPos);

    // turn (don't move) to keep the ball in view
    const rigPos = this.rig.object3D.position;
    const dx = ballPos.x - rigPos.x;
    const dy = ballPos.y - (this.rigY + 1.65);
    const dz = ballPos.z - rigPos.z;
    const targetYaw = Math.atan2(-dx, -dz);
    const targetPitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
    const k = Math.min(1, dt / 140);
    this.camYaw +=
      Math.atan2(
        Math.sin(targetYaw - this.camYaw),
        Math.cos(targetYaw - this.camYaw)
      ) * k;
    this.camPitch += (targetPitch - this.camPitch) * k;
    this.rig.object3D.rotation.set(0, this.camYaw, 0);
    this.rig.object3D.matrixNeedsUpdate = true;
    this.head.object3D.rotation.set(this.camPitch, 0, 0);

    if (
      (this.followTime > 700 && this.ballStillTime > 700) ||
      this.followTime > 9000
    ) {
      this.exitAim();
    }
  },

  // Re-assert the club pose right before physics reads it, so nothing that
  // touched the wrapper between our tick and the physics step can desync the
  // visual club from its kinematic body
  tock: function () {
    if (this.state === "aim") this.updateClub();
  },
});
