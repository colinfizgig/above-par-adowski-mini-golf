/** @format */

AFRAME.registerComponent("tutorial", {
  schema: {
    activeHoleIndex: { type: "number", default: 0 },
  },
  init: function () {
    //general values
    this.fontKnockout =
      "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/knockout-htf48-featherweight-webfont.woff?v=1664908792370";
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

    this.el.sceneEl.renderer.toneMappingExposure = 1;
    this.el.sceneEl.renderer.gammaFactor = 2.2;

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

    console.log("active hole", this.data.activeHoleIndex);
    if (this.data.activeHoleIndex == 0) {
      this.createContent();
    }

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
    if (this.tutIndex == 2) {
      this.useButtons = false;
      document.removeEventListener("advanced-tutorial", () => {});
      this.removeContent();
      this.removeBase();
      document.dispatchEvent(new Event("remove-tutorial"));
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
    this.tutBase.setAttribute("position", "0 2 -1.5");
    this.tutBase.setAttribute("visible", true);
    this.tutBase.setAttribute("color", "white");
    this.tutBase.setAttribute("material", {
      src: "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tutorial_bg.png?v=1665001918390",
      transparent: true,
      flatshading: true,
    });
    this.tutBase.object3D.updateMatrix();
    this.el.sceneEl.appendChild(this.tutBase);
    this.tutBase.classList.add("tutBase");
    this.tutBase.addEventListener("loaded", () => {
      this.tutorialTarget.target.add(this.tutBase.object3D);
      this.tutBase.object3D.updateMatrix();
    });

    //TUTORIAL BASE
    this.container = document.createElement("a-plane");
    this.container.setAttribute("width", this.boxWidth);
    this.container.setAttribute("height", this.boxHeight);
    this.container.setAttribute("position", "0 2 -1.5");
    this.container.setAttribute("visible", true);
    this.container.setAttribute("color", "white");
    this.container.setAttribute("material", {
      transparent: true,
      opacity: 0.0,
    });
    this.container.object3D.updateMatrix();
    this.el.sceneEl.appendChild(this.container);
    this.container.classList.add("container");
    this.container.addEventListener("loaded", () => {
      this.tutorialTarget.target.add(this.container.object3D);
      this.container.object3D.updateMatrix();
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
    this.container.appendChild(headerText);

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
    this.container.appendChild(bodyText);

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
    tutIcon1.classList.add("tutIcon1");

    this.container.appendChild(tutIcon1);
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
    this.tutBase.object3D.parent.remove(this.tutBase.object3D);
    this.tutorialTarget.target.parent.remove(this.tutorialTarget.target);
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
