const express = require('express');
const { listFiles } = require('../controllers/listController');
const router = express.Router();

router.get('/uploaded-files', listFiles);

module.exports = router;
