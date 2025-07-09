import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../components/workflowbuilder.css';
import LeadEnrichmentPipeline from '../components/LeadEnrichmentPipeline';
import DataEngine from './Dataengine';
import PropTypes from 'prop-types';
import { FaGlobe, FaDatabase, FaFilter, FaClock, FaShareSquare, FaBolt } from 'react-icons/fa';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';



const componentConfig = {
  'Web Scraping': {
    icon: FaGlobe,
    color: '#4CAF50',
    description: 'Extract data from websites',
    status: 'Extract',
  },
  'Data Enrichment': {
    icon: FaDatabase,
    color: '#2196F3',
    description: 'Enhance with contact info',
    status: 'Enrich',
  },
  'Export & Sync': {
    icon: FaShareSquare,
    color: '#E91E63',
    description: 'Send to CRM or export',
    status: 'Push',
  },
};

const defaultWorkflow = [
  {
    name: 'Web Scraping',
    description: 'Extract data from websites',
    status: 'Extract',
    icon: 'FaGlobe',
    color: '#4CAF50',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'Data Enrichment',
    description: 'Enhance with contact info',
    status: 'Enrich',
    icon: 'FaDatabase',
    color: '#2196F3',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'Export & Sync',
    description: 'Send to CRM or export',
    status: 'Push',
    icon: 'FaShareSquare',
    color: '#E91E63',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const ComponentButton = ({ name, description, iconType, onDragStart }) => {
  const IconComponent = componentConfig[name]?.icon || FaGlobe;
  return (
    <div
      className="workflowbuilder-component"
      draggable
      onDragStart={(e) => onDragStart(e, name)}
    >
      <span className={`workflowbuilder-component-icon workflowbuilder-component-icon-${iconType}`}>
        <IconComponent color={componentConfig[name]?.color} size={20} />
      </span>
      <div className="workflowbuilder-component-text">
        <h3 className="workflowbuilder-component-title">{name}</h3>
        <p className="workflowbuilder-component-description">{description}</p>
      </div>
    </div>
  );
};

const Workflowbuilder = () => {
  const [workflows, setWorkflows] = useState([]);
  const [activeTab, setActiveTab] = useState('Visual Builder');
  const [componentsVisible, setComponentsVisible] = useState(false);
  const [currentSteps, setCurrentSteps] = useState([]);
  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [newWorkflowTitle, setNewWorkflowTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showWorkflowSelector, setShowWorkflowSelector] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const workflowsPerPage = 2;
  const { workflowId } = useParams();
  const navigate = useNavigate();

  // Fetch workflows on component mount
  useEffect(() => {
    fetchWorkflows();
  }, []);

  // Handle workflowId changes for Drag & Drop
  useEffect(() => {
    console.log('Workflowbuilder state:', { activeTab, workflows, workflowId });
    if (workflowId) {
      setActiveTab('Drag & Drop');
      setComponentsVisible(true);
      fetchWorkflow(workflowId);
    } else {
      setActiveTab('Visual Builder');
      setComponentsVisible(false);
      setCurrentSteps([]);
      navigate('/workflow');
    }
  }, [workflowId, navigate]);

  const fetchWorkflows = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated. Please sign in.');
      }
      const response = await fetch(`${BASE_URL}/workflows/user`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Fetch workflows response:', text);
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || `Failed to fetch workflows (Status: ${response.status})`);
        } catch {
          throw new Error(`Failed to fetch workflows: Non-JSON response received (Status: ${response.status})`);
        }
      }
      const data = await response.json();
      // Map icon strings to React components and sort by createdAt (newest first)
      const mappedWorkflows = data
        .map(workflow => ({
          ...workflow,
          steps: workflow.steps.map(step => ({
            ...step,
            icon: componentConfig[step.name]?.icon || FaGlobe,
          })),
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setWorkflows(mappedWorkflows);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      alert(`Failed to load workflows: ${error.message}`);
    }
  };

  const fetchWorkflow = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated. Please sign in.');
      }
      const response = await fetch(`${BASE_URL}/workflows/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Fetch workflow response:', text);
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || `Failed to fetch workflow (Status: ${response.status})`);
        } catch {
          throw new Error(`Failed to fetch workflow: Non-JSON response received (Status: ${response.status})`);
        }
      }
      const data = await response.json();
      // Map icon strings to React components
      const mappedSteps = data.steps.map(step => ({
        ...step,
        icon: componentConfig[step.name]?.icon || FaGlobe,
      }));
      setCurrentSteps(mappedSteps);
    } catch (error) {
      console.error('Error fetching workflow:', error);
      setCurrentSteps([]);
      alert(`Failed to load workflow: ${error.message}`);
    }
  };

  const handleDragStart = (e, componentName) => {
    e.dataTransfer.setData('componentName', componentName);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const componentName = e.dataTransfer.getData('componentName');
    if (componentName && componentConfig[componentName]) {
      if (currentSteps.some(step => step.name === componentName)) {
        alert('This component is already added to the workflow.');
        return;
      }
      const now = new Date().toISOString();
      const newStep = {
        name: componentName,
        description: componentConfig[componentName].description,
        status: componentConfig[componentName].status,
        icon: componentConfig[componentName].icon,
        color: componentConfig[componentName].color,
        createdAt: now,
        updatedAt: now,
      };

      // Validation for component order
      let updatedSteps = [...currentSteps];
      if (componentName === 'Web Scraping') {
        updatedSteps = [newStep, ...updatedSteps];
      } else if (componentName === 'Data Enrichment') {
        if (updatedSteps.some(step => step.name === 'Web Scraping')) {
          updatedSteps.splice(1, 0, newStep);
        } else {
          updatedSteps = [newStep, ...updatedSteps];
        }
      } else if (componentName === 'Export & Sync') {
        updatedSteps.push(newStep);
      } else {
        updatedSteps.push(newStep);
      }
      setCurrentSteps(updatedSteps);
    }
  };

  const handleRemoveStep = (index) => {
    setCurrentSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveWorkflow = async () => {
    if (!workflowId) {
      alert('Please create a new workflow using the "New Workflow" button.');
      return;
    }
    if (currentSteps.length === 0) {
      alert('Please add at least one component to save the workflow.');
      return;
    }
    const workflow = workflows.find((w) => w.id === workflowId);
    if (!workflow) {
      alert('Workflow not found.');
      return;
    }
    // Validate workflow order
    if (currentSteps.length === 3) {
      if (
        currentSteps[0].name !== 'Web Scraping' ||
        currentSteps[1].name !== 'Data Enrichment' ||
        currentSteps[2].name !== 'Export & Sync'
      ) {
        alert('Invalid workflow order. Required: Web Scraping (1st), Data Enrichment (2nd), Export & Sync (3rd).');
        return;
      }
    } else if (currentSteps.length === 2) {
      if (
        currentSteps[0].name !== 'Data Enrichment' ||
        currentSteps[1].name !== 'Export & Sync'
      ) {
        alert('Invalid workflow order. Required: Data Enrichment (1st), Export & Sync (2nd).');
        return;
      }
    }
    const now = new Date().toISOString();
    const stepsForBackend = currentSteps.map(step => ({
      name: step.name,
      description: step.description,
      status: step.status,
      icon: Object.keys(componentConfig).find(
        key => componentConfig[key].icon === step.icon
      ) || 'FaGlobe',
      color: step.color,
      createdAt: step.createdAt || now,
      updatedAt: now,
    }));
    const workflowToSave = {
      id: workflowId,
      title: workflow.title,
      steps: stepsForBackend,
      status: workflow.status || 'Ready',
      createdAt: workflow.createdAt || now,
      updatedAt: now,
    };
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated. Please sign in.');
      }
      const response = await fetch(`${BASE_URL}/workflows/${workflowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(workflowToSave),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Save workflow response:', text);
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || `Failed to save workflow (Status: ${response.status})`);
        } catch {
          throw new Error(`Failed to save workflow: Non-JSON response received (Status: ${response.status})`);
        }
      }
      const updatedWorkflow = await response.json();
      updatedWorkflow.steps = updatedWorkflow.steps.map(step => ({
        ...step,
        icon: componentConfig[step.name]?.icon || FaGlobe,
      }));
      setWorkflows((prev) => {
        const updated = prev.map((w) => (w.id === workflowId ? updatedWorkflow : w))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return updated;
      });
      setCurrentSteps([]);
      setActiveTab('Visual Builder');
      setComponentsVisible(false);
      navigate('/workflow');
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert(`Failed to save workflow: ${error.message}`);
    }
  };

  const handleClearCanvas = () => {
    if (!workflowId) return;
    setCurrentSteps([]);
  };

  const handleNewWorkflowClick = () => {
    setShowWorkflowForm(true);
    setNewWorkflowTitle('');
    setSelectedTemplate('');
  };

  const handleCloseForm = () => {
    setShowWorkflowForm(false);
    setNewWorkflowTitle('');
    setSelectedTemplate('');
  };

  const handleSaveNewWorkflow = async () => {
    if (!newWorkflowTitle.trim()) {
      alert('Please enter a workflow title.');
      return;
    }
    const newWorkflowId = `workflow-${Date.now()}`;
    const now = new Date().toISOString();
    const templateWorkflow = selectedTemplate === 'default'
      ? {
          title: 'Lead Enrichment Pipeline',
          steps: defaultWorkflow.map(step => ({ ...step, createdAt: now, updatedAt: now })),
        }
      : workflows.find(w => w.id === selectedTemplate) || { title: newWorkflowTitle, steps: [] };
    const newWorkflow = {
      id: newWorkflowId,
      title: newWorkflowTitle,
      steps: templateWorkflow.steps.map(step => ({
        ...step,
        icon: Object.keys(componentConfig).find(
          key => componentConfig[key].icon === step.icon
        ) || 'FaGlobe',
        createdAt: step.createdAt || now,
        updatedAt: step.updatedAt || now,
      })),
      status: 'Ready',
      createdAt: now,
      updatedAt: now,
    };
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated. Please sign in.');
      }
      const response = await fetch(`${BASE_URL}/workflows/all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newWorkflow),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Create workflow response:', text);
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || `Failed to create workflow (Status: ${response.status})`);
        } catch {
          throw new Error(`Failed to create workflow: Non-JSON response received (Status: ${response.status})`);
        }
      }
      const savedWorkflow = await response.json();
      savedWorkflow.steps = savedWorkflow.steps.map(step => ({
        ...step,
        icon: componentConfig[step.name]?.icon || FaGlobe,
      }));
      setWorkflows((prev) => [savedWorkflow, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      handleCloseForm();
      setActiveTab('Drag & Drop');
      setComponentsVisible(true);
      navigate(`/workflow/drag-drop/${newWorkflowId}`);
    } catch (error) {
      console.error('Error creating workflow:', error);
      alert(`Failed to create workflow: ${error.message}`);
    }
  };

  const handleUpdateWorkflows = async (updatedWorkflows) => {
    setWorkflows(updatedWorkflows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    const now = new Date().toISOString();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('User not authenticated. Please sign in.');
      return;
    }
    for (const workflow of updatedWorkflows) {
      try {
        const stepsForBackend = workflow.steps.map(step => ({
          ...step,
          icon: Object.keys(componentConfig).find(
            key => componentConfig[key].icon === step.icon
          ) || 'FaGlobe',
          updatedAt: now,
        }));
        const response = await fetch(`${BASE_URL}/workflows/${workflow.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ ...workflow, steps: stepsForBackend, updatedAt: now }),
        });
        if (!response.ok) {
          const text = await response.text();
          console.error(`Update workflow ${workflow.id} response:`, text);
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.error || `Failed to update workflow (Status: ${response.status})`);
          } catch {
            throw new Error(`Failed to update workflow: Non-JSON response received (Status: ${response.status})`);
          }
        }
      } catch (error) {
        console.error(`Error updating workflow ${workflow.id}:`, error);
        alert(`Failed to update workflow ${workflow.id}: ${error.message}`);
      }
    }
  };

  const handleDragDropClick = () => {
    if (!workflowId) {
      alert('Please create a new workflow using the "New Workflow" button.');
      return;
    }
    setActiveTab('Drag & Drop');
    setComponentsVisible(true);
    navigate(`/workflow/drag-drop/${workflowId}`);
  };

  const handleTestRun = () => {
    if (!workflowId) {
      alert('Please select or create a workflow to test.');
      return;
    }
    if (currentSteps.length === 3 &&
        currentSteps[0].name === 'Web Scraping' &&
        currentSteps[1].name === 'Data Enrichment' &&
        currentSteps[2].name === 'Export & Sync') {
      setActiveTab('Data Engine');
      setComponentsVisible(false);
      navigate(`/workflow/data-enrichment/${workflowId}`);
    } else if (currentSteps.length === 2 &&
               currentSteps[0].name === 'Data Enrichment' &&
               currentSteps[1].name === 'Export & Sync') {
      setActiveTab('Data Engine');
      setComponentsVisible(false);
      navigate(`/Dataenrichment`);
    } else {
      alert('Invalid workflow configuration. Required: Either [Web Scraping, Data Enrichment, Export & Sync] or [Data Enrichment, Export & Sync].');
      return;
    }
  };

  const handleRunWorkflow = () => {
    if (!workflowId) {
      setShowWorkflowSelector(true);
    } else {
      setActiveTab('Data Engine');
      setComponentsVisible(false);
      navigate(`/workflow/data-enrichment/${workflowId}`);
    }
  };

  const handleSelectWorkflow = (selectedWorkflowId) => {
    setShowWorkflowSelector(false);
    setActiveTab('Data Engine');
    setComponentsVisible(false);
    navigate(`/workflow/drag-drop/${selectedWorkflowId}`);
  };

  const handleCloseWorkflowSelector = () => {
    setShowWorkflowSelector(false);
  };

  // Pagination logic
  const totalPages = Math.ceil(workflows.length / workflowsPerPage);
  const paginatedWorkflows = workflows.slice(
    (currentPage - 1) * workflowsPerPage,
    currentPage * workflowsPerPage
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderContent = () => {
    if (activeTab === 'Drag & Drop' && componentsVisible) {
      return (
        <div className="workflowbuilder-content">
          <div className="workflowbuilder-components-section">
            <h2 className="workflowbuilder-subheading">Workflow Components</h2>
            <div className="workflowbuilder-component-grid">
              {Object.keys(componentConfig).map((component) => (
                <ComponentButton
                  key={component}
                  name={component}
                  description={componentConfig[component].description}
                  iconType={component.toLowerCase().replace(/ & /g, '-')}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </div>
          <div className="workflowbuilder-right-column">
            <div
              className="workflowbuilder-canvas"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="workflowbuilder-canvas-controls">
                <button className="workflowbuilder-canvas-btn" onClick={handleClearCanvas}>
                  Clear Canvas
                </button>
                <button className="workflowbuilder-canvas-btn" onClick={handleSaveWorkflow}>
                  Save Workflow
                </button>
                <button className="workflowbuilder-canvas-btn primary" onClick={handleTestRun}>
                  Test Run
                </button>
              </div>
              {currentSteps.length === 0 ? (
                <div className="workflowbuilder-canvas-placeholder">
                  <div className="workflowbuilder-canvas-header">
                    <span className="workflowbuilder-canvas-icon">
                      <i className="bi bi-gear-fill"></i>
                    </span>
                    <h2>Build Your Workflow</h2>
                  </div>
                  <p className="workflowbuilder-canvas-text">Drag components from the left panel to start building</p>
                </div>
              ) : (
                <div className="vb-pipeline-steps">
                  {currentSteps.map((step, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <div className="vb-arrow">→</div>}
                      <div className="vb-step">
                        <div className="vb-step-header">
                          <div className="vb-step-icon">
                            <step.icon color={step.color} size={40} />
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
                        <button
                          className="vb-remove-button"
                          onClick={() => handleRemoveStep(index)}
                        >
                          Remove
                        </button>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    } else if (activeTab === 'Visual Builder' && !componentsVisible) {
      return (
        <div>
          <LeadEnrichmentPipeline
            workflows={paginatedWorkflows}
            onUpdateWorkflows={handleUpdateWorkflows}
          />
          {workflows.length > workflowsPerPage && (
            <div className="workflowbuilder-pagination">
              <button
                className="workflowbuilder-pagination-btn"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`workflowbuilder-pagination-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="workflowbuilder-pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      );
    } else if (activeTab === 'Data Engine' && !componentsVisible) {
      return <DataEngine workflows={workflows} onUpdateWorkflows={handleUpdateWorkflows} />;
    }
    return <LeadEnrichmentPipeline workflows={paginatedWorkflows} onUpdateWorkflows={handleUpdateWorkflows} />;
  };

  return (
    <div className="workflowbuilder-container">
      <div className="workflowbuilder-header">
        <div className="workflowbuilder-header-content">
          <h1 className="workflowbuilder-heading">Workflow Builder</h1>
          <p className="workflowbuilder-subtext">Design and configure your automation workflows</p>
        </div>
        <div className="workflowbuilder-header-actions">
          <button className="workflowbuilder-action-btn" onClick={handleNewWorkflowClick}>
            <i className="bi bi-plus"></i> New Workflow
          </button>
          <button className="workflowbuilder-action-btn primary" onClick={handleRunWorkflow}>
            <i className="bi bi-play"></i> Run Workflow
          </button>
        </div>
      </div>
      <div className="workflowbuilder-main">
        <div className="workflowbuilder-tabs">
          <button
            className={`workflowbuilder-tab ${activeTab === 'Visual Builder' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('Visual Builder');
              setComponentsVisible(false);
              setShowWorkflowSelector(false);
              navigate('/workflow');
            }}
          >
            Visual Builder
          </button>
          <button
            className={`workflowbuilder-tab ${activeTab === 'Drag & Drop' ? 'active' : ''}`}
            onClick={handleDragDropClick}
          >
            Drag & Drop
          </button>
        </div>
        {renderContent()}
      </div>
      {showWorkflowForm && (
        <div className="vb-step-form-overlay">
          <div className="vb-step-form">
            <h3 className="vb-form-title">Create New Workflow</h3>
            <div className="vb-form-fields">
              <label htmlFor="workflowTitle">Workflow Title</label>
              <input
                id="workflowTitle"
                type="text"
                value={newWorkflowTitle}
                onChange={(e) => setNewWorkflowTitle(e.target.value)}
                placeholder="Enter workflow title"
                className="vb-input"
                aria-label="Workflow title"
              />
              <label htmlFor="template">Template</label>
              <select
                id="template"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="vb-input"
                aria-label="Select a template"
              >
                <option value="">Create new (empty)</option>
                <option value="default">Default (Lead Enrichment Pipeline)</option>
                {paginatedWorkflows.filter(w => w.id !== 'default').map((w) => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
            </div>
            <div className="vb-form-actions">
              <button className="vb-save-button" onClick={handleSaveNewWorkflow}>
                Save
              </button>
              <button className="vb-close-button" onClick={handleCloseForm}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showWorkflowSelector && (
        <div className="vb-step-form-overlay">
          <div className="vb-step-form">
            <h3 className="vb-form-title">Select Workflow to Run</h3>
            <div className="vb-form-fields">
              {paginatedWorkflows.length === 0 ? (
                <p className="workflowbuilder-canvas-text">No workflows available. Create a new workflow to run.</p>
              ) : (
                paginatedWorkflows.map((workflow) => (
                  <div key={workflow.id} className="vb-workflow-select-item">
                    <span>{workflow.title}</span>
                    <button
                      className="vb-save-button"
                      onClick={() => handleSelectWorkflow(workflow.id)}
                    >
                      Run
                    </button>
                  </div>
                ))
              )}
            </div>
            {workflows.length > workflowsPerPage && (
              <div className="workflowbuilder-pagination">
                <button
                  className="workflowbuilder-pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`workflowbuilder-pagination-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="workflowbuilder-pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            )}
            <div className="vb-form-actions">
              <button className="vb-close-button" onClick={handleCloseWorkflowSelector}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Workflowbuilder.propTypes = {
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
          createdAt: PropTypes.string,
          updatedAt: PropTypes.string,
        })
      ),
      status: PropTypes.string,
      createdAt: PropTypes.string,
      updatedAt: PropTypes.string,
    })
  ),
};

Workflowbuilder.defaultProps = {
  workflows: [],
};

export default Workflowbuilder;