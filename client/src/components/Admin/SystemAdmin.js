import React, { useState, useMemo } from 'react';
import {
  FaDownload, FaSyncAlt, FaCheckCircle, FaExclamationTriangle, FaCloud,
  FaDatabase
} from 'react-icons/fa';
import { MdOutlineCloudSync } from 'react-icons/md';
import { TbBrandGoogle, TbDatabase } from 'react-icons/tb';
 import axios from 'axios';
import AdminDashboard from './AdminDashboard';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


const initialData = [
  { id: 1, title: 'Customer Data Export', platform: 'Csv', icon: <FaDatabase />, status: 'connected', lastSync: '2 min ago', records: 1247 },
  { id: 2, title: 'Sales Pipeline', platform: 'Hubspot', icon: <MdOutlineCloudSync />, status: 'syncing', lastSync: '5 min ago', records: 892 },
  { id: 3, title: 'Marketing Leads', platform: 'Google Sheets', icon: <TbBrandGoogle />, status: 'connected', lastSync: '1 hour ago', records: 2341 },
  { id: 4, title: 'Product Inventory', platform: 'Airtable', icon: <TbDatabase />, status: 'error', lastSync: '2 hours ago', records: 456 },
  { id: 5, title: 'Contact Database', platform: 'Salesforce', icon: <FaCloud />, status: 'connected', lastSync: '30 min ago', records: 3567 },
];

const SystemAdmin = () => {
  const [activeTab, setActiveTab] = useState('Exports & Sync');
  const [syncData, setSyncData] = useState(initialData);

 

const handleSync = async (id) => {
  try {
    await axios.post(`${BASE_URL}/api/sync/start/${id}`);
    setSyncData(syncData.map(item =>
      item.id === id ? { ...item, status: 'syncing', lastSync: 'Just now' } : item
    ));
    setTimeout(async () => {
      const { data } = await axios.get(`${BASE_URL}/api/sync/${id}`);
      setSyncData(prev =>
        prev.map(item =>
          item.id === id ? { ...item, status: data.status, lastSync: data.lastSync } : item
        )
      );
    }, 3500);
  } catch (err) {
    console.error(err);
  }
};


  const stats = useMemo(() => ({
    total: syncData.reduce((sum, i) => sum + i.records, 0),
    active: syncData.filter(i => i.status === 'connected').length,
    syncing: syncData.filter(i => i.status === 'syncing').length,
    failed: syncData.filter(i => i.status === 'error').length,
  }), [syncData]);

  const getStatusIcon = (status) => {
    if (status === 'connected') return <FaCheckCircle className="text-success fs-5" />;
    if (status === 'syncing') return <FaSyncAlt className="text-primary fs-5 spin" />;
    if (status === 'error') return <FaExclamationTriangle className="text-danger fs-5" />;
    return null;
  };

  // const tabs = ['Overview', 'Credits & Team', 'Exports & Sync', 'Support Tickets', 'Usage Logs'];

  return (
    <>
          <AdminDashboard />
     <div className="container-fluid py-4 bg-light min-vh-100">
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>

    
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="fw-semibold">Export & Sync</h5>
              <p className="text-muted">Manage data exports and CRM synchronization</p>
            </div>
            <button className="btn btn-primary">Add Destination</button>
          </div>

          {/* Cards Grid */}
          <div className="row">
            {syncData.map(item => (
              <div className="col-12 col-md-6 col-lg-4 mb-4" key={item.id}>
                <div className="card h-100 shadow-sm border">
                  <div className="card-body d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="d-flex align-items-center gap-2 text-primary fw-bold">
                          <div>{item.icon}</div>
                          <span>{item.title}</span>
                        </div>
                        <div>{getStatusIcon(item.status)}</div>
                      </div>
                      <p className="text-muted small mb-2">{item.platform}</p>
                      <p className="mb-1"><strong>Status:</strong> <span className={`text-${item.status === 'connected' ? 'success' : item.status === 'syncing' ? 'primary' : 'danger'}`}>{item.status}</span></p>
                      <p className="mb-1"><strong>Last Sync:</strong> {item.lastSync}</p>
                      <p><strong>Records:</strong> {item.records.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="card-footer border-top-0 bg-white d-flex justify-content-between align-items-center">
                    <button
                      className={`btn btn-sm ${item.status === 'syncing' ? 'btn-secondary' : 'btn-outline-primary'}`}
                      disabled={item.status === 'syncing'}
                      onClick={() => handleSync(item.id)}
                    >
                      {item.status === 'syncing' ? (
                        <>
                          <FaSyncAlt className="me-2 spin" /> Syncing...
                        </>
                      ) : 'Sync Now'}
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => alert('Downloading...')}>
                      <FaDownload />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Export Statistics */}
          <div className="row text-center border shadow-sm bg-white p-4 rounded">
            <h5 className="fw-semibold text-start mb-4" >Export Statistics</h5>
            <div className="col-6 col-md-3 mb-3">
              <h4>{stats.total.toLocaleString()}</h4>
              <p className="text-muted">Total Records</p>
            </div>
            <div className="col-6 col-md-3 mb-3">
              <h4 className="text-success">{stats.active}</h4>
              <p className="text-muted">Active Syncs</p>
            </div>
            <div className="col-6 col-md-3 mb-3">
              <h4 className="text-primary">{stats.syncing}</h4>
              <p className="text-muted">In Progress</p>
            </div>
            <div className="col-6 col-md-3 mb-3">
              <h4 className="text-danger">{stats.failed}</h4>
              <p className="text-muted">Failed</p>
            </div>
          </div>
        </>
     
    </div>
    </>
   
  );
};

export default SystemAdmin;
