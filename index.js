#!/usr/bin/env node
const store = require("./src/state/store");
const { readFileSync } = require("fs");
const path = require("path");

const blessed = require("blessed");
const {
  getTaskService,
  setupCompleted,
  setup
} = require("./src/lib/task-service");

const {
  moveTask,
  fetch: fetchTaskLists,
  saveSettings,
  add: createTaskList
} = require("./src/state/taskLists");

const {
  fetch: fetchTasks,
  toggle: toggleTask,
  add: addTask,
  edit: editTask,
  clear: clearCompletedTasks,
  remove: removeTask
} = require("./src/state/tasks");

const listbar = require("./src/components/listbar");
const taskList = require("./src/components/taskList");

const INSTRUCTION_PATH =
  "https://developers.google.com/tasks/quickstart/nodejs";

const main = async () => {
  const args = process.argv.slice(2);
  if (["help", "--help"].includes(args[0])) {
    const packageInfo = JSON.parse(
      readFileSync(path.join(__dirname, "package.json"))
    );

    [
      `${packageInfo.name} v.${packageInfo.version}`,
      "",
      "Keyboard help",
      "============",
      "q / Ctrl-C:   Quit",
      "",
      "Bottom bar:",
      "",
      "- `1` - previous list",
      "- `2` - next list",
      "- `3` - refresh list",
      "- `4` - clear all completed tasks",
      "- `n` - create new tasklist",
      "",
      "Navigation:",
      "",
      "- `j/k`/arrows - move selection",
      "- `g/G` - top/bottom of list",
      "",
      "Tasks:",
      "",
      "- `x` - Complete/open task",
      "- Enter - edit item",
      "- `a` - add new item underneath selected item",
      "- `s` - add new item as subtask of selected item",
      "- `D` - Delete task",
      "- `m` - Move item. use arrows/`j/k/l` to move item. Enter to confirm, Esc to cancel"
    ].forEach(l => console.log(l));
    return process.exit(0);
  }
  if (!setupCompleted() && (args[0] !== "setup" || !setup(args[1]))) {
    [
      "Please setup the use of google-tasks-api.",
      "",
      `1. Go to ${INSTRUCTION_PATH}`,
      "2. Click ENABLE THE GOOGLE TASKS API",
      "3. Download the credentials.json file",
      "4. call this program with: todo-list setup /path/to/credentials.json"
    ].forEach(l => console.log(l));
    return process.exit(0);
  }
  const service = await getTaskService();

  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true
  });
  screen.title = "Todo CLI";
  // Quit on q, or Control-C.
  screen.key(["q", "C-c"], async () => {
    const state = store.getState();
    const currentList = state.taskLists.lists[state.taskLists.activeList];

    await saveSettings({
      list: currentList.id
    });

    return process.exit(0);
  });
  listbar(screen, store, {
    refreshList: (listId, clear = false) =>
      fetchTasks(store, service, listId, clear, 0),
    createList: name => createTaskList(store, service, name),
    clearCompleted: () => clearCompletedTasks(store)
  });
  taskList(screen, store, {
    fetchTasks: listId => fetchTasks(store, service, listId),
    toggleTask: taskId => toggleTask(store, service, taskId),
    addTask: (previousId, name) => addTask(store, service, previousId, name),
    addSubTask: (parentId, name) =>
      addTask(store, service, undefined, name, parentId),
    editTask: (taskId, newName) => editTask(store, service, taskId, newName),
    removeTask: taskId => removeTask(store, service, taskId),
    moveTask: taskId => moveTask(store, service, taskId),
    completeMove: async mutation => {
      await mutation.confirm();
      await fetchTasks(store, service, mutation.listId, false, 0);
      mutation.cancel();
    }
  });
  screen.render();

  fetchTaskLists(store, service);
  setInterval(() => {
    const state = store.getState();
    const currentList = state.taskLists.lists[state.taskLists.activeList];
    fetchTasks(store, service, currentList.id);
  }, 3 * 60e3);
};

main();
