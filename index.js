#!/usr/bin/env node
const store = require("./src/state/store");

const blessed = require("blessed");
const { getTaskService } = require("./src/lib/task-service");

const fetchTaskLists = require("./src/state/taskLists").fetch;
const fetchTasks = require("./src/state/tasks").fetch;
const listbar = require("./src/components/listbar");
const taskList = require("./src/components/taskList");

/*
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
*/

const main = async () => {
  const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true
  });
  screen.title = "Todo CLI";
  // Quit on Escape, q, or Control-C.
  screen.key(["escape", "q", "C-c"], function(ch, key) {
    return process.exit(0);
  });

  listbar(screen, store);
  taskList(screen, store, {
    fetchTasks: listId => {
      fetchTasks(store, service, listId);
    }
  });
  screen.render();

  const service = await getTaskService();
  fetchTaskLists(store, service);

  /*
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

  clr = await displayList(activeList);
  */
};

main();
