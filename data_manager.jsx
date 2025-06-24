import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/navbar';
import {
    Box,
    Typography,
    Button,
    Table,
    Card,
    CardContent,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    TextField,
    Stack,
    CircularProgress,
    Tooltip,
} from '@mui/material'
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import {
    CloudUpload,
    Delete,
    DateRange,
    CheckCircle,
    Error as ErrorIcon,  // Renamed to avoid conflict with global Error
    Warning
} from '@mui/icons-material';

import '../styles/data_manager.css';

const DataManagerPage = () => {

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('error');

    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);



    const [files, setFiles] = useState([]);
    const [dragActive, setDragActive] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        }
        else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    // Helper function to determine quality check status
    const getQualityCheckStatus = (file) => {
        // You can modify this logic based on your actual quality check criteria
        const random = Math.random();
        if (random > 0.7) return 'success';
        if (random > 0.4) return 'warning';
        return 'error';
    };

    const handleFileUpload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        setUploadProgress(0);

        try {

            const xhr = new XMLHttpRequest();

            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    setUploadProgress(Math.round(percentComplete));
                }
            });

            // Handle response
            const uploadPromise = new Promise((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        // Fixed: Now using global Error constructor correctly
                        reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error'));
            });

            // Send the request
            xhr.open('POST', `http://localhost:5000/upload-csv`);
            xhr.send(formData);

            const result = await uploadPromise;
            setSnackbarMessage('File uploaded successfully');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);

            fetchUploadedFiles();

        } catch (err) {
            console.error('Error uploading file:', err);
            setSnackbarMessage(err.message || 'Something went wrong');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);

        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleFileSelect = async (e) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        await handleFileUpload(selectedFiles[0]);
        e.target.value = '';
    };

    const fetchUploadedFiles = async () => {
        try {
            const res = await fetch(`http://localhost:5000/uploaded-files`);
            const data = await res.json();
            const files = data.files || data.data || data; // fallback for various response shapes

            const filesWithStatus = await Promise.all(
                files.map(async (file) => {
                    const fileId = file.id || file.file_id;
                    let qualityStatus = 'error'; // default to fail

                    try {
                        const summaryRes = await fetch(`http://localhost:5000/summary?file_id=${fileId}`);
                        if (!summaryRes.ok) throw new Error('Summary fetch failed');

                        const result = await summaryRes.json();
                        const summary = result.summary || {};
                        const total = summary.totalElements || 0;
                        const within = summary.elementsWithinTolerance || 0;

                        if (total > 0 && total === within) {
                            qualityStatus = 'success';
                        }

                    } catch (err) {
                        console.error(`❌ Failed to fetch summary for file ${fileId}:`, err.message);
                    }

                    return {
                        ...file,
                        qualityStatus
                    };
                })
            );

            setFiles(filesWithStatus);
        } catch (err) {
            console.error('❌ Failed to fetch uploaded files:', err.message);
        }
    };


    useEffect(() => {
        fetchUploadedFiles();
    }, []);

    const handleFiles = (fileList) => {
        const newFiles = Array.from(fileList).map((file, index) => ({
            id: files.length + index + 1,
            name: file.name.split('.')[0],
            type: file.name.split('.').pop().toUpperCase(),
            user: 'Current User',
            email: 'randommail@gmail.com',
            uploadDate: new Date().toLocaleString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(',', ''),
            status: 'Uploaded',
            qualityStatus: getQualityCheckStatus(file)
        }));
        setFiles([...files, ...newFiles]);
    };

    const handleDelete = async (id) => {
        try {
            const res = await fetch(`http://localhost:5000/hide-file/${id}`, {
                method: 'POST',
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setFiles(prevFiles => prevFiles.filter(file => file.id !== id));
            } else {
                alert(data.error || 'Failed to hide the file');
            }
        } catch (err) {
            console.error('Error hiding file:', err);
            setSnackbarMessage('Something went wrong while trying to hide the file');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleDownload = (fileId) => {
        const link = document.createElement('a');
        link.href = `http://localhost:5000/download-file/${fileId}`;
        link.download = ''; // Let server set the filename via Content-Disposition
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    // Function to render quality check status icon
    const renderQualityStatus = (status, filename, fileId) => {
        const statusConfig = {
            success: {
                icon: <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />,
                tooltip: `Quality check passed for ${filename}`,
                color: '#4caf50'
            },
            warning: {
                icon: <Warning sx={{ color: '#ff9800', fontSize: 20 }} />,
                tooltip: `Quality check completed with warnings for ${filename}`,
                color: '#ff9800'
            },
            error: {
                icon: <ErrorIcon sx={{ color: '#f44336', fontSize: 20 }} />,  // Using renamed ErrorIcon
                tooltip: `Quality check failed for ${filename}`,
                color: '#f44336'
            }
        };

        const config = statusConfig[status] || statusConfig.error;

        return (
            <Tooltip title={config.tooltip} arrow>
                <Box
                    sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => navigate('/qc-checks', { state: { fileId } })}
                >
                    {config.icon}
                </Box>
            </Tooltip>
        );
    };

    const [selectedItem, setSelectedItem] = useState('Data Manager');
    const location = useLocation();
    const navigate = useNavigate();
    return (
        <Box className="file-upload-container">
            <Navbar selectedItem={selectedItem} setSelectedItem={setSelectedItem} />

            <Box className="main-content">
                <Box className="header-section">
                    <Typography variant="h4" className="page-title">
                        Data Manager
                    </Typography>

                    <Stack direction="row" spacing={2} className="date-filters">
                        <TextField
                            type="date"
                            defaultValue="2025-04-17"
                            variant="outlined"
                            size="small"
                            InputProps={{
                                startAdornment: <DateRange className="date-icon" />
                            }}
                        />
                        <TextField
                            type="date"
                            defaultValue="2025-04-17"
                            variant="outlined"
                            size="small"
                            InputProps={{
                                startAdornment: <DateRange className="date-icon" />
                            }}
                        />
                    </Stack>
                </Box>

                <Card className="upload-card">
                    <CardContent>
                        <Box
                            className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {isUploading ? (
                                <Box className="upload-progress-container">
                                    <CircularProgress
                                        variant="determinate"
                                        value={uploadProgress}
                                        size={70}
                                        thickness={4}
                                        className="upload-progress-circular"
                                    />
                                    <Typography variant="body1" className="upload-progress-text">
                                        Uploading... {uploadProgress}%
                                    </Typography>
                                </Box>
                            ) : (
                                <Box className="upload-normal-state">
                                    <Button
                                        variant="contained"
                                        component="label"
                                        className="upload-button"
                                        startIcon={<CloudUpload />}
                                        size="large"
                                        disabled={isUploading}
                                    >
                                        Choose file
                                        <input
                                            type="file"
                                            hidden
                                            multiple
                                            onChange={handleFileSelect}
                                        />
                                    </Button>
                                    <Typography variant="body2" className="upload-text">
                                        or drag file in here
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </CardContent>
                </Card>

                <Card className="files-table-card">
                    <CardContent>
                        <TableContainer component={Paper} elevation={0}>
                            <Table>
                                <TableHead>
                                    <TableRow className="table-header">
                                        <TableCell className="table-cell-header">#</TableCell>
                                        <TableCell className="table-cell-header">Filename</TableCell>
                                        <TableCell className="table-cell-header">Quality Check</TableCell>
                                        <TableCell className="table-cell-header">Type</TableCell>
                                        <TableCell className="table-cell-header">User</TableCell>
                                        <TableCell className="table-cell-header">Upload Date</TableCell>
                                        <TableCell className="table-cell-header">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {files.map((file, index) => (
                                        <TableRow key={file.id} className="table-row">
                                            <TableCell className="table-cell">{index + 1}</TableCell>
                                            <TableCell className="filename-cell">
                                                <Typography variant="body2" className="filename-text">
                                                    {file.name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell className="table-cell">
                                                {renderQualityStatus(file.qualityStatus, file.name, file.id)}
                                            </TableCell>
                                            <TableCell className="table-cell">
                                                <Chip
                                                    label={file.type}
                                                    className="file-type-chip"
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell className="table-cell">
                                                <Box className="user-cell">
                                                    <Box className="user-info">
                                                        <Typography variant="body2" className="user-name">
                                                            {file.user}
                                                        </Typography>
                                                        <Typography variant="caption" className="user-email">
                                                            {file.email}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell className="table-cell">
                                                <Typography variant="body2" className="date-text">
                                                    {file.uploadDate}
                                                </Typography>
                                            </TableCell>
                                            <TableCell className="table-cell">
                                                <>
                                                    <IconButton onClick={() => handleDownload(file.id)}>
                                                        <DownloadIcon />
                                                    </IconButton>

                                                    <IconButton
                                                        onClick={() => {
                                                            setFileToDelete(file.id);
                                                            setConfirmDialogOpen(true);
                                                        }}
                                                        className="delete-button"
                                                        size="small"
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Box>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={5000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {snackbarMessage}
                    </Typography>
                </Alert>
            </Snackbar>

            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete this file?
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={() => {
                            handleDelete(fileToDelete);
                            setConfirmDialogOpen(false);
                        }}
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default DataManagerPage;