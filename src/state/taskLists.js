const UPDATE_LISTS = "UPDATE-LISTS";
const NEXT_LIST = "NEXT-LIST";
const PREV_LIST = "PREV-LIST";
const START_MOVE = "START-MOVE";
//const MOVE = "MOVE";
//const END_MOVE = "END-MOVE";
//const CANCEL_MOVE = "CANCEL-MOVE"

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
        newPosition: action.newPosition
      }
    };
  }
  return state;
};

const fetch = async (store, service) => {
  const res = await service.tasklists.list({
    maxResults: 10
  });
  const taskLists = res.data.items;
  store.dispatch({
    type: UPDATE_LISTS,
    lists: taskLists,
    time: new Date() * 1
  });
};

const moveTask = (store, service, taskId) => {
  const state = store.getState();
  const currentList = state.taskLists.lists[state.taskLists.activeList];
  const task = state.tasks[currentList.id].items.find(t => t.id === taskId);

  store.dispatch({
    type: START_MOVE,
    taskId: taskId,
    newParent: task.parent,
    newPosition: task.position
  });

  return {};
};

module.exports = {
  reducer,
  fetch,
  nextList: () => ({ type: NEXT_LIST }),
  prevList: () => ({ type: PREV_LIST }),
  moveTask
};
