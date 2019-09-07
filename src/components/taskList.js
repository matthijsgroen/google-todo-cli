const blessed = require("blessed");
const theme = require("./theme");

const LOADING_TITLE = "[ loading... ]";
const ROOT_LEVEL = undefined;

const displayTaskLine = task =>
  `${task.parent ? "  " : ""}${
    task.status === "new"
      ? " * "
      : `[${task.status === "completed" ? "X" : " "}]`
  } ${task.title}`;

const getSortedSiblings = (tasks, parent) =>
  tasks
    .filter(item => item.parent === parent)
    .sort((a, b) => ("" + a.position).localeCompare("" + b.position));

const taskList = (
  screen,
  store,
  { fetchTasks, toggleTask, addTask, editTask, removeTask }
) => {
  const props = {
    label: LOADING_TITLE,
    currentList: null,
    items: []
  };

  const promptAdd = previousTaskId => {
    const prompt = blessed.prompt({
      left: "center",
      top: "center",
      height: "shrink",
      width: "100%",
      ...theme.BOX_STYLING
    });
    screen.append(prompt);
    prompt.input("New task name", "", (err, data) => {
      prompt.hide();
      screen.render();
      if (data === null) return;
      addTask(previousTaskId, data);
    });
  };

  const promptEdit = task => {
    const prompt = blessed.prompt({
      left: "center",
      top: "center",
      height: "shrink",
      width: "100%",
      ...theme.BOX_STYLING
    });
    screen.append(prompt);
    prompt.input("Edit task name", task.title, (err, data) => {
      prompt.hide();
      screen.render();
      if (data === null) return;
      editTask(task.id, data);
    });
  };

  const taskScreen = blessed.box({
    parent: screen,
    ...theme.BOX_STYLING,
    top: 0,
    right: 0,
    width: "100%",
    height: "100%-1",
    label: {
      text: props.label,
      side: "center"
    }
  });

  const list = blessed.list({
    parent: taskScreen,
    top: 0,
    bottom: 0,
    style: theme.LIST_STYLING,
    focused: true,
    mouse: true,
    keys: true,
    vi: true,
    scrollable: true,
    alwaysScroll: true,
    tags: true,
    items: props.items
  });

  let selectedIndex = null;
  list.on("select item", (item, index) => {
    selectedIndex = index;
  });
  list.on("keypress", char => {
    const selectedTask = props.displayItems[selectedIndex];
    if (selectedTask && selectedTask.id !== "new" && char === "x") {
      toggleTask(selectedTask.id);
    }
    if (selectedTask && selectedTask.id !== "new" && char === "a") {
      promptAdd(selectedTask.id);
    }
    if (selectedTask && selectedTask.id !== "new" && char === "D") {
      removeTask(selectedTask.id);
    }
  });

  list.on("action", async () => {
    const selectedTask = props.displayItems[selectedIndex];
    if (selectedTask && selectedTask.id === "new") {
      const bottomTask = props.displayItems
        .filter(i => i.parent === ROOT_LEVEL && i.id !== "new")
        .slice(-1)[0];
      promptAdd(bottomTask && bottomTask.id);
    }
    if (selectedTask && selectedTask.id !== "new") {
      promptEdit(selectedTask);
    }
  });

  const unsubscribe = store.subscribe(() => {
    let propUpdated = false;
    const state = store.getState();

    const amountList = state.taskLists.lists.length;
    const activeIndex = state.taskLists.activeList;
    const activeList = state.taskLists.lists[activeIndex];

    if (activeList) {
      const taskItems = state.tasks[activeList.id];
      if (!taskItems && props.items) {
        props.items = null;

        list.setItems(["Loading..."]);
        propUpdated = true;
      }
      if (taskItems && props.items !== taskItems.items) {
        props.items = taskItems.items;

        props.displayItems = getSortedSiblings(props.items, ROOT_LEVEL)
          .reduce(
            (list, parent) =>
              list
                .concat(parent)
                .concat(getSortedSiblings(props.items, parent.id)),
            []
          )
          .concat({ id: "new" });

        const visibleItems = props.displayItems
          .slice(0, -1)
          .map(displayTaskLine)
          .concat(" + Add new task");

        list.setItems(visibleItems);
        propUpdated = true;
      }
    }

    if (props.currentList !== activeIndex && activeList) {
      props.currentList = activeIndex;
      fetchTasks(activeList.id);
    }

    const label = activeList
      ? `[ ${activeList.title} ${activeIndex + 1} / ${amountList} ]`
      : LOADING_TITLE;

    if (props.label !== label) {
      taskScreen.setLabel(label);
      props.label = label;
      propUpdated = true;
    }

    if (propUpdated) {
      screen.render();
    }
  });

  return () => {
    unsubscribe();
  };
};

module.exports = taskList;
