const fs = require("fs");
const path = require("path");
const homedir = require("os").homedir();

const folderPreferences = [process.env.XDG_CONFIG_HOME, homedir].filter(
  Boolean
);
const settingsPath = path.join(
  folderPreferences[0],
  ".google-task-cli",
  "settings.json"
);

const UPDATE_LISTS = "UPDATE-LISTS";
const NEW_LIST = "NEW-LIST";
const NEXT_LIST = "NEXT-LIST";
const PREV_LIST = "PREV-LIST";
const START_MOVE = "START-MOVE";
const MOVE = "MOVE";
const CANCEL_MOVE = "CANCEL-MOVE";
const STORE_MOVE = "STORE-MOVE";
const UPDATE_TASK = "UPDATE-TASK";
const ROOT_LEVEL = undefined;

const INITIAL_STATE = {
  activeList: 0,
  time: 0,
  moveMutation: null,
  lists: []
};

const reducer = (state = INITIAL_STATE, action) => {
  if (action.type === UPDATE_LISTS) {
    return {
      ...state,
      time: action.time,
      lists: action.lists,
      activeList:
        action.active !== undefined ? action.active : state.activeList,
      moveMutation: null
    };
  }
  if (action.type === NEW_LIST) {
    const lists = state.lists.concat(action.list);
    return {
      ...state,
      lists,
      activeList: lists.length - 1,
      moveMutation: null
    };
  }
  if (action.type === PREV_LIST) {
    return {
      ...state,
      activeList:
        (state.activeList + state.lists.length - 1) % state.lists.length,
      moveMutation: null
    };
  }
  if (action.type === NEXT_LIST) {
    return {
      ...state,
      activeList:
        (state.activeList + state.lists.length + 1) % state.lists.length,
      moveMutation: null
    };
  }
  if (action.type === START_MOVE) {
    return {
      ...state,
      moveMutation: {
        taskId: action.taskId,
        newParent: action.newParent,
        newPosition: action.newPosition,
        position: "NEW",
        hasChildren: action.hasChildren
      }
    };
  }
  if (action.type === MOVE) {
    return {
      ...state,
      moveMutation: {
        ...state.moveMutation,
        newParent: action.newParent,
        newPosition:
          action.newPosition === undefined
            ? undefined
            : action.newPosition + "1",
        position: action.newPosition
      }
    };
  }
  if (action.type === STORE_MOVE) {
    return {
      ...state,
      moveMutation: {
        ...state.moveMutation,
        saving: true
      }
    };
  }
  if (action.type === CANCEL_MOVE) {
    return {
      ...state,
      moveMutation: null
    };
  }
  return state;
};

const readSettings = () =>
  new Promise((resolve, reject) => {
    if (!fs.existsSync(settingsPath)) {
      resolve({});
    }

    fs.readFile(settingsPath, (err, content) => {
      if (err) return reject(err);
      const settings = JSON.parse(content);
      resolve(settings);
    });
  });

const saveSettings = async folderSettings => {
  const settings = await readSettings();
  const updatedSettings = { ...settings, [process.cwd()]: folderSettings };
  const p = new Promise((resolve, reject) =>
    fs.writeFile(settingsPath, JSON.stringify(updatedSettings, null, 2), err =>
      err ? reject(err) : resolve()
    )
  );
  await p;
};

const fetch = async (store, service) => {
  const settings = await readSettings();
  const folderSettings = settings[process.cwd()] || {};

  const res = await service.tasklists.list({
    maxResults: 10
  });
  const taskLists = res.data.items;
  const index = taskLists.indexOf(
    taskLists.find(l => l.id === folderSettings.list)
  );

  // selectActiveTasklist based on folder
  store.dispatch({
    type: UPDATE_LISTS,
    lists: taskLists,
    active: index !== undefined && index > -1 ? index : undefined,
    time: new Date() * 1
  });
};

const add = async (store, service, name) => {
  const res = await service.tasklists.insert({
    requestBody: {
      kind: "tasks#taskList",
      title: name
    }
  });
  store.dispatch({
    type: NEW_LIST,
    list: res.data,
    time: new Date() * 1
  });
};

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

