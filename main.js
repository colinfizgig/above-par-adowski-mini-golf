/**
 * /* jshint esversion: 9
 *
 * @format
 */

/* global THREE, AFRAME, gtag, Stats */
import "./systems/handedness.js";
import "./systems/avatar-targets.js";
import "./components/putt.js";
import "./components/watch-face.js";
import "./components/shadow-shader.js";
import "./components/tutorial.js";
import "./components/endgame.js";

document.addEventListener("DOMContentLoaded", (event) => {
  document.querySelector("a-scene").setAttribute("webxr", {
    optionalFeatures: "dom-overlay",
    overlayElement: "#dom-overlay",
  });
});

/* This component automatically sets club height based on raycast intersections w/ the floor */
AFRAME.registerComponent("ground-listener", {
  schema: {},
  init: function () {
    this.raycasterEl;
    this.clubShaft = document.querySelector("#club-wrapper .club-shaft");
    this.clubHeadContainer = document.querySelector(
      "#club-wrapper .club-head-container"
    );
    this.clubShaft.object3D.scale.setZ(1.15 - 0.13);
    this.clubHeadContainer.object3D.position.setZ(-1.15 + 0.13);
    // Use events to figure out what raycaster is listening
    this.el.addEventListener("raycaster-intersected", (evt) => {
      this.raycasterEl = evt.detail.el;
    });
    this.el.addEventListener("raycaster-intersected-cleared", (evt) => {
      this.raycasterEl = null;
    });
  },

  tick: function () {
    if (!this.raycasterEl) return; // Not intersecting.
    let intersection = this.raycasterEl.components.raycaster.getIntersection(
      this.el
    );
    if (!intersection) return;
    this.clubShaft.object3D.scale.setZ(intersection.distance - 0.13);
    this.clubHeadContainer.object3D.position.setZ(
      -intersection.distance + 0.13
    );
  },
});

/* This is a compass-like 3D arrow that scales up and points to the ball when
    the user is looking away from the ball (i.e. when the ball is outside the camera frustum). */
