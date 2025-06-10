const express = require('express');
const router = express.Router();
const logbookController = require('../controllers/logbookController');

router.get('/:date', logbookController.getEntriesByDate);
router.post('/:date', logbookController.saveEntriesByDate);

module.exports = router;
