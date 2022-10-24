/** @format */
import "aframe-rounded";

AFRAME.registerComponent("endgame", {
  schema: {},
  init: function () {
    this.fontKnockout =
      "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/knockout-htf48-featherweight-webfont.woff?v=1664908792370";

    this.circleButtonContent = {
      icon:
          "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tut2.png?v=1665089713417",
      iconWidth: 0.375,
      iconHeight: 0.07,
    };

    //general values
    this.offWhite = "#FFFFD5";
    this.yellow = "#ECEC43";
    this.green = "#1CB134";

    //target
    this.endGameTarget =
      this.el.sceneEl.systems[
        "avatar-targets"
      ].createStaticWorldLookDirectionGroundTarget();

    this.tutorialPosition = this.endGameTarget.target.position;

    // this.createContent();

    this.touchControllerR = document.querySelector(
      `[oculus-touch-controls="hand:right;model:false;"]`
    );
    this.touchControllerL = document.querySelector(
      `[oculus-touch-controls="hand:left;model:false;"]`
    );

    this.touchControllerR.addEventListener("abuttondown", () => {
      this.el.sceneEl.components["putt"].restartGame();
    });
    this.touchControllerR.addEventListener("bbuttondown", () => {
      this.el.sceneEl.components["putt"].restartGame();
    });
    this.touchControllerL.addEventListener("xbuttondown", () => {
      this.el.sceneEl.components["putt"].restartGame();
    });
    this.touchControllerL.addEventListener("ybuttondown", () => {
      this.el.sceneEl.components["putt"].restartGame();
    });
  },

  createContent() {
    //ENDGAME BASE
    const baseWidth = 1;
    const baseHeight = 1;
    this.endBase = document.createElement("a-rounded");
    this.endBase.setAttribute("width", baseWidth);
    this.endBase.setAttribute("height", baseHeight);
    this.endBase.setAttribute("position", `${-baseWidth / 2} 1 -1.5`);
    this.endBase.setAttribute("visible", true);
    this.endBase.setAttribute(
      "material",
      "color:#1CB134; roughness: 0; opacity: 1; flatShading: true;"
    );
    this.endBase.setAttribute("radius", "0.1");
    this.endBase.setAttribute("no-tonemapping", "");
    this.endBase.object3D.updateMatrix();
    this.el.sceneEl.appendChild(this.endBase);
    this.endBase.classList.add("endBase");
    this.endBase.addEventListener("loaded", () => {
      this.endGameTarget.target.add(this.endBase.object3D);
      this.endBase.object3D.updateMatrix();
    });

    //ENDGAME CONTENT PARENT
    this.container = document.createElement("a-plane");
    this.container.setAttribute("width", baseWidth);
    this.container.setAttribute("height", baseHeight);
    this.container.setAttribute("position", `0 1.5 -1.5`);
    this.container.setAttribute("visible", true);
    this.container.setAttribute(
      "material",
      "color:#1CB134; transparent:true; opacity: 0;"
    );
    this.container.object3D.updateMatrix();
    this.el.sceneEl.appendChild(this.container);
    this.container.classList.add("container");
    this.container.addEventListener("loaded", () => {
      this.endGameTarget.target.add(this.container.object3D);
      this.container.object3D.updateMatrix();
    });

    //TEXT: HEADER
    const headerText = document.createElement("a-entity");
    headerText.setAttribute("troika-text", {
      value: "Nice round! You shot a",
      fontSize: 0.08,
      color: this.offWhite,
      font: this.fontKnockout,
      align: "center",
    });
    headerText.setAttribute("position", `0 0.35 0.015`);
    headerText.classList.add("headerText");
    this.container.appendChild(headerText);

    //TEXT: BODY
    this.finalScore = this.el.sceneEl.components["putt"].getScore().toString();
    const scoreText = document.createElement("a-entity");
    scoreText.setAttribute("troika-text", {
      value: this.finalScore,
      fontSize: 0.7,
      color: this.yellow,
      font: this.fontKnockout,
      align: "center",
      maxWidth: 1,
    });
    scoreText.setAttribute("position", `0 0 0.015`);
    scoreText.classList.add("scoreText");
    this.container.appendChild(scoreText);

    //TEXT: BOTTOM TEXT
    const playAgainText = document.createElement("a-entity");
    playAgainText.setAttribute("troika-text", {
      value: "Press                                         to play again",
      fontSize: 0.08,
      color: this.offWhite,
      font: this.fontKnockout,
      align: "center",
    });
    playAgainText.setAttribute("position", `0 -0.35 0.015`);
    playAgainText.classList.add("playAgainText");
    this.container.appendChild(playAgainText);

    //ICON
    const circleButtonIcons = document.createElement("a-plane");
    circleButtonIcons.setAttribute(
        "width",
        this.circleButtonContent.iconWidth
    );
    circleButtonIcons.setAttribute(
        "height",
        this.circleButtonContent.iconHeight
    );
    circleButtonIcons.setAttribute("material", {
      src: this.circleButtonContent.icon,
      transparent: true,
      flatshading: true,
    });
    circleButtonIcons.setAttribute("position", `-.07 -0.35 0.01`);
    circleButtonIcons.classList.add("tutIcon2");
    this.container.appendChild(circleButtonIcons);
  },

  removeContent() {
    const scoreText = document.querySelector(".scoreText");
    const headerText = document.querySelector(".headerText");
    const playAgainText = document.querySelector(".playAgainText");

    if (scoreText) {
      scoreText.parentNode.removeChild(scoreText);
    }
    if (headerText) {
      headerText.parentNode.removeChild(headerText);
    }
    if (playAgainText) {
      playAgainText.parentNode.removeChild(playAgainText);
    }

    this.endBase.setAttribute("visible", false);
    this.endBase.object3D.parent.remove(this.endBase.object3D);
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
      this.endGameTarget.update();
    }
  },
});
