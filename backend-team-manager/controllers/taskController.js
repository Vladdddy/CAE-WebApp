const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "data", "tasks.json");
const usersFilePath = path.join(__dirname, "..", "data", "users.json");

// Helper function to get active employees from users.json
const getActiveEmployees = () => {
    if (fs.existsSync(usersFilePath)) {
        const users = JSON.parse(fs.readFileSync(usersFilePath));
        return users.filter(
            (user) =>
                user.active &&
                user.role === "employee" &&
                user.department === "Operations"
        );
    }
    return [];
};

// Helper function to get shift data path
const getShiftDataPath = (year, month) => {
    return path.join(
        __dirname,
        `../data/shifts-${year}-${String(month).padStart(2, "0")}.json`
    );
};

// Helper function to determine which shift a time belongs to
const getShiftFromTime = (time) => {
    const hour = parseInt(time.split(":")[0]);
    if (hour >= 7 && hour < 12) {
        return "O"; // Morning shift
    } else if (hour >= 12 && hour < 19) {
        return "OP"; // Afternoon shift
    } else {
        return "ON"; // Night shift
    }
};

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

    // Check if the assigned employee exists in users.json and is active
    const activeEmployees = getActiveEmployees();
    const assignedEmployee = activeEmployees.find(
        (emp) => emp.name === assignedTo
    );

    if (!assignedEmployee) {
        return res.status(400).json({
            message: `${assignedTo} non è un dipendente attivo nel sistema.`,
        });
    }

    // Get the required shift for the task
    const requiredShift = getShiftFromTime(time);

    // Get shift data for the specific date
    const taskDate = new Date(date);
    const year = taskDate.getFullYear();
    const month = taskDate.getMonth() + 1;
    const shiftFilePath = getShiftDataPath(year, month);

    if (fs.existsSync(shiftFilePath)) {
        const shiftData = JSON.parse(fs.readFileSync(shiftFilePath));
        const dayData = shiftData[date];

        if (dayData) {
            // Check if the assigned employee is working the required shift on this date
            const employeeData = dayData[assignedTo];
            if (!employeeData || employeeData.shift !== requiredShift) {
                return res.status(400).json({
                    message: `${assignedTo} non è in servizio nel turno richiesto (${requiredShift}) per la data ${date}. Controlla i turni prima di assegnare il task.`,
                });
            }
        }
    } // Generate a unique ID that won't be reused even if tasks are deleted
    const maxId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) : 0;
    const newTask = {
        id: maxId + 1,
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

    // Check permissions for employees
    if (req.user.role === "employee") {
        // Employees can only toggle tasks assigned to them
        if (task.assignedTo !== req.user.name) {
            return res.status(403).json({
                message:
                    "Non hai i permessi per modificare questo task. Puoi modificare solo i task assegnati a te.",
            });
        }
    }
    const nextStatus = {
        "non iniziato": "in corso",
        "in corso": "completato",
        completato: "non completato",
        "non completato": "completato",
        riassegnato: "in corso",
    };

    task.status = nextStatus[task.status] || "non iniziato";
    saveTasksToFile();
    res.json(task);
};

exports.deleteTask = (req, res) => {
    const id = parseInt(req.params.id);
    const task = tasks.find((t) => t.id === id);

    if (!task) return res.status(404).json({ message: "Task non trovato" });

    // Check permissions - only admins, managers, supervisors can delete tasks
    if (req.user.role === "employee") {
        return res.status(403).json({
            message:
                "Non hai i permessi per eliminare i task. Solo amministratori, manager e supervisori possono eliminare i task.",
        });
    }

    const index = tasks.findIndex((t) => t.id === id);
    tasks.splice(index, 1);
    saveTasksToFile();
    res.json({ success: true, id });
};

// Add description and simulator to a task
exports.updateTaskDescription = (req, res) => {
    console.log("updateTaskDescription called with:", {
        id: req.params.id,
        body: req.body,
        user: req.user,
    });

    const id = parseInt(req.params.id);
    const { description, simulator } = req.body;
    const task = tasks.find((t) => t.id === id);

    if (!task) {
        console.log("Task not found with id:", id);
        return res.status(404).json({ message: "Task non trovato" });
    }

    // Check permissions for employees
    if (req.user.role === "employee") {
        // Employees can only update descriptions for tasks assigned to them
        if (task.assignedTo !== req.user.name) {
            console.log(
                "Permission denied: task assigned to",
                task.assignedTo,
                "but user is",
                req.user.name
            );
            return res.status(403).json({
                message:
                    "Non hai i permessi per modificare questo task. Puoi modificare solo i task assegnati a te.",
            });
        }
    }

    console.log(
        "Updating task with description:",
        description,
        "and simulator:",
        simulator
    );
    task.description = description || "";
    task.simulator = simulator || "";
    saveTasksToFile();
    console.log("Task updated successfully:", task);
    res.json(task);
};

