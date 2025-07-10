import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Table, Dropdown } from 'react-bootstrap';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import AddEnrichmentModal from './AddEnrichmentModal.js';
import AddProviderModal from './AddProviderModal.js';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


const EnrichmentList = () => {
  const [configs, setConfigs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [result, setResult] = useState(null);
  const [selectedConfigId, setSelectedConfigId] = useState(null);

  useEffect(() => {
    setLoadingProviders(true);
    Promise.all([
      axios.get(`${BASE_URL}/api/enrichment-configs`),
      axios.get(`${BASE_URL}/api/providers/active`)
    ])
      .then(([configsRes, providersRes]) => {
        setConfigs(configsRes.data || []);
        setProviders(providersRes.data || []);
        setLoadingProviders(false);
        // console.log('Fetched configs:', JSON.stringify(configsRes.data, null, 2));
        // console.log('Fetched providers:', JSON.stringify(providersRes.data, null, 2));
      })
      .catch(err => {
        console.error('Error fetching data:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setConfigs([]);
        setProviders([]);
        setLoadingProviders(false);
      });
  }, []);

  const handleSaved = (newConfig) => {
    setConfigs([...configs, newConfig]);
  };

  const handleProviderAdded = () => {
    axios.get(`${BASE_URL}/api/providers/active`)
      .then(res => {
        // console.log('Updated providers:', JSON.stringify(res.data, null, 2));
        setProviders(res.data || []);
      })
      .catch(err => {
        console.error('Error fetching providers:', err);
        setProviders([]);
      });
  };

  const runEnrichment = async (configId) => {
    try {
      const config = configs.find(c => c._id === configId);
      if (!config) {
        console.error('Config not found for ID:', configId);
        alert('Enrichment configuration not found.');
        return;
      }

      if (!inputValue) {
        console.error('Input value is empty');
        alert(`Please enter a valid input for ${config.inputField}`);
        return;
      }

      if (config.type === 'email' || config.type === 'person') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputValue)) {
          console.error('Invalid email format');
          alert('Please enter a valid email address.');
          return;
        }
      }

      const requestBody = {
        [config.inputField]: inputValue
      };

      // console.log('Running enrichment for:', config.title);
      // console.log('Config details:', JSON.stringify(config, null, 2));
      // console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const response = await axios.post(
        `${BASE_URL}/api/enrichment-configs/run/${configId}`,
        requestBody,
        { headers: { 'Content-Type': 'application/json' } }
      );

      setResult(response.data);
      setSelectedConfigId(configId);
      // console.log('Enrichment result:', JSON.stringify(response.data, null, 2));
    } catch (err) {
      console.error('Enrichment error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      alert(`Enrichment failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const exportEnrichmentResult = (format) => {
    if (!result || !selectedConfigId) {
      alert('No enrichment result available to export.');
      return;
    }

    const config = configs.find(c => c._id === selectedConfigId);
    if (!config) {
      console.error('Config not found for ID:', selectedConfigId);
      alert('Configuration not found.');
      return;
    }

    const fieldMapping = {
      name: config.outputFields.includes('name') ? 'name' : 'full_name',
      email: config.outputFields.includes('email') ? 'email' : 'email_address',
      phone: config.outputFields.includes('phone') ? 'phone' : 'phone_number',
      company: config.outputFields.includes('company') ? 'company' : 'organization',
      enriched: config.outputFields.includes('enriched') ? 'enriched' : 'status'
    };

    const row = {
      name: String(result.output[fieldMapping.name] || 'N/A').replace(/"/g, '""'),
      email: String(result.output[fieldMapping.email] || result.input || 'N/A').replace(/"/g, '""'),
      phone: String(result.output[fieldMapping.phone] || 'N/A').replace(/"/g, '""'),
      company: String(result.output[fieldMapping.company] || 'N/A').replace(/"/g, '""'),
      enriched: String(result.output[fieldMapping.enriched] || 'N/A').replace(/"/g, '""')
    };

    const fileName = `${config.title.replace(/\s+/g, '_').toLowerCase()}_enrichment_${Date.now()}.${format}`;
    const headers = ['name', 'email', 'phone', 'company', 'enriched'];

    if (format === 'csv') {
      const csv = Papa.unparse([row], {
        header: true,
        columns: headers,
        delimiter: ',',
        quoteChar: '"',
        escapeChar: '"',
        skipEmptyLines: true
      });
      const blob = new Blob([csv], { type: 'text/csv; charset=utf-8' });
      saveAs(blob, fileName);
    } else if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet([row], { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Enrichment');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);
    }

    // console.log(`Exported enrichment result as ${format}:`, row);
  };

  const getNestedValue = (obj, path) => {
    if (obj[path] !== undefined) return obj[path];
    return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : 'N/A'), obj);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      {loadingProviders && (
        <div className="flex justify-center items-center py-4">
          <p className="text-gray-500 text-lg">Loading...</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300 text-sm sm:text-base"
          onClick={() => setShowModal(true)}
          disabled={loadingProviders}
        >
          Add Enrichment
        </button>
        <button
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm sm:text-base"
          onClick={() => setShowProviderModal(true)}
        >
          Add Provider
        </button>
      </div>
      <AddEnrichmentModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        onSaved={handleSaved}
        providers={providers}
      />
      <AddProviderModal
        show={showProviderModal}
        handleClose={() => setShowProviderModal(false)}
        onAdded={handleProviderAdded}
      />
      <div className="mt-6">
        {providers.length === 0 && (
          <p className="text-center text-gray-500 text-sm sm:text-base">
            No providers available. Please add a provider to create enrichment configurations.
          </p>
        )}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter email"
          className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
        />
        {configs.length === 0 ? (
          <p className="text-center text-gray-500 text-sm sm:text-base">
            No enrichment configurations available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-md">
              <thead>
                <tr className="">
                  <th className="p-3 text-left text-xs sm:text-sm font-semibold text-white-700">Title</th>
                  <th className="p-3 text-left text-xs sm:text-sm font-semibold text-white-700">Type</th>
                  <th className="p-3 text-left text-xs sm:text-sm font-semibold text-white-700">Provider</th>
                  <th className="p-3 text-left text-xs sm:text-sm font-semibold text-white-700">Input Field</th>
                  <th className="p-3 text-left text-xs sm:text-sm font-semibold text-white-700">Output Fields</th>
                  <th className="p-3 text-left text-xs sm:text-sm font-semibold text-white-700">Condition</th>
                  <th className="p-3 text-left text-xs sm:text-sm font-semibold text-white-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {configs.map(config => (
                  <tr key={config._id} className="border-b">
                    <td className="p-3 text-xs sm:text-sm text-gray-800">{config.title}</td>
                    <td className="p-3 text-xs sm:text-sm text-gray-800">{config.type}</td>
                    <td className="p-3 text-xs sm:text-sm text-gray-800">
                      {typeof config.provider === 'object' ? config.provider.type : config.provider}
                    </td>
                    <td className="p-3 text-xs sm:text-sm text-gray-800">{config.inputField}</td>
                    <td className="p-3 text-xs sm:text-sm text-gray-800">{config.outputFields.join(', ')}</td>
                    <td className="p-3 text-xs sm:text-sm text-gray-800">{config.condition || 'None'}</td>
                    <td className="p-3">
                      <button
                        className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-xs sm:text-sm"
                        onClick={() => runEnrichment(config._id)}
                      >
                        Run Enrichment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result && selectedConfigId && (
          <div className="mt-6 bg-white p-4 rounded-md shadow-sm">
            <h5 className="text-lg font-semibold text-gray-800 mb-3">Enrichment Result</h5>
            <p className="text-sm sm:text-base text-gray-700">
              <strong>Input:</strong> {result.input}
            </p>
            <ul className="list-disc pl-5 text-sm sm:text-base text-gray-700">
              {configs
                .find(c => c._id === selectedConfigId)
                ?.outputFields.map(key => (
                  <li key={key}>
                    <strong>{key}:</strong> {getNestedValue(result.output, key)}
                  </li>
                ))}
            </ul>
            <div className="relative inline-block mt-3">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base"
                onClick={() => document.getElementById('export-dropdown').nextElementSibling.classList.toggle('hidden')}
              >
                Export
              </button>
              <div
                id="export-dropdown"
                className="hidden absolute z-10 bg-white border border-gray-300 rounded-md shadow-lg mt-1"
              >
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => exportEnrichmentResult('csv')}
                >
                  Export as CSV
                </button>
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => exportEnrichmentResult('xlsx')}
                >
                  Export as Excel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrichmentList;