const dashboardModel = require('../models/dashboardModel');
const graphModel = require('../models/graphModel');
const qcCheckService = require('./qcCheckService');

class DashboardService {
  /**
   * Get dashboard data - total files, total samples, QC pass rate, and graph data
   */
  static async getDashboardData() {
    try {
      console.log('Getting dashboard data...');
      
      const [summary, qcGraphData] = await Promise.all([
        dashboardModel.getDashboardSummary(),
        this.getQCGraphDataForDashboard()
      ]);
      
      console.log('Dashboard summary received:', summary);
      console.log('QC graph data received:', qcGraphData);

      return {
        totalFiles: summary.totalFiles,
        totalSamples: summary.totalSamples,
        qcPassRate: summary.qcPassRate,
        qcStats: {
          totalChecks: summary.qcTotalChecks,
          passedChecks: summary.qcPassedChecks,
          passRate: summary.qcPassRate
        },
        qcGraphData: qcGraphData
      };
    } catch (err) {
      console.error('Dashboard service error:', err);
      throw new Error('Failed to get dashboard data: ' + err.message);
    }
  }

  /**
   * Get individual statistics
   */
  static async getTotalFiles() {
    try {
      return await dashboardModel.getTotalFilesCount();
    } catch (err) {
      console.error('Error getting total files:', err);
      throw err;
    }
  }

  static async getTotalSamples() {
    try {
      return await dashboardModel.getTotalSamplesCount();
    } catch (err) {
      console.error('Error getting total samples:', err);
      throw err;
    }
  }

  static async getQCPassRate() {
    try {
      return await dashboardModel.getQCPassRate();
    } catch (err) {
      console.error('Error getting QC pass rate:', err);
      throw err;
    }
  }

  /**
   * Get QC Graph Data for Dashboard using existing graph infrastructure
   */
  static async getQCGraphDataForDashboard() {
    try {
      // Get QC files from the past week
      const qcFiles = await this.getQCFilesFromPastWeek();
      
      if (!qcFiles || qcFiles.length === 0) {
        return {
          success: true,
          graphData: {},
          message: 'No QC files found in the past week'
        };
      }

      // Get graph data for each QC file using the existing graphModel
      const allGraphData = {};
      let totalDataPoints = 0;

      for (const file of qcFiles) {
        try {
          const fileGraphData = await graphModel.fetchGraphData(file.id);
          
          if (fileGraphData.success && fileGraphData.graphData) {
            // Merge graph data from this file with the overall data
            Object.keys(fileGraphData.graphData).forEach(element => {
              if (!allGraphData[element]) {
                allGraphData[element] = [];
              }
              
              // Transform the existing graph data format to dashboard format
              const elementData = fileGraphData.graphData[element].map(point => ({
                timestamp: point.sample, // graphModel uses 'sample' field for timestamp
                value: point.value,
                fileId: file.id,
                fileName: file.filename,
                fileType: file.type === 1 ? 'PPM' : 'PPB',
                uploadedAt: file.uploaded_at
              }));
              
              allGraphData[element] = allGraphData[element].concat(elementData);
              totalDataPoints += elementData.length;
            });
          }
        } catch (fileError) {
          console.warn(`Error getting graph data for file ${file.id}:`, fileError);
          // Continue with other files even if one fails
        }
      }

      // Sort data points by timestamp for each element
      Object.keys(allGraphData).forEach(element => {
        allGraphData[element].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      });

      return {
        success: true,
        graphData: allGraphData,
        summary: {
          totalElements: Object.keys(allGraphData).length,
          totalFiles: qcFiles.length,
          totalDataPoints: totalDataPoints,
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          }
        }
      };
    } catch (err) {
      console.error('Error getting QC graph data for dashboard:', err);
      return {
        success: false,
        graphData: {},
        message: 'Failed to get QC graph data: ' + err.message
      };
    }
  }

  /**
   * Get QC files from the past week
   */
  static async getQCFilesFromPastWeek() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT DISTINCT 
          uploaded_files.id,
          uploaded_files.type,
          uploaded_files.uploaded_at,
          uploaded_files.filename
        FROM uploaded_files
        JOIN qc_data ON uploaded_files.id = qc_data.file_id
        WHERE uploaded_files.uploaded_at >= DATE('now', '-7 days')
          AND uploaded_files.hidden = 0
          AND qc_data."Solution Label" LIKE '%QC MES%'
        ORDER BY uploaded_files.uploaded_at ASC
      `;

      const db = require('../initialize_db');
      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Error getting QC files from past week:', err);
          return reject(err);
        }
        resolve(rows || []);
      });
    });
  }

  /**
   * Get QC Graph Data (alias for backward compatibility)
   */
  static async getQCGraphData() {
    return await this.getQCGraphDataForDashboard();
  }
}

module.exports = DashboardService;