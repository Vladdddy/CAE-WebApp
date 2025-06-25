const express = require("express");
const router = express.Router();
const notesController = require("../controllers/notesController");
const auth = require("../middleware/auth");

// Get all task notes
router.get("/tasks", auth, notesController.getTaskNotes);

// Get all logbook notes
router.get("/logbook", auth, notesController.getLogbookNotes);

// Get notes for a specific task
router.get("/tasks/:taskId", auth, notesController.getTaskNotesById);

// Get notes for a specific logbook entry
router.get("/logbook/:entryId", auth, notesController.getLogbookNotesById);

// Add a note to a task
router.post("/tasks/:taskId", auth, notesController.addTaskNote);

// Add a note to a logbook entry
router.post("/logbook/:entryId", auth, notesController.addLogbookNote);

// Update a specific note
router.put("/:type/:entryId/:noteIndex", auth, notesController.updateNote);

// Delete a specific note
router.delete("/:type/:entryId/:noteIndex", auth, notesController.deleteNote);

// Migrate notes from localStorage (one-time migration endpoint)
router.post("/migrate", auth, notesController.migrateNotesFromLocalStorage);

module.exports = router;
