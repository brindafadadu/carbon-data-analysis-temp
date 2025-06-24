const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');

// Main dashboard route - gets all data (files, samples, QC pass rate, graph data)
router.get('/dashboard', DashboardController.getDashboard);

// Individual metric routes
router.get('/dashboard/files', DashboardController.getTotalFiles);
router.get('/dashboard/samples', DashboardController.getTotalSamples);
router.get('/dashboard/qc-pass-rate', DashboardController.getQCPassRate);

// QC graph data route
router.get('/dashboard/qc-graph', DashboardController.getQCGraphData);

// Health check route
router.get('/dashboard/health', DashboardController.getHealth);

// Alternative routes for backward compatibility (if needed)
router.get('/stats', DashboardController.getDashboard); // Maps to main dashboard
router.get('/qc-graph', DashboardController.getQCGraphData); // Alternative QC graph route
router.get('/health', DashboardController.getHealth); // Alternative health route

module.exports = router;