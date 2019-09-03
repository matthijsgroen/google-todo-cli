const blessed = require("blessed");
const { getTaskService } = require("./src/lib/task-service");
const theme = require("./src/lib/theme");

const ROOT_LEVEL = undefined;
const showTaskList = async (screen, tasklists, activeList, service) => {
  const tasklist = tasklists[activeList];

  const tasks = await service.tasks.list({
    tasklist: tasklist.id
  });

  const taskScreen = blessed.box({
    parent: screen,
    ...theme.BOX_STYLING,
    top: 0,
    right: 0,
    width: "100%",
    height: "100%-1",
    label: {
      text: `[ ${tasklist.title} ${activeList + 1} / ${tasklists.length} ]`,
      side: "center"
    }
  });

  const getSortedSiblings = parent =>
    tasks.data.items
      .filter(item => item.parent === parent)
      .sort((a, b) => ("" + a.position).localeCompare("" + b.position));

  const displayItems = getSortedSiblings(ROOT_LEVEL).reduce(
    (list, parent) => list.concat(parent).concat(getSortedSiblings(parent.id)),
    []
  );

  const list = blessed.list({
    parent: taskScreen,
    top: 0,
    bottom: 7,
    style: theme.LIST_STYLING,
    focused: true,
    mouse: true,
    keys: true,
    vi: true,
    scrollable: true,
    alwaysScroll: true,
    tags: true,
    items: displayItems
      .map(
        task =>
          `${task.parent ? "  " : ""}[${task.completed ? "X" : " "}] ${
            task.title
          }`
      )
      .concat(" +  Add new task")
  });
  screen.render();

  const clear = () => {
    list.destroy();
    taskScreen.destroy();
  };
  return clear;
};

const main = async () => {
  const service = await getTaskService();

  const res = await service.tasklists.list({
    maxResults: 10
  });
  const taskLists = res.data.items;

  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true
  });
  screen.title = "Todo CLI";

  // Quit on Escape, q, or Control-C.
  screen.key(["escape", "q", "C-c"], function(ch, key) {
    return process.exit(0);
  });

  let clr = () => {};
  let activeList = 0;

  const displayList = listIndex =>
    showTaskList(screen, taskLists, listIndex, service);

  const navigate = delta => async () => {
    clr();
    activeList = (activeList + taskLists.length + delta) % taskLists.length;
    clr = await displayList(activeList);
  };

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
        callback: navigate(-1)
      },
      Next: {
        keys: ["2"],
        callback: navigate(1)
      },
      Refresh: {
        keys: ["3"],
        callback: navigate(0)
      }
    }
  });
  clr = await displayList(activeList);
};

main();
