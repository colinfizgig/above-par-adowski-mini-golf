/** @format */

const mainMenu = document.querySelector(".main-menu");
const playInVrIntro = document.querySelector("#playInVr");
const mainIntro = document.querySelector(".introBtn");
const howToPlayButtonMain = document.querySelector("#howToPlayButtonMain");
const mainInGame = document.querySelector(".gameplayButtons");
const resumeBtn = document.querySelector("#resumeBtn");
const startOverBtn = document.querySelector("#startOverBtn");
const aboutButton = document.querySelector(".aboutBtn");

const introModal = document.querySelector(".intro-modal");
const myInterface = document.querySelector("#my-interface");
const aboutContent = document.querySelector("#aboutContent");
const howToContent = document.querySelector("#howToContent");
const howToPlayButtonModal = document.querySelector("#howToPlayButtonModal");
const closeBtn = document.querySelector(".closeBtn");
const playInVrAbout = document.querySelector("#playInVrAbout");
const playInVrHowTo = document.querySelector("#playInVrHowTo");

hideMe(mainInGame);

document.addEventListener("exit-vr", function () {
  showMainInGame();
});

playInVrIntro.onclick = function () {
  startGame();
};

aboutButton.onclick = function () {
  hideMainMenu();
  showAbout();
};

howToPlayButtonMain.onclick = function () {
  hideMainMenu();
  showHowTo();
};

resumeBtn.onclick = function () {
  sceneEl.enterVR();
  hideMainMenu();
};

startOverBtn.onclick = function () {
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
  closeModal();
  backingTrack.play();
  if (!AFRAME.utils.device.isMobile()) sceneEl.enterVR();
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
  hideMe(mainInGame);
}

function showMainInGame() {
  showMe(mainMenu);
  showMe(mainInGame);
  hideMe(mainIntro);
}

function hideMainMenu() {
  hideMe(mainMenu);
  hideMe(mainIntro);
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
