const express = require('express');
const router = express.Router();
const QcCheckController = require('../controllers/qcCheckController');

// GET: solution labels based on file type
router.get('/solution-labels', QcCheckController.getSolutionLabels);

router.get('/file-meta',QcCheckController.meta);


// GET: summary data for a given file and solution label
router.get('/summary', QcCheckController.getSummary);

module.exports = router;
