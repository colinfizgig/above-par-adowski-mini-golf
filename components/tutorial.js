/** @format */
import { Text } from "troika-three-text";

AFRAME.registerComponent("tutorial", {
  schema: {},
  init: function () {
    console.log("INIT TUTORIAL");

    const fontKnockout =
      "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/knockout-htf48-featherweight-webfont.woff?v=1664908792370";

    //   new THREE.MeshBasicMaterial({
    //     map: loader.load(
    //       "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tutorial_bg.png?v=1665001918390"
    //     ),
    //     transparent: true,
    //     depthWrite: false,
    //   })

    //target
    this.tutorialTarget =
      this.el.sceneEl.systems[
        "avatar-targets"
      ].createStaticWorldLookDirectionGroundTarget();

    //general values
    const boxWidth = 2;
    const boxHeight = 1;
    const boxDepth = 0.1;
    const buttonWidth = boxWidth / 3;
    const buttonHeight = boxHeight / 5;
    const buttonPosX = boxWidth / 2 - buttonWidth / 2;
    const buttonPosY = -boxHeight / 2 - -buttonHeight / 2;
    const btnTextSize = 0.3;
    const bodyTextSize = 0.1;
    const offWhite = "#FFFFD5";
    const yellow = "#ECEC43";
    const green = "#1CB134";

    this.tutorialPosition = this.tutorialTarget.target.position;

    //tutorial base plane
    const tutBase = document.createElement("a-box");
    tutBase.setAttribute("width", boxWidth);
    tutBase.setAttribute("height", boxHeight);
    tutBase.setAttribute("depth", boxDepth);
    tutBase.setAttribute("position", "0 1 -1");
    tutBase.setAttribute("color", green);
    // tutBase.setAttribute("material", materials);
    // tutBase.object3D.material.set(materials);
    tutBase.object3D.updateMatrix();
    this.el.sceneEl.appendChild(tutBase);
    tutBase.addEventListener("loaded", () => {
      this.tutorialTarget.target.add(tutBase.object3D);
      tutBase.object3D.updateMatrix();
    });

    const tutorialContent = [
      {
        header: "A few tips before you tee off. ",
        icon1:
          "https://cdn.glitch.global/f43e6264-95fc-43e8-8049-dc53b985b1e3/tut1.png?v=1665089713416",
        iconWidth: 0.5,
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

    let index = 2;

    //tutorial header text
    const headerText = document.createElement("a-entity");
    headerText.setAttribute("troika-text", {
      value: tutorialContent[index].header,
      fontSize: 0.1,
      color: yellow,
      font: fontKnockout,
      align: "center",
    });
    headerText.setAttribute("position", `0 0.2 ${boxDepth / 2 + 0.01}`);
    tutBase.appendChild(headerText);

    //bodyText
    const bodyText = document.createElement("a-entity");
    bodyText.setAttribute("troika-text", {
      value: tutorialContent[index].body,
      fontSize: 0.08,
      color: offWhite,
      font: fontKnockout,
      align: "center",
      maxWidth: 1,
    });
    bodyText.setAttribute("position", `0 -0.2 ${boxDepth / 2 + 0.01}`);
    tutBase.appendChild(bodyText);

    //icon
    const tutIcon1 = document.createElement("a-plane");
    tutIcon1.setAttribute("width", tutorialContent[index].iconWidth);
    tutIcon1.setAttribute("height", tutorialContent[index].iconHeight);
    tutIcon1.setAttribute("material", {
      src: tutorialContent[index].icon1,
      transparent: true,
    });
    tutIcon1.setAttribute("position", `0 0 ${boxDepth / 2 + 0.01}`);
    tutBase.appendChild(tutIcon1);
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
      console.log("out of bounds");
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
