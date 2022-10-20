/** @format */

AFRAME.registerComponent("putt", {
  schema: {},
  init: function () {
    // Player els:
    this.clubEl = document.querySelector("#club-wrapper");
    this.clubHeadCenterEl = this.clubEl.querySelector(".club-head-center");
    this.hmdTextEl = document.querySelector("#hmdText");
    this.cameraRig = document.querySelector("#cameraRig");
    this.head = document.querySelector("#head");

    this.touchControllerR = document.querySelector(
      `[oculus-touch-controls="hand:right;model:false;"]`
    );
    this.touchControllerL = document.querySelector(
      `[oculus-touch-controls="hand:left;model:false;"]`
    );
    this.ballFinderEl = document.querySelector("#ball-finder");
    this.faderEl = document.querySelector("head-occlusion-fader");
    this.watchTextEl = document.querySelector(".watch-text");
    this.clubShadowEl = document.querySelector("#club-shadow");
    this.ballShadowRaycaster = new THREE.Raycaster();
    this.clubShadowRaycaster = new THREE.Raycaster();
    // Course and scene els:
    this.ballEl = document.querySelector("#ball");
    this.ballShadowEl = document.querySelector("#ball-shadow");
    this.ballHaloEl = document.querySelector("#ballHalo");
    this.flagEl = document.querySelector("#flag");
    this.courseColliders = document.querySelectorAll(".colliders");
    //this.blocker = document.querySelector("#blocker");
    //this.credits = document.querySelector("#credits");
    this.driveInScreen = document.querySelector("#drive-in-screen");
    this.creditsScreen = document.querySelector("#credits-screen");
    this.moviesEl = document.querySelector("#movies");
    this.creditsEl = document.querySelector("#credits");
    this.ballParticles = document.querySelector("#ballParticles");
    this.floors = document.querySelectorAll(".floor");
    this.activeFloor = document.querySelector(".floor");
    this.downVector = new THREE.Vector3(0, -1, 0);
    // SFX els:
    this.eagleSoundEl = document.querySelector("#eagle-sound");
    this.birdieSoundEl = document.querySelector("#birdie-sound");
    this.parSoundEl = document.querySelector("#par-sound");
    this.bogeySoundEl = document.querySelector("#bogey-sound");
    this.doubleBogeySoundEl = document.querySelector("#double-bogey-sound");
    this.tripleBogeySoundEl = document.querySelector("#triple-bogey-sound");
    this.lastHit = new THREE.Vector3();
    // Game logic and scoring stuff:
    this.holeOver = false;
    this.gameOver = false;
    this.firstTimeEnteringVR = true;
    this.puttDebounce = false;
    this.scores = new Array(this.courseColliders.length).fill("0"); // score array for as many holes as we have
    this.activeHoleIndex = 0;
    this.activeHoleScore = 0;
    this.scores[this.activeHoleIndex] = 0;
    this.tickCounter = 0;
    this.parInfo = {
      "-3": {
        name: "Albatross",
        soundEl: this.eagleSoundEl,
        particleMultiplier: 5,
      },
      "-2": {
        name: "Eagle",
        soundEl: this.eagleSoundEl,
        particleMultiplier: 3,
      },
      "-1": {
        name: "Birdie",
        soundEl: this.birdieSoundEl,
        particleMultiplier: 1.5,
      },
      0: { name: "Par", soundEl: this.parSoundEl, particleMultiplier: 1 },
      1: {
        name: "Bogey",
        soundEl: this.bogeySoundEl,
        particleMultiplier: 0.05,
      },
      2: {
        name: "Double Bogey",
        soundEl: this.doubleBogeySoundEl,
        particleMultiplier: 0,
      },
      3: {
        name: "Triple Bogey",
        soundEl: this.tripleBogeySoundEl,
        particleMultiplier: 0,
      },
      4: {
        name: "Oof",
        soundEl: this.tripleBogeySoundEl,
        particleMultiplier: 0,
      },
    };

    // Set/update the values on the player's 3D watch in VR
    this.updateWatch();

    // Start the animated blocker, which can't autoplay due to setting the startEvents prop
    //this.blocker.emit("startanimup", null, true);

    this.el.addEventListener("loaded", () => {
      this.ballFinderEl.setAttribute("ball-finder", ""); // Don't start ball-finding until the scene loads

      // let colliderMat = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.FrontSide });
      // for (let i = 0; i < this.courseColliders.length; i++) {
      //   this.courseColliders[i].object3D.traverse(node => {
      //     if (node.isMesh) node.material = colliderMat;
      //   });
      // }
    });

    console.log("IS MOBILE???????", AFRAME.utils.device.isMobile());

    // Don't start listening to raycaster until VR is entered
    this.el.addEventListener(
      "enter-vr",
      function () {
        if (this.firstTimeEnteringVR) {
          this.firstTimeEnteringVR = false;
          this.restartGame(true);
        }
        gtag("event", "enteredVR");
        this._isVR = true;
        this.hmdTextEl.setAttribute("text", `value:;`);
        this.moviesEl.play();
      }.bind(this)
    );
    this.el.addEventListener(
      "exit-vr",
      function () {
        this.activeFloor.removeAttribute("ground-listener");
        gtag("event", "exitedVR");
        this._isVR = false;
      }.bind(this)
    );

    // On trigger, teleport to ball - logic in handler below
    this.touchControllerR.addEventListener(
      "triggerdown",
      this.teleportToBall.bind(this)
    );
    this.touchControllerL.addEventListener(
      "triggerdown",
      this.teleportToBall.bind(this)
    );

    /* Helper keybindings to position the ball for easier desktop dev & debugging */
    document.addEventListener("keydown", (event) => {
      console.log("onkeydown Button " + event.code);
      if (event.code == "KeyP") {
        // Disable physics on the ball with P, can't move its position w/o first doing this
        this.ballEl.removeAttribute("physx-material");
        this.ballEl.removeAttribute("physx-body");
      }
      let pos;
      if (this.ballEl) {
        pos = this.ballEl.object3D.position;
      }
      // WASD ball controls but with IJKL
      if (event.code == "KeyJ" && pos) {
        this.ballEl.setAttribute(
          "position",
          `${pos.x - 0.25}, ${pos.y}, ${pos.z}`
        );
      } else if (event.code == "KeyL" && pos) {
        this.ballEl.setAttribute(
          "position",
          `${pos.x + 0.25}, ${pos.y}, ${pos.z}`
        );
      } else if (event.code == "KeyI" && pos) {
        this.ballEl.setAttribute(
          "position",
          `${pos.x}, ${pos.y}, ${pos.z - 0.25}`
        );
      } else if (event.code == "KeyK" && pos) {
        this.ballEl.setAttribute(
          "position",
          `${pos.x}, ${pos.y}, ${pos.z + 0.25}`
        );
      } else if (event.code == "KeyM") {
        this.putt(); // iterate put count
      } else if (event.code == "KeyN") {
        this.teleportToBall(); // iterate put count
      }
    });

    gtag("event", "gameInit");

    document.addEventListener("restart-game", (e) => {
      this.el.sceneEl.enterVR();

      document.addEventListener(
        "enter-vr",
        () => {
          this.restartGame(true);
        },
        { once: true }
      );
    });
  },

  /**
   * Move and rotate the player to the ball
   */
  teleportToBall: function () {
    // Move player towards the ball
    const ballPos = this.ballEl.object3D.position;
    let intersects;
    this.ballShadowRaycaster.set(ballPos, this.downVector);
    intersects = this.ballShadowRaycaster.intersectObject(
      document.querySelector(".navmesh").object3D
    );

    const ballIntersectPos = intersects[0].point;
    const flagPos = this.flagEl.object3D.position;
    const dir = new THREE.Vector3()
      .subVectors(flagPos, ballIntersectPos)
      .normalize();
    dir.cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(1); // cross ball-to-hole vector with up vector, normalize, multiply scalar 1m
    if (this.el.sceneEl.systems["handedness"].data.hand === "right")
      dir.subVectors(ballIntersectPos, dir); // if right-handed, subVectors
    else dir.addVectors(ballIntersectPos, dir); // if left-handed, addVectors
    this.cameraRig.object3D.position.copy(dir); // location is correct!

    // Rotate player towards the ball
    const cameraDirection = new THREE.Vector3();
    this.el.sceneEl.camera.getWorldDirection(cameraDirection); //Already normalized
    cameraDirection.y = 0;

    const directionOfPlayerToBall = new THREE.Vector3()
      .subVectors(ballIntersectPos, this.cameraRig.object3D.position)
      .normalize();
    directionOfPlayerToBall.y = 0;

    const crossCameraAndBall = new THREE.Vector3().crossVectors(
      cameraDirection,
      directionOfPlayerToBall
    );
    const directionFloat = crossCameraAndBall.dot(new THREE.Vector3(0, 1, 0));
    let direction = 0;

    if (directionFloat > 0.0) {
      direction = 1.0;
    } else if (directionFloat < 0.0) {
      direction = -1.0;
    }

    let angle = cameraDirection.angleTo(directionOfPlayerToBall);

    this.cameraRig.object3D.rotation.y += angle * direction;
    this.cameraRig.object3D.matrixNeedsUpdate = true;
  },

  putt: function () {
    if (!this.puttDebounce) {
      console.log("PUTT");
      this.lastHit.copy(this.ballEl.object3D.position);
      this.puttDebounce = true;
      this.activeHoleScore++;
      this.scores[this.activeHoleIndex] = this.activeHoleScore;
      this.updateWatch();
      if (this.el.sceneEl.systems["handedness"].data.hand === "right") {
        this.touchControllerR.components.haptics.pulse(0.75, 200);
      } else this.touchControllerL.components.haptics.pulse(0.75, 200);
      this.ballParticles.object3D.position.copy(this.ballEl.object3D.position);
      this.ballParticles.components["particle-system"].startParticles();
      this.ballEl.components.sound.playSoundBound();
      setTimeout(() => {
        this.ballParticles.components["particle-system"].stopParticles();
        this.puttDebounce = false;
      }, 1000);
    } else {
      console.log(
        "Collision w/ ball and putter occurred within 1 second of last collision, probably unintentional."
      );
    }
  },

  madePutt: async function () {
    if (!this.holeOver) {
      console.log("MADE PUTT");
      this.ballShadowEl.object3D.visible = false;
      this.clubShadowEl.object3D.visible = false;
      this.ballFinderEl.removeAttribute("ball-finder");
      this.courseColliders[this.activeHoleIndex].removeAttribute("physx-body"); // remove colliders so the ball "falls through the hole"
      this.activeFloor.removeAttribute("physx-body"); // remove colliders so the ball "falls through the hole"
      this.flagEl.components.sound.playSoundBound();
      if (this.el.sceneEl.systems["handedness"].data.hand === "right") {
        this.touchControllerR.components.haptics.pulse(1, 1000);
      } else this.touchControllerL.components.haptics.pulse(1, 1000);
      const parString = this.parHandler(this.scores[this.activeHoleIndex]);
      this.hmdTextEl.setAttribute("text", `value:${parString}!;`);
      this.hmdTextEl.emit("cuehmdtextin");
      setTimeout(() => {
        this.hmdTextEl.emit("cuehmdtextout");
        setTimeout(() => {
          this.hmdTextEl.setAttribute("text", `value:;`);
        }, 2000);
      }, 2000);
      this.holeOver = true;
      gtag("event", "madePutt");
      this.activeHoleScore = 0; // reset
      this.activeHoleIndex++; // advance
    }
    if (this.activeHoleIndex < this.courseColliders.length) {
      this.nextHole();
    } else {
      // game over
      this.gameOver = true;

      // this.credits.setAttribute("visible", true);
      // this.credits.emit("rollCredits", null, true);
      this.driveInScreen.setAttribute("visible", "false");
      this.creditsScreen.setAttribute("visible", "true");
      this.moviesEl.pause();
      this.creditsEl.play();

      gtag("event", "finishedGame");
    }
  },

  async nextHole(instant = false) {
    // if there are more holes, apply colliders
    if (!instant) {
      await new Promise((resolve) =>
        setTimeout(() => {
          resolve();
        }, 4000)
      ); // wait for the helper text notification to fade
    }
    this.flagEl.components["particle-system"].stopParticles();

    const lastHoleIndex =
      this.activeHoleIndex == 0
        ? this.courseColliders.length - 1
        : this.activeHoleIndex - 1;

    if (lastHoleIndex != this.activeHoleIndex) {
      this.courseColliders[lastHoleIndex].removeAttribute("physx-body");
      this.courseColliders[lastHoleIndex].removeAttribute("physx-material");
      this.activeFloor.removeAttribute("physx-body");
      this.activeFloor.removeAttribute("physx-material");
    }
    //this.courseColliders[this.activeHoleIndex].setAttribute("visible", "true");
    this.courseColliders[this.activeHoleIndex].setAttribute(
      "physx-body",
      "type:static;angularDamping:.8;linearDamping:.8"
    );
    this.courseColliders[this.activeHoleIndex].setAttribute(
      "physx-material",
      "restitution:.99; dynamicFriction:.25; staticFriction:.65;"
    );
    //add hidden collision attribute to hide the colliders.  make this false to see them.
    this.courseColliders[this.activeHoleIndex].setAttribute(
      "physx-hidden-collision",
      ""
    );

    this.activeFloor.removeAttribute("ground-listener");
    this.activeFloor =
      this.courseColliders[this.activeHoleIndex].querySelector(".floor");

    //add different physics for floor since it should be a different material anyway basically turn off the bounce -- colin
    this.activeFloor.setAttribute(
      "physx-material",
      "restitution:0.05; dynamicFriction:.1; staticFriction:.85;"
    );

    this.activeFloor.setAttribute("ground-listener", "");
    //set floor collider invisible but still colliding, false to make it visible
    this.activeFloor.setAttribute("physx-hidden-collision", "");

    this.updateWatch();
    await this.newBall(
      this.courseColliders[this.activeHoleIndex].dataset.balldrop
    );
    if (!instant) {
      this.faderEl.emit("cuefadeout");
      await new Promise((resolve) =>
        setTimeout(() => {
          resolve();
        }, 2000)
      );
    }
    this.flagEl.setAttribute(
      "position",
      this.courseColliders[this.activeHoleIndex].dataset.flag
    );
    this.teleportToBall();
    this.lastHit.copy(this.ballEl.object3D.position);
    this.clubShadowEl.object3D.visible = true;
    this.ballShadowEl.object3D.visible = true;
    if (!instant) {
      this.faderEl.emit("cuefadein");
      await new Promise((resolve) =>
        setTimeout(() => {
          resolve();
        }, 2000)
      );
    }
    this.holeOver = false;
  },

  parHandler: function (score) {
    let parScore =
      score - this.courseColliders[this.activeHoleIndex].dataset.par;
    console.log(parScore);
    if (parScore > 4) parScore = 4; // for purposes of accessing parInfo for SFX and VFX
    let parString = this.parInfo[parScore]?.name;
    this.parInfo[parScore].soundEl.play();
    const multiplier = this.parInfo[parScore].particleMultiplier;
    if (multiplier > 0) {
      this.flagEl.setAttribute(
        "particle-system",
        `velocitySpread:${multiplier} ${multiplier} ${multiplier};`
      );
      this.flagEl.components["particle-system"].startParticles();
    }
    return parString;
  },

  outOfBounds: async function () {
    if (!this.holeOver) {
      this.ballFinderEl.removeAttribute("ball-finder");
      this.hmdTextEl.setAttribute(
        "text",
        "value:Out of Bounds!\nRespawning...;align:center;"
      );
      this.hmdTextEl.emit("cuehmdtextin");
      setTimeout(() => {
        this.hmdTextEl.emit("cuehmdtextout");
        setTimeout(() => {
          this.hmdTextEl.setAttribute("text", `value:;`);
        }, 2000);
      }, 2000);
      await this.newBall(
        `${this.lastHit.x} ${this.lastHit.y} ${this.lastHit.z}`
      );
    }
  },

  globalRAF(callback) {
    const xrSession = this.el.sceneEl.renderer.xr?.getSession();
    if (!xrSession) return window.requestAnimationFrame(callback);
    return xrSession.requestAnimationFrame(callback);
  },

  newBall: function (newballposition) {
    return new Promise((resolve, reject) => {
      if (this.ballEl) this.ballEl.remove();
      const newBallEl = document.createElement("a-sphere");
      newBallEl.setAttribute("id", "ball");
      newBallEl.setAttribute("radius", ".0275");
      newBallEl.setAttribute("position", newballposition);
      newBallEl.setAttribute("material", "color: white; src: #ball-texture;");
      newBallEl.setAttribute(
        "physx-body",
        "type:dynamic;mass:2.0; emitCollisionEvents:true;angularDamping:0.7;linearDamping:.7;highPrecision: true;"
      );
      //turn down the bounce to smooth out the floor effect, crank it up on the walls so the bounce at angles works --colin
      newBallEl.setAttribute(
        "physx-material",
        "restitution:0.2; dynamicFriction: .1; staticFriction: .85; contactOffset: 0.0025;"
      );
      newBallEl.setAttribute(
        "trail",
        "width:.075;length:100;resolution:10;color:blue;"
      );
      newBallEl.setAttribute(
        "sound",
        "src:#BallSoundSrc;autoplay:false;poolSize:4;"
      );

      this.ballEl = newBallEl;
      this.el.sceneEl.appendChild(this.ballEl);
      this.ballEl.addEventListener(
        "contactbegin",
        this.collisionHandler.bind(this)
      );
      this.ballFinderEl.setAttribute("ball-finder", "");
      this.ballEl.object3D.matrixNeedsUpdate = true;

      // RAF To make sure ball position update takes place
      this.globalRAF(() => {
        resolve();
      });
    });
  },

  updateWatch: function () {
    const watch = document.querySelector("[watch-face]");

    watch.setAttribute("watch-face", {
      holeNumber: this.activeHoleIndex + 1,
      holeScore: this.activeHoleScore,
      holePar: this.courseColliders[this.activeHoleIndex].dataset.par,
      totalScore: this.scores.reduce((a, b) => parseInt(a) + parseInt(b)),
    });
  },

  collisionHandler: function (e) {
    if (
      e.detail.otherComponent.el.className.includes("club") &&
      this.puttDebounce == false
    ) {
      this.putt();
    } else if (e.detail.otherComponent.el.id == "oob") {
      this.outOfBounds();
    } else {
      // TODO: modulate bounce sound depending on velocity of ball
      this.ballEl.components.sound.playSoundBound();
    }
  },

  restartGame(instant = false) {
    // Reset overall game state
    this.gameOver = false;

    let params = new URLSearchParams(document.location.search);
    let hole = parseInt(params.get("hole"));
    this.activeHoleIndex = hole ? hole - 1 : 0;
    this.scores = new Array(this.courseColliders.length).fill("0");

    // Hide the credits or endscreen content
    // this.credits.setAttribute("visible", false);
    // this.credits.emit("pauseCredits", null, true);
    this.driveInScreen.setAttribute("visible", "true");
    this.creditsScreen.setAttribute("visible", "false");
    this.moviesEl.play();
    this.creditsEl.pause();

    // Start Next Game
    this.nextHole(instant);

    // Track analytics of user choice to restart
    gtag("event", "restartGame");
  },

  tick: function (t, dt) {
    if (!this.holeOver) {
      if (!this.holeOver) {
        /* THIS IS THE WIN CONDITION CHECK! */
        let intersects;
        if (this.ballEl) {
          let ballPos = this.ballEl.object3D.position;
          const distToFlag = ballPos.distanceTo(this.flagEl.object3D.position);
          if (distToFlag < 0.135) {
            console.log("within .15 distance!");
            this.madePutt();
          }
          // Next, position and rotate the blob shadows for the ball and club
          this.ballShadowRaycaster.set(ballPos, this.downVector);
          intersects = this.ballShadowRaycaster.intersectObject(
            this.activeFloor.object3D
          ); // Get intersection
          if (intersects.length > 0) {
            const distanceToFloorIntersect = ballPos.distanceTo(
              intersects[0].point
            );

            const fadeMax = 1.0;
            const fadeMin = 0.75;
            let fadeAsRatioOfDistance =
              fadeMin + distanceToFloorIntersect * 0.5;
            if (fadeAsRatioOfDistance > fadeMax)
              fadeAsRatioOfDistance = fadeMax;

            this.ballShadowEl.object3D.position.set(
              intersects[0].point.x,
              intersects[0].point.y + 0.01,
              intersects[0].point.z
            );
            const shader =
              this.ballShadowEl.components["shadow-shader"].material;
            shader.uniforms.fade.value = fadeAsRatioOfDistance;

            // Align the shadow plane to the normal of the floor intersection
            this.ballShadowEl.object3D.up.copy(intersects[0].face.normal);
            var ballShadowLookVector = this.ballShadowEl.object3D
              .localToWorld(new THREE.Vector3())
              .add(intersects[0].face.normal);
            this.ballShadowEl.object3D.lookAt(ballShadowLookVector);
          } else
            this.ballShadowEl.object3D.position.set(
              ballPos.x,
              ballPos.y - 0.0255,
              ballPos.z
            );
        }
        let clubHeadCenterPos = new THREE.Vector3();
        this.clubHeadCenterEl.object3D.getWorldPosition(clubHeadCenterPos);
        this.clubShadowRaycaster.set(clubHeadCenterPos, this.downVector); // Cast down from the club head world pos
        intersects = this.clubShadowRaycaster.intersectObject(
          this.activeFloor.object3D
        ); // Get intersection
        if (intersects.length > 0) {
          const distanceToFloorIntersect = clubHeadCenterPos.distanceTo(
            intersects[0].point
          );
          const fadeMax = 0.9;
          const fadeMin = 0.4;
          let fadeAsRatioOfDistance = fadeMin + distanceToFloorIntersect * 0.5;
          if (fadeAsRatioOfDistance > fadeMax) fadeAsRatioOfDistance = fadeMax;

          this.clubShadowEl.object3D.position.set(
            intersects[0].point.x,
            intersects[0].point.y + 0.011,
            intersects[0].point.z
          );

          const shader = this.clubShadowEl.components["shadow-shader"].material;
          shader.uniforms.fade.value = fadeAsRatioOfDistance;

          // Align the shadow plane to the normal of the floor intersection
          this.clubShadowEl.object3D.up.copy(intersects[0].face.normal);
          var clubShadowLookVector = this.clubShadowEl.object3D
            .localToWorld(new THREE.Vector3())
            .add(intersects[0].face.normal);
          this.clubShadowEl.object3D.lookAt(clubShadowLookVector);
        } else
          this.clubShadowEl.object3D.position.set(
            clubHeadCenterPos.x,
            0.101,
            clubHeadCenterPos.z
          );

        /* Check every 200 ticks to see if ball is further than 2m from the player,
           highlight ball w/ halo animation if so. Align positions rather than attaching as a
           child element of the ball b/c we don't want to inherit the ball's rotation */
        this.tickCounter++;
        if (this.tickCounter === 200 && this.ballEl) {
          const distToPlayer = this.ballEl.object3D.position.distanceTo(
            this.cameraRig.object3D.position
          );
          if (distToPlayer > 2) {
            const angularVelocity =
              this.ballEl.components[
                "physx-body"
              ]?.rigidBody.getAngularVelocity();
            if (angularVelocity) {
              const velocity = new THREE.Vector3(0, 0, 0).distanceTo(
                angularVelocity
              );
              if (velocity == 0) {
                this.ballHaloEl.object3D.position.copy(
                  this.ballEl.object3D.position
                );
                this.ballHaloEl.emit("highlightBall");
              }
              // } else {  // no physx on the ball, probably debug mode
              //   this.ballHaloEl.setAttribute("position", this.ballEl.object3D.position)
              //   this.ballHaloEl.emit("highlightBall");
            }
          } else if (this.ballHaloEl.components) {
            this.ballHaloEl.emit("pauseHighlight");
            this.ballHaloEl.setAttribute("scale", ".001 .001 .001");
          }
          this.tickCounter = 0;
        }
      }
    }
  },
});
