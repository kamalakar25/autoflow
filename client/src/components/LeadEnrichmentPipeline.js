import React, { useState, useEffect } from 'react';
import './LeadEnrichmentPipeline.css';
import { FaGlobe, FaDatabase, FaFilter, FaClock, FaShareSquare, FaBolt } from 'react-icons/fa';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import axiosRetry from 'axios-retry';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
});

const componentConfig = {
  'Web Scraping': { icon: FaGlobe },
  'Data Enrichment': { icon: FaDatabase },
  'Filter & Validate': { icon: FaFilter },
  'Delay': { icon: FaClock },
  'Export & Sync': { icon: FaShareSquare },
  'Webhook': { icon: FaBolt },
};

const refreshToken = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    const response = await axios.post(`${BASE_URL}/users/refresh-token`, { token });
    localStorage.setItem('token', response.data.token);
    // console.log('Token refreshed');
    return response.data.token;
  } catch (error) {
    console.error('Token refresh error:', error.response?.data?.message || error.message);
    localStorage.removeItem('token');
    return null;
  }
};

const LeadEnrichmentPipeline = ({ workflows = [], onUpdateWorkflows }) => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const handleEditWorkflow = (workflowId) => {
    navigate(`/workflow/drag-drop/${workflowId}`);
  };

  const handleDeleteWorkflow = async (workflowId) => {
    if (workflowId === 'default') {
      alert('The default workflow cannot be deleted.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        let token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
        const response = await axios.delete(`${BASE_URL}/workflows/${workflowId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // console.log('Workflow deleted:', workflowId);
        const updatedWorkflows = workflows.filter((w) => w.id !== workflowId);
        onUpdateWorkflows(updatedWorkflows);
        setError(null);
      } catch (error) {
        console.error('Error deleting workflow:', error.response?.data?.message || error.message);
        if (error.response?.status === 401) {
          const newToken = await refreshToken();
          if (newToken) {
            try {
              const response = await axios.delete(`${BASE_URL}/workflows/${workflowId}`, {
                headers: { Authorization: `Bearer ${newToken}` },
              });
              // console.log('Workflow deleted after refresh:', workflowId);
              const updatedWorkflows = workflows.filter((w) => w.id !== workflowId);
              onUpdateWorkflows(updatedWorkflows);
              setError(null);
            } catch (retryErr) {
              console.error('Retry delete error:', retryErr.response?.data?.message || retryErr.message);
              alert('Failed to delete workflow: Session expired. Please log in again.');
              navigate('/login');
            }
          } else {
            alert('Session expired. Please log in again.');
            navigate('/login');
          }
        } else {
          alert(`Failed to delete workflow: ${error.response?.data?.message || 'Server error'}`);
          setError(error.response?.data?.message || 'Failed to delete workflow');
        }
      }
    }
  };

  return (
    <div className="vb-pipeline-container">
      {workflows.map((workflow) => (
        <div key={workflow.id} className="vb-workflow">
          <div className="vb-workflow-header">
            <h2 className="vb-pipeline-title">
              {workflow.title} <span className="vb-status">• {workflow.status}</span>
            </h2>
            <div className="vb-workflow-actions">
              <button className="vb-edit-button" onClick={() => handleEditWorkflow(workflow.id)}>
                Edit
              </button>
              <button className="vb-delete-button" onClick={() => handleDeleteWorkflow(workflow.id)}>
                Delete
              </button>
            </div>
          </div>
          <div className="vb-pipeline-steps">
            {workflow.steps.length === 0 ? (
              <p className="vb-no-steps">No steps added yet. Edit to add steps.</p>
            ) : (
              workflow.steps.map((step, index) => {
                const IconComponent = step.icon || FaGlobe;
                return (
                  <React.Fragment key={index}>
                    {index > 0 && <div className="vb-arrow">→</div>}
                    <div className="vb-step">
                      <div className="vb-step-header">
                        <div className="vb-step-icon">
                          <IconComponent color={step.color || '#6b7280'} size={40} />
                        </div>
                        <span className="vb-ellipsis">
                          <span>.</span><span>.</span><span>.</span>
                        </span>
                      </div>
                      <h3 className="vb-step-title">{step.name}</h3>
                      <p className="vb-step-description">{step.description}</p>
                      <span className="vb-step-status">
                        {step.status} <span className="vb-ready">• Ready</span>
                      </span>
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

LeadEnrichmentPipeline.propTypes = {
  workflows: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      steps: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string.isRequired,
          description: PropTypes.string,
          status: PropTypes.string,
          icon: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
          color: PropTypes.string,
        })
      ),
      status: PropTypes.string,
    })
  ),
  onUpdateWorkflows: PropTypes.func,
};

LeadEnrichmentPipeline.defaultProps = {
  workflows: [],
};

export default LeadEnrichmentPipeline;