const path = require('path');
const fs = require('fs');
const db = require('../initialize_db');
const uploadService = require('../services/uploadService');
const fileModel = require('../models/fileModel');
const { get } = require('http');
const { error } = require('console');

/**
 * Controller to handle file upload and processing:
 * 1. Validate uploaded file
 * 2. Insert raw data into DB
 * 3. Apply correction factors
 */
const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const originalName = req.file.originalname;
  const savedFilePath = path.join('uploads', originalName);

  db.serialize(async () => {
    try {
      db.run('BEGIN TRANSACTION');

      // ========================
      // 1. Validate the file
      // ========================
      const {
        error: validationError,
        samples,
        qc,
        csvType
      } = await uploadService.validate(savedFilePath, originalName);

      if (validationError) {
        db.run('ROLLBACK', () => {
          fs.unlink(savedFilePath, err => {
            if (err) console.error('Failed to delete invalid file:', err);
          });
          return res.status(400).json({ error: validationError });
        });
        return;
      }

      // ========================
      // 2. Insert raw data rows + file metadata
      // ========================
      const {
        error: insertError,
        fileId,
      } = await uploadService.insertAllData(originalName, savedFilePath, samples, qc, csvType);

      if (insertError) {
        db.run('ROLLBACK', () => {
          fs.unlink(savedFilePath, err => {
            if (err) console.error(`Failed to delete file after insert error (fileId: ${fileId}):`, err);
          });
          return res.status(500).json({ error: insertError });
        });
        return;
      }

      // ========================
      // 3. Apply correction factors to sample & std data
      // ========================
      const { error: correctionError } = await uploadService.insertCorrected(fileId, csvType);

      if (correctionError) {
        db.run('ROLLBACK', () => {
          fs.unlink(savedFilePath, err => {
            if (err) console.error('Failed to delete file after correction error:', err);
          });
          return res.status(500).json({ error: correctionError });
        });
        return;
      }

      // ========================
      // 4. Success: Commit changes
      // ========================
      db.run('COMMIT');
      res.status(200).json({
        message: 'File uploaded and processed successfully',
        fileId,
      });

    } catch (err) {
      console.error('[uploadFile] Error:', err);
      db.run('ROLLBACK', () => {
        fs.unlink(savedFilePath, unlinkErr => {
          if (unlinkErr) console.error('Failed to delete file on error:', unlinkErr);
        });
        res.status(500).json({ error: 'Database or CSV processing failed' });
      });
    }
  });
};

module.exports = { uploadFile };