const getCurrentListOrdered = (store, replace, nested = true) => {
  const state = store.getState();
  const currentList = state.taskLists.lists[state.taskLists.activeList];
  const currentListItems = state.tasks[currentList.id].items.map(i =>
    i.id === replace.id ? { ...i, ...replace } : i
  );
  return getSortedSiblings(currentListItems, ROOT_LEVEL).reduce(
    (list, parent) =>
      list
        .concat(parent)
        .concat(nested ? getSortedSiblings(currentListItems, parent.id) : []),
    []
  );
};

const moveTask = (store, service, taskId) => {
  const state = store.getState();
  const currentList = state.taskLists.lists[state.taskLists.activeList];
  const listItems = state.tasks[currentList.id].items;
  const task = listItems.find(t => t.id === taskId);
  const taskHasChildren = listItems.filter(i => i.parent === task.id).length;

  store.dispatch({
    type: START_MOVE,
    taskId: taskId,
    newParent: task.parent,
    newPosition: task.position,
    hasChildren: taskHasChildren
  });

  const branchActions = {
    moveUp: () => {
      const currentMutation = store.getState().taskLists.moveMutation;
      const orderedList = getCurrentListOrdered(
        store,
        {
          id: currentMutation.taskId,
          parent: currentMutation.newParent,
          position: currentMutation.newPosition
        },
        false
      );
      const item = orderedList.find(i => i.id === taskId);
      const itemIndex = orderedList.indexOf(item);
      const previous = orderedList[itemIndex - 1];
      if (!previous) return;
      const earlier = orderedList[itemIndex - 2];
      if (earlier) {
        store.dispatch({
          type: MOVE,
          newParent: ROOT_LEVEL,
          newPosition: earlier.position
        });
      } else {
        store.dispatch({
          type: MOVE,
          newParent: ROOT_LEVEL,
          newPosition: undefined
        });
      }
    },
    moveDown: () => {
      const currentMutation = store.getState().taskLists.moveMutation;
      const orderedList = getCurrentListOrdered(
        store,
        {
          id: currentMutation.taskId,
          parent: currentMutation.newParent,
          position: currentMutation.newPosition
        },
        false
      );
      const item = orderedList.find(i => i.id === taskId);
      const itemIndex = orderedList.indexOf(item);
      const next = orderedList[itemIndex + 1];
      if (!next) return;
      store.dispatch({
        type: MOVE,
        newParent: ROOT_LEVEL,
        newPosition: next.position
      });
    },
    moveRight: () => {}
  };

  const leafActions = {
    moveUp: () => {
      const currentMutation = store.getState().taskLists.moveMutation;
      const orderedList = getCurrentListOrdered(store, {
        id: currentMutation.taskId,
        parent: currentMutation.newParent,
        position: currentMutation.newPosition
      });
      const item = orderedList.find(i => i.id === taskId);
      const itemIndex = orderedList.indexOf(item);
      const previous = orderedList[itemIndex - 1];
      if (!previous) return;
      const previousHasChildren = orderedList.some(
        i => i.parent === previous.id
      );
      if (previous.parent === item.parent && item.parent) {
        const earlier = orderedList[itemIndex - 2];
        if (!earlier) return;
        if (earlier.parent === ROOT_LEVEL) {
          store.dispatch({
            type: MOVE,
            newParent: previous.parent,
            newPosition: undefined
          });
        } else {
          store.dispatch({
            type: MOVE,
            newParent: previous.parent,
            newPosition: earlier.parent && item.parent && earlier.position
          });
        }
        return;
      }
      if (previous.parent === ROOT_LEVEL) {
        const earlier = orderedList[itemIndex - 2];
        if (!earlier) {
          store.dispatch({
            type: MOVE,
            newParent: ROOT_LEVEL,
            newPosition: undefined
          });
          return;
        }
        if (earlier.parent === ROOT_LEVEL) {
          store.dispatch({
            type: MOVE,
            newParent: ROOT_LEVEL,
            newPosition: earlier.position
          });
          return;
        }
        const otherParent = orderedList.find(i => i.id === earlier.parent);
        store.dispatch({
          type: MOVE,
          newParent: ROOT_LEVEL,
          newPosition: otherParent.position
        });
        return;
      }
      if (previous.parent && item.parent === ROOT_LEVEL) {
        store.dispatch({
          type: MOVE,
          newParent: previous.parent,
          newPosition: previous.position
        });
      }
    },
    moveDown: () => {
      const currentMutation = store.getState().taskLists.moveMutation;
      const orderedList = getCurrentListOrdered(store, {
        id: currentMutation.taskId,
        parent: currentMutation.newParent,
        position: currentMutation.newPosition
      });
      const item = orderedList.find(i => i.id === currentMutation.taskId);
      const itemIndex = orderedList.indexOf(item);
      const next = orderedList[itemIndex + 1];
      if (!next) return;
      const nextHasChildren = orderedList.some(i => i.parent === next.id);

      if (next.parent === item.parent && item.parent) {
        store.dispatch({
          type: MOVE,
          newParent: next.parent,
          newPosition: next.position
        });
        return;
      }
      if (
        next.parent === item.parent &&
        next.parent === ROOT_LEVEL &&
        nextHasChildren
      ) {
        store.dispatch({
          type: MOVE,
          newParent: next.id,
          newPosition: undefined
        });
        return;
      }
      if (
        next.parent === item.parent &&
        next.parent === ROOT_LEVEL &&
        !nextHasChildren
      ) {
        store.dispatch({
          type: MOVE,
          newParent: next.parent,
          newPosition: next.position
        });
        return;
      }
      if (next.parent === ROOT_LEVEL && item.parent) {
        const parent = orderedList.find(i => i.id === item.parent);
        store.dispatch({
          type: MOVE,
          newParent: ROOT_LEVEL,
          newPosition: parent.position
        });
        return;
      }
    },
    moveRight: () => {
      const currentMutation = store.getState().taskLists.moveMutation;
      const orderedList = getCurrentListOrdered(store, {
        id: currentMutation.taskId,
        parent: currentMutation.newParent,
        position: currentMutation.newPosition
      });
      const item = orderedList.find(i => i.id === taskId);
      const itemIndex = orderedList.indexOf(item);
      const previous = orderedList[itemIndex - 1];
      if (!previous) return;

      if (item.parent !== ROOT_LEVEL) return;
      if (previous.parent) {
        store.dispatch({
          type: MOVE,
          newParent: previous.parent,
          newPosition: previous.position
        });
        return;
      }
      store.dispatch({
        type: MOVE,
        newParent: previous.id,
        newPosition: undefined
      });
    }
  };

  const commonActions = {
    listId: currentList.id,
    cancel: () => {
      store.dispatch({
        type: CANCEL_MOVE
      });
    },
    confirm: async () => {
      const state = store.getState();
      const currentList = state.taskLists.lists[state.taskLists.activeList];
      const currentMutation = state.taskLists.moveMutation;
      if (currentMutation.position === "NEW") {
        store.dispatch({
          type: CANCEL_MOVE
        });
        return;
      }
      store.dispatch({
        type: STORE_MOVE
      });
      const tasks = state.tasks[currentList.id].items;
      const previous = tasks.find(
        i =>
          i.parent === currentMutation.newParent &&
          i.position === currentMutation.position
      );

      const payload = {
        task: currentMutation.taskId,
        tasklist: currentList.id,
        parent: currentMutation.newParent,
        previous: previous && previous.id
      };
      const res = await service.tasks.move(payload);
    }
  };

  return taskHasChildren > 0
    ? { ...commonActions, ...branchActions }
    : { ...commonActions, ...leafActions };
};

module.exports = {
  reducer,
  add,
  fetch,
  nextList: () => ({ type: NEXT_LIST }),
  prevList: () => ({ type: PREV_LIST }),
  saveSettings,
  moveTask
};
