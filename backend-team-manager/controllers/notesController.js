const fs = require("fs");
const path = require("path");

const notesFilePath = path.join(__dirname, "..", "data", "notes.json");

// Initialize notes storage if it doesn't exist
let notesData = {
    taskNotes: {},
    logbookNotes: {},
};

// Load existing notes from file
if (fs.existsSync(notesFilePath)) {
    try {
        notesData = JSON.parse(fs.readFileSync(notesFilePath));
    } catch (error) {
        console.error("Error loading notes file:", error);
    }
}

// Helper function to save notes to file
const saveNotesToFile = () => {
    try {
        fs.writeFileSync(notesFilePath, JSON.stringify(notesData, null, 2));
    } catch (error) {
        console.error("Error saving notes to file:", error);
        throw error;
    }
};

// Get all task notes
exports.getTaskNotes = (req, res) => {
    try {
        // Always reload data from file to get latest system notes
        let currentNotesData = {
            taskNotes: {},
            logbookNotes: {},
        };

        if (fs.existsSync(notesFilePath)) {
            currentNotesData = JSON.parse(fs.readFileSync(notesFilePath));
        }

        res.json(currentNotesData.taskNotes || {});
    } catch (error) {
        console.error("Error getting task notes:", error);
        res.status(500).json({ error: "Error retrieving task notes" });
    }
};

// Get all logbook notes
exports.getLogbookNotes = (req, res) => {
    try {
        res.json(notesData.logbookNotes || {});
    } catch (error) {
        console.error("Error getting logbook notes:", error);
        res.status(500).json({ error: "Error retrieving logbook notes" });
    }
};

// Get notes for a specific task
exports.getTaskNotesById = (req, res) => {
    try {
        const { taskId } = req.params;

        // Always reload data from file to get latest system notes
        let currentNotesData = {
            taskNotes: {},
            logbookNotes: {},
        };

        if (fs.existsSync(notesFilePath)) {
            currentNotesData = JSON.parse(fs.readFileSync(notesFilePath));
        }

        const notes = currentNotesData.taskNotes[taskId] || [];
        res.json(notes);
    } catch (error) {
        console.error("Error getting task notes by ID:", error);
        res.status(500).json({ error: "Error retrieving task notes" });
    }
};

// Get notes for a specific logbook entry
exports.getLogbookNotesById = (req, res) => {
    try {
        const { entryId } = req.params;
        const notes = notesData.logbookNotes[entryId] || [];
        res.json(notes);
    } catch (error) {
        console.error("Error getting logbook notes by ID:", error);
        res.status(500).json({ error: "Error retrieving logbook notes" });
    }
};

// Add a note to a task
exports.addTaskNote = (req, res) => {
    try {
        const { taskId } = req.params;
        const { text, author } = req.body;

        if (!text || !author) {
            return res
                .status(400)
                .json({ error: "Text and author are required" });
        }

        // Always reload data from file to get latest system notes
        let currentNotesData = {
            taskNotes: {},
            logbookNotes: {},
        };

        if (fs.existsSync(notesFilePath)) {
            currentNotesData = JSON.parse(fs.readFileSync(notesFilePath));
        }

        const noteData = {
            text,
            author,
            timestamp: new Date().toISOString(),
        };

        if (!currentNotesData.taskNotes[taskId]) {
            currentNotesData.taskNotes[taskId] = [];
        }

        currentNotesData.taskNotes[taskId].push(noteData);

        // Update global notesData and save to file
        notesData = currentNotesData;
        saveNotesToFile();

        res.status(201).json({
            message: "Note added successfully",
            note: noteData,
        });
    } catch (error) {
        console.error("Error adding task note:", error);
        res.status(500).json({
            error: "Error adding task note: " + error.message,
        });
    }
};

// Add a note to a logbook entry
exports.addLogbookNote = (req, res) => {
    try {
        const { entryId } = req.params;
        const { text, author } = req.body;

        if (!text || !author) {
            return res
                .status(400)
                .json({ error: "Text and author are required" });
        }

        const noteData = {
            text,
            author,
            timestamp: new Date().toISOString(),
        };

        if (!notesData.logbookNotes[entryId]) {
            notesData.logbookNotes[entryId] = [];
        }

        notesData.logbookNotes[entryId].push(noteData);
        saveNotesToFile();

        res.status(201).json({
            message: "Note added successfully",
            note: noteData,
        });
    } catch (error) {
        console.error("Error adding logbook note:", error);
        res.status(500).json({
            error: "Error adding logbook note: " + error.message,
        });
    }
};

