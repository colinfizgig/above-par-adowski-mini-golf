/** @format */

const playInVrIntro = document.querySelector("#playInVr");
const playInVrAbout = document.querySelector("#playInVrAbout");
const playInVrHowTo = document.querySelector("#playInVrHowTo");
const aboutButton = document.querySelector(".aboutBtn");
const introModal = document.querySelector(".intro-modal");
const settingsIcon = document.querySelector("#settingsIcon");
const closeSettingsIcon = document.querySelector("#closeSettingsIcon");
const myInterface = document.querySelector("#my-interface");
const mainMenu = document.querySelector(".main-menu");
const aboutContent = document.querySelector("#aboutContent");
const howToContent = document.querySelector("#howToContent");
const howToPlayButtonMain = document.querySelector("#howToPlayButtonMain");
const howToPlayButtonModal = document.querySelector("#howToPlayButtonModal");

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

settingsIcon.onclick = function () {
  myInterface.style = "display:block;";
  settingsIcon.style = "display:none;";
};

closeSettingsIcon.onclick = function () {
  myInterface.style = "display:none;";
  settingsIcon.style = "display:block;";
};

function startGame() {
  mainMenu.style = "display:none;";
  closeModal();
  backingTrack.play();
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
