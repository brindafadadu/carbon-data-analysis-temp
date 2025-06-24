const express = require('express');
const multer = require('multer');
const path = require('path');
const { uploadFile} = require('../controllers/uploadController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
 filename: (req, file, cb) => {
  cb(null, file.originalname); // Store using the original filename
}

});

const upload = multer({ storage });

//POST route for file upload
router.post('/upload-csv', upload.single('file'), uploadFile);

module.exports = router;
