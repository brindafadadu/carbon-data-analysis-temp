import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Upload, TrendingUp, Database, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import Navbar from '@/components/navbar';
import '../styles/homepage.css';

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedItem, setSelectedItem] = useState('dashboard');
  const [selectedElement, setSelectedElement] = useState(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Fetching dashboard data from: http://localhost:5000/dashboard');
      
      const response = await fetch('http://localhost:5000/dashboard');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Dashboard data received:', result);
      
      if (result.success) {
        setDashboardData(result.data);
        setLastRefresh(new Date());
        setError(null);
        
        // Set default selected element if QC graph data exists
        if (result.data.qcGraphData?.success && result.data.qcGraphData.graphData) {
          const elements = Object.keys(result.data.qcGraphData.graphData);
          if (elements.length > 0 && !selectedElement) {
            setSelectedElement(elements[0]);
          }
        }
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now - date;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  // Prepare chart data for selected element
  const getChartData = () => {
    if (!dashboardData?.qcGraphData?.success || !selectedElement) {
      return [];
    }

    const elementData = dashboardData.qcGraphData.graphData[selectedElement];
    if (!elementData?.dailyAverages) {
      return [];
    }

    return elementData.dailyAverages.map(item => ({
      date: new Date(item.date),
      value: item.value,
      dataPoints: item.dataPoints
    }));
  };

  if (loading && !dashboardData) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="error-container">
        <div className="error-content">
          <AlertCircle className="error-icon" />
          <h2 className="error-title">Error Loading Dashboard</h2>
          <p className="error-message">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const chartData = getChartData();
  const availableElements = dashboardData?.qcGraphData?.success ? 
    Object.keys(dashboardData.qcGraphData.graphData || {}) : [];

  return (
    <div className="dashboard-container">
      <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
      
      <div className="dashboard-content">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-info">
              <h1 className="dashboard-title">Dashboard</h1>
              <p className="last-updated">
                {lastRefresh && `Last updated: ${lastRefresh.toLocaleTimeString()}`}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="card-content">
              <div className="card-icon">
                <FileText className="icon-files" />
              </div>
              <div className="card-info">
                <h3 className="card-label">Total Files</h3>
                <p className="card-value">{dashboardData?.totalFiles || 0}</p>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-content">
              <div className="card-icon">
                <Database className="icon-database" />
              </div>
              <div className="card-info">
                <h3 className="card-label">Total Samples</h3>
                <p className="card-value">{dashboardData?.totalSamples || 0}</p>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-content">
              <div className="card-icon">
                <CheckCircle className={`icon-qc ${(dashboardData?.qcPassRate || 0) >= 80 ? 'icon-qc-good' : 'icon-qc-bad'}`} />
              </div>
              <div className="card-info">
                <h3 className="card-label">QC Pass Rate</h3>
                <p className="card-value">{dashboardData?.qcPassRate || 0}%</p>
                <p className="card-subtitle">past week</p>
              </div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-content">
              <div className="card-icon">
                <TrendingUp className="icon-trending" />
              </div>
              <div className="card-info">
                <h3 className="card-label">QC Checks</h3>
                <p className="card-value">{dashboardData?.qcStats?.totalChecks || 0}</p>
                <p className="card-subtitle">{dashboardData?.qcStats?.passedChecks || 0} passed</p>
              </div>
            </div>
          </div>
        </div>

        <div className="charts-container">
          {/* QC Graph Chart */}
          <div className="chart-card chart-main">
            <div className="chart-header">
              <h3 className="chart-title">QC Element Trends (Past Week)</h3>
              {availableElements.length > 0 && (
                <div className="element-selector">
                  <label htmlFor="element-select">Element: </label>
                  <select
                    id="element-select"
                    value={selectedElement || ''}
                    onChange={(e) => setSelectedElement(e.target.value)}
                    className="element-dropdown"
                  >
                    {availableElements.map(element => (
                      <option key={element} value={element}>
                        {element}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Concentration', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [value, selectedElement]}
                    labelFormatter={(label) => `Date: ${formatDate(label)}`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                    name={selectedElement || 'Concentration'}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">
                <div className="no-data-content">
                  <TrendingUp className="no-data-icon" />
                  <p>No QC data available for the past week</p>
                  {availableElements.length === 0 && (
                    <p className="no-data-subtitle">No elements found in QC data</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* QC Statistics */}
        {dashboardData?.qcGraphData?.success && (
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Total Elements</h4>
              <p className="stat-value">{dashboardData.qcGraphData.summary?.totalElements || 0}</p>
            </div>
            <div className="stat-card">
              <h4>QC Files</h4>
              <p className="stat-value">{dashboardData.qcGraphData.summary?.totalFiles || 0}</p>
            </div>
            <div className="stat-card">
              <h4>Data Points</h4>
              <p className="stat-value">{dashboardData.qcGraphData.summary?.totalDataPoints || 0}</p>
            </div>
            {selectedElement && dashboardData.qcGraphData.graphData[selectedElement] && (
              <div className="stat-card">
                <h4>{selectedElement} Points</h4>
                <p className="stat-value">
                  {dashboardData.qcGraphData.graphData[selectedElement].totalDataPoints || 0}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="dashboard-footer">
          {error && (
            <p className="footer-error">
              Warning: {error}
            </p>
          )}
          {dashboardData?.qcGraphData?.success && (
            <p className="footer-info">
              QC data from {dashboardData.qcGraphData.summary?.dateRange?.start ? 
                formatDate(dashboardData.qcGraphData.summary.dateRange.start) : 'N/A'} to {
                dashboardData.qcGraphData.summary?.dateRange?.end ? 
                formatDate(dashboardData.qcGraphData.summary.dateRange.end) : 'N/A'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;