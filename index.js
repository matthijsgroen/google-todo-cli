const blessed = require("blessed");
const { getTaskService } = require("./src/lib/task-service");

const main = async () => {
  const service = await getTaskService();

  const res = await service.tasklists.list({
    maxResults: 10
  });

  const taskLists = res.data.items;
  if (taskLists) {
    console.log("Task lists:");
    taskLists.forEach(taskList => {
      console.log(`${taskList.title} (${taskList.id})`);
    });
  } else {
    console.log("No task lists found.");
  }
};

main();
