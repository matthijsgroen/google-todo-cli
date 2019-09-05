const blessed = require("blessed");
const { getTaskService } = require("./src/lib/task-service");
const theme = require("./src/lib/theme");

const ROOT_LEVEL = undefined;
const showTaskList = async (
  screen,
  tasklists,
  activeList,
  service,
  dataChanged
) => {
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

  const displayItems = getSortedSiblings(ROOT_LEVEL)
    .reduce(
      (list, parent) =>
        list.concat(parent).concat(getSortedSiblings(parent.id)),
      []
    )
    .concat({ id: "new" });

  const displayTaskLine = task =>
    `${task.parent ? "  " : ""}[${task.status === "completed" ? "X" : " "}] ${
      task.title
    }`;

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
      .slice(0, -1)
      .map(displayTaskLine)
      .concat(" +  Add new task")
  });
  let selectedIndex = null;
  list.on("select item", (item, index) => {
    selectedIndex = index;
  });
  list.on("keypress", async char => {
    const selectedTask = displayItems[selectedIndex];
    if (selectedTask && selectedTask.id !== "new" && char === "x") {
      const res = await service.tasks.update({
        tasklist: tasklist.id,
        task: selectedTask.id,
        requestBody: {
          id: selectedTask.id,
          status:
            selectedTask.status === "completed" ? "needsAction" : "completed"
        }
      });
      const updatedTask = res.data;
      displayItems[selectedIndex] = updatedTask;
      list.setItem(selectedIndex, displayTaskLine(updatedTask));
      screen.render();
    }
    if (selectedTask && selectedTask.id !== "new" && char === "D") {
      const res = await service.tasks.delete({
        tasklist: tasklist.id,
        task: selectedTask.id
      });
      dataChanged();
    }
  });
  list.on("action", async () => {
    const selectedTask = displayItems[selectedIndex];
    if (selectedTask && selectedTask.id !== "new") {
      const prompt = blessed.prompt({
        left: "center",
        top: "center",
        height: "shrink",
        width: "shrink",
        ...theme.BOX_STYLING
      });
      screen.append(prompt);
      prompt.input("Edit task name", selectedTask.title, async (err, data) => {
        prompt.hide();
        screen.render();
        if (data === null) return;
        const res = await service.tasks.update({
          tasklist: tasklist.id,
          task: selectedTask.id,
          requestBody: {
            id: selectedTask.id,
            title: data
          }
        });
        dataChanged();
      });
    }
    if (selectedTask && selectedTask.id === "new") {
      const prompt = blessed.prompt({
        left: "center",
        top: "center",
        height: "shrink",
        width: "shrink",
        ...theme.BOX_STYLING
      });
      screen.append(prompt);
      prompt.input("New task name", "", async (err, data) => {
        prompt.hide();
        screen.render();
        if (data === null) return;
        const bottomTask = displayItems[selectedIndex - 1];
        const res = await service.tasks.insert({
          tasklist: tasklist.id,
          previous: bottomTask.id,
          requestBody: {
            kind: "tasks#task",
            status: "needsAction",
            title: data
          }
        });
        dataChanged();
      });
    }
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
    showTaskList(screen, taskLists, listIndex, service, async () => {
      clr();
      clr = await displayList(activeList);
    });

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
