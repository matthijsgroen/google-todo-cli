const UPDATE_LISTS = "UPDATE-LISTS";
const NEXT_LIST = "NEXT-LIST";
const PREV_LIST = "PREV-LIST";
const START_MOVE = "START-MOVE";
const MOVE = "MOVE";
//const END_MOVE = "END-MOVE";
const CANCEL_MOVE = "CANCEL-MOVE";
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
  if (action.type === CANCEL_MOVE) {
    return {
      ...state,
      moveMutation: null
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

const getCurrentListOrdered = (store, replace) => {
  const state = store.getState();
  const currentList = state.taskLists.lists[state.taskLists.activeList];
  const currentListItems = state.tasks[currentList.id].items.map(i =>
    i.id === replace.id ? { ...i, ...replace } : i
  );
  return getSortedSiblings(currentListItems, ROOT_LEVEL).reduce(
    (list, parent) =>
      list
        .concat(parent)
        .concat(getSortedSiblings(currentListItems, parent.id)),
    []
  );
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

  return {
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
    cancel: () => {
      store.dispatch({
        type: CANCEL_MOVE
      });
    }
  };
};

module.exports = {
  reducer,
  fetch,
  nextList: () => ({ type: NEXT_LIST }),
  prevList: () => ({ type: PREV_LIST }),
  moveTask
};
