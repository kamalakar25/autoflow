import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button, Card, ProgressBar, Badge, Form } from 'react-bootstrap';
import { FaBolt, FaCheckCircle, FaDatabase, FaChartLine, FaEnvelope, FaBuilding, FaUsers, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import AddEnrichmentModal from './AddEnrichmentModal';
import EnrichmentCard from './EnrichmentCard';
import './enrichment.css';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';



// Set up axios interceptor to include Authorization header
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

const OldEnrichment = () => {
  const [providers, setProviders] = useState([]);
  const [enrichments, setEnrichments] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [configs, setConfigs] = useState([]);
  const navigate = useNavigate();

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch providers, enrichments, and configs
  const fetchAll = useCallback(async () => {
    try {
      const [provResponse, enrichResponse, configResponse] = await Promise.all([
        axios.get(`${BASE_URL}/api/providers/all`),
        axios.get(`${BASE_URL}/api/enrichments`),
        axios.get(`${BASE_URL}/api/enrichment-configs`),
      ]);
      setProviders(provResponse.data || []);
      setEnrichments(enrichResponse.data || []);
      setConfigs(configResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  }, [navigate]);

  // Fetch only enrichments after a run
  const fetchEnrichments = useCallback(async () => {
    try {
      const enrichResponse = await axios.get(`${BASE_URL}/api/enrichments`);
      setEnrichments(enrichResponse.data || []);
    } catch (error) {
      console.error('Error fetching enrichments:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  }, [navigate]);

  // Handle deletion of an enrichment config
  const handleDeleteEnrichment = useCallback(async (configId) => {
    try {
      await axios.delete(`${BASE_URL}/api/enrichment-configs/${configId}`);
      setConfigs((prev) => prev.filter((config) => config._id !== configId));
    } catch (error) {
      console.error('Error deleting enrichment config:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  }, [navigate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Calculate summary metrics
  const successCount = enrichments.filter((e) => e.status === 'success').length;
  const totalCount = enrichments.length;
  const successRate = totalCount ? ((successCount / totalCount) * 100).toFixed(1) : 0;
  const dataSources = providers.length;
  const apiCallsToday = enrichments.reduce((sum, e) => sum + (e.apiCalls || 0), 0);

  // Map configs to EnrichmentCard props
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

  const handleAddEnrichmentClick = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const handleStatusToggle = useCallback((providerId, newStatus) => {
    setProviders((prev) =>
      prev.map((provider) =>
        provider._id === providerId ? { ...provider, status: newStatus } : provider
      )
    );
  }, []);

  const handleRunSuccess = useCallback(() => {
    fetchEnrichments();
  }, [fetchEnrichments]);

  // Filter configs based on search query
  const filteredConfigs = configs.filter((config) =>
    [config.title, config.provider, config.inputField, config.outputFields?.join(', ')]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="k-container k-background">
      <div className="k-flex-justify k-flex-align k-margin-bottom-lg">
        <div>
          <h4 className="k-title-bold">Data Enrichment</h4>
          <p className="k-text-muted k-no-margin">Enhance your data with external sources</p>
        </div>
        <div className="k-flex-align k-flex-gap">
          <Button variant="dark" className="k-flex-align" onClick={handleAddEnrichmentClick}>
            <FaPlus className="k-icon-spacing" /> Add Enrichment
          </Button>
        </div>
      </div>

      {/* Summary Cards with Icons */}
      <div className="row k-margin-bottom-lg text-center">
        {/* <div className="col-md-3 col-6 k-margin-bottom-sm">
          <Card className="k-card-shadow k-card-border">
            <div className="k-flex-align k-flex-justify-center k-margin-bottom">
              <FaBolt className="k-icon-primary k-icon-spacing" />
              <h5 className="k-title-bold k-no-margin">{totalCount}</h5>
            </div>
            <p className="k-text-muted k-no-margin">Total Enrichments</p>
          </Card>
        </div>
        <div className="col-md-3 col-6 k-margin-bottom-sm">
          <Card className="k-card-shadow k-card-border">
            <div className="k-flex-align k-flex-justify-center k-margin-bottom">
              <FaCheckCircle className="k-icon-success k-icon-spacing" />
              <h5 className="k-title-bold k-text-success k-no-margin">{successRate}%</h5>
            </div>
            <p className="k-text-muted k-no-margin">Success Rate</p>
          </Card>
        </div> */}
        <div className="col-md-3 col-6 k-margin-bottom-sm">
          <Card className="k-card-shadow k-card-border">
            <div className="k-flex-align k-flex-justify-center k-margin-bottom">
              <FaDatabase className="k-icon-purple k-icon-spacing" />
              <h5 className="k-title-bold k-no-margin">{dataSources}</h5>
            </div>
            <p className="k-text-muted k-no-margin">Data Sources</p>
          </Card>
        </div>
        {/* <div className="col-md-3 col-6 k-margin-bottom-sm">
          <Card className="k-card-shadow k-card-border">
            <div className="k-flex-align k-flex-justify-center k-margin-bottom">
              <FaChartLine className="k-icon-warning k-icon-spacing" />
              <h5 className="k-title-bold k-text-warning k-no-margin">{apiCallsToday}</h5>
            </div>
            <p className="k-text-muted k-no-margin">API Calls Today</p>
          </Card>
        </div> */}
      </div>

      <Form.Control
        type="text"
        placeholder="Search enrichments..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="k-search-input"
      />

      {/* Enrichment Cards */}
      <div className="k-flex-wrap k-gap mt-3">
        {filteredConfigs.length > 0 ? (
          filteredConfigs.map((config, idx) => {
            const provider = providers.find((p) => p.type === config.provider) || {};
            const configEnrichments = enrichments.filter((e) => e.configId?.toString() === config._id?.toString());
            const used = configEnrichments.reduce((sum, e) => sum + (e.apiCalls || 0), 0);
            const successCount = configEnrichments.filter((e) => e.status === 'success').length;
            const totalRuns = configEnrichments.length;
            const accuracy = totalRuns ? ((successCount / totalRuns) * 100).toFixed(1) : 90;

            return (
              <EnrichmentCard
                key={config._id || idx}
                title={config.title || 'Enrichment Config'}
                subtitle={config.provider || 'Unknown Provider'}
                description={`Input: ${config.inputField || 'N/A'}, Outputs: ${config.outputFields?.join(', ') || 'N/A'}`}
                used={used}
                total={1000}
                accuracy={accuracy}
                status={provider.status || 'active'}
                icon={getIcon(config.type)}
                onStatusToggle={handleStatusToggle}
                providerId={provider._id || ''}
                configId={config._id}
                inputField={config.inputField}
                onRunSuccess={handleRunSuccess}
                onDelete={() => handleDeleteEnrichment(config._id)}
              />
            );
          })
        ) : (
          <p className="k-text-muted">No enrichments found matching your search.</p>
        )}
      </div>

      {/* Add Enrichment Modal */}
      <AddEnrichmentModal
        show={showAddModal}
        handleClose={() => setShowAddModal(false)}
        onSaved={fetchAll}
        providers={providers}
      />
    </div>
  );
};

export default OldEnrichment;