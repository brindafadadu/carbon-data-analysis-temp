const path = require('path');
const fileModel = require('../models/fileModel');

exports.downloadFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const row = await fileModel.getFileById(fileId); // gets { filename, path }

    if (!row) {
      return res.status(404).json({ error: 'File not found' });
    }

    const absoluteFilePath = path.join(__dirname, '..', row.path);
    // console.log("Download request:", {
    //   file: row.filename,
    //   path: row.path
    // });

    // ✅ Use res.download to set filename correctly
    return res.download(absoluteFilePath, row.filename);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to download file' });
  }
  
};
