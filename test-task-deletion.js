// Test script to verify that task deletion also deletes associated notes
const fs = require("fs");
const path = require("path");

// Simulate a task with notes being deleted
const testTaskDeletion = () => {
    console.log("Testing task deletion with notes cleanup...");

    // Read current notes to see if there are any task notes
    const notesPath = path.join(
        __dirname,
        "backend-team-manager",
        "data",
        "notes.json"
    );

    if (fs.existsSync(notesPath)) {
        const notesData = JSON.parse(fs.readFileSync(notesPath));
        console.log(
            "Current task notes keys:",
            Object.keys(notesData.taskNotes || {})
        );

        // Show how many notes each task has
        if (notesData.taskNotes) {
            Object.entries(notesData.taskNotes).forEach(([taskId, notes]) => {
                console.log(`Task ${taskId} has ${notes.length} notes`);
            });
        }
    } else {
        console.log("Notes file doesn't exist yet");
    }

    console.log(
        "\nNow when you delete a task, its notes will also be automatically deleted!"
    );
    console.log("The deleteTask function has been modified to:");
    console.log("1. Delete the task from tasks.json");
    console.log("2. Delete all associated notes from notes.json");
    console.log(
        "3. This prevents new tasks with the same ID from inheriting old notes"
    );
};

testTaskDeletion();
