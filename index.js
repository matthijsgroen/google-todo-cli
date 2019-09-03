const blessed = require("blessed");
const { getTaskService } = require("./src/lib/task-service");
const theme = require("./src/lib/theme");

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

  const list = blessed.list({
    parent: taskScreen,
    top: 0,
    bottom: 7,
    style: theme.LIST_STYLING,
    focussed: true,
    mouse: true,
    keys: true,
    vi: true,
    scrollable: true,
    alwaysScroll: true,
    tags: true,
    items: tasks.data.items
      .slice(0, -1)
      .map(task => `[${task.completed ? "X" : " "}] ${task.title}`)
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
  screen.title = "Pivotal assistant";

  // Quit on Escape, q, or Control-C.
  screen.key(["escape", "q", "C-c"], function(ch, key) {
    return process.exit(0);
  });

  let clr = () => {};
  let activeList = 0;

  const displayList = listIndex =>
    showTaskList(screen, taskLists, listIndex, service);

  const next = async () => {
    clr();
    activeList = (activeList + 1) % taskLists.length;
    clr = await displayList(activeList);
  };
  const prev = async () => {
    clr();
    activeList = (activeList + taskLists.length - 1) % taskLists.length;
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
        callback: prev
      },
      Next: {
        keys: ["2"],
        callback: next
      }
    }
  });
  clr = await displayList(activeList);
};

main();
