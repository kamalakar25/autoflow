import React, { useState } from 'react';
import './styles/Dashboard.css';
import { FaPause, FaPlay, FaStop, FaCog, FaReply, FaEye, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { FaPlus, FaDatabase, FaUsers, FaChartLine, FaExclamationTriangle, FaClock } from 'react-icons/fa';

const InboxCard = ({ messages, onReply, onMarkRead }) => {
  return (
    <div className="sa-inbox-card card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="sa-inbox-title mb-0">Inbox</h5>
          <span className="sa-inbox-count">{messages.length} New</span>
        </div>
        <div className="sa-inbox-list">
          {messages.map((message) => (
            <div key={message.id} className="sa-inbox-item d-flex align-items-center mb-3">
              <div className="flex-grow-1">
                <h6 className="sa-inbox-channel mb-0">{message.channel}</h6>
                <p className="sa-inbox-from mb-0">{message.from}</p>
                <p className="sa-inbox-message mb-0">{message.message}</p>
                <p className="sa-inbox-time mb-0">{message.time}</p>
              </div>
              <div className="sa-inbox-actions d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-primary sa-btn-reply"
                  onClick={() => onReply(message.from)}
                  aria-label={`Reply to ${message.from}`}
                >
                  <FaReply /> Reply
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary sa-btn-read"
                  onClick={() => onMarkRead(message.id)}
                  aria-label={`Mark ${message.from} as read`}
                >
                  <FaCheckCircle />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TicketCard = ({ tickets, onView, onClose }) => {
  return (
    <div className="sa-ticket-card card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="sa-ticket-title mb-0">Support Tickets</h5>
          <span className="sa-ticket-count">{tickets.filter((t) => t.status === 'Open').length} Open</span>
        </div>
        <div className="sa-ticket-list">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="sa-ticket-item d-flex align-items-center mb-3">
              <div className="flex-grow-1">
                <h6 className="sa-ticket-title mb-0">{ticket.title}</h6>
                <p className="sa-ticket-meta mb-0">
                  Status: {ticket.status} • {ticket.time}
                </p>
              </div>
              <div className="sa-ticket-actions d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-primary sa-btn-view"
                  onClick={() => onView(ticket.title)}
                  aria-label={`View ticket ${ticket.title}`}
                >
                  <FaEye /> View
                </button>
                {ticket.status === 'Open' && (
                  <button
                    className="btn btn-sm btn-outline-danger sa-btn-close"
                    onClick={() => onClose(ticket.id)}
                    aria-label={`Close ticket ${ticket.title}`}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [metrics] = useState({
    creditsUsed: 2847,
    successRate: 94.2,
    activeWorkflows: 12,
    recordsProcessed: 24700,
    leadConversionRate: 32.5,
    pipelineHealth: 85,
    campaignROI: 240,
    remainingCredits: 1500,
  });

  const [workflows, setWorkflows] = useState([
    {
      id: 1,
      name: 'LinkedIn Lead Generation',
      records: 1247,
      lastRun: '2 min ago',
      progress: 60,
      status: 'completed',
    },
    {
      id: 2,
      name: 'Company Data Enrichment',
      records: 1247,
      lastRun: '2 min ago',
      progress: 60,
      status: 'running',
    },
    {
      id: 3,
      name: 'Email Validation Pipeline',
      records: 543,
      lastRun: '5 min ago',
      progress: 60,
      status: 'paused',
    },
    {
      id: 4,
      name: 'CRM Data Sync',
      records: 124,
      lastRun: '1 day ago',
      progress: 60,
      status: 'running',
    },
  ]);

  const [messages, setMessages] = useState([
    { id: 1, channel: 'Email', from: 'john.doe@example.com', message: 'Interested in your services', time: '10 min ago' },
    { id: 2, channel: 'SMS', from: '+1234567890', message: 'Callback requested', time: '15 min ago' },
    { id: 3, channel: 'Social', from: '@clientX', message: 'Query about pricing', time: '20 min ago' },
  ]);

  const [tickets, setTickets] = useState([
    { id: 1, title: 'API Integration Issue', status: 'Open', time: '1 hr ago' },
    { id: 2, title: 'Billing Query', status: 'Resolved', time: '2 hr ago' },
  ]);

  const handlePause = (id) => {
    setWorkflows(
      workflows.map((wf) =>
        wf.id === id && wf.status === 'running'
          ? { ...wf, status: 'paused' }
          : wf
      )
    );
    alert(`Paused workflow: ${workflows.find((wf) => wf.id === id).name}`);
  };

  const handleResume = (id) => {
    setWorkflows(
      workflows.map((wf) =>
        wf.id === id && wf.status === 'paused'
          ? { ...wf, status: 'running' }
          : wf
      )
    );
    alert(`Resumed workflow: ${workflows.find((wf) => wf.id === id).name}`);
  };

  const handleStop = (id) => {
    setWorkflows(
      workflows.map((wf) =>
        wf.id === id && wf.status === 'running'
          ? { ...wf, status: 'stopped' }
          : wf
      )
    );
    alert(`Stopped workflow: ${workflows.find((wf) => wf.id === id).name}`);
  };

  const handleSettings = (id) => {
    alert(`Opening settings for: ${workflows.find((wf) => wf.id === id).name}`);
  };

  const handleReply = (from) => {
    alert(`Opening reply composer for: ${from}`);
    setMessages(messages.filter((msg) => msg.from !== from));
  };

  const handleMarkRead = (id) => {
    alert(`Marked message as read`);
    setMessages(messages.filter((msg) => msg.id !== id));
  };

  const handleView = (title) => {
    alert(`Viewing ticket: ${title}`);
  };

  const handleClose = (id) => {
    setTickets(
      tickets.map((ticket) =>
        ticket.id === id ? { ...ticket, status: 'Resolved' } : ticket
      )
    );
    alert(`Closed ticket: ${tickets.find((t) => t.id === id).title}`);
  };

  const handleNewWorkflow = () => {
    alert('Opening new workflow creation wizard');
  };

  const handleDashboardSettings = () => {
    alert('Opening dashboard settings');
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'Create New Workflow':
        alert('Opening new workflow creation wizard');
        break;
      case 'Enrich Data':
        alert('Starting data enrichment process');
        break;
      case 'Team Management':
        alert('Opening team management panel');
        break;
      case 'Analytics':
        alert('Navigating to analytics dashboard');
        break;
      default:
        alert(`Triggered action: ${action}`);
    }
  };

  return (
    <div className="dash-dashboard-wrapper">
      <div className="dash-dashboard-header">
        <div className="dash-header-content">
          <h1 className="dash-dashboard-title">Dashboard</h1>
          <p className="dash-dashboard-subtitle">Manage your automation workflows and monitor performance</p>
        </div>
        <div className="dash-header-actions">
          <button
            className="dash-new-workflow-btn"
            onClick={handleNewWorkflow}
            aria-label="Create new workflow"
          >
            + New Workflow
          </button>
          <button
            className="dash-settings-btn"
            onClick={handleDashboardSettings}
            aria-label="Open settings"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>
      <div className="dash-dashboard-main">
        <div className="dash-main-content-area">
          <div className="dash-metrics-grid">
            {[
              { label: 'Credits Used', value: metrics.creditsUsed.toLocaleString(), icon: '📈' },
              { label: 'Success Rate', value: `${metrics.successRate}%`, icon: '⬆️' },
              { label: 'Active Workflows', value: metrics.activeWorkflows, icon: '🔄' },
              { label: 'Records Processed', value: `${(metrics.recordsProcessed / 1000).toFixed(1)}K`, icon: '💾' },
              { label: 'Lead Conversion Rate', value: `${metrics.leadConversionRate}%`, icon: '📊' },
              { label: 'Pipeline Health', value: `${metrics.pipelineHealth}%`, icon: '🛠️' },
              { label: 'Campaign ROI', value: `${metrics.campaignROI}%`, icon: '💰' },
              { label: 'Remaining Credits', value: metrics.remainingCredits.toLocaleString(), icon: '🎫' },
            ].map((metric, index) => (
              <div key={index} className="dash-metric-box">
                <div className="dash-metric-content">
                  <p className="dash-metric-label">{metric.label}</p>
                  <p className="dash-metric-value">{metric.value}</p>
                </div>
                <span className="dash-metric-icon">{metric.icon}</span>
              </div>
            ))}
          </div>
          <div className="dash-workflows-card">
            <div className="dash-workflows-header">
              <h3 className="dash-workflows-title">Active Workflows</h3>
              <span className="dash-workflows-count">
                {workflows.filter((wf) => wf.status === 'running').length} Running
              </span>
            </div>
            <div className="dash-workflows-list">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="dash-workflow-item">
                  <div className="dash-workflow-info">
                    <p className="dash-workflow-name">{workflow.name}</p>
                    <p className="dash-workflow-meta">
                      {workflow.records.toLocaleString()} records • Last run {workflow.lastRun}
                    </p>
                    <div className="dash-workflow-progress-bar">
                      <div
                        className="dash-workflow-progress-fill"
                        style={{ width: `${workflow.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="dash-workflow-controls">
                    <span
                      className={`dash-status-badge dash-running${
                        workflow.status === 'completed'
                          ? '1'
                          : workflow.status === 'paused'
                          ? '2'
                          : workflow.status === 'stopped'
                          ? '3'
                          : ''
                      }`}
                    >
                      {workflow.status}
                    </span>
                    <div className="dash-button-group">
                      {workflow.status === 'running' && (
                        <button
                          className="dash-btn dash-btn-outline-secondary dash-btn-sm"
                          title="Pause"
                          onClick={() => handlePause(workflow.id)}
                          aria-label={`Pause ${workflow.name}`}
                        >
                          <FaPause />
                        </button>
                      )}
                      {workflow.status === 'paused' && (
                        <button
                          className="dash-btn dash-btn-outline-success dash-btn-sm"
                          title="Resume"
                          onClick={() => handleResume(workflow.id)}
                          aria-label={`Resume ${workflow.name}`}
                        >
                          <FaPlay />
                        </button>
                      )}
                      {workflow.status === 'running' && (
                        <button
                          className="dash-btn dash-btn-outline-danger dash-btn-sm"
                          title="Stop"
                          onClick={() => handleStop(workflow.id)}
                          aria-label={`Stop ${workflow.name}`}
                        >
                          <FaStop />
                        </button>
                      )}
                      <button
                        className="dash-btn dash-btn-outline-primary dash-btn-sm"
                        title="Settings"
                        onClick={() => handleSettings(workflow.id)}
                        aria-label={`Settings for ${workflow.name}`}
                      >
                        <FaCog />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="dash-support-section">
            <InboxCard messages={messages} onReply={handleReply} onMarkRead={handleMarkRead} />
            <TicketCard tickets={tickets} onView={handleView} onClose={handleClose} />
          </div>
        </div>
        <div className="dash-sidebar-panel">
          <div className="dash-quick-actions-panel">
            <div className="dash-recent-activity-card">
              <h3 className="dash-panel-title">Quick Actions</h3>
              <ul className="dash-action-list">
                {[
                  { icon: <FaPlus />, label: 'Create New Workflow' },
                  { icon: <FaDatabase />, label: 'Enrich Data' },
                  { icon: <FaUsers />, label: 'Team Management' },
                  { icon: <FaChartLine />, label: 'Analytics' },
                ].map((action, index) => (
                  <li
                    key={index}
                    className="dash-action-item"
                    onClick={() => handleQuickAction(action.label)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickAction(action.label)}
                    aria-label={`Trigger ${action.label}`}
                  >
                    {action.icon} {action.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="dash-recent-activity-card">
              <h3 className="dash-card-title">Recent Activity</h3>
              <ul className="dash-activity-list">
                <li className="dash-activity-item"><FaCheckCircle className="dash-action-icon1" /> Linking scraping completed</li>
                <li className="dash-activity-item"><FaExclamationTriangle className="dash-action-icon2" /> API limit reached</li>
                <li className="dash-activity-item"><FaCheckCircle className="dash-action-icon1" /> Data exported to HubSpot</li>
                <li className="dash-activity-item"><FaClock className="dash-action-icon3" /> Scheduled job started</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
