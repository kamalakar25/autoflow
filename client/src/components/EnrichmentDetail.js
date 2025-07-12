import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button, Card, ProgressBar, Badge, Form, Alert } from 'react-bootstrap';
import { FaPlay, FaPause, FaCog, FaFileCsv, FaFileExcel, FaEnvelope, FaBuilding, FaUsers, FaDatabase } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import './enrichment.css';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


// Axios interceptor for adding token to requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const EnrichmentDetail = () => {
  const { configId } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [provider, setProvider] = useState(null);
  const [enrichments, setEnrichments] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);

  // Fetch config, provider, and enrichments
  const fetchData = useCallback(async () => {
    try {
      const [configResponse, enrichResponse, providersResponse] = await Promise.all([
        axios.get(`${BASE_URL}/api/enrichment-configs`),
        axios.get(`${BASE_URL}/api/enrichments`),
        axios.get(`${BASE_URL}/api/providers/all`),
      ]);
      const configData = configResponse.data.find((c) => c._id === configId);
      if (!configData) {
        throw new Error('Configuration not found');
      }
      console.log('Fetched config:', JSON.stringify(configData, null, 2));
      if (!configData.inputField || !configData.type || !configData.provider) {
        throw new Error('Configuration is missing required fields (inputField, type, or provider)');
      }
      const providerData = providersResponse.data.find((p) => p.type === configData.provider && p.status === 'active');
      if (!providerData?._id) {
        throw new Error(`No active provider found for ${configData.provider}. Please configure a provider.`);
      }
      console.log('Fetched provider:', JSON.stringify(providerData, null, 2));
      setConfig(configData);
      setProvider(providerData);
      setEnrichments(enrichResponse.data.filter((e) => e.configId?.toString() === configId));
      setIsPaused(providerData.status === 'paused');
    } catch (err) {
      console.error('Error fetching data:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.message || 'Failed to load enrichment details.');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  }, [configId, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
    fetchData();
  }, [fetchData, navigate]);

  // Calculate metrics
  const used = enrichments.reduce((sum, e) => sum + (e.apiCalls || 0), 0);
  const successCount = enrichments.filter((e) => e.status === 'success').length;
  const totalRuns = enrichments.length;
  const accuracy = totalRuns ? ((successCount / totalRuns) * 100).toFixed(1) : 90;
  const total = 1000; // Placeholder
  const progress = total ? (used / total) * 100 : 0;

  const getIcon = useCallback((type) => {
    switch (type?.toLowerCase()) {
      case 'email':
        return <FaEnvelope className="k-icon-primary" />;
      case 'company':
        return <FaBuilding className="k-icon-purple" />;
      case 'social':
        return <FaUsers className="k-icon-purple" />;
      default:
        return <FaDatabase className="k-icon-primary" />;
    }
  }, []);

  const handlePauseResume = useCallback(async () => {
    if (!provider?._id) {
      setError('No provider found for this configuration. Please configure a provider.');
      return;
    }
    const newStatus = isPaused ? 'active' : 'paused';
    try {
      await axios.put(`${BASE_URL}/api/providers/${provider._id}`, { status: newStatus });
      setIsPaused(!isPaused);
    } catch (error) {
      console.error('Error toggling status:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setError(error.response?.data?.message || 'Failed to toggle provider status.');
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  }, [isPaused, provider, navigate]);

  const handleConfigure = useCallback(() => {
    navigate('/emailenrich');
  }, [navigate]);

  // Helper to get nested values
  const getNestedValue = (obj, path) => {
    // Direct match first
    if (obj[path] !== undefined) return obj[path];
    // Try nested access
    return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : 'N/A'), obj);
  };

  const handleRun = useCallback(async () => {
    if (!inputValue.trim()) {
      setError(`Please enter a valid value for ${config?.inputField || 'the input field'}.`);
      return;
    }
    if (!config?.inputField) {
      setError('Configuration is missing input field.');
      return;
    }
    if (!config || (config.type !== 'email' && config.type !== 'person')) {
      setError('Invalid configuration: Only email or person type is supported.');
      return;
    }
    if (!provider?._id) {
      setError('No active provider found. Redirecting to configure a provider...');
      setTimeout(() => navigate('/emailenrich'), 2000);
      return;
    }
    // Validate email format for email or person type
    if (config.type === 'email' || config.type === 'person') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputValue)) {
        setError('Please enter a valid email address.');
        return;
      }
    }
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const requestBody = { [config.inputField]: inputValue.trim() };
      console.log('Sending run request:', {
        configId,
        inputField: config.inputField,
        requestBody,
        provider: provider.type,
        config: JSON.stringify(config, null, 2),
      });
      const response = await axios.post(`${BASE_URL}/api/enrichment-configs/run/${configId}`, requestBody, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Enrichment result:', JSON.stringify(response.data, null, 2));
      setResults({
        input: inputValue.trim(),
        output: response.data.output,
      });
      setShowInput(true);
      fetchData(); // Refresh enrichments
    } catch (err) {
      console.error('Error running enrichment:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      const errorMessage = err.response?.data?.message || 'Failed to run enrichment.';
      setError(errorMessage);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [inputValue, config, configId, provider, navigate]);

  const toggleInput = useCallback((event) => {
    event.stopPropagation();
    setShowInput((prev) => {
      console.log('Toggling showInput:', !prev);
      return !prev;
    });
  }, []);

  const exportToCSV = useCallback(() => {
    if (!results) return;
    const data = [{ input: results.input, ...results.output }];
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${config.title}_results.csv`;
    link.click();
  }, [results, config]);

  const exportToExcel = useCallback(() => {
  if (!results) return;
  const data = [{ input: results.input, ...results.output }];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Results');
  XLSX.writeFile(wb, `${config.title}_results.xlsx`);
}, [results, config]);

  if (error && !config) {
    return (
      <div className="k-container k-background">
        <Alert variant="danger">{error}</Alert>
        <Button variant="light" onClick={() => navigate('/Dataenrichment')}>
          Back to Enrichments
        </Button>
      </div>
    );
  }

  if (!config) {
    return <div className="k-container k-background">Loading...</div>;
  }

  const statusColor = isPaused ? 'warning' : 'success';
  const statusLabel = isPaused ? 'paused' : 'active';

  return (
    <div className="k-container k-background">
      <Button variant="light" className="mb-3" onClick={() => navigate('/Dataenrichment')}>
        Back to Enrichments
      </Button>
      <Card className="k-card-shadow k-card-border">
        <Card.Body>
          <div className="k-flex-align k-flex-justify k-margin-bottom">
            <div className="k-flex-align">
              {/* <div className="k-circle-icon">{getIcon(config.type)}</div> */}
              <div>
                <h6 className="k-title-bold">{config.title}</h6>
                <small className="k-text-muted">{config.provider}</small>
              </div>
            </div>
            <FaCog className="k-icon-muted" />
          </div>

          <p className="k-text-muted k-description">
            Input: {config.inputField || 'N/A'}, Outputs: {config.outputFields?.join(', ') || 'N/A'}
          </p>

          <div className="k-margin-bottom">
            {/* <small className="k-text-muted">Credits Used</small> */}
            <div className="k-flex-justify">
             <Button variant="light" size="sm" onClick={toggleInput}>
              <FaPlay className="k-icon-spacing" /> Run
            </Button>
            </div>
          </div>

          {/* <div className="k-flex-align k-margin-bottom">
            <Badge bg={statusColor} className="k-badge k-text-uppercase">{statusLabel}</Badge>
            <small className="k-text-muted">{accuracy}% accuracy</small>
          </div> */}

          <div className="k-flex-gap">
            {/* <Button variant="light" size="sm" onClick={handlePauseResume} disabled={!provider?._id}>
              {isPaused ? (
                <>
                  <FaPlay className="k-icon-spacing" /> Resume
                </>
              ) : (
                <>
                  <FaPause className="k-icon-spacing" /> Pause
                </>
              )}
            </Button>
            <Button variant="light" size="sm" onClick={handleConfigure}>
              <FaCog className="k-icon-spacing" /> Configure
            </Button> */}
            
          </div>

          {/* Input Form for Running Enrichment */}
          {showInput && (
            <div className="mt-3">
              <Form onSubmit={(e) => e.preventDefault()}>
                <Form.Group className="mb-3">
                  <Form.Label className="k-title-bold">{config.inputField || 'Input'}</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder={`Enter ${config.inputField || 'input value'}`}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="k-search-input"
                    disabled={loading}
                  />
                </Form.Group>
                <Button
                  variant="dark"
                  size="sm"
                  onClick={handleRun}
                  disabled={loading || !config.inputField || !provider?._id}
                >
                  {loading ? 'Running...' : 'Execute'}
                </Button>
              </Form>
            </div>
          )}

          {/* Display Results or Error */}
          {error && (
            <Alert variant="danger" className="mt-3">
              {error}
              {error.includes('No active provider') && (
                <div>
                  <Button
                    variant="link"
                    onClick={() => navigate('/emailenrich')}
                    className="p-0 mt-2"
                  >
                    Configure a provider
                  </Button>
                </div>
              )}
              {error.includes('Unsupported') && (
                <div>
                  <Button
                    variant="link"
                    onClick={() => navigate('/emailenrich')}
                    className="p-0 mt-2"
                  >
                    Update configuration
                  </Button>
                </div>
              )}
            </Alert>
          )}
          {results && (
            <div className="mt-3">
              <h6 className="k-title-bold">Results</h6>
              <p><strong>Input:</strong> {results.input}</p>
              <h6>Output:</h6>
              <ul>
                {config.outputFields.map((key) => (
                  <li key={key}>
                    <strong>{key}:</strong> {getNestedValue(results.output, key)}
                  </li>
                ))}
              </ul>
              <div className="k-flex-gap">
                <Button variant="outline-primary" size="sm" onClick={exportToCSV}>
                  <FaFileCsv className="k-icon-spacing" /> Export to CSV
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={exportToExcel}>
                  <FaFileExcel className="k-icon-spacing" /> Export to Excel
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default EnrichmentDetail;