// New endpoint to get available employees for a specific date and time
exports.getAvailableEmployees = (req, res) => {
    const { date, time } = req.query;

    if (!date || !time) {
        return res.status(400).json({ message: "Date and time are required" });
    }

    const requiredShift = getShiftFromTime(time);
    const taskDate = new Date(date);
    const year = taskDate.getFullYear();
    const month = taskDate.getMonth() + 1;
    const shiftFilePath = getShiftDataPath(year, month);

    // Get all active employees from users.json
    const activeEmployees = getActiveEmployees();
    let availableEmployees = [];

    if (fs.existsSync(shiftFilePath)) {
        const shiftData = JSON.parse(fs.readFileSync(shiftFilePath));
        const dayData = shiftData[date];

        if (dayData) {
            // Find employees from users.json who are working the required shift
            activeEmployees.forEach((employee) => {
                // Check if employee has shift data for this date
                const employeeShiftData = dayData[employee.name];
                if (
                    employeeShiftData &&
                    employeeShiftData.shift === requiredShift
                ) {
                    availableEmployees.push(employee.name);
                }
            });
        }
    } else {
        // If no shift data exists, return all active employees as potentially available
        // This provides a fallback when shift planning hasn't been done yet
        availableEmployees = activeEmployees.map((emp) => emp.name);
    }

    res.json({
        availableEmployees,
        requiredShift,
        date,
        time,
    });
};

// Reassign a task with "non completato" status
exports.reassignTask = (req, res) => {
    const id = parseInt(req.params.id);
    const { date, time, assignedTo } = req.body;
    const task = tasks.find((t) => t.id === id);

    if (!task) {
        return res.status(404).json({ message: "Task non trovato" });
    }

    // Only allow reassignment of "non completato" tasks
    if (task.status !== "non completato") {
        return res.status(400).json({
            message:
                "Solo i task con stato 'non completato' possono essere riassegnati.",
        });
    }

    // Check permissions - employees cannot reassign tasks
    if (req.user.role === "employee") {
        return res.status(403).json({
            message:
                "Non hai i permessi per riassegnare i task. Solo amministratori, manager e supervisori possono riassegnare i task.",
        });
    }

    // Validate the new assignment
    if (!date || !time || !assignedTo) {
        return res.status(400).json({
            message:
                "Data, ora e dipendente assegnato sono obbligatori per la riassegnazione.",
        });
    }

    // Check if the assigned employee exists in users.json and is active
    const activeEmployees = getActiveEmployees();
    const assignedEmployee = activeEmployees.find(
        (emp) => emp.name === assignedTo
    );

    if (!assignedEmployee) {
        return res.status(400).json({
            message: `${assignedTo} non è un dipendente attivo nel sistema.`,
        });
    }

    // Get the required shift for the task
    const requiredShift = getShiftFromTime(time);

    // Get shift data for the specific date
    const taskDate = new Date(date);
    const year = taskDate.getFullYear();
    const month = taskDate.getMonth() + 1;
    const shiftFilePath = getShiftDataPath(year, month);

    if (fs.existsSync(shiftFilePath)) {
        const shiftData = JSON.parse(fs.readFileSync(shiftFilePath));
        const dayData = shiftData[date];

        if (dayData) {
            // Check if the assigned employee is working the required shift on this date
            const employeeData = dayData[assignedTo];
            if (!employeeData || employeeData.shift !== requiredShift) {
                return res.status(400).json({
                    message: `${assignedTo} non è in servizio nel turno richiesto (${requiredShift}) per la data ${date}. Controlla i turni prima di riassegnare il task.`,
                });
            }
        }
    }

    // Update the task
    task.date = date;
    task.time = time;
    task.assignedTo = assignedTo;
    task.status = "riassegnato";

    saveTasksToFile();
    res.json(task);
};
