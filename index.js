#!/usr/bin/env node
const store = require("./src/state/store");

const blessed = require("blessed");
const {
  getTaskService,
  setupCompleted,
  setup
} = require("./src/lib/task-service");

const fetchTaskLists = require("./src/state/taskLists").fetch;
const moveTask = require("./src/state/taskLists").moveTask;
const fetchTasks = require("./src/state/tasks").fetch;
const toggleTask = require("./src/state/tasks").toggle;
const addTask = require("./src/state/tasks").add;
const editTask = require("./src/state/tasks").edit;
const removeTask = require("./src/state/tasks").remove;
const listbar = require("./src/components/listbar");
const taskList = require("./src/components/taskList");

const INSTRUCTION_PATH =
  "https://developers.google.com/tasks/quickstart/nodejs";

const main = async () => {
  const args = process.argv.slice(2);
  if (!setupCompleted() && (args[0] !== "setup" || !setup(args[1]))) {
    console.log("Please setup the use of google-tasks-api.");
    console.log("");
    console.log(`1. Go to ${INSTRUCTION_PATH}`);
    console.log("2. Click ENABLE THE GOOGLE TASKS API");
    console.log("3. Download the credentials.json file");
    console.log(
      "4. call this program with: todo-list setup /path/to/credentials.json"
    );
    return process.exit(0);
  }
  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true
  });
  screen.title = "Todo CLI";
  // Quit on Escape, q, or Control-C.
  screen.key(["escape", "q", "C-c"], function(ch, key) {
    return process.exit(0);
  });

  const service = await getTaskService();
  listbar(screen, store, {
    refreshList: (listId, clear = false) =>
      fetchTasks(store, service, listId, clear, 0)
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
};

main();
