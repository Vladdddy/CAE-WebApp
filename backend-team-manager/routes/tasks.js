const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
    getTasks,
    createTask,
    toggleTask,
    deleteTask,
    getAvailableEmployees,
} = require("../controllers/taskController");

router.get("/", verifyToken, getTasks);
router.get("/available-employees", verifyToken, getAvailableEmployees);
router.post("/", verifyToken, createTask);
router.patch("/:id/toggle", verifyToken, toggleTask);
router.delete("/:id", verifyToken, deleteTask);

module.exports = router;
