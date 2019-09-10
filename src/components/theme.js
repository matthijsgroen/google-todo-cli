const TEXT_STYLING = {
  fg: "#F1F0E3",
  bg: "#464D55"
};

const BUTTON_STYLING = {
  fg: "#F1F0E3",
  bg: "#213F63",
  focus: {
    fg: "#213F63",
    bg: "green"
  },
  blur: {
    fg: "#F1F0E3",
    bg: "#464D55"
  }
};

const LIST_STYLING = {
  bg: "#464D55",
  selected: {
    fg: "#F1F0E3",
    bg: "#213F63"
  },
  item: {
    fg: "#F1F0E3",
    bg: "#464D55"
  }
};

const BOX_STYLING = {
  padding: {
    top: 1,
    bottom: 1,
    left: 1,
    right: 1
  },
  border: {
    type: "line"
  },
  style: {
    ...TEXT_STYLING,
    border: {
      fg: "#999999",
      bg: "#464D55"
    },
    label: {
      fg: "#ffffff",
      bg: "#666666"
    }
  }
};

module.exports = {
  TEXT_STYLING,
  BOX_STYLING,
  BUTTON_STYLING,
  LIST_STYLING
};
