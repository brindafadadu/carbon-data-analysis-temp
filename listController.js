const fileModel = require('../models/fileModel');
const authModel = require('../models/authModel');

const listFiles = async (req, res) => {
  try {
    const rows = await fileModel.getVisibleFiles();
    
    const transformedFiles = rows.map(file => ({
      id: file.id,
      name: file.filename, // Map filename to name
      type: file.filename.split('.').pop().toUpperCase(), // Extract file extension
      user: 'Default', //Default for now, need to integrate user authentication later
      email: 'system@example.com', // Default email
      uploadDate: new Date(file.uploaded_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(',', ''), // Format date to match frontend expectation
      status: 'Uploaded'
    }));
    
    res.json(transformedFiles);
  } catch (err) {
    console.error('DB fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};

module.exports = { listFiles };