// Update a specific note
exports.updateNote = (req, res) => {
    try {
        const { type, entryId, noteIndex } = req.params;
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        // Always reload data from file to get latest system notes
        let currentNotesData = {
            taskNotes: {},
            logbookNotes: {},
        };

        if (fs.existsSync(notesFilePath)) {
            currentNotesData = JSON.parse(fs.readFileSync(notesFilePath));
        }

        const notesArray =
            type === "tasks"
                ? currentNotesData.taskNotes[entryId]
                : currentNotesData.logbookNotes[entryId];

        if (!notesArray || !notesArray[noteIndex]) {
            return res.status(404).json({ error: "Note not found" });
        }

        const note = notesArray[noteIndex];
        const currentUser = req.user;

        if (note.isSystem) {
            return res.status(403).json({
                error: "System notes cannot be modified",
            });
        }

        if (
            currentUser.role !== "admin" &&
            currentUser.role !== "superuser" &&
            note.author !== currentUser.name
        ) {
            return res.status(403).json({
                error: "You can only modify your own notes or you must be an admin/superuser",
            });
        }

        notesArray[noteIndex].text = text;
        notesArray[noteIndex].updatedAt = new Date().toISOString();

        // Update global notesData and save to file
        notesData = currentNotesData;
        saveNotesToFile();

        res.json({
            message: "Note updated successfully",
            note: notesArray[noteIndex],
        });
    } catch (error) {
        console.error("Error updating note:", error);
        res.status(500).json({ error: "Error updating note" });
    }
};

// Delete a specific note
exports.deleteNote = (req, res) => {
    try {
        const { type, entryId, noteIndex } = req.params;

        // Always reload data from file to get latest system notes
        let currentNotesData = {
            taskNotes: {},
            logbookNotes: {},
        };

        if (fs.existsSync(notesFilePath)) {
            currentNotesData = JSON.parse(fs.readFileSync(notesFilePath));
        }

        const notesArray =
            type === "tasks"
                ? currentNotesData.taskNotes[entryId]
                : currentNotesData.logbookNotes[entryId];

        if (!notesArray || !notesArray[noteIndex]) {
            return res.status(404).json({ error: "Note not found" });
        }

        const note = notesArray[noteIndex];
        const currentUser = req.user;

        if (note.isSystem) {
            return res.status(403).json({
                error: "System notes cannot be deleted",
            });
        }

        if (
            currentUser.role !== "admin" &&
            currentUser.role !== "superuser" &&
            note.author !== currentUser.name
        ) {
            return res.status(403).json({
                error: "You can only delete your own notes or you must be an admin/superuser",
            });
        }

        notesArray.splice(noteIndex, 1);

        // Remove the array if it's empty
        if (notesArray.length === 0) {
            if (type === "tasks") {
                delete currentNotesData.taskNotes[entryId];
            } else {
                delete currentNotesData.logbookNotes[entryId];
            }
        }

        // Update global notesData and save to file
        notesData = currentNotesData;
        saveNotesToFile();

        res.json({ message: "Note deleted successfully" });
    } catch (error) {
        console.error("Error deleting note:", error);
        res.status(500).json({ error: "Error deleting note" });
    }
};

// Migrate notes from localStorage (for one-time migration)
exports.migrateNotesFromLocalStorage = (req, res) => {
    try {
        const { taskNotes, logbookNotes } = req.body;

        if (taskNotes) {
            // Merge with existing task notes
            Object.keys(taskNotes).forEach((taskId) => {
                if (!notesData.taskNotes[taskId]) {
                    notesData.taskNotes[taskId] = [];
                }
                // Add notes that don't already exist
                taskNotes[taskId].forEach((note) => {
                    const exists = notesData.taskNotes[taskId].some(
                        (existingNote) =>
                            existingNote.timestamp === note.timestamp &&
                            existingNote.text === note.text
                    );
                    if (!exists) {
                        notesData.taskNotes[taskId].push(note);
                    }
                });
            });
        }

        if (logbookNotes) {
            // Merge with existing logbook notes
            Object.keys(logbookNotes).forEach((entryId) => {
                if (!notesData.logbookNotes[entryId]) {
                    notesData.logbookNotes[entryId] = [];
                }
                // Add notes that don't already exist
                logbookNotes[entryId].forEach((note) => {
                    const exists = notesData.logbookNotes[entryId].some(
                        (existingNote) =>
                            existingNote.timestamp === note.timestamp &&
                            existingNote.text === note.text
                    );
                    if (!exists) {
                        notesData.logbookNotes[entryId].push(note);
                    }
                });
            });
        }

        saveNotesToFile();

        res.json({
            message: "Notes migrated successfully",
            taskNotesCount: Object.keys(notesData.taskNotes).length,
            logbookNotesCount: Object.keys(notesData.logbookNotes).length,
        });
    } catch (error) {
        console.error("Error migrating notes:", error);
        res.status(500).json({
            error: "Error migrating notes from localStorage",
        });
    }
};
