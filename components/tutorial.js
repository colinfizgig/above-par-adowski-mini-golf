/** @format */

AFRAME.registerComponent("tutorial", {
  schema: {
    activeHoleIndex: { type: "number", default: 0 },
  },
  init: function () {
    //general values
    this.fontKnockout =
      "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/knockout-htf48-featherweight-webfont.woff?v=1664908792370";
    this.boxWidth = 2.2 * 0.75;
    this.boxHeight = 1.2 * 0.75;
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

    this.el.sceneEl.renderer.toneMappingExposure = 1.2;
    this.el.sceneEl.renderer.gammaFactor = 2.2;

    this.circleButtonContent = {
      icon: "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tut2.png?v=1665089713417",
      iconWidth: 0.35,
      iconHeight: 0.065,
    };

    this.desktopTutorialContent = [
      {
        header: "Take a mulligan.",
        body:
            "This is a WebXR game meant to be played on\nvirtual reality headsets like Meta Quest 2,\n" +
            "but desktop players can use keyboard\n and mouse to explore the course!",
        id: "desktopTut",
      }
    ]

    // this.mobileTutorialContent = [
    //   {
    //     header: "Take a mulligan.",
    //     body:
    //         "This is a WebXR game meant to be played on\nvirtual reality headsets like Meta Quest 2,\n" +
    //         "but mobile players can pinch-and-zoom to explore the course!",
    //     id: "desktopTut",
    //   }
    // ]

    this.tutorialContent = [
      {
        header: "A few tips before you tee off.",
        icon1:
          "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tut1.png?v=1665089713416",
        iconWidth: 0.13,
        iconHeight: 0.18,
        body:
          "Take a look at your watch any time to track\nyour strokes and see your score.\n\n" +
          "Press                                               to continue.",
        id: "tut1",
      },
      {
        header: "A few tips before you tee off.",
        icon1:
          "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tut2.png?v=1665089713417",
        iconWidth: 0.7,
        iconHeight: 0.13,
        body:
          "Press the X/Y or A/B buttons on either\ncontroller to change your club hand.\n\n" +
          "Press                                               to continue.",
        id: "tut2",
      },
      {
        header: "A few tips before you tee off.",
        icon1:
          "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tut3.png?v=1665089713417",
        iconWidth: 0.4,
        iconHeight: 0.13,
        body:
          "Use the joystick to navigate manually, or\nuse the trigger to teleport directly to the ball.\n\n" +
          "Press                                               to continue.",
        id: "tut3",
      },
    ];

    this.tutIndex = 0;
    this.useButtons = true;

    console.log("active hole", this.data.activeHoleIndex);
    if (this.data.activeHoleIndex == 0) {
      if (AFRAME.utils.device.checkHeadsetConnected()) this.createVRContent();
      else {
        this.createDesktopContent();
      }
    }

    //tutorial header text
    document.addEventListener("advanced-tutorial", () => {
      this.removeContent();
      this.createVRContent();
    });

    this.touchControllerR = document.querySelector("#right-controller");
    this.touchControllerL = document.querySelector("#left-controller");

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

    document.addEventListener("keydown", (event) => {
      console.log("onkeydown Button " + event.code);
      if (event.code == "KeyG") {
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

  createContentBase() {
    //TUTORIAL BASE
    this.tutBase = document.createElement("a-plane");
    this.tutBase.setAttribute("width", this.boxWidth);
    this.tutBase.setAttribute("height", this.boxHeight);
    this.tutBase.setAttribute("depth", this.boxDepth);
    this.tutBase.setAttribute("position", "-.375 1.86 -1.7");
    this.tutBase.setAttribute("visible", true);
    this.tutBase.setAttribute("color", "white");
    this.tutBase.setAttribute("material", {
      src: "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tutorial_bg_v008.png?v=1666645719488",
      flatshading: true,
    });
    this.tutBase.object3D.updateMatrix();
    this.el.sceneEl.appendChild(this.tutBase);
    this.tutBase.classList.add("tutBase");
    this.tutBase.addEventListener("loaded", () => {
      if (AFRAME.utils.device.checkHeadsetConnected()) {
        this.tutorialTarget.target.add(this.tutBase.object3D);
        this.tutBase.object3D.updateMatrix();
      } else {
        this.tutBase.setAttribute("position", "-15 2.285 2.425");
        this.tutBase.setAttribute("rotation", "0 -90 0");
        this.tutBase.object3D.updateMatrix();
      }
    });
  },

  createDesktopContent() {
    this.createContentBase();

    //TEXT: HEADER
    const headerText = document.createElement("a-entity");
    headerText.setAttribute("troika-text", {
      value: this.desktopTutorialContent[this.tutIndex]?.header,
      fontSize: 0.1,
      color: this.yellow,
      font: this.fontKnockout,
      align: "center",
    });
    headerText.setAttribute("position", `${-this.boxWidth / 5} 0.225 0.01`);
    headerText.classList.add("headerText");
    this.tutBase.appendChild(headerText);

    //TEXT: BODY
    const bodyText = document.createElement("a-entity");
    bodyText.setAttribute("troika-text", {
      value: this.desktopTutorialContent[this.tutIndex]?.body,
      fontSize: 0.065,
      color: this.offWhite,
      font: this.fontKnockout,
      align: "center",
      maxWidth: 1,
      lineHeight: 1.2,
    });
    bodyText.setAttribute("position", `${-this.boxWidth / 5} -.1 0.01`);
    bodyText.classList.add("bodyText");
    this.tutBase.appendChild(bodyText);
  },

  createVRContent() {
    this.createContentBase();

    //TEXT: HEADER
    const headerText = document.createElement("a-entity");
    headerText.setAttribute("troika-text", {
      value: this.tutorialContent[this.tutIndex]?.header,
      fontSize: 0.1,
      color: this.yellow,
      font: this.fontKnockout,
      align: "center",
    });
    headerText.setAttribute("position", `${-this.boxWidth / 5} 0.275 0.01`);
    headerText.classList.add("headerText");
    this.tutBase.appendChild(headerText);

    //TEXT: BODY
    const bodyText = document.createElement("a-entity");
    bodyText.setAttribute("troika-text", {
      value: this.tutorialContent[this.tutIndex]?.body,
      fontSize: 0.065,
      color: this.offWhite,
      font: this.fontKnockout,
      align: "center",
      maxWidth: 1,
      lineHeight: 1.2,
    });
    bodyText.setAttribute("position", `${-this.boxWidth / 5} -0.2 0.01`);
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
      flatshading: true,
    });
    tutIcon1.setAttribute("position", `${-this.boxWidth / 5} 0.09 0.01`);
    tutIcon1.classList.add("tutIcon1");

    this.tutBase.appendChild(tutIcon1);

    //ICON
    const circleButtonIcons = document.createElement("a-plane");
    circleButtonIcons.setAttribute("width", this.circleButtonContent.iconWidth);
    circleButtonIcons.setAttribute(
      "height",
      this.circleButtonContent.iconHeight
    );
    circleButtonIcons.setAttribute("material", {
      src: this.circleButtonContent.icon,
      transparent: true,
      flatshading: true,
    });
    circleButtonIcons.setAttribute(
      "position",
      ` ${-this.boxWidth / 5 - 0.05} -0.32 0.01`
    );
    circleButtonIcons.classList.add("tutIcon2");

    this.tutBase.appendChild(circleButtonIcons);
  },

  removeContent() {
    const bodyText = document.querySelector(".bodyText");
    const headerText = document.querySelector(".headerText");
    const tutIcon = document.querySelector(".tutIcon1");
    const circleButtonIcons = document.querySelector(".circleButtonIcons");

    if (bodyText) {
      bodyText.parentNode.removeChild(bodyText);
    }

    if (headerText) {
      headerText.parentNode.removeChild(headerText);
    }

    if (tutIcon) {
      tutIcon.parentNode.removeChild(tutIcon);
    }

    if (circleButtonIcons) {
      circleButtonIcons.parentNode.removeChild(circleButtonIcons);
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
