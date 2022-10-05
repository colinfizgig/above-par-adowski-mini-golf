/** @format */

AFRAME.registerComponent("tutorial", {
  schema: {},
  init: function () {
    console.log("INIT TUTORIAL");

    //target
    this.tutorialTarget =
      this.el.sceneEl.systems[
        "avatar-targets"
      ].createStaticWorldLookDirectionGroundTarget();

    //mainbox
    const boxWidth = 3 / 2;
    const boxHeight = 2.5 / 2;
    const boxDepth = 0.1;
    this.mybox = new THREE.Mesh(
      new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth),
      new THREE.MeshBasicMaterial({ color: "green" })
    );
    this.tutorialTarget.target.add(this.mybox);
    this.mybox.updateMatrix();
    this.mybox.position.set(0, 1, -0.75);
    this.tutorialPosition = this.tutorialTarget.target.position;

    //next button
    const buttonWidth = boxWidth / 4;
    const buttonHeight = boxHeight / 4;
    this.nextBtn = new THREE.Mesh(
      new THREE.BoxGeometry(buttonWidth, buttonHeight, boxDepth),
      new THREE.MeshBasicMaterial({ color: "orange" })
    );
    this.mybox.add(this.nextBtn);
    this.nextBtn.updateMatrix();
    const buttonPosX = boxWidth / 2 - buttonWidth / 2;
    const buttonPosY = -boxHeight / 2 - -buttonHeight / 2;
    this.nextBtn.position.set(buttonPosX, buttonPosY, boxDepth / 2);

    //close button
    this.closeBtn = new THREE.Mesh(
      new THREE.BoxGeometry(buttonHeight, buttonHeight, boxDepth),
      new THREE.MeshBasicMaterial({ color: "orange" })
    );
    this.mybox.add(this.closeBtn);
    this.closeBtn.updateMatrix();
    const closePosX = boxWidth / 2 - buttonHeight / 2;
    const closePosY = boxHeight / 2 - buttonHeight / 2;
    this.closeBtn.position.set(closePosX, closePosY, boxDepth / 2);
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
