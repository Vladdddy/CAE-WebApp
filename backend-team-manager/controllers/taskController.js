const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "data", "tasks.json");
const usersFilePath = path.join(__dirname, "..", "data", "users.json");
const notesFilePath = path.join(__dirname, "..", "data", "notes.json");

// Helper function to get active employees and admins from users.json
const getActiveUsers = () => {
    if (fs.existsSync(usersFilePath)) {
        const users = JSON.parse(fs.readFileSync(usersFilePath));
        return users.filter(
            (user) =>
                user.active &&
                (user.role === "employee" || user.role === "admin") &&
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

// Helper function to delete notes for a specific task
const deleteTaskNotes = (taskId) => {
    try {
        if (fs.existsSync(notesFilePath)) {
            const notesData = JSON.parse(fs.readFileSync(notesFilePath));

            // Delete the task notes if they exist
            if (notesData.taskNotes && notesData.taskNotes[taskId.toString()]) {
                delete notesData.taskNotes[taskId.toString()];

                // Save the updated notes back to file
                fs.writeFileSync(
                    notesFilePath,
                    JSON.stringify(notesData, null, 2)
                );
                console.log(`Deleted notes for task ID: ${taskId}`);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error(`Error deleting notes for task ID ${taskId}:`, error);
        return false;
    }
};

// Helper function to add a system note (non-deletable, non-modifiable)
const addSystemNote = (taskId, userName, action) => {
    try {
        let notesData = {
            taskNotes: {},
            logbookNotes: {},
        };

        // Load existing notes if file exists
        if (fs.existsSync(notesFilePath)) {
            notesData = JSON.parse(fs.readFileSync(notesFilePath));
        }

        // Create the system note
        const systemNote = {
            text: `${userName} ha modificato la task`,
            author: "SYSTEM",
            timestamp: new Date().toISOString(),
            isSystem: true, // Mark as system note
            isSimple: true, // Mark as simple display (no author/timestamp shown)
        };

        // Initialize taskNotes array if it doesn't exist
        if (!notesData.taskNotes[taskId.toString()]) {
            notesData.taskNotes[taskId.toString()] = [];
        }

        // Add the system note
        notesData.taskNotes[taskId.toString()].push(systemNote);

        // Save to file
        fs.writeFileSync(notesFilePath, JSON.stringify(notesData, null, 2));
        console.log(
            `Added system note for task ID: ${taskId} by user: ${userName}`
        );
        return true;
    } catch (error) {
        console.error(`Error adding system note for task ID ${taskId}:`, error);
        return false;
    }
};

exports.getTasks = (req, res) => {
    res.json(tasks);
};

exports.createTask = (req, res) => {
    const {
        title,
        description,
        assignedTo,
        simulator,
        category,
        subcategory,
        extraDetail,
        date,
        time,
        status,
    } = req.body;

    // Skip active employee check for "da definire" tasks and "Non assegnare"
    if (status !== "da definire" && assignedTo !== "Non assegnare") {
        // Check if the assigned employee(s) exist in users.json and are active
        const activeUsers = getActiveUsers();

        // Handle multiple employees (comma-separated)
        const assignedEmployeeNames = assignedTo.includes(",")
            ? assignedTo.split(",").map((name) => name.trim())
            : [assignedTo];

        for (const employeeName of assignedEmployeeNames) {
            const assignedEmployee = activeUsers.find(
                (emp) => emp.name === employeeName
            );

            if (!assignedEmployee) {
                return res.status(400).json({
                    message: `${employeeName} non è un dipendente attivo nel sistema.`,
                });
            }
        }
    }

    // Skip shift validation for "da definire" tasks and "Non assegnare" since they don't have real date/time or assignee
    if (status !== "da definire" && assignedTo !== "Non assegnare") {
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
                // Handle multiple employees (comma-separated)
                const assignedEmployeeNames = assignedTo.includes(",")
                    ? assignedTo.split(",").map((name) => name.trim())
                    : [assignedTo];

                for (const employeeName of assignedEmployeeNames) {
                    // Check if the assigned employee is working the required shift on this date
                    const employeeData = dayData[employeeName];
                    if (employeeData && employeeData.shift) {
                        const userShift = employeeData.shift;

                        // Check if user's shift matches the required time period
                        const isShiftMatch =
                            userShift === requiredShift ||
                            (userShift === "D" &&
                                (requiredShift === "O" ||
                                    requiredShift === "OP")) ||
                            (userShift === "N" && requiredShift === "ON");

                        if (!isShiftMatch) {
                            return res.status(400).json({
                                message: `${employeeName} non è in servizio nel turno richiesto (${requiredShift}) per la data ${date}. Controlla i turni prima di assegnare il task.`,
                            });
                        }
                    } else {
                        return res.status(400).json({
                            message: `${employeeName} non è in servizio nel turno richiesto (${requiredShift}) per la data ${date}. Controlla i turni prima di assegnare il task.`,
                        });
                    }
                }
            }
        }
    }

    // Generate a unique ID that won't be reused even if tasks are deleted
    const maxId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) : 0;
    const newTask = {
        id: maxId + 1,
        title,
        description: description || "",
        assignedTo,
        simulator: simulator || "",
        category: category || "",
        subcategory: subcategory || "",
        extraDetail: extraDetail || "",
        status: status || "non iniziato",
        date: status === "da definire" ? null : date,
        time: status === "da definire" ? null : time,
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
        completato: "non completato",
        "non completato": "completato",
        riassegnato: "in corso",
    };

    task.status = nextStatus[task.status] || "non iniziato";

    // Add system note when employee modifies a task
    if (req.user.role === "employee") {
        addSystemNote(id, req.user.name, "status_change");
    }

    saveTasksToFile();
    res.json(task);
};

exports.deleteTask = (req, res) => {
    const id = parseInt(req.params.id);
    const task = tasks.find((t) => t.id === id);

    if (!task) return res.status(404).json({ message: "Task non trovato" });

    // Check permissions - only admins, managers, supervisors, and superusers can delete tasks
    if (req.user.role === "employee") {
        return res.status(403).json({
            message:
                "Non hai i permessi per eliminare i task. Solo amministratori, manager, supervisori e superuser possono eliminare i task.",
        });
    }

    const index = tasks.findIndex((t) => t.id === id);
    tasks.splice(index, 1);

    // Delete all notes associated with this task
    deleteTaskNotes(id);

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
    const { title, description, simulator, employee, date, time } = req.body;
    const task = tasks.find((t) => t.id === id);

    if (!task) {
        console.log("Task not found with id:", id);
        return res.status(404).json({ message: "Task non trovato" });
    }

    // If employee is being changed, validate the new employee
    if (employee !== undefined && employee !== task.assignedTo) {
        const activeUsers = getActiveUsers();
        const employeeExists = activeUsers.find((emp) => emp.name === employee);

        if (employee !== "" && !employeeExists) {
            return res.status(400).json({
                message: "Dipendente non valido o non attivo",
            });
        }
    }

    console.log(
        "Updating task with title:",
        title,
        "description:",
        description,
        "simulator:",
        simulator,
        "employee:",
        employee,
        "date:",
        date,
        "time:",
        time
    );

    // Update the task fields
    if (title !== undefined) {
        task.title = title || "";
    }
    task.description = description || "";
    task.simulator = simulator || "";
    if (employee !== undefined) {
        task.assignedTo = employee;
    }
    if (date !== undefined) {
        task.date = date || null;
    }
    if (time !== undefined) {
        task.time = time || null;
    }

    // If date or time changed, check if current employee is still available for the new slot
    if (
        (date !== undefined || time !== undefined) &&
        task.assignedTo &&
        task.assignedTo !== "Non assegnare"
    ) {
        const taskDate = task.date;
        const taskTime = task.time;

        if (taskDate && taskTime) {
            const requiredShift = getShiftFromTime(taskTime);
            const dateObj = new Date(taskDate);
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth() + 1;
            const shiftFilePath = getShiftDataPath(year, month);

            let employeeStillAvailable = false;

            if (fs.existsSync(shiftFilePath)) {
                const shiftData = JSON.parse(fs.readFileSync(shiftFilePath));
                const dayData = shiftData[taskDate];

                if (dayData && dayData[task.assignedTo]) {
                    const employeeShiftData = dayData[task.assignedTo];
                    if (employeeShiftData && employeeShiftData.shift) {
                        const userShift = employeeShiftData.shift;

                        // Check if user's shift matches the required time period
                        const isShiftMatch =
                            userShift === requiredShift ||
                            (userShift === "D" &&
                                (requiredShift === "O" ||
                                    requiredShift === "OP")) ||
                            (userShift === "N" && requiredShift === "ON");

                        employeeStillAvailable = isShiftMatch;
                    }
                }
            } else {
                // If no shift data exists, assume employee is still available
                employeeStillAvailable = true;
            }

            // If employee is no longer available for this shift, set to "Non assegnare"
            if (!employeeStillAvailable) {
                console.log(
                    `Employee ${task.assignedTo} not available for new date/time, setting to "Non assegnare"`
                );
                task.assignedTo = "Non assegnare";
            }
        }
    }

    // Add system note when employee modifies a task
    if (req.user.role === "employee") {
        addSystemNote(id, req.user.name, "task_update");
    }

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
    const activeUsers = getActiveUsers();
    let availableEmployees = [];

    if (fs.existsSync(shiftFilePath)) {
        const shiftData = JSON.parse(fs.readFileSync(shiftFilePath));
        const dayData = shiftData[date];

        if (dayData) {
            // Find employees from users.json who are working the required shift
            activeUsers.forEach((employee) => {
                // Check if employee has shift data for this date
                const employeeShiftData = dayData[employee.name];
                if (employeeShiftData && employeeShiftData.shift) {
                    const userShift = employeeShiftData.shift;

                    // Check if user's shift matches the required time period
                    const isShiftMatch =
                        userShift === requiredShift ||
                        (userShift === "D" &&
                            (requiredShift === "O" ||
                                requiredShift === "OP")) ||
                        (userShift === "N" && requiredShift === "ON");

                    if (isShiftMatch) {
                        availableEmployees.push(employee.name);
                    }
                }
            });
        }
    } else {
        // If no shift data exists, return all active employees as potentially available
        // This provides a fallback when shift planning hasn't been done yet
        availableEmployees = activeUsers.map((emp) => emp.name);
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

    // Only allow reassignment of "non completato" and "da definire" tasks
    if (task.status !== "non completato" && task.status !== "da definire") {
        return res.status(400).json({
            message:
                "Solo i task con stato 'non completato' o 'da definire' possono essere riassegnati.",
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

    // Check if the assigned employee exists in users.json and is active (skip for "Non assegnare")
    if (assignedTo !== "Non assegnare") {
        const activeUsers = getActiveUsers();
        const assignedEmployee = activeUsers.find(
            (emp) => emp.name === assignedTo
        );

        if (!assignedEmployee) {
            return res.status(400).json({
                message: `${assignedTo} non è un dipendente attivo nel sistema.`,
            });
        }
    }

    // Skip shift validation for "Non assegnare" tasks since they don't have an assignee
    if (assignedTo !== "Non assegnare") {
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
                if (employeeData && employeeData.shift) {
                    const userShift = employeeData.shift;

                    // Check if user's shift matches the required time period
                    const isShiftMatch =
                        userShift === requiredShift ||
                        (userShift === "D" &&
                            (requiredShift === "O" ||
                                requiredShift === "OP")) ||
                        (userShift === "N" && requiredShift === "ON");

                    if (!isShiftMatch) {
                        return res.status(400).json({
                            message: `${assignedTo} non è in servizio nel turno richiesto (${requiredShift}) per la data ${date}. Controlla i turni prima di riassegnare il task.`,
                        });
                    }
                } else {
                    return res.status(400).json({
                        message: `${assignedTo} non è in servizio nel turno richiesto (${requiredShift}) per la data ${date}. Controlla i turni prima di riassegnare il task.`,
                    });
                }
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

// Update task status directly
exports.updateTaskStatus = (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const task = tasks.find((t) => t.id === id);

    if (!task) {
        return res.status(404).json({ message: "Task non trovato" });
    }

    // Validate status
    const validStatuses = [
        "non iniziato",
        "in corso",
        "completato",
        "non completato",
        "riassegnato",
        "da definire",
    ];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            message: "Status non valido",
        });
    }

    task.status = status;

    // Add system note when employee modifies a task
    if (req.user.role === "employee") {
        addSystemNote(id, req.user.name, "status_update");
    }

    saveTasksToFile();
    res.json(task);
};
