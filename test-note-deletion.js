// Test script to simulate task deletion and verify notes are also deleted
const fs = require("fs");
const path = require("path");

const testTaskNoteDeletion = () => {
    console.log("=== Task Note Deletion Test ===\n");

    const notesPath = path.join(
        __dirname,
        "backend-team-manager",
        "data",
        "notes.json"
    );
    const tasksPath = path.join(
        __dirname,
        "backend-team-manager",
        "data",
        "tasks.json"
    );

    // Read current state
    if (fs.existsSync(notesPath)) {
        const notesData = JSON.parse(fs.readFileSync(notesPath));
        console.log("Current task notes in notes.json:");
        Object.entries(notesData.taskNotes || {}).forEach(([taskId, notes]) => {
            console.log(`  Task ${taskId}: ${notes.length} notes`);
        });
    }

    if (fs.existsSync(tasksPath)) {
        const tasks = JSON.parse(fs.readFileSync(tasksPath));
        console.log("\nCurrent tasks in tasks.json:");
        tasks.forEach((task) => {
            console.log(`  Task ${task.id}: "${task.title}"`);
        });
    }

    console.log("\n=== Simulating deletion of task 45 ===");

    // Simulate the deletion logic from taskController
    const deleteTaskNotes = (taskId) => {
        try {
            if (fs.existsSync(notesPath)) {
                const notesData = JSON.parse(fs.readFileSync(notesPath));

                // Delete the task notes if they exist
                if (
                    notesData.taskNotes &&
                    notesData.taskNotes[taskId.toString()]
                ) {
                    delete notesData.taskNotes[taskId.toString()];

                    // Save the updated notes back to file
                    fs.writeFileSync(
                        notesPath,
                        JSON.stringify(notesData, null, 2)
                    );
                    console.log(`✅ Deleted notes for task ID: ${taskId}`);
                    return true;
                } else {
                    console.log(`⚠️  No notes found for task ID: ${taskId}`);
                    return false;
                }
            }
            return false;
        } catch (error) {
            console.error(
                `❌ Error deleting notes for task ID ${taskId}:`,
                error
            );
            return false;
        }
    };

    // Test deleting notes for task 45
    const result = deleteTaskNotes(45);

    // Show the result
    if (fs.existsSync(notesPath)) {
        const notesData = JSON.parse(fs.readFileSync(notesPath));
        console.log("\nAfter deletion - remaining task notes:");
        Object.entries(notesData.taskNotes || {}).forEach(([taskId, notes]) => {
            console.log(`  Task ${taskId}: ${notes.length} notes`);
        });

        if (!notesData.taskNotes["45"]) {
            console.log("✅ Task 45 notes successfully deleted!");
        } else {
            console.log("❌ Task 45 notes still exist!");
        }
    }
};

testTaskNoteDeletion();
