/** @format */

const mainMenu = document.querySelector(".main-menu");
const playInVrIntro = document.querySelector("#playInVr");
const mainIntro = document.querySelector(".introBtn");
const howToPlayButtonMain = document.querySelector("#howToPlayButtonMain");
const mainInGame = document.querySelector(".gameplayButtons");
const resumeBtn = document.querySelector("#resumeBtn");
const startOverBtn = document.querySelector("#startOverBtn");
const aboutButton = document.querySelector(".aboutBtn");
const scenePreviewCam = document.querySelector("#scene-preview");
const scenePreviewCamTrack = document.querySelector("#scene-preview-track");

const introModal = document.querySelector(".intro-modal");
const myInterface = document.querySelector("#my-interface");
const aboutContent = document.querySelector("#aboutContent");
const howToContent = document.querySelector("#howToContent");
const howToPlayButtonModal = document.querySelector("#howToPlayButtonModal");
const closeBtn = document.querySelector(".closeBtn");
const playInVrAbout = document.querySelector("#playInVrAbout");
const playInVrHowTo = document.querySelector("#playInVrHowTo");
const birdieSoundEl = document.querySelector("#birdie-effect-sound");

function shuffleArray(array) {
  let curId = array.length;
  // There remain elements to shuffle
  while (0 !== curId) {
    // Pick a remaining element
    let randId = Math.floor(Math.random() * curId);
    curId -= 1;
    // Swap it with the current element.
    let tmp = array[curId];
    array[curId] = array[randId];
    array[randId] = tmp;
  }
  return array;
}

const backingTracks = document.querySelectorAll(".backing-track");
const backingTracksArray = shuffleArray(Array.from(backingTracks)); // create an array from the node list and shuffle it
let trackIndex = 0;
let trackCount = backingTracks.length;
let backingTrack = backingTracksArray[trackIndex];

let playNextTrack = () => {
  trackIndex++;
  if (trackIndex == trackCount) trackIndex = 0;
  backingTrack = backingTracksArray[trackIndex];
  backingTrack.play();
};

for (var i = 0; i < trackCount; i++) {
  let t = backingTracksArray[i];
  t.volume = 0.25;
  t.addEventListener("ended", playNextTrack);
}

// const backingTrack = document.querySelector("#backing-track");
// backingTrack.volume = 0.5;

let movementType = "teleport";
const cameraRig = document.querySelector("#cameraRig");

// If the user is teleporting disable movement-controls in XR
const sceneEl = document.querySelector("a-scene");
sceneEl.addEventListener("enter-vr", function () {
  backingTrack.play();
  scenePreviewCam.setAttribute("camera", "active:false;");
  head.setAttribute("camera", "active:true;");
  if (
    movementType === "teleport" &&
    AFRAME.utils.device.checkHeadsetConnected()
  ) {
    cameraRig.setAttribute("movement-controls", "enabled", false);
  }
});
sceneEl.addEventListener("exit-vr", function () {
  cameraRig.setAttribute("movement-controls", "enabled", true);
  mainMenu.style = "display:block;";
  mainIntro.style = "display:block;";
  mainInGame.style = "display:none;";
});

hideMe(mainInGame);

document.addEventListener("exit-vr", function () {
  showMainInGame();
});

playInVrIntro.onclick = function () {
  birdieSoundEl.play();
  startGame();
};

const playOnDesktopBtn = document.querySelector("#playOnDesktop");
if (playOnDesktopBtn)
  playOnDesktopBtn.onclick = function () {
    birdieSoundEl.play();
    startDesktopGame();
  };

function startDesktopGame() {
  window.APDesktopMode = true;
  hideMainMenu();
  closeModal();
  backingTrack.play();
  scenePreviewCam.removeAttribute("animation");
  scenePreviewCam.setAttribute("camera", "active:false;");
  document.querySelector("#head").setAttribute("camera", "active:true;");
  sceneEl.emit("start-desktop-game");
}

aboutButton.onclick = function () {
  hideMainMenu();
  showAbout();
};

howToPlayButtonMain.onclick = function () {
  hideMainMenu();
  showHowTo();
};

resumeBtn.onclick = function () {
  if (window.APDesktopMode) {
    hideMainMenu();
    return;
  }
  sceneEl.enterVR();
  hideMainMenu();
};

startOverBtn.onclick = function () {
  if (window.APDesktopMode) hideMainMenu();
  document.dispatchEvent(new Event("restart-game"));
};

closeBtn.onclick = function () {
  closeModal();
  showMainIntro();
};

playInVrAbout.onclick = function () {
  startGame();
};

howToPlayButtonModal.onclick = function () {
  showHowTo();
};

playInVrHowTo.onclick = function () {
  startGame();
};

function startGame() {
  hideMainMenu();
  backingTrack.play();
  if (!AFRAME.utils.device.isMobile()) {
    closeModal();
    sceneEl.enterVR();
  } else {
    scenePreviewCam.removeAttribute("animation");
    scenePreviewCamTrack.setAttribute("animation-mixer", "");
    let trackCube = null;
    scenePreviewCamTrack.object3D.traverse((obj) => {
      if (obj.name == "Cube") trackCube = obj;
    });

    if (trackCube) {
      const offsetQuaternion = new THREE.Quaternion();
      offsetQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -90);

      scenePreviewCam.setAttribute("match-world-transform", {
        objectToMatch: trackCube,
        offsetQuaternion: offsetQuaternion.toArray(),
      });

      closeModal();
    } else {
      console.error("No cube found for camera to track!");
    }
  }

  // && AFRAME.utils.device.checkHeadsetConnected()
}

function showAbout() {
  showMe(introModal);
  showMe(aboutContent);
  hideMe(howToContent);
}

function showHowTo() {
  showMe(introModal);
  showMe(howToContent);
  hideMe(aboutContent);
}

function closeModal() {
  hideMe(introModal);
}

function showMainIntro() {
  showMe(mainMenu);
  showMe(mainIntro);
  if (playOnDesktopBtn && !AFRAME.utils.device.isMobile())
    showMe(playOnDesktopBtn);
  hideMe(mainInGame);
}

function showMainInGame() {
  showMe(mainMenu);
  showMe(mainInGame);
  hideMe(mainIntro);
  if (playOnDesktopBtn) hideMe(playOnDesktopBtn);
}

function hideMainMenu() {
  hideMe(mainMenu);
  hideMe(mainIntro);
  if (playOnDesktopBtn) hideMe(playOnDesktopBtn);
  hideMe(mainInGame);
}

function showMe(el) {
  el.classList.add("show");
  el.classList.remove("hide");
}

function hideMe(el) {
  el.classList.add("hide");
  el.classList.remove("show");
}

if (AFRAME.utils.device.isMobile()) {
  console.log("is Mobile")
  this.hideMe(howToPlayButtonMain)
  this.hideMe(howToPlayButtonModal)
  if (playOnDesktopBtn) this.hideMe(playOnDesktopBtn)
  introModal.style.left = "5vw"
  document.querySelector("#playInVr").textContent = "MOBILE FLY-THROUGH"
  document.querySelector("#playInVrAbout").textContent = "MOBILE FLY-THROUGH"
}