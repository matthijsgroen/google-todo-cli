const blessed = require("blessed");
const { prevList, nextList } = require("../state/taskLists");

const listbar = (screen, store) => {
  const bar = blessed.listbar({
    parent: screen,
    mouse: true,
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    commands: {
      Prev: {
        keys: ["1"],
        callback: () => {
          store.dispatch(prevList());
        }
      },
      Next: {
        keys: ["2"],
        callback: () => {
          store.dispatch(nextList());
        }
      },
      Refresh: {
        keys: ["3"],
        callback: () => {}
      }
    }
  });
};

module.exports = listbar;