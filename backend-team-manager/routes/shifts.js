// 📄 routes/shifts.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const { getShifts, saveShifts } = require("../controllers/shiftController");

router.get("/:year/:month", verifyToken, getShifts);
router.post("/:year/:month", verifyToken, saveShifts);

module.exports = router;
