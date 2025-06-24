// controllers/tableController.js
const TableModel = require('../models/tableModel');
const fileModel = require('../models/fileModel');
const miniTableService = require('../services/miniTableService');
const tableService = require('../services/tableService');
const QcCheckService = require('../services/qcCheckService');



class TableController {

  //===========================================
  //1. Get qc miniTableData by file_id and date range
  //===========================================
  static async getQcMiniTableData(req, res) {
  try {
    const { start_date, end_date, element, file_id } = req.query; // Destructure with snake_case

    if (!element || (!file_id && (!start_date || !end_date))) { // Use file_id, start_date, end_date
      return res.status(400).json({
        success: false,
        message: 'Query must include an element and either a file_id or both a start_date and end_date.',
      });
    }

    let fileIdsToProcess = [];

    if (file_id) { // Use file_id
      fileIdsToProcess = [parseInt(file_id, 10)];
    } else {
      fileIdsToProcess = await fileModel.getFileIdsByDateRange(start_date, end_date); // Use start_date, end_date
    }

    if (!fileIdsToProcess || fileIdsToProcess.length === 0) {
      return res.json({
        success: true,
        message: 'No files found for the specified criteria.',
        miniTable: [],
      });
    }

    let aggregatedData = [];
    for (const file_id_item of fileIdsToProcess) { // Renamed to avoid conflict with outer file_id
      const solution_label = await QcCheckService.getSolutionLabelsForFile(file_id_item);

      if (!solution_label) {
        console.warn(`[TableController] Skipping file_id ${file_id_item} as no solution_label was found.`);
        continue;
      }

      const data = await miniTableService.getMiniTableForElement(
        parseInt(file_id_item, 10),
        solution_label,
        element
      );

      if (data && data.length > 0) {
        aggregatedData = aggregatedData.concat(data);
      }
    }

    return res.json({
      success: true,
      miniTable: aggregatedData,
    });

  } catch (error) {
    console.error('[TableController] Error in getMiniTableData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mini table data',
      error: error.message,
    });
  }
}

  static async getSJSMiniTableData(req, res) {
  try {
    const { file_id, element } = req.query;

    if (!file_id || !element) {
      return res.status(400).json({
        success: false,
        message: 'file_id and element are required'
      });
    }

    const solutionLabel = 'SJS-Std';

    const data = await miniTableService.getSJSMiniTableForElement(
      parseInt(file_id),
      solutionLabel,
      element
    );

    return res.json({
      success: true,
      miniTable: data
    });

  } catch (error) {
    console.error('[TableController] Error in getSJSMiniTableData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mini table data',
      error: error.message
    });
  }
}



  // Get QC table data by file ID
  static async getTableDataByFile(req, res) {
    console.log("🔍 Received Query Params:", req.query);
  try {
    const { file_id, start_date, end_date } = req.query;

    if (!file_id && !(start_date && end_date)) {
      return res.status(400).json({
        success: false,
        message: 'A file_id or a start_date and end_date range is required'
      });
    }
    console.log('sd',start_date,'ed', end_date);
    console.log('file',file_id);

    let result;
    
    if (file_id) {
      result = await tableService.getQCTableData(parseInt(file_id, 10));
    } 
    else if (start_date && end_date) {
      result = await tableService.getFinalQCTableData(start_date, end_date);
    }

    if (!result || !result.tableData || result.tableData.length === 0) {
      return res.json({
        success: true,
        message: result ? result.message : 'No data found for the selected criteria',
        tableData: [],
        elements: []
      });
    }

    res.json({
      success: true,
      tableData: result.tableData,
      elements: result.elements
    });

  } catch (error) {
    console.error('[TableController] Error fetching QC table data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch QC table data',
      error: error.message
    });
  }
}

    static async getSJSTableDataByFile(req, res) {
  console.log(" Received Query Params:", req.query);

  try {
    const { file_id, start_date, end_date } = req.query;

    if (!file_id && !(start_date && end_date)) {
      return res.status(400).json({
        success: false,
        message: 'A file_id or a start_date and end_date range is required'
      });
    }

    console.log('sd', start_date, 'ed', end_date);
    console.log('file', file_id);

    let result;

    if (file_id) {
      const solutionLabel = 'SJS-Std';
      result = await tableService.getSJSTableData(parseInt(file_id, 10), solutionLabel);
    } else if (start_date && end_date) {
      result = await tableService.getFinalSJSTableData(start_date, end_date);
    }

    if (!result || !result.tableData || result.tableData.length === 0) {
      return res.json({
        success: true,
        message: result ? result.message : 'No data found for the selected criteria',
        tableData: [],
        elements: []
      });
    }

    return res.json({
      success: true,
      tableData: result.tableData,
      elements: result.elements
    });

  } catch (error) {
    console.error('[TableController] Error fetching SJS table data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SJS table data',
      error: error.message
    });
  }
}

}

module.exports = TableController;