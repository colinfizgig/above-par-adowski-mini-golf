/** @format */

AFRAME.registerComponent("watch-face", {
  schema: {
    holeNumber: { type: "number", default: 1 },
    holeScore: { type: "number", default: 0 },
    holePar: { type: "number", default: 3 },
    totalScore: { type: "number", default: 0 },
  },
  init: function () {
    const width = 0.03;
    const height = 0.04;
    const font =
      "./assets/fonts/NewReasonBold.ttf";
    const red = "#E60000";
    const offWhite = "#FFFB1A";

    // const faceVisual = document.createElement("a-plane");
    // faceVisual.setAttribute("width", width);
    // faceVisual.setAttribute("height", height);
    // faceVisual.setAttribute("color", "blue");
    // this.el.appendChild(faceVisual);

    const holeScore = document.createElement("a-entity");
    this.holeScore = holeScore;
    holeScore.setAttribute("troika-text", {
      value: this.data.holeScore.toString(),
      fontSize: 0.02,
      color: red,
      font: font,
    });
    holeScore.setAttribute("position", `0 0 0.0001`);
    this.el.appendChild(holeScore);

    const details = document.createElement("a-entity");
    this.details = details;
    details.setAttribute("troika-text", {
      value: this.getDetailText(),
      fontSize: 0.0037,
      color: offWhite,
      font: font,
      align: "center",
    });
    details.setAttribute("position", `0 0 0.0001`);
    this.el.appendChild(details);

    document.addEventListener("handedness-changed", (e) => {
      const direction = e.detail.hand == "right" ? 1 : -1;
      this.el.setAttribute("scale", `${direction} 1 1`);
    });
  },

  getDetailText() {
    return `Hole: ${this.data.holeNumber}     Par: ${this.data.holePar}\n\n\n\n\n\nTotal: ${this.data.totalScore}`;
  },

  update(oldData) {
    this.details.setAttribute("troika-text", {
      value: this.getDetailText(),
    });

    this.holeScore.setAttribute("troika-text", {
      value: this.data.holeScore.toString(),
    });
  },
});
