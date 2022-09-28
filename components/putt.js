AFRAME.registerComponent("putt", {
  // Game logic!
  schema: {
    handedness: { default: "right", type: "string" },
  },
  init: function () {
    // Player els:
    this.clubRightEl = document.querySelector("#club-right");
    this.clubLeftEl = document.querySelector("#club-left");
    this.clubHeadCenterEl = this.clubRightEl.querySelector(".club-head-center");
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
    // this.shadowRaycaster = new THREE.Raycaster();
    this.ballShadowRaycaster = new THREE.Raycaster();
    this.clubShadowRaycaster = new THREE.Raycaster();
    // Course and scene els:
    this.ballEl = document.querySelector("#ball");
    this.ballShadowEl = document.querySelector("#ball-shadow");
    this.ballHaloEl = document.querySelector("#ballHalo");
    this.flagEl = document.querySelector("#flag");
    this.courseColliders = document.querySelectorAll(".colliders");
    this.blocker = document.querySelector("#blocker");
    this.credits = document.querySelector("#credits");
    this.ballParticles = document.querySelector("#ballParticles");
    this.floors = document.querySelectorAll(".floor");
    this.activeFloor = document.querySelector(".floor");
    // SFX els:
    this.eagleSoundEl = document.querySelector("#eagle-sound");
    this.birdieSoundEl = document.querySelector("#birdie-sound");
    this.parSoundEl = document.querySelector("#par-sound");
    this.bogeySoundEl = document.querySelector("#bogey-sound");
    this.doubleBogeySoundEl = document.querySelector("#double-bogey-sound");
    this.tripleBogeySoundEl = document.querySelector("#triple-bogey-sound");
    // Game logic and scoring stuff:
    this.holeOver = false;
    this.gameOver = false;
    this.puttDebounce = false;
    this.scores = new Array(this.courseColliders.length).fill("0"); // score array for as many holes as we have
    this.activeHoleScore = 0;
    this.activeHoleIndex = 0;
    this.scores[this.activeHoleIndex] = 0;
    this.totalParScore = 0;
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

    this.updateWatch();

    // Set up listener for first ball collisions
    this.ballEl.addEventListener(
      "contactbegin",
      this.collisionHandler.bind(this)
    );

    // Start the animated blocker, which can't autoplay due to setting the startEvents prop
    this.blocker.emit("startanimup", null, true);

    this.el.addEventListener("loaded", () => {
      this.ballFinderEl.setAttribute("ball-finder", ""); // Don't start ball-finding until the scene loads

      // let colliderMat = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.FrontSide });
      // for (let i = 0; i < this.courseColliders.length; i++) {
      //   this.courseColliders[i].object3D.traverse(node => {
      //     if (node.isMesh) node.material = colliderMat;
      //   });
      // }
    });

    // Don't start listening to raycaster until VR is entered
    this.el.addEventListener("enter-vr", function () {
      document.querySelector(".floor").setAttribute("ground-listener", "");
      gtag("event", "enteredVR");
    });
    this.el.addEventListener("exit-vr", function () {
      document.querySelector(".floor").removeAttribute("ground-listener");
      gtag("event", "exitedVR");
    });

    // On trigger, teleport to ball - logic in handler below. WIP since rotation is still weird.
    this.touchControllerR.addEventListener(
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
      const pos = this.ballEl.object3D.position;
      // WASD ball controls but with IJKL
      if (event.code == "KeyJ") {
        this.ballEl.setAttribute(
          "position",
          `${pos.x - 0.25}, ${pos.y}, ${pos.z}`
        );
      } else if (event.code == "KeyL") {
        this.ballEl.setAttribute(
          "position",
          `${pos.x + 0.25}, ${pos.y}, ${pos.z}`
        );
      } else if (event.code == "KeyI") {
        this.ballEl.setAttribute(
          "position",
          `${pos.x}, ${pos.y}, ${pos.z - 0.25}`
        );
      } else if (event.code == "KeyK") {
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
  },

  teleportToBall: async function () {
    // console.log("triggerdown called teleportToBall");
    // this.faderEl.emit("cuefadeout");
    const ballPos = this.ballEl.object3D.position; // {x: 0, y: 0.125, z: -1.25}
    const flagPos = this.flagEl.object3D.position; // {x: 0, y: 0.125, z: -8}
    const dir = new THREE.Vector3().subVectors(flagPos, ballPos).normalize();
    dir.cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(1); // cross ball-to-hole vector with up vector, normalize, multiply scalar 1m
    if (this.data.handedness === "right")
      dir.subVectors(ballPos, dir); // if right-handed, subVectors
    else dir.addVectors(ballPos, dir); // if left-handed, addVectors
    this.cameraRig.object3D.position.copy(dir); // location is correct!

    // Rotate player towards the ball
    console.log(this.el.sceneEl.camera);
    const cameraDirection = new THREE.Vector3();

    this.el.sceneEl.camera.getWorldDirection(cameraDirection); //Already normalized
    // console.log(cameraDirection);
    // cameraDirection.normalize();
    // console.log(cameraDirection);
    // const cameraLookRotationInRadians = Math.atan2(
    //   cameraDirection.x,
    //   cameraDirection.z
    // );

    cameraDirection.y = 0;

    const directionOfUserToBall = new THREE.Vector3()
      .subVectors(ballPos, this.cameraRig.object3D.position)
      .normalize();

    directionOfUserToBall.y = 0;

    var quaternion = new THREE.Quaternion(); // create one and reuse it

    quaternion.setFromUnitVectors(cameraDirection, directionOfUserToBall);

    this.cameraRig.object3D.applyQuaternion(quaternion);
    this.cameraRig.object3D.matrixNeedsUpdate = true;

    // const matrix = new THREE.Matrix4();
    // const axis = new THREE.Vector3(0, 1, 0);
    // axis.cross(cameraDirection, directionOfUserToBall);
    // const angle = cameraDirection.angleTo(directionOfUserToBall);
    // matrix.makeRotationAxis(axis, angle);
    // this.cameraRig.object3D.applyMatrix(matrix);
    // this.cameraRig.object3D.matrixNeedsUpdate = true;

    // CLOSEST START
    // let angle = cameraDirection.angleTo(directionOfUserToBall);

    // this.cameraRig.object3D.rotation.y += angle;
    // this.cameraRig.object3D.matrixNeedsUpdate = true;

    // CLOSEST END

    // console.log(angle);

    // TODO: figure out appropriate lookAt vector
    // A bunch of misbegotten attempts to rotate the player. */

    // // First guess:
    // const lookDir = new THREE.Vector3().subVectors(ballPos, this.cameraRig.object3D.position).normalize();
    // const euler = new THREE.Euler().setFromVector3(new THREE.Vector3(0, lookDir.y, 0).normalize());  // should work, right? But it faces opposite the ball.
    // // this.cameraRig.object3D.lookAt(ballPos.negate());  // negate is the negative of the vector,
    // console.log(ballPos)
    // console.log(this.cameraRig.object3D.rotation)
    // // this.head.object3D.lookAt(ballPos);  // tried various negative values, no luck
    // this.cameraRig.object3D.setRotationFromEuler(euler);
    // // Also tried:
    // // console.log(this.cameraRig.object3D.position)
    // const euler = new THREE.Euler().setFromVector(lookDir);
    // // this.cameraRig.object3D.setRotationFromEuler(euler)
    // this.cameraRig.setAttribute("rotation", `0 ${lookDir.y} 0`); // this works once, but rotation on that rig breaks

    // await new Promise(resolve => setTimeout(resolve, 1000));
    // this.faderEl.emit("cuefadein");
    // await new Promise(resolve => setTimeout(resolve, 1000));
  },

  putt: function () {
    if (!this.puttDebounce) {
      console.log("PUTT");
      this.puttDebounce = true;
      this.activeHoleScore++;
      this.scores[this.activeHoleIndex] = this.activeHoleScore;
      this.updateWatch();
      if (this.data.handedness === "right") {
        this.touchControllerR.components.haptics.pulse(0.75, 200);
      } else this.touchControllerR.components.haptics.pulse(0.75, 200);
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
      this.ballFinderEl.removeAttribute("ball-finder");
      this.courseColliders[this.activeHoleIndex].removeAttribute("physx-body"); // remove colliders so the ball "falls through the hole"
      this.courseColliders[this.activeHoleIndex]
        .querySelector(".floor")
        .removeAttribute("physx-body"); // remove colliders so the ball "falls through the hole"
      this.flagEl.components.sound.playSoundBound();
      if (this.data.handedness === "right") {
        this.touchControllerR.components.haptics.pulse(1, 1000);
      } else this.touchControllerR.components.haptics.pulse(1, 1000);
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
      // if there are more holes, apply colliders
      await new Promise((resolve) => setTimeout(resolve, 4000)); // wait for the helper text notification to fade
      this.flagEl.components["particle-system"].stopParticles();
      this.faderEl.emit("cuefadeout");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.courseColliders[this.activeHoleIndex - 1].setAttribute(
        "visible",
        "false"
      );
      this.courseColliders[this.activeHoleIndex - 1]
        .querySelector(".floor")
        .removeAttribute("ground-listener");
      this.courseColliders[this.activeHoleIndex - 1]
        .querySelector(".floor")
        .classList.remove("floor");
      //this.courseColliders[this.activeHoleIndex].setAttribute("visible", "true");
      this.courseColliders[this.activeHoleIndex].setAttribute(
        "physx-body",
        "type:static;angularDamping:.8;linearDamping:.8"
      );
      this.courseColliders[this.activeHoleIndex].setAttribute(
        "physx-material",
        "restitution:.99; dynamicFriction:.25; staticFriction:.65;"
      );
      //add different physics for floor since it should be a different material anyway basically turn off the bounce -- colin
      this.courseColliders[this.activeHoleIndex]
        .querySelector(".floor")
        .setAttribute(
          "physx-material",
          "restitution:0.05; dynamicFriction:.1; staticFriction:.85;"
        );

      this.courseColliders[this.activeHoleIndex]
        .querySelector(".floor")
        .setAttribute("ground-listener", "");
      this.updateWatch();
      this.flagEl.setAttribute(
        "position",
        this.courseColliders[this.activeHoleIndex].dataset.flag
      );
      this.cameraRig.setAttribute(
        "position",
        this.courseColliders[this.activeHoleIndex].dataset.startpos
      );
      this.cameraRig.setAttribute("rotation", "0 0 0");
      this.faderEl.emit("cuefadein");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.newBall(this.courseColliders[this.activeHoleIndex].dataset.balldrop);
      this.holeOver = false;
    } else {
      // game over
      this.gameOver = true;
      this.credits.setAttribute("visible", true);
      this.credits.emit("rollCredits", null, true);
      gtag("event", "finishedGame");
    }
  },

  parHandler: function (score) {
    let parScore =
      score - this.courseColliders[this.activeHoleIndex].dataset.par;
    console.log(parScore);
    this.totalParScore += parScore;
    console.log(this.totalParScore);
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

  outOfBounds: function () {
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
      this.newBall(this.courseColliders[this.activeHoleIndex].dataset.balldrop);
    }
  },

  newBall: function (newballposition) {
    this.ballEl.remove();
    setTimeout(() => {
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
        "restitution:0.2; dynamicFriction: .1; staticFriction: .85;"
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
    }, 500);
  },

  updateWatch: function () {
    let watchString = "Above\nPar-adowski\n";
    watchString += "Hole #" + (this.activeHoleIndex + 1).toString() + "\n";
    watchString +=
      "Par " +
      this.courseColliders[this.activeHoleIndex].dataset.par.toString() +
      "\n";
    watchString += "Score: " + this.activeHoleScore.toString() + "\n";
    watchString += "Overall: " + this.totalParScore.toString() + "\n";
    this.watchTextEl.setAttribute("text", `value:${watchString};`);
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

  tick: function (t, dt) {
    if (!this.holeOver) {
      if (!this.holeOver) {
        /* THIS IS THE WIN CONDITION CHECK! */
        let ballPos = this.ballEl.object3D.position;
        const distToFlag = ballPos.distanceTo(this.flagEl.object3D.position);
        if (distToFlag < 0.135) {
          console.log("within .15 distance!");
          this.madePutt();
        }

        // Next, position and rotate the blob shadows for the ball and club
        this.ballShadowRaycaster.set(ballPos, new THREE.Vector3(0, -1, 0)); // TODO: don't instantiate a new V3, figure out Vector3.down syntax
        let intersects = this.ballShadowRaycaster.intersectObject(
          this.activeFloor.object3D
        ); // Get intersection
        if (intersects.length > 0) {
          this.ballShadowEl.object3D.position.set(
            intersects[0].point.x,
            intersects[0].point.y + 0.01,
            intersects[0].point.z
          );
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

        let clubHeadCenterPos = new THREE.Vector3();
        this.clubHeadCenterEl.object3D.getWorldPosition(clubHeadCenterPos);
        this.clubShadowRaycaster.set(
          clubHeadCenterPos,
          new THREE.Vector3(0, -1, 0)
        ); // Cast down from the club head world pos
        intersects = this.clubShadowRaycaster.intersectObject(
          this.activeFloor.object3D
        ); // Get intersection
        if (intersects.length > 0) {
          this.clubShadowEl.object3D.position.set(
            intersects[0].point.x,
            intersects[0].point.y + 0.01,
            intersects[0].point.z
          );
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
        if (this.tickCounter === 200) {
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
