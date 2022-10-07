/** @format */

AFRAME.registerComponent("tutorial", {
  schema: {},
  init: function () {
    console.log("INIT TUTORIAL");

    this.fontKnockout =
      "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/knockout-htf48-featherweight-webfont.woff?v=1664908792370";

    //   new THREE.MeshBasicMaterial({
    //     map: loader.load(
    //       "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tutorial_bg.png?v=1665001918390"
    //     ),
    //     transparent: true,
    //     depthWrite: false,
    //   })
    // this.buttonWidth = this.boxWidth / 3;
    // this.buttonHeight = this.boxHeight / 5;
    // this.buttonPosX = this.boxWidth / 2 - this.buttonWidth / 2;
    // this.buttonPosY = -this.boxHeight / 2 - -this.buttonHeight / 2;

    //general values
    this.boxWidth = 3;
    this.boxHeight = 1.75;
    this.boxDepth = 0.1;
    this.offWhite = "#FFFFD5";
    this.yellow = "#ECEC43";
    this.green = "#1CB134";

    //target
    this.tutorialTarget =
      this.el.sceneEl.systems[
        "avatar-targets"
      ].createStaticWorldLookDirectionGroundTarget();

    this.tutorialPosition = this.tutorialTarget.target.position;

    this.tutorialContent = [
      {
        header: "A few tips before you tee off. ",
        icon1:
          "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tut1.png?v=1665089713416",
        iconWidth: 0.13,
        iconHeight: 0.13,
        body: "Take a look at your watch any time to track your strokes and see your score.",
        id: "tut1",
      },
      {
        header: "A few tips before you tee off. ",
        icon1:
          "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tut2.png?v=1665089713417",
        iconWidth: 0.7,
        iconHeight: 0.13,
        body: "Press the X/Y or A/B buttons on either  controller to change your club hand. ",
        id: "tut2",
      },
      {
        header: "A few tips before you tee off. ",
        icon1:
          "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tut3.png?v=1665089713417",
        iconWidth: 0.4,
        iconHeight: 0.13,
        body: "Use the joystick to navigate manually, or use the trigger to teleport directly to the ball. ",
        id: "tut3",
      },
    ];

    this.tutIndex = 0;
    this.useButtons = true;

    this.createContent();

    //tutorial header text
    document.addEventListener("advanced-tutorial", () => {
      this.removeContent();
      this.createContent();
    });

    this.touchControllerR = document.querySelector(
      `[oculus-touch-controls="hand:right;model:false;"]`
    );
    this.touchControllerL = document.querySelector(
      `[oculus-touch-controls="hand:left;model:false;"]`
    );

    this.touchControllerR.addEventListener("abuttondown", () => {
      if (this.useButtons) {
        this.advanceTutorial();
      }
    });
    this.touchControllerR.addEventListener("bbuttondown", () => {
      if (this.useButtons) {
        this.advanceTutorial();
      }
    });
    this.touchControllerL.addEventListener("xbuttondown", () => {
      if (this.useButtons) {
        this.advanceTutorial();
      }
    });
    this.touchControllerL.addEventListener("ybuttondown", () => {
      if (this.useButtons) {
        this.advanceTutorial();
      }
    });
  },

  advanceTutorial() {
    console.log(this.tutIndex);
    if (this.tutIndex == 2) {
      this.useButtons = false;
      document.removeEventListener("advanced-tutorial", () => {});
      this.removeContent();
      this.removeBase();
    } else {
      this.tutIndex += 1;
      document.dispatchEvent(new Event("advanced-tutorial"));
    }
  },

  createContent() {
    //TUTORIAL BASE
    this.tutBase = document.createElement("a-plane");
    this.tutBase.setAttribute("width", this.boxWidth);
    this.tutBase.setAttribute("height", this.boxHeight);
    this.tutBase.setAttribute("depth", this.boxDepth);
    this.tutBase.setAttribute("position", "0 1 -1");
    this.tutBase.setAttribute("visible", true);
    this.tutBase.setAttribute("color", "white");
    this.tutBase.setAttribute("material", {
      src: "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tutorial_bg.png?v=1665001918390",
      transparent: true,
      flatshading: true,
    });
    this.tutBase.object3D.updateMatrix();
    this.el.sceneEl.appendChild(this.tutBase);
    this.tutBase.setAttribute("no-tonemapping", "");
    this.tutBase.classList.add("tutBase");
    this.tutBase.addEventListener("loaded", () => {
      this.tutorialTarget.target.add(this.tutBase.object3D);
      this.tutBase.object3D.updateMatrix();
    });

    //TEXT: HEADER
    const headerText = document.createElement("a-entity");
    headerText.setAttribute("troika-text", {
      value: this.tutorialContent[this.tutIndex]?.header,
      fontSize: 0.1,
      color: this.yellow,
      font: this.fontKnockout,
      align: "center",
    });
    headerText.setAttribute("position", `0 0.05 0.01`);
    headerText.classList.add("headerText");
    this.tutBase.appendChild(headerText);

    //TEXT: BODY
    const bodyText = document.createElement("a-entity");
    bodyText.setAttribute("troika-text", {
      value: this.tutorialContent[this.tutIndex]?.body,
      fontSize: 0.08,
      color: this.offWhite,
      font: this.fontKnockout,
      align: "center",
      maxWidth: 1,
    });
    bodyText.setAttribute("position", `0 -0.35 0.01`);
    bodyText.classList.add("bodyText");
    this.tutBase.appendChild(bodyText);

    //ICON
    const tutIcon1 = document.createElement("a-plane");
    tutIcon1.setAttribute(
      "width",
      this.tutorialContent[this.tutIndex]?.iconWidth
    );
    tutIcon1.setAttribute(
      "height",
      this.tutorialContent[this.tutIndex]?.iconHeight
    );
    tutIcon1.setAttribute("material", {
      src: this.tutorialContent[this.tutIndex]?.icon1,
      transparent: true,
    });
    tutIcon1.setAttribute("position", `0 -0.15 0.01`);
    tutIcon1.setAttribute("no-tonemapping", "");
    tutIcon1.classList.add("tutIcon1");

    this.tutBase.appendChild(tutIcon1);
  },

  removeContent() {
    const bodyText = document.querySelector(".bodyText");
    const headerText = document.querySelector(".headerText");
    const tutIcon = document.querySelector(".tutIcon1");

    if (bodyText) {
      bodyText.parentNode.removeChild(bodyText);
    }

    if (headerText) {
      headerText.parentNode.removeChild(headerText);
    }

    if (tutIcon) {
      tutIcon.parentNode.removeChild(tutIcon);
    }
  },

  removeBase() {
    const tutBase = document.querySelector(".tutBase");
    this.tutBase.setAttribute("visible", false);
    // console.log(this.tutBase.object3D.visible);
    // console.log(this.tutBase.parentNode);
    // tutBase.object3D?.parent.remove(tutBase.object3D);
    // tutBase?.parentNode.removeChild(tutBase.object3D);
    console.log("parent before", this.tutBase.object3D.parent);
    this.tutBase.object3D.parent.remove(this.tutBase.object3D);
    console.log("parent after", this.tutBase.object3D.parent);
  },

  tick() {
    const avatarRigWorld = new THREE.Vector3();
    document
      .querySelector("#cameraRig")
      .object3D.getWorldPosition(avatarRigWorld);
    const avatarPovWorld = new THREE.Vector3();
    document.querySelector("#head").object3D.getWorldPosition(avatarPovWorld);
    avatarPovWorld.y = avatarRigWorld.y;

    const avatarPovLocalToScene =
      this.el.sceneEl.object3D.worldToLocal(avatarPovWorld);

    this.distanceFromCameraToModal = avatarPovLocalToScene.distanceTo(
      this.tutorialPosition
    );

    if (this.distanceFromCameraToModal > 4) {
      this.tutorialTarget.update();
    }
  },
});

