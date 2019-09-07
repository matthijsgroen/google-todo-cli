const UPDATE_TASKS = "UPDATE-TASKS";

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
  return state;
};

const CACHE_TIME = 5 * 60e3;

const fetch = async (store, service, listId) => {
  const state = store.getState();
  const currentList = state.tasks[listId];
  if (currentList && currentList.time > new Date() * 1 - CACHE_TIME) {
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

module.exports = {
  reducer,
  fetch
};
