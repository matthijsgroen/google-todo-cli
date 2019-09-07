const { createStore, combineReducers } = require("redux");
const taskLists = require("./taskLists").reducer;
const tasks = require("./tasks").reducer;

const reducer = combineReducers({
  taskLists,
  tasks
});

const store = createStore(reducer);

module.exports = store;
