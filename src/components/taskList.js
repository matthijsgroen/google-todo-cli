const blessed = require("blessed");
const theme = require("./theme");

const LOADING_TITLE = "[ loading... ]";
const ROOT_LEVEL = undefined;

const displayTaskLine = task =>
  `${task.parent ? "  " : ""}${
    task.moving
      ? task.saving
        ? " * "
        : "-> "
      : task.status === "new"
      ? " * "
      : `[${task.status === "completed" ? "X" : " "}]`
  } ${task.title}`;

const getSortedSiblings = (tasks, parent) =>
  tasks
    .filter(item => item.parent === parent)
    .sort((a, b) =>
      a.position === undefined && b.position
        ? -1
        : b.position === undefined && a.position
        ? 1
        : ("" + a.position).localeCompare("" + b.position)
    );

const taskList = (
  screen,
  store,
  {
    fetchTasks,
    toggleTask,
    addTask,
    addSubTask,
    editTask,
    removeTask,
    moveTask,
    completeMove
  }
) => {
  const props = {
    label: LOADING_TITLE,
    currentList: null,
    items: [],
    moveMutation: null,
    ready: true
  };

  const createPrompt = (name, value = "") =>
    new Promise(resolve => {
      const prompt = blessed.prompt({
        left: "center",
        top: "center",
        height: "shrink",
        width: "100%",
        ...theme.BOX_STYLING
      });
      screen.append(prompt);
      prompt.input(name, value, (err, data) => {
        prompt.hide();
        screen.render();
        resolve(data);
      });
    });

  const confirm = name =>
    new Promise(resolve => {
      const prompt = blessed.question({
        left: "center",
        top: "center",
        height: "shrink",
        width: "100%",
        ...theme.BOX_STYLING
      });
      screen.append(prompt);
      prompt.ask(name, (err, data) => {
        resolve(data);
      });
    });

  const promptAdd = async previousTaskId => {
    const data = await createPrompt("New task name");
    if (data === null) return;
    addTask(previousTaskId, data);
  };

  const promptAddSubtask = async parentTaskId => {
    const data = await createPrompt("New sub-task name");
    if (data === null) return;
    addSubTask(parentTaskId, data);
  };

  const promptEdit = async task => {
    const data = await createPrompt("Edit task name", task.title);
    if (data === null) return;
    editTask(task.id, data);
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
    width: "100%-2",
    left: -4,
    style: theme.LIST_STYLING,
    focused: true,
    mouse: true,
    keys: false,
    vi: true,
    scrollable: true,
    alwaysScroll: true,
    tags: true,
    items: props.items
  });

  let selectedIndex = null;
  let moveMutation = null;

  list.on("select item", (item, index) => {
    if (!props.ready) return;
    const selectedTask =
      selectedIndex !== null && props.displayItems[selectedIndex];
    if (selectedTask && selectedTask.moving && !selectedTask.saving) {
      const delta = index - selectedIndex;
      selectedIndex = index;
      if (delta === 0 || !moveMutation) return;
      delta == 1 && moveMutation.moveDown();
      delta == -1 && moveMutation.moveUp();

      if (delta > 1 || delta < -1) {
        moveMutation && moveMutation.cancel();
        moveMutation = null;
      }
    } else {
      selectedIndex = index;
      if (moveMutation) {
        moveMutation.cancel();
        moveMutation = null;
      }
    }
  });
  list.on("keypress", async (char, key) => {
    if (key.name === "up" || key.name === "k") {
      list.up();
      list.screen.render();
      return;
    }
    if (key.name === "down" || key.name === "j") {
      list.down();
      list.screen.render();
      return;
    }
    if (key.name === "enter") {
      list.enterSelected();
      return;
    }
    if (key.name === "escape" || key.name === "q") {
      list.cancelSelected();
      return;
    }
    if (key.name === "g" && !key.shift) {
      list.select(0);
      list.screen.render();
      return;
    }
    if (key.name === "g" && key.shift) {
      list.select(list.items.length - 1);
      list.screen.render();
      return;
    }

    const selectedTask = props.displayItems[selectedIndex];
    if (selectedTask && selectedTask.id !== "new" && char === "x") {
      toggleTask(selectedTask.id);
    }
    if (selectedTask && selectedTask.id !== "new" && char === "a") {
      await promptAdd(selectedTask.id);
    }
    if (
      selectedTask &&
      selectedTask.id !== "new" &&
      selectedTask.parent === undefined &&
      char === "s"
    ) {
      await promptAddSubtask(selectedTask.id);
    }
    if (selectedTask && selectedTask.id !== "new" && char === "m") {
      if (moveMutation) {
        moveMutation.cancel();
        moveMutation = null;
      } else {
        moveMutation = moveTask(selectedTask.id);
      }
    }
    if (
      selectedTask &&
      moveMutation &&
      key.shift === false &&
      (key.name === "l" || key.name === "right")
    ) {
      moveMutation.moveRight();
    }
    if (selectedTask && selectedTask.id !== "new" && char === "D") {
      const result = await confirm("Are you sure?");
      if (result) removeTask(selectedTask.id);
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
      if (moveMutation && !moveMutation.saving) {
        completeMove(moveMutation);
        moveMutation = null;
      } else {
        promptEdit(selectedTask);
      }
    }
  });

  const unsubscribe = store.subscribe(() => {
    props.ready = false;
    let propUpdated = false;
    const state = store.getState();

    const amountList = state.taskLists.lists.length;
    const activeIndex = state.taskLists.activeList;
    const activeList = state.taskLists.lists[activeIndex];
    const moveMutation = state.taskLists.moveMutation;

    if (activeList) {
      const taskItems = state.tasks[activeList.id];
      if (!taskItems && props.items) {
        props.items = null;

        list.setItems(["Loading..."]);
        propUpdated = true;
      }
      if (
        taskItems &&
        (props.items !== taskItems.items || moveMutation !== props.moveMutation)
      ) {
        props.items = taskItems.items;
        props.moveMutation = moveMutation;

        const items = props.items.map(i =>
          moveMutation && moveMutation.taskId === i.id
            ? {
                ...i,
                position: moveMutation.newPosition,
                parent: moveMutation.newParent,
                moving: true,
                saving: moveMutation.saving
              }
            : i
        );

        props.displayItems = getSortedSiblings(items, ROOT_LEVEL)
          .reduce(
            (list, parent) =>
              list.concat(parent).concat(getSortedSiblings(items, parent.id)),
            []
          )
          .concat({ id: "new" });

        const visibleItems = props.displayItems
          .slice(0, -1)
          .map(displayTaskLine)
          .concat(" + Add new task");

        list.setItems(visibleItems);
        if (moveMutation) {
          const item = props.displayItems.find(i => i.moving);
          const index = props.displayItems.indexOf(item);
          list.select(index);
          selectedIndex = index;
        }
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
      props.ready = true;
    }
  });

  return () => {
    unsubscribe();
  };
};

module.exports = taskList;
