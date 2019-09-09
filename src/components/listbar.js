const blessed = require("blessed");
const { prevList, nextList } = require("../state/taskLists");
const { createPrompt } = require("./prompt");

const listbar = (screen, store, { refreshList, createList }) => {
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
        callback: () => {
          const state = store.getState();
          const activeIndex = state.taskLists.activeList;
          const activeList = state.taskLists.lists[activeIndex];
          refreshList(activeList.id);
        }
      },
      Clear: {
        keys: ["4"],
        callback: () => {
          const state = store.getState();
          const activeIndex = state.taskLists.activeList;
          const activeList = state.taskLists.lists[activeIndex];
          refreshList(activeList.id, true);
        }
      },
      New: {
        keys: ["n"],
        callback: async () => {
          const newListName = await createPrompt(screen, "New list name");
          createList(newListName);
        }
      }
    }
  });
};

module.exports = listbar;
