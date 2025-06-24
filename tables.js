console.log('✅ tables.js route file loaded');

// routes/tableRoutes.js
const express = require('express');
const router = express.Router();
const TableController = require('../controllers/tableController');

// Get table data by file ID
router.get('/table-data', TableController.getTableDataByFile);
router.get('/sjsTable-data',TableController.getSJSTableDataByFile);
router.get('/element-mini-table', TableController.getQcMiniTableData);
router.get('/sjs-mini-table', TableController.getSJSMiniTableData);

module.exports = router;