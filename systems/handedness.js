AFRAME.registerSystem("handedness", {
  schema: {
    hand: { default: "none", type: "string" },
  },

  init: function () {
    this.touchControllerR = document.querySelector(
      `[oculus-touch-controls="hand:right;model:false;"]`
    );
    this.touchControllerL = document.querySelector(
      `[oculus-touch-controls="hand:left;model:false;"]`
    );

    this.touchControllerR.addEventListener("abuttondown", () => {
      this.setHand("right");
    });
    this.touchControllerR.addEventListener("bbuttondown", () => {
      this.setHand("right");
    });

    this.touchControllerL.addEventListener("xbuttondown", () => {
      this.setHand("left");
    });
    this.touchControllerL.addEventListener("ybuttondown", () => {
      this.setHand("left");
    });

    // Might be a better way to check for ready
    document.addEventListener("DOMContentLoaded", (event) => {
      this.setHand("right");
    });
  },

  updateClubVisuals(hand) {
    const leftController = document.querySelector("#left-controller");
    const rightController = document.querySelector("#right-controller");
    const clubWrapper = document.querySelector("#club-wrapper");

    if (hand === "right") {
      rightController.object3D.add(clubWrapper.object3D);
      clubWrapper.object3D.scale.set(1, 1, 1);
    } else if (hand === "left") {
      leftController.object3D.add(clubWrapper.object3D);
      clubWrapper.object3D.scale.set(-1, 1, 1);
    }
  },

  setHand(hand) {
    // Only change hands if hand isn't correct
    if (hand != this.data.hand) {
      this.data.hand = hand;

      this.updateClubVisuals(hand);

      document.dispatchEvent(
        new CustomEvent("handedness-changed", { detail: { hand: hand } })
      );
    }
  },
});
