import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';

import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  Alert,
  ThemeProvider
} from '@mui/material';
import {
  TableChart as TableChartIcon,
  BarChart as BarChartIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';

import { Calculator, CheckSquare, Activity, AlertTriangle, FileText } from 'lucide-react';


import Navbar from '@/components/navbar';
import QCTable from '@/components/qc_table';
import SJS_Table from '@/components/sjs_table';
import QCGraph from '@/components/qc_graph';
import SJS_Graph from '@/components/sjs_graph';
import NestedFilterDrawer from '@/components/common/Filter';

import customTheme from '../theme';

const QCChecks = () => {
  const { section } = useParams();
  const location = useLocation();
  const preselectedFileId = location.state?.fileId;

  const [selectedItem, setSelectedItem] = useState('qc-tables');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState(null);

  const [summary, setSummary] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const qcTableRef = useRef(null);
  const sjsTableRef = useRef(null);

  useEffect(() => {
    if (!selectedFileId || !section) return;
    const scrollTarget =
      section === 'lab-standards' ? qcTableRef :
        section === 'sjs-standards' ? sjsTableRef : null;

    if (scrollTarget?.current) {
      setTimeout(() => {
        scrollTarget.current.scrollIntoView({ behavior: 'auto', block: 'start' });
      }, 100);
    }
  }, [selectedFileId, section]);

  const fetchFileMeta = async (fileId) => {
    try {
      const res = await fetch(`http://localhost:5000/file-meta?file_id=${fileId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      // Assuming data is directly the metadata object like:
      // { filename: "...", uploaded_at: "...", uploaded_by: "...", type: ... }
      if (data && (data.filename || data.uploaded_at || data.uploaded_by || data.fileType)) {
        setUploadedFiles(prev =>
          prev.map(f => {
            const currentFileId = f.id || f.file_id;
            return currentFileId === fileId
              ? {
                ...f,
                filename: data.filename,
                uploaded_at: data.uploaded_at, // Use uploaded_at directly
                uploaded_by: data.uploaded_by,
                type: data.file_type // Use 'type' or fallback to 'fileType'
              }
              : f;
          })
        );
      }
    } catch (err) {
      console.error("❌ Failed to fetch file meta:", err);
      // Optionally, set an error state here if meta data fetching is critical
    }
  };


  const fetchUploadedFiles = async (filters) => {
    setLoading(true);
    setError(null);
    let url = `http://localhost:5000/uploaded-files`;

    if (filters?.startDate && filters?.endDate) {
      const params = new URLSearchParams({
        start_date: filters.startDate,
        end_date: filters.endDate,
      });
      url += `?${params.toString()}`;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const files = data.files || data.data || (Array.isArray(data) ? data : []);
      setUploadedFiles(files);

      if (files.length > 0 && !selectedFileId) {
        const defaultId = preselectedFileId || files[0].id || files[0].file_id;
        setSelectedFileId(defaultId);
      }

    } catch (err) {
      console.error('Error fetching files:', err);
      setError(`Failed to load files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchSummaryData = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/summary?file_id=${selectedFileId}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const summaryData = result.summary || {
        totalElements: 0,
        elementsWithinTolerance: 0,
        averageRSD: 0,
        averageErrorPercentage: 0,
      };
      setSummary(summaryData);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setSummary(null);
      // Optionally, set an error state here if summary data fetching is critical
    }
  };

  useEffect(() => {
    if (selectedFileId) {
      fetchSummaryData();
      fetchFileMeta(selectedFileId); // 👈 added here
    } else {
      setSummary(null);
    }
  }, [selectedFileId]);


  const handleApplyFilter = (filterData) => {
    setError(null);

    if (filterData.type === 'clear') {
      setSelectedFileId('');
      setSelectedDateRange(null);
      fetchUploadedFiles();
    }

    else if (filterData.type === 'date') {
      setSelectedFileId('');  // ⛔ clear file
      setSelectedDateRange({
        startDate: filterData.startDate,
        endDate: filterData.endDate,
      });
      fetchUploadedFiles({ startDate: filterData.startDate, endDate: filterData.endDate });
    }

    else if (filterData.type === 'file') {
      const fileId = filterData.file.id || filterData.file.file_id;
      setSelectedFileId(fileId);
      setSelectedDateRange(null);  // ✅ clear date
    }
  };


  return (
    <ThemeProvider theme={customTheme}>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />

        <div style={{ flexGrow: 1, padding: '24px' }}>
          <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
            QC Checks
          </Typography>

          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <NestedFilterDrawer
                uploadedFiles={uploadedFiles}
                onApplyFilter={handleApplyFilter}
                selectedFile={selectedFileId}
                selectedDateRange={selectedDateRange}
              />

            </Grid>
            <Grid item xs={12} md={8}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant={viewMode === 'table' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('table')}
                  startIcon={<TableChartIcon />}
                  // Add sx prop for styling
                  sx={{
                    // When selected (contained variant)
                    ...(viewMode === 'table' && {
                      backgroundColor: 'black', // Black background for contained
                      color: 'white', // White text for contained
                      '&:hover': {
                        backgroundColor: '#333', // Slightly lighter black on hover
                      },
                    }),
                    // When not selected (outlined variant)
                    ...(viewMode !== 'table' && {
                      borderColor: 'black', // Black border for outlined
                      color: 'black', // Black text for outlined
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)', // Light hover effect
                      },
                    }),
                  }}
                >
                  Table
                </Button>
                <Button
                  variant={viewMode === 'graph' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('graph')}
                  startIcon={<BarChartIcon />}
                  // Add sx prop for styling
                  sx={{
                    // When selected (contained variant)
                    ...(viewMode === 'graph' && {
                      backgroundColor: 'black', // Black background for contained
                      color: 'white', // White text for contained
                      '&:hover': {
                        backgroundColor: '#333', // Slightly lighter black on hover
                      },
                    }),
                    // When not selected (outlined variant)
                    ...(viewMode !== 'graph' && {
                      borderColor: 'black', // Black border for outlined
                      color: 'black', // Black text for outlined
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)', // Light hover effect
                      },
                    }),
                  }}
                >
                  Graph
                </Button>
              </Stack>
            </Grid>
          </Grid>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {loading && <LinearProgress sx={{ mb: 3 }} />}
          {selectedFileId && uploadedFiles.length > 0 && (() => {
            const file = uploadedFiles.find(f => f.id === selectedFileId || f.file_id === selectedFileId);
            if (!file) return null;


            return (
              <Box sx={{ mt: 2, ml: 1.5, mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Showing data for:
                </Typography>
                <Stack direction="row" spacing={4} flexWrap="wrap">
                  <Typography variant="body1" fontWeight={500}>📁 {file.filename || '— No filename —'}</Typography>
                  <Typography variant="body2" color="text.secondary">🕒 Uploaded at: {file.uploaded_at ? new Date(file.uploaded_at).toLocaleString() : '—'}</Typography>
                  <Typography variant="body2" color="text.secondary">👤 Uploaded by: {file.uploaded_by || '—'}</Typography>
                  <Typography variant="body2" color="text.secondary">🧪 Type: {file.type}</Typography>
                </Stack>
              </Box>
            );
          })()}


          {summary && (
            <Grid container spacing={3} sx={{ mb: 3 }}> {/* Grid container spacing applied */}
              {/* Card 1: Total Elements */}
              <Grid item xs={12} sm={6} md={3}> {/* Responsive: 1 per row on xs, 2 per row on sm, 4 per row on md+ */}
                <Card
                  elevation={2}
                  sx={{
                    transition: 'box-shadow 0.3s ease-in-out',
                    '&:hover': {
                      boxShadow: 6,
                      cursor: 'pointer',
                    }
                  }}
                >
                  <CardContent sx={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    minHeight: 110,
                  }}>
                    <Box sx={{
                      flexShrink: 0,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#e3f2fd',
                    }}>
                      <Calculator size={24} color="#1976d2" />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="summaryLabel" sx={{ mb: 0.5 }}>
                        Total Elements
                      </Typography>
                      <Typography variant="summaryValue" sx={{ color: '#1976d2' }}>
                        {summary.totalElements}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Card 2: Within Tolerance */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  elevation={2}
                  sx={{
                    transition: 'box-shadow 0.3s ease-in-out',
                    '&:hover': {
                      boxShadow: 6,
                      cursor: 'pointer',
                    }
                  }}
                >
                  <CardContent sx={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    minHeight: 110,
                  }}>
                    <Box sx={{
                      flexShrink: 0,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#e8f5e9',
                    }}>
                      <CheckSquare size={24} color="#4caf50" />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="summaryLabel" sx={{ mb: 0.5 }}>
                        Within Tolerance
                      </Typography>
                      <Typography variant="summaryValue" sx={{ color: '#4caf50' }}>
                        {summary.elementsWithinTolerance}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={summary.totalElements > 0 ? (summary.elementsWithinTolerance / summary.totalElements) * 100 : 0}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Card 3: Average RSD */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  elevation={2}
                  sx={{
                    transition: 'box-shadow 0.3s ease-in-out',
                    '&:hover': {
                      boxShadow: 6,
                      cursor: 'pointer',
                    }
                  }}
                >
                  <CardContent sx={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    minHeight: 110,
                  }}>
                    <Box sx={{
                      flexShrink: 0,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#fff3e0',
                    }}>
                      <Activity size={24} color="#ff9800" />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="summaryLabel" sx={{ mb: 0.5 }}>
                        Average RSD
                      </Typography>
                      <Typography variant="summaryValue" sx={{ color: '#ff9800' }}>
                        {summary.averageRSD}%
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Card 4: Average Error */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  elevation={2}
                  sx={{
                    transition: 'box-shadow 0.3s ease-in-out',
                    '&:hover': {
                      boxShadow: 6,
                      cursor: 'pointer',
                    }
                  }}
                >
                  <CardContent sx={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    minHeight: 110,
                  }}>
                    <Box sx={{
                      flexShrink: 0,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#f3e5f5',
                    }}>
                      <AlertTriangle size={24} color="#9c27b0" />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="summaryLabel" sx={{ mb: 0.5 }}>
                        Average Error
                      </Typography>
                      <Typography variant="summaryValue" sx={{ color: '#9c27b0' }}>
                        {summary.averageErrorPercentage}%
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {(selectedFileId || (selectedDateRange?.startDate && selectedDateRange?.endDate)) && viewMode === 'table' && (
            <>
              <div ref={qcTableRef}>
                <QCTable selectedFileId={selectedFileId} selectedDateRange={selectedDateRange} />
              </div>

              <Box mt={4} ref={sjsTableRef}>
                <SJS_Table
                  selectedFileId={selectedFileId}
                  startDate={selectedDateRange?.startDate}
                  endDate={selectedDateRange?.endDate}
                />
              </Box>

            </>
          )}

          {selectedFileId && viewMode === 'graph' && (
            <>
              <QCGraph selectedFileId={selectedFileId} />
              <Box mt={4}>
                <SJS_Graph selectedFileId={selectedFileId} />
              </Box>
            </>
          )}

          {!selectedFileId && !loading && (
            <Card
              elevation={2}
              sx={{
                transition: 'box-shadow 0.3s ease-in-out',
                '&:hover': {
                  boxShadow: 6,
                  cursor: 'pointer',
                }
              }}
            >
              <CardContent sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
              }}>
                <FilterListIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="textSecondary">
                  Apply a Filter to Begin
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Use the filter to select a specific file or narrow down the file list by date.
                </Typography>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
};

export default QCChecks;