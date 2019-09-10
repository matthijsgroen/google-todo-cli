const { createStore, combineReducers } = require("../lib/redux-lite");
const taskLists = require("./taskLists").reducer;
const tasks = require("./tasks").reducer;

const reducer = combineReducers({
  taskLists,
  tasks
});

const store = createStore(reducer);

module.exports = store;
