const theme = require("./theme");
const blessed = require("blessed");

const createPrompt = (screen, name, value = "") =>
  new Promise(resolve => {
    const prompt = blessed.prompt({
      left: "center",
      top: "center",
      height: 10,
      width: "100%-2",
      ...theme.BOX_STYLING,
      shadow: true
    });
    screen.append(prompt);
    prompt.input(name, value, (err, data) => {
      prompt.hide();
      screen.render();
      resolve(data);
    });
  });

module.exports = {
  createPrompt
};
