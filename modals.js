/** @format */

const playInVrIntro = document.querySelector("#playInVr");
const playInVrAbout = document.querySelector("#playInVrAbout");
const playInVrHowTo = document.querySelector("#playInVrHowTo");
const aboutButton = document.querySelector(".aboutBtn");
const introModal = document.querySelector(".intro-modal");
//const settingsIcon = document.querySelector("#settingsIcon");
//const closeSettingsIcon = document.querySelector("#closeSettingsIcon");
const myInterface = document.querySelector("#my-interface");
const mainMenu = document.querySelector(".main-menu");
const aboutContent = document.querySelector("#aboutContent");
const howToContent = document.querySelector("#howToContent");
const howToPlayButtonMain = document.querySelector("#howToPlayButtonMain");
const howToPlayButtonModal = document.querySelector("#howToPlayButtonModal");
const closeBtn = document.querySelector(".closeBtn");
const resumeBtn = document.querySelector("#resumeBtn");
const startOverBtn = document.querySelector("#startOverBtn");
const mainIntro = document.querySelector("#mainIntro");
const mainInGame = document.querySelector("#mainInGame");

mainInGame.style = "display:none;";

resumeBtn.onclick = function () {
  //TODO: add enter vr here
  mainMenu.style = "display:none;";
  mainIntro.style = "display:none;";
  mainInGame.style = "display:none;";
};

startOverBtn.onclick = function () {
  mainMenu.style = "display:block;";
  mainIntro.style = "display:block;";
  mainInGame.style = "display:none;";
};

closeBtn.onclick = function () {
  closeModal();
  mainMenu.style = "display:block;";
};

howToPlayButtonMain.onclick = function () {
  showHowTo();
};

howToPlayButtonModal.onclick = function () {
  showHowTo();
};
aboutButton.onclick = function () {
  showAbout();
};

playInVrIntro.onclick = function () {
  startGame();
};

playInVrAbout.onclick = function () {
  startGame();
};

playInVrHowTo.onclick = function () {
  startGame();
};

// settingsIcon.onclick = function () {
//   myInterface.style = "display:block;";
//   settingsIcon.style = "display:none;";
// };

// closeSettingsIcon.onclick = function () {
//   myInterface.style = "display:none;";
//   settingsIcon.style = "display:block;";
// };

function startGame() {
  mainMenu.style = "display:none;";
  closeModal();
  backingTrack.play();
  //TODO: add enter vr here
}

function showAbout() {
  introModal.style = "display:block;";
  aboutContent.style = "display:block;";
  howToContent.style = "display:none;";
  mainMenu.style = "display:none;";
}

function showHowTo() {
  introModal.style = "display:block;";
  howToContent.style = "display:block;";
  aboutContent.style = "display:none;";
  mainMenu.style = "display:none;";
}

function closeModal() {
  introModal.style = "display:none;";
  howToContent.style = "display:none;";
  aboutContent.style = "display:none;";
}
