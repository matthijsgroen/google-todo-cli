const UPDATE_TASKS = "UPDATE-TASKS";
const UPDATE_TASK = "UPDATE-TASK";
const ADD_TASK = "ADD-TASK";
const DELETE_TASK = "DELETE-TASK";

const TASK_STATUS = {
  COMPLETE: "completed",
  OPEN: "needsAction",
  NEW: "new"
};

const INITIAL_STATE = {};

const reducer = (state = INITIAL_STATE, action) => {
  if (action.type === UPDATE_TASKS) {
    return {
      ...state,
      [action.list]: {
        time: action.time,
        items: action.items
      }
    };
  }
  if (action.type === UPDATE_TASK) {
    const list = state[action.list];
    if (!list) return state;
    return {
      ...state,
      [action.list]: {
        ...list,
        items: list.items.map(item =>
          action.id === item.id
            ? {
                ...item,
                ...action.data
              }
            : item
        )
      }
    };
  }
  if (action.type === ADD_TASK) {
    const list = state[action.list];
    if (!list) return state;
    return {
      ...state,
      [action.list]: {
        ...list,
        items: [action.data].concat(list.items)
      }
    };
  }
  if (action.type === DELETE_TASK) {
    const list = state[action.list];
    if (!list) return state;
    return {
      ...state,
      [action.list]: {
        ...list,
        items: list.items.filter(item => item.id !== action.id)
      }
    };
  }
  return state;
};

const CACHE_TIME = 5 * 60e3;

const fetch = async (store, service, listId, cacheTime = CACHE_TIME) => {
  const state = store.getState();
  const currentList = state.tasks[listId];
  if (currentList && currentList.time > new Date() * 1 - cacheTime) {
    return;
  }

  const res = await service.tasks.list({
    tasklist: listId
  });
  const tasks = res.data.items;
  store.dispatch({
    type: UPDATE_TASKS,
    items: tasks,
    list: listId,
    time: new Date() * 1
  });
};

const toggle = async (store, service, taskId) => {
  const state = store.getState();
  const currentList = state.taskLists.lists[state.taskLists.activeList];
  const currentTask = state.tasks[currentList.id].items.find(
    t => t.id === taskId
  );

  const newStatus =
    currentTask.status === TASK_STATUS.COMPLETE
      ? TASK_STATUS.OPEN
      : TASK_STATUS.COMPLETE;

  store.dispatch({
    type: UPDATE_TASK,
    list: currentList.id,
    id: taskId,
    data: {
      status: newStatus
    }
  });
  const res = await service.tasks.update({
    tasklist: currentList.id,
    task: taskId,
    requestBody: {
      id: taskId,
      status: newStatus
    }
  });
};

let tempCounter = 0;

const add = async (store, service, previousId, name) => {
  const state = store.getState();
  const currentList = state.taskLists.lists[state.taskLists.activeList];
  const previousTask = state.tasks[currentList.id].items.find(
    t => t.id === previousId
  );

  const id = `temp-${tempCounter++}`;

  // optimistically add it to state
  store.dispatch({
    type: ADD_TASK,
    list: currentList.id,
    previous: previousTask && previousTask.id,
    data: {
      id,
      status: TASK_STATUS.NEW,
      parent: previousTask && previousTask.parent,
      position: previousTask ? previousTask.position + "1" : "",
      title: name
    }
  });

  const res = await service.tasks.insert({
    tasklist: currentList.id,
    previous: previousTask && previousTask.id,
    parent: previousTask && previousTask.parent,
    requestBody: {
      kind: "tasks#task",
      status: TASK_STATUS.OPEN,
      title: name
    }
  });
  store.dispatch({
    type: UPDATE_TASK,
    list: currentList.id,
    id: id,
    data: res.data
  });
};

const edit = async (store, service, taskId, newName) => {
  const state = store.getState();
  const currentList = state.taskLists.lists[state.taskLists.activeList];
  const task = state.tasks[currentList.id].items.find(t => t.id === taskId);

  store.dispatch({
    type: UPDATE_TASK,
    list: currentList.id,
    id: task.id,
    data: {
      title: newName
    }
  });

  const res = await service.tasks.update({
    tasklist: currentList.id,
    task: task.id,
    requestBody: {
      id: task.id,
      title: newName
    }
  });
  store.dispatch({
    type: UPDATE_TASK,
    list: currentList.id,
    id: task.id,
    data: res.data
  });
};

const remove = (store, service, taskId) => {
  const state = store.getState();
  const currentList = state.taskLists.lists[state.taskLists.activeList];
  const task = state.tasks[currentList.id].items.find(t => t.id === taskId);

  store.dispatch({
    type: DELETE_TASK,
    list: currentList.id,
    id: task.id
  });

  if (task.status === TASK_STATUS.COMPLETE) {
    service.tasks.update({
      tasklist: currentList.id,
      task: task.id,
      requestBody: {
        id: task.id,
        hidden: true
      }
    });
  } else {
    service.tasks.delete({
      tasklist: currentList.id,
      task: task.id
    });
  }
};

module.exports = {
  reducer,
  fetch,
  toggle,
  add,
  edit,
  remove
};
