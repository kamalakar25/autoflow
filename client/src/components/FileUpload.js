    import React, { useState, useEffect } from 'react';
    import axios from 'axios';
    import { useLocation } from 'react-router-dom';
    import { saveAs } from 'file-saver';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


    function FileUpload() {
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [syncMessages, setSyncMessages] = useState([]); // Array for multiple sync/export messages
    const [error, setError] = useState('');
    const [syncTime, setSyncTime] = useState(null);
    const [autoUploaded, setAutoUploaded] = useState(false); // Track auto-upload status
    const [fileName, setFileName] = useState(''); // Store fileName for display
    const location = useLocation();
    const token = localStorage.getItem('token');

    const formatTime = (time) => new Date(time).toLocaleString();

    const resetFeedback = () => {
        setSyncMessages([]);
        setError('');
        setSyncTime(null);
        setResponse(null);
    };

    // Automatically fetch, upload, sync, and export
    useEffect(() => {
        const { resultId, jobId, fileName: passedFileName } = location.state || {};
        if (resultId && jobId && passedFileName && !autoUploaded) {
        const processFile = async () => {
            setLoading(true);
            resetFeedback();
            try {
            // Step 1: Fetch the saved Excel file
            setSyncMessages((prev) => [...prev, `⏳ Fetching file ${passedFileName}...`]);
            const fetchResponse = await axios.get(`${BASE_URL}/scrape/results/${resultId}/download`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });

            // Create a File object from the blob
            const fetchedFile = new File([fetchResponse.data], passedFileName, {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            // Step 2: Upload to /api/upload
            setSyncMessages((prev) => [...prev, `⏳ Uploading ${passedFileName}...`]);
            const formData = new FormData();
            formData.append('file', fetchedFile);
            const uploadResponse = await axios.post(`${BASE_URL}/api/upload`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setResponse(uploadResponse.data);
            setSyncMessages((prev) => [...prev, `✅ Successfully uploaded ${passedFileName}`]);
            setFileName(passedFileName);
            setSyncTime(new Date());
            setAutoUploaded(true);

            // Step 3: Sync to all CRMs
            const crmList = ['hubspot', 'zoho', 'salesforce', 'notion'];
            for (const crm of crmList) {
                try {
                setSyncMessages((prev) => [...prev, `⏳ Syncing to ${crm.charAt(0).toUpperCase() + crm.slice(1)}...`]);
                const syncResponse = await axios.post(`${BASE_URL}/api/sync/${crm}`, {}, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setSyncMessages((prev) => [...prev, `✅ ${syncResponse.data.message}`]);
                setSyncTime(new Date());
                } catch (err) {
                setSyncMessages((prev) => [
                    ...prev,
                    `❌ Sync to ${crm.charAt(0).toUpperCase() + crm.slice(1)} failed: ${err.response?.data?.message || err.message}`,
                ]);
                }
            }

            // Step 4: Export to CSV, Excel, and Google Sheets
            const exportTypes = ['csv', 'excel', 'google'];
            for (const type of exportTypes) {
                try {
                setSyncMessages((prev) => [...prev, `⏳ Exporting to ${type.charAt(0).toUpperCase() + type.slice(1)}...`]);
                if (type === 'csv' || type === 'excel') {
                    const exportResponse = await axios.get(`${BASE_URL}/api/export/${type}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob',
                    });
                    const exportFileName = type === 'csv' ? `${passedFileName.replace('.xlsx', '')}.csv` : passedFileName;
                    const mimeType =
                    type === 'csv'
                        ? 'text/csv'
                        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    const blob = new Blob([exportResponse.data], { type: mimeType });
                    saveAs(blob, exportFileName);
                    setSyncMessages((prev) => [...prev, `✅ Exported to ${type.toUpperCase()}`]);
                } else if (type === 'google') {
                    const exportResponse = await axios.post(`${BASE_URL}/api/export/google`, {}, {
                    headers: { Authorization: `Bearer ${token}` },
                    });
                    setSyncMessages((prev) => [...prev, `✅ ${exportResponse.data.message}`]);
                }
                setSyncTime(new Date());
                } catch (err) {
                setSyncMessages((prev) => [
                    ...prev,
                    `❌ ${type.charAt(0).toUpperCase() + type.slice(1)} export failed: ${err.response?.data?.message || err.message}`,
                ]);
                }
            }
            } catch (err) {
            setError(`❌ Failed to process file: ${err.response?.data?.message || err.message}`);
            } finally {
            setLoading(false);
            }
        };
        processFile();
        } else if (!resultId || !jobId || !passedFileName) {
        setError('❌ No valid file data provided for processing.');
        }
    }, [location.state, autoUploaded, token]);

    return (
        <div style={styles.container}>
        <div style={styles.card}>
            <h2 style={styles.header}>📁 CRM Sync & Export Dashboard</h2>

            {/* Auto-Upload Status */}
            <div style={styles.section}>
            <label style={styles.label}>1️⃣ Auto-Processed File</label>
            <p style={{ color: '#333', marginBottom: '10px' }}>
                {fileName ? `File: ${fileName}` : 'No file selected for processing.'}
            </p>
            </div>

            {/* Processing Status */}
            <hr style={styles.divider} />
            <div style={styles.section}>
            <label style={styles.label}>2️⃣ Processing Status</label>
            {loading && <p style={{ color: '#333' }}>⏳ Processing...</p>}
            {syncMessages.length > 0 && (
                <div style={styles.statusBox}>
                {syncMessages.map((message, index) => (
                    <div
                    key={index}
                    style={{
                        ...styles.statusItem,
                        backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
                        color: message.includes('✅') ? '#155724' : '#721c24',
                    }}
                    >
                    {message}
                    {syncTime && index === syncMessages.length - 1 && <div>🕒 {formatTime(syncTime)}</div>}
                    </div>
                ))}
                </div>
            )}
            </div>


            {/* Error Feedback */}
            {error && <div style={styles.error}>{error}</div>}
        </div>
        </div>
    );
    }

    const styles = {
    container: {
        background: '#f7f9fb',
        minHeight: '100vh',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
        fontFamily: 'Segoe UI, sans-serif',
    },
    card: {
        width: '100%',
        maxWidth: '800px',
        background: '#fff',
        borderRadius: '10px',
        padding: '30px',
        boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
        maxHeight: 'fit-content',
    },
    header: {
        marginBottom: '20px',
        color: '#333',
    },
    label: {
        display: 'block',
        marginBottom: '10px',
        fontWeight: 'bold',
        fontSize: '16px',
        color: '#333',
    },
    statusBox: {
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '10px',
        borderRadius: '5px',
        background: '#f0f8ff',
    },
    statusItem: {
        padding: '8px 12px',
        borderRadius: '4px',
        marginBottom: '5px',
    },
    resultBox: {
        background: '#f0f8ff',
        padding: '15px',
        borderRadius: '5px',
        marginTop: '10px',
    },
    pre: {
        background: '#e8f1fa',
        padding: '10px',
        borderRadius: '4px',
        overflowX: 'auto',
        maxHeight: '250px',
    },
    error: {
        marginTop: '20px',
        background: '#f8d7da',
        padding: '12px 15px',
        borderRadius: '5px',
        color: '#721c24',
    },
    section: {
        marginBottom: '20px',
    },
    divider: {
        margin: '30px 0',
    },
    };

    export default FileUpload;