//next button
// const nextBtn = document.createElement("a-box");
// nextBtn.setAttribute("width", buttonWidth);
// nextBtn.setAttribute("height", buttonHeight);
// nextBtn.setAttribute("depth", boxDepth);
// nextBtn.setAttribute("color", "#FF1D00");
// nextBtn.classList.add("clickable");
// nextBtn.object3D.updateMatrix();
// tutBase.appendChild(nextBtn);
// nextBtn.setAttribute(
//   "position",
//   `${buttonPosX} ${buttonPosY} ${boxDepth / 2}`
// );

// //next button text
// const nextText = document.createElement("a-entity");
// nextText.setAttribute("troika-text", {
//   value: "next",
//   fontSize: 0.3,
//   color: offWhite,
//   font: fontKnockout,
//   align: "center",
// });
// nextText.setAttribute("position", `0 0 ${boxDepth / 2 + 0.01}`);
// nextBtn.appendChild(nextText);

//onclick index += 1
//if > 2 = 0

//close btn
// const closeBtn = document.createElement("a-box");
// closeBtn.setAttribute("width", buttonHeight);
// closeBtn.setAttribute("height", buttonHeight);
// closeBtn.setAttribute("depth", boxDepth);
// closeBtn.setAttribute("color", "#FF1D00");
// closeBtn.object3D.updateMatrix();
// tutBase.appendChild(closeBtn);
// const closeX = boxWidth / 2 - buttonHeight / 2;
// const closeY = boxHeight / 2 - buttonHeight / 2;
// closeBtn.setAttribute("position", `${closeX} ${closeY} ${boxDepth / 2}`);

// //close button icon
// const closeIcon = document.createElement("a-plane");
// closeIcon.setAttribute("width", buttonHeight / 2);
// closeIcon.setAttribute("height", buttonHeight / 2);
// closeIcon.setAttribute("material", {
//   src: new THREE.TextureLoader().load(
//     "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/close.png?v=1664901648952"
//   ),
//   transparent: true,
// });
// closeIcon.setAttribute("position", `0 0 0.1`);
// closeBtn.appendChild(closeIcon);
