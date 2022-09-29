AFRAME.registerSystem("handedness", {
  schema: {
    hand: { default: "right", type: "string" },
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
  },

  addPhysics(el) {
    el.querySelector(".club-head-container").setAttribute(
      "physx-body",
      "type:kinematic;highPrecision:true;"
    );
    el.querySelector(".club-head-container").setAttribute(
      "physx-material",
      "restitution:.6;"
    );
    el.querySelector(".club-head").setAttribute("physx-no-collision", "");
    el.querySelector(".club-collider").setAttribute(
      "physx-hidden-collision",
      ""
    );
    el.setAttribute("raycaster", "objects:.floor;showLine:false;far:1.5;");
  },

  removePhysics(el) {
    el.querySelector(".club-collider").removeAttribute(
      "physx-hidden-collision"
    );
    el.querySelector(".club-head").removeAttribute("physx-no-collision");
    el.querySelector(".club-head-container").removeAttribute("physx-material");
    el.querySelector(".club-head-container").removeAttribute("physx-body");
    el.removeAttribute("raycaster");
  },

  updateClubVisuals(hand) {
    const leftController = document.querySelector("#left-controller");
    const rightController = document.querySelector("#right-controller");
    const clubR = document.querySelector("#club-right");
    const clubL = document.querySelector("#club-left");

    if (hand === "right") {
      leftController.setAttribute("visible", "false");
      rightController.setAttribute("visible", "true");
      this.removePhysics(clubL);
      this.addPhysics(clubR);
      document
        .querySelector(".floor")
        .setAttribute("ground-listener", "handedness: right;");
    } else if (hand === "left") {
      leftController.setAttribute("visible", "true");
      rightController.setAttribute("visible", "false");
      this.removePhysics(clubR);
      this.addPhysics(clubL);
      document
        .querySelector(".floor")
        .setAttribute("ground-listener", "handedness: left;");
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
