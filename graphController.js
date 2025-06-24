const graphModel = require('../models/graphModel');

exports.getGraphData = async (req, res) => {
  const { file_id } = req.query;

  if (!file_id) {
    return res.status(400).json({ success: false, message: 'Missing file_id' });
  }

  try {
    const result = await graphModel.fetchGraphData(file_id);
    res.json(result);
  } catch (error) {
    console.error('Error in graphController:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSJSGraphData = async (req, res) => {
  const { file_id } = req.query;

  if (!file_id) {
    return res.status(400).json({ success: false, message: 'Missing file_id' });
  }

  try {
    const result = await graphModel.fetchSJSGraphData(file_id);
    res.json(result);
  } catch (error) {
    console.error('Error in getSJSGraphData:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
