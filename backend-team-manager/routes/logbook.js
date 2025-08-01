const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const upload = require("../middleware/upload");
const logbookController = require("../controllers/logbookController");

router.get("/:date", verifyToken, logbookController.getEntriesByDate);
router.post(
    "/:date",
    verifyToken,
    upload.array("images", 5),
    logbookController.saveEntriesByDate
); // Allow up to 5 images

module.exports = router;
