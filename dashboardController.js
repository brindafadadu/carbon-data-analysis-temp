const DashboardService = require('../services/dashboardService');

class DashboardController {
  /**
   * GET /dashboard
   * Get complete dashboard data: total files, total samples, QC pass rate, and QC graph data
   */
  static async getDashboard(req, res) {
    try {
      const dashboardData = await DashboardService.getDashboardData();
      
      res.status(200).json({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Dashboard controller error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
        message: err.message
      });
    }
  }

  /**
   * GET /dashboard/files
   * Get total files count only
   */
  static async getTotalFiles(req, res) {
    try {
      const totalFiles = await DashboardService.getTotalFiles();
      
      res.status(200).json({
        success: true,
        data: { totalFiles },
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Get total files error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch total files count',
        message: err.message
      });
    }
  }

  /**
   * GET /dashboard/samples
   * Get total samples count only
   */
  static async getTotalSamples(req, res) {
    try {
      const totalSamples = await DashboardService.getTotalSamples();
      
      res.status(200).json({
        success: true,
        data: { totalSamples },
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Get total samples error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch total samples count',
        message: err.message
      });
    }
  }

  /**
   * GET /dashboard/qc-pass-rate
   * Get QC pass rate only
   */
  static async getQCPassRate(req, res) {
    try {
      const qcStats = await DashboardService.getQCPassRate();
      
      res.status(200).json({
        success: true,
        data: qcStats,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Get QC pass rate error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch QC pass rate',
        message: err.message
      });
    }
  }

  /**
   * GET /dashboard/qc-graph
   * Get QC graph data for dashboard visualization (past week)
   */
  static async getQCGraphData(req, res) {
    try {
      const qcGraphData = await DashboardService.getQCGraphData();
      
      res.status(200).json({
        success: true,
        data: qcGraphData,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('QC graph data error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch QC graph data',
        message: err.message
      });
    }
  }

  /**
   * GET /dashboard/health
   * Dashboard health check
   */
  static async getHealth(req, res) {
    try {
      const dashboardData = await DashboardService.getDashboardData();
      
      res.status(200).json({
        success: true,
        status: 'healthy',
        data: {
          totalFiles: dashboardData.totalFiles,
          totalSamples: dashboardData.totalSamples,
          qcPassRate: dashboardData.qcPassRate,
          lastCheck: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error('Dashboard health check error:', err);
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Dashboard service unavailable',
        message: err.message,
        lastCheck: new Date().toISOString()
      });
    }
  }
}

module.exports = DashboardController;