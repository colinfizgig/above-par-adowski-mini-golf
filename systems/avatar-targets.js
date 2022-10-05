/** @format */

AFRAME.registerSystem("avatar-targets", {
  init: function () {
    this.tickHanders = [];
    this.lookDirectionGroundTarget = this._createLookDirectionGroundTarget();
  },

  createStaticWorldLookDirectionGroundTarget() {
    const snapTarget = new THREE.Group();

    //HELPER
    // const helperMesh = new THREE.Mesh(
    //   new THREE.BoxGeometry(0.25, 0.25, 0.25),
    //   new THREE.MeshBasicMaterial({ color: "red" })
    // );
    // snapTarget.add(helperMesh);

    this.el.sceneEl.object3D.add(snapTarget);

    const update = () => {
      console.log("UPDATING");
      const groundTargetWorldPosition = new THREE.Vector3();
      this.lookDirectionGroundTarget.getWorldPosition(
        groundTargetWorldPosition
      );

      const worldQuaternion = new THREE.Quaternion();
      this.lookDirectionGroundTarget.getWorldQuaternion(worldQuaternion);

      const worldPositionToLocal = this.el.sceneEl.object3D.worldToLocal(
        groundTargetWorldPosition
      );

      snapTarget.position.set(
        worldPositionToLocal.x,
        worldPositionToLocal.y,
        worldPositionToLocal.z
      );
      snapTarget.setRotationFromQuaternion(worldQuaternion);
      snapTarget.matrixNeedsUpdate = true;
    };

    update();

    return {
      target: snapTarget,
      update: update,
    };
  },

  _createLookDirectionGroundTarget() {
    const snapPivot = new THREE.Group();
    const snapTarget = new THREE.Group();
    snapTarget.position.add(new THREE.Vector3(0, 0.1, -1));

    // const helperMesh = new THREE.Mesh(
    //   new THREE.BoxGeometry(0.5, 0.55, 0.5),
    //   new THREE.MeshBasicMaterial({ color: "orange" })
    // );
    // snapTarget.add(helperMesh);

    snapPivot.add(snapTarget);
    this.el.sceneEl.object3D.add(snapPivot);

    this.tickHanders.push(() => {
      const avatarRigWorld = new THREE.Vector3();
      document
        .querySelector("#cameraRig")
        .object3D.getWorldPosition(avatarRigWorld);
      const avatarPovWorld = new THREE.Vector3();
      document.querySelector("#head").object3D.getWorldPosition(avatarPovWorld);
      avatarPovWorld.y = avatarRigWorld.y;

      const avatarPovLocalToScene =
        this.el.sceneEl.object3D.worldToLocal(avatarPovWorld);
      snapPivot.position.set(
        avatarPovLocalToScene.x,
        avatarPovLocalToScene.y,
        avatarPovLocalToScene.z
      );
      snapPivot.matrixNeedsUpdate = true;

      const cameraDirection = new THREE.Vector3();
      this.el.sceneEl.camera.getWorldDirection(cameraDirection);
      const cameraLookRotationInRadians = Math.atan2(
        cameraDirection.x,
        cameraDirection.z
      );

      snapPivot.rotation.y = cameraLookRotationInRadians + Math.PI;
      snapPivot.matrixNeedsUpdate = true;
    });

    return snapTarget;
  },

  tick: function () {
    for (const handler of this.tickHanders) {
      handler();
    }
  },
});
