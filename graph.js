const express = require('express');
const router = express.Router();
const graphController = require('../controllers/graphController');

router.get('/graph-data', graphController.getGraphData);
router.get('/sjs-graph', graphController.getSJSGraphData); // NEW: SJS Graph

module.exports = router;