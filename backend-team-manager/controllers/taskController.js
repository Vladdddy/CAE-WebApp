const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "data", "tasks.json");

let tasks = [];

// Carica i task dal file all'avvio
if (fs.existsSync(filePath)) {
  tasks = JSON.parse(fs.readFileSync(filePath));
}

const saveTasksToFile = () => {
  fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2));
};

exports.getTasks = (req, res) => {
  res.json(tasks);
};

exports.createTask = (req, res) => {
  const { title, assignedTo, date, time } = req.body;
  const newTask = {
    id: tasks.length ? tasks[tasks.length - 1].id + 1 : 1,
    title,
    assignedTo,
    status: "non iniziato",
    date,
    time,
  };
  tasks.push(newTask);
  saveTasksToFile();
  res.status(201).json(newTask);
};

exports.toggleTask = (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find((t) => t.id === id);
  if (!task) return res.status(404).json({ message: "Task non trovato" });

  const nextStatus = {
    "non iniziato": "in corso",
    "in corso": "completato",
    "completato": "non iniziato",
  };

  task.status = nextStatus[task.status] || "non iniziato";
  saveTasksToFile();
  res.json(task);
};

exports.deleteTask = (req, res) => {
  const id = parseInt(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return res.status(404).json({ message: "Task non trovato" });

  tasks.splice(index, 1);
  saveTasksToFile();
  res.json({ success: true, id });
};
