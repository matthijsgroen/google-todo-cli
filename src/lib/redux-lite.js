const createStore = (reducer, initialState) => {
  let state = reducer(initialState, { type: "__INIT" });
  let subscribers = [];

  return {
    subscribe: f => {
      subscribers = subscribers.concat(f);
      return () => {
        subscribers = subscribers.filter(subscriber => subscriber !== f);
      };
    },
    getState: () => state,
    dispatch: action => {
      const newState = reducer(state, action);
      if (state !== newState) {
        state = newState;
        subscribers.forEach(f => f());
      }
    }
  };
};

const combineReducers = reducers => (state, action) =>
  Object.entries(reducers).reduce((state, [key, reducer]) => {
    const subState = state[key];
    const updatedState = reducer(subState, action);
    return subState !== updatedState
      ? { ...state, [key]: updatedState }
      : state;
  }, state || {});

module.exports = {
  combineReducers,
  createStore
};
