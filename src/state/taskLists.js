const UPDATE_LISTS = "UPDATE-LISTS";
const NEXT_LIST = "NEXT-LIST";
const PREV_LIST = "PREV-LIST";

const INITIAL_STATE = {
  activeList: 0,
  time: 0,
  lists: []
};

const reducer = (state = INITIAL_STATE, action) => {
  if (action.type === UPDATE_LISTS) {
    return {
      ...state,
      time: action.time,
      lists: action.lists
    };
  }
  if (action.type === PREV_LIST) {
    return {
      ...state,
      activeList:
        (state.activeList + state.lists.length - 1) % state.lists.length
    };
  }
  if (action.type === NEXT_LIST) {
    return {
      ...state,
      activeList:
        (state.activeList + state.lists.length + 1) % state.lists.length
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

module.exports = {
  reducer,
  fetch,
  nextList: () => ({ type: NEXT_LIST }),
  prevList: () => ({ type: PREV_LIST })
};
