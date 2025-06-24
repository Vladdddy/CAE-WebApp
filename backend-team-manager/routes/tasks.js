const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
    getTasks,
    createTask,
    toggleTask,
    deleteTask,
    getAvailableEmployees,
    updateTaskDescription,
    reassignTask,
} = require("../controllers/taskController");

router.get("/", verifyToken, getTasks);
router.get("/available-employees", verifyToken, getAvailableEmployees);
router.post("/", verifyToken, createTask);
router.patch("/:id/toggle", verifyToken, toggleTask);
router.patch("/:id/description", verifyToken, updateTaskDescription);
router.patch("/:id/reassign", verifyToken, reassignTask);
router.delete("/:id", verifyToken, deleteTask);

module.exports = router;