AFRAME.registerComponent("ball-finder", {
  init: function () {
    this.frustum = new THREE.Frustum();
    this.helperAvailable = true;
    this.helperScaledUp = false;
    this.el.addEventListener("animationcomplete__turnon", () => {
      // console.log("turnon animationcomplete")
      this.helperAvailable = true;
      this.helperScaledUp = true;
    });

    this.el.addEventListener("animationcomplete__turnoff", () => {
      // console.log("turnoff animationcomplete")
      this.helperAvailable = true;
      this.helperScaledUp = false;
    });
    this.tick = AFRAME.utils.throttleTick(this.tick, 20, this);
  },

  // I wonder if there is a cheaper way to do this - throttling tick for now;
  tick: function () {
    // reconstruct camera frustum since I don't think I can get it from sceneEl.camera directly
    const matrix = new THREE.Matrix4().multiplyMatrices(
      this.el.sceneEl.camera.projectionMatrix,
      this.el.sceneEl.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(matrix);
    const ball = document.querySelector("#ball");
    if (ball) {
      const ballPos = ball.object3D.position;
      this.el.object3D.lookAt(ballPos);
      if (this.frustum.containsPoint(ballPos)) {
        // console.log("in view")
        if (this.helperAvailable && this.helperScaledUp) {
          this.helperAvailable = false;
          this.el.emit("turnoff");
        }
      } else {
        // console.log("out of view")
        if (this.helperAvailable && !this.helperScaledUp) {
          this.helperAvailable = false;
          this.el.emit("turnon");
        }
      }
    }
  },
});

// The shader used for the fade-to-black effect
AFRAME.registerShader("fade", {
  schema: {
    color: { type: "vec3", is: "uniform" },
    intensity: {
      type: "number",
      default: 0.0,
      max: 1.0,
      min: 0.0,
      is: "uniform",
    },
  },
  vertexShader:
    "void main() {" +
    "vec3 newPosition = position * 2.0;" +
    "gl_Position = vec4(newPosition, 1.0);" +
    "}",
  fragmentShader:
    "uniform vec3 color;" +
    "uniform float intensity;" +
    "void main() {" +
    "gl_FragColor = vec4(color, intensity);" +
    "}",
});

// The primitive used to display the above shader on a plane
AFRAME.registerPrimitive("head-occlusion-fader", {
  defaultComponents: {
    material: { shader: "fade", transparent: true, depthTest: false },
    geometry: { primitive: "plane" },
    "head-occlusion": { property: "material.intensity" },
  },
  mappings: {
    objects: "head-occlusion.objects",
  },
});

/**
 * Haptics component for A-Frame.
 */
AFRAME.registerComponent("haptics", {
  schema: {
    actuatorIndex: { default: 0 },
    dur: { default: 100 },
    enabled: { default: true },
    events: { type: "array" },
    eventsFrom: { type: "string" },
    force: { default: 1 },
  },

  multiple: true,

  init: function () {
    var data = this.data;
    var i;

    this.callPulse = () => {
      this.pulse();
    };

    var doInit = () => {
      this.gamepad = this.el.components["tracked-controls"].controller;
      if (this.gamepad.gamepad) {
        // WebXR.
        this.gamepad = this.gamepad.gamepad;
      }
      if (
        !this.gamepad ||
        !this.gamepad.hapticActuators ||
        !this.gamepad.hapticActuators.length
      ) {
        return;
      }
      this.addEventListeners();
    };

    // There may exist a tracked-controls when this component is initialized
    if (
      this.el.components["tracked-controls"] &&
      this.el.components["tracked-controls"].controller
    ) {
      doInit();
    } else {
      this.el.addEventListener("controllerconnected", async () => {
        await this.WaitForController().then(() => {
          doInit();
        });
      });
    }
  },

  async WaitForController() {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (this.el.components["tracked-controls"].controller) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  },

  remove: function () {
    this.removeEventListeners();
  },

  pulse: function (force, dur) {
    var actuator;
    var data = this.data;
    if (!data.enabled || !this.gamepad || !this.gamepad.hapticActuators) {
      return;
    }
    actuator = this.gamepad.hapticActuators[data.actuatorIndex];
    actuator.pulse(force || data.force, dur || data.dur);
  },

  addEventListeners: function () {
    var data = this.data;
    var i;
    var listenTarget;

    listenTarget = data.eventsFrom
      ? document.querySelector(data.eventsFrom)
      : this.el;
    for (i = 0; i < data.events.length; i++) {
      listenTarget.addEventListener(data.events[i], this.callPulse);
    }
  },

  removeEventListeners: function () {
    var data = this.data;
    var i;
    var listenTarget;

    listenTarget = data.eventsFrom
      ? document.querySelector(data.eventsFrom)
      : this.el;
    for (i = 0; i < data.events.length; i++) {
      listenTarget.removeEventListener(data.events[i], this.callPulse);
    }
  },
});

/**
 * Animate the UV offset of a mesh's material
 * @component uv-scroll
 */
AFRAME.registerComponent("uv-scroll", {
  schema: {
    speed: { type: "vec2", default: { x: 0, y: 0.0003 } },
    increment: { type: "vec2", default: { x: 0, y: 0 } },
  },

  init: async function () {
    this.uvScrollSystem = new UVScrollSystem();
    this.createScrollHandler = this.playScroll.bind(this);
    this.removeScrollHandler = this.removeScroll.bind(this);

    setTimeout(() => {
      this.createScrollHandler();
    }, 2000);
  },

  tick(t, dt) {
    this.uvScrollSystem.tick(dt * 1000);
  },

  removeScroll: function () {
    if (this.map) {
      const itemToRemove = registeredTextures.indexOf(this.map);
      registeredTextures.splice(itemToRemove, 1);
    }
  },

  playScroll() {
    let mesh =
      this.el.getObject3D("mesh") ||
      this.el.getObject3D("skinnedmesh") ||
      this.el.object3D.getObjectByProperty("isMesh", true);
    mesh = mesh.children[0]; // asset setup as a group, so the actual mesh w/ mesh.material is the first child
    const material = mesh && mesh.material;
    if (material) {
      // We store mesh here instead of the material directly because we end up swapping out the material in injectCustomShaderChunks.
      // We need material in the first place because of MobileStandardMaterial
      const instance = { component: this, mesh };

      this.instance = instance;
      this.map = material.map || material.emissiveMap;

      if (this.map && !textureToData.has(this.map)) {
        textureToData.set(this.map, {
          offset: new THREE.Vector2(),
          instances: [instance],
        });
        registeredTextures.push(this.map);
      } else if (!this.map) {
        console.warn(
          "Ignoring uv-scroll added to mesh with no scrollable texture."
        );
      } else {
        console.warn(
          "Multiple uv-scroll instances added to objects sharing a texture, only the speed/increment from the first one will have any effect"
        );
        textureToData.get(this.map).instances.push(instance);
      }
    }
  },

  pause() {
    if (this.map) {
      const instances = textureToData.get(this.map).instances;
      instances.splice(instances.indexOf(this.instance), 1);
      // If this was the last uv-scroll component for a given texture
      if (!instances.length) {
        textureToData.delete(this.map);
        registeredTextures.splice(registeredTextures.indexOf(this.map), 1);
      }
    }
  },
});

const textureToData = new Map();
const registeredTextures = [];

class UVScrollSystem {
  tick(dt) {
    for (let i = 0; i < registeredTextures.length; i++) {
      const map = registeredTextures[i];
      const { offset, instances } = textureToData.get(map);
      const { component } = instances[0];

      offset.addScaledVector(component.data.speed, dt / 1000);

      offset.x = offset.x % 1.0;
      offset.y = offset.y % 1.0;

      const increment = component.data.increment;
      map.offset.x = increment.x
        ? offset.x - (offset.x % increment.x)
        : offset.x;
      map.offset.y = increment.y
        ? offset.y - (offset.y % increment.y)
        : offset.y;
    }
  }
}
