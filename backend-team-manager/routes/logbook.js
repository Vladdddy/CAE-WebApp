const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const logbookController = require("../controllers/logbookController");

router.get("/:date", verifyToken, logbookController.getEntriesByDate);
router.post("/:date", verifyToken, logbookController.saveEntriesByDate);

module.exports = router;
