/** @format */

// ! Might be able to use something like this in the future. For now made the targets system functions

// class SnapTarget {
//   constructor(parent, offset, helper = false, tickHandler = null) {
//     this.tickHandler = tickHandler;
//     this.target = new THREE.Group();
//     this.target.position.add(offset);

//     if (helper) {
//       const helperMesh = new THREE.Mesh(
//         new THREE.BoxGeometry(0.25, 0.25, 0.25),
//         new THREE.MeshBasicMaterial({ color: "red" })
//       );
//       this.target.add(helperMesh);
//     }

//     parent.add(this.target);
//   }
// }

// ! TODO: Im not really happy with this system, come back if time to make this more re-useable:
// The targets are fairly single use for retail, no way to pass in or modify distances
// The static targets use the single use ones, although at least you can make more than one of those

AFRAME.registerSystem("avatar-targets", {
  init: async function () {
    this.tickHanders = [];
    this.faceStickingTarget = this._createFaceStickingTarget();
    this.lookDirectionGroundTarget = this._createLookDirectionGroundTarget();
    console.log("avatar target init");
  },

  _createFaceStickingTarget() {
    const target = new THREE.Group();
    target.position.add(new THREE.Vector3(0, 0.1, -1));

    // const helperMesh = new THREE.Mesh(
    //   new THREE.BoxGeometry(0.25, 0.25, 0.25),
    //   new THREE.MeshBasicMaterial({ color: "red" })
    // );
    // target.add(helperMesh);

    this.el.sceneEl.camera.add(target);

    return target;
  },

  createStaticWorldLookDirectionGroundTarget() {
    const snapTarget = new THREE.Group();

    // const helperMesh = new THREE.Mesh(
    //   new THREE.BoxGeometry(0.25, 0.25, 0.25),
    //   new THREE.MeshBasicMaterial({ color: "red" })
    // );
    // snapTarget.add(helperMesh);

    this.el.sceneEl.object3D.add(snapTarget);

    const update = () => {
      // TODO! Should probably do this with inverse matrix rather than this way so it includes an exact space transformation
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
    //   new THREE.BoxGeometry(0.25, 0.25, 0.25),
    //   new THREE.MeshBasicMaterial({ color: "blue" })
    // );
    // snapTarget.add(helperMesh);

    snapPivot.add(snapTarget);
    this.el.sceneEl.object3D.add(snapPivot);

    this.tickHanders.push(() => {
      // * Start Comment: This is only needed because Hubs treats teleports to waypoints differently than other teleports...  *//
      const avatarRigWorld = new THREE.Vector3();
      document
        .querySelector("#avatar-rig")
        .object3D.getWorldPosition(avatarRigWorld);
      const avatarPovWorld = new THREE.Vector3();
      document
        .querySelector("#avatar-pov-node")
        .object3D.getWorldPosition(avatarPovWorld);
      avatarPovWorld.y = avatarRigWorld.y;

      const avatarPovLocalToScene =
        this.el.sceneEl.object3D.worldToLocal(avatarPovWorld);
      snapPivot.position.set(
        avatarPovLocalToScene.x,
        avatarPovLocalToScene.y,
        avatarPovLocalToScene.z
      );
      snapPivot.matrixNeedsUpdate = true;
      // * End Comment * //

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
    if (this.ready) {
      for (const handler of this.tickHanders) {
        handler();
      }
    }
  },
});
