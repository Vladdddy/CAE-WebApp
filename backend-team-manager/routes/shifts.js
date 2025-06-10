// 📄 routes/shifts.js
const express = require("express");
const router = express.Router();
const { getShifts, saveShifts } = require("../controllers/shiftController");

router.get("/:year/:month", getShifts);
router.post("/:year/:month", saveShifts);

module.exports = router;