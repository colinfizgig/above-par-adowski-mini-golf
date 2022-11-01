/** @format */

/**
 * Match the object with this component to another's world transform.  Current DOES NOT support scale.
 */
AFRAME.registerComponent("match-world-transform", {
  schema: {
    objectToMatch: { type: "selector" },
    offsetQuaternion: { type: "array" }, //Have to toArray -> fromArray due to aframe stringify
  },
  init: function () {},

  tick() {
    if (this.data.objectToMatch) {
      // Setup holder variables
      const cubeWorldQuaternion = new THREE.Quaternion();
      const cubeWorldPosition = new THREE.Vector3();

      // Set the world transforms into holders
      this.data.objectToMatch.getWorldPosition(cubeWorldPosition);
      this.data.objectToMatch.getWorldQuaternion(cubeWorldQuaternion);

      // Apply offsets if specified
      const offsetQuaternion = new THREE.Quaternion().fromArray(
        this.data.offsetQuaternion
      );
      cubeWorldQuaternion.multiply(offsetQuaternion);

      // Set object to match transform
      this.el.object3D.position.set(
        cubeWorldPosition.x,
        cubeWorldPosition.y,
        cubeWorldPosition.z
      );
      this.el.object3D.setRotationFromQuaternion(cubeWorldQuaternion);
    }
  },
});
