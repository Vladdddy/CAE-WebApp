const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
    getTasks,
    createTask,
    toggleTask,
    deleteTask,
    getAvailableEmployees,
    updateTaskDescription,
    reassignTask,
    updateTaskStatus,
    deleteTaskImage,
} = require("../controllers/taskController");

router.get("/", verifyToken, getTasks);
router.get("/available-employees", verifyToken, getAvailableEmployees);
router.post("/", verifyToken, upload.array("images", 5), createTask); // Allow up to 5 images
router.patch("/:id/toggle", verifyToken, toggleTask);
router.patch("/:id/description", verifyToken, updateTaskDescription);
router.patch("/:id/reassign", verifyToken, reassignTask);
router.patch("/:id/status", verifyToken, updateTaskStatus);
router.delete("/:taskId/images/:imageId", verifyToken, deleteTaskImage); // Route for deleting specific images
router.delete("/:id", verifyToken, deleteTask);
router.delete("/:taskId/images/:imageId", verifyToken, deleteTaskImage);

module.exports = router;
