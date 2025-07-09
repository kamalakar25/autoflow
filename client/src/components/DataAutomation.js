import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { GearFill, DatabaseFill, Diagram2, CloudUploadFill, PeopleFill, BarChartFill, CreditCardFill, GearWideConnected } from 'react-bootstrap-icons';
import './DataAutomation.css';
import './StatsSection.css';
import image1 from '../assets/data-workflow-image.png';
import { useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import Footer from './Footer';

// import AuthModal from './AuthModal';

// Automation Suite Component
const AutomationSuite = () => {
  const [activeSection, setActiveSection] = React.useState('data');
  


  const sections = {
    data: {
      title: "Data Automation Engine",
      description: "Powerful headless browser scraping with intelligent CAPTCHA handling, scheduled jobs, and dynamic scrolling capabilities.",
      features: ["Headless browser automation", "Scheduled & dynamic jobs", "CAPTCHA & login support"]
    },
    enrichment: {
      title: "Enrichment Engine",
      description: "Enhance your data with advanced enrichment techniques, real-time updates, and intelligent data categorization.",
      features: ["Data enrichment", "Real-time updates", "Intelligent categorization"]
    },
    workflows: {
      title: "Workflows Engine",
      description: "Streamline your processes with automated workflows, task scheduling, and seamless integration capabilities.",
      features: ["Automated workflows", "Task scheduling", "Seamless integration"]
    },
    sync: {
      title: "Sync & Export Engine",
      description: "Efficiently sync and export data across platforms with secure and customizable export options.",
      features: ["Data synchronization", "Secure export", "Customizable options"]
    }
  };

  return (
    <div className="automation-suite-section">
      <h1 className="automation-title text-center mb-4">Complete Automation Suite</h1>
      <p className="automation-subtitle text-center mb-4">Seven powerful modules working together to automate your entire data workflow</p>
      <div className="automation-tabs">
        <button
          className={`automation-tab ${activeSection === 'data' ? 'active' : ''}`}
          onClick={() => setActiveSection('data')}
        >
          <GearFill /> Data Engine
        </button>
        <button
          className={`automation-tab ${activeSection === 'enrichment' ? 'active' : ''}`}
          onClick={() => setActiveSection('enrichment')}
        >
          <DatabaseFill /> Enrichment
        </button>
        <button
          className={`automation-tab ${activeSection === 'workflows' ? 'active' : ''}`}
          onClick={() => setActiveSection('workflows')}
        >
          <Diagram2 /> Workflows
        </button>
        <button
          className={`automation-tab ${activeSection === 'sync' ? 'active' : ''}`}
          onClick={() => setActiveSection('sync')}
        >
          <CloudUploadFill /> Sync & Export
        </button>
      </div>
      <div className="automation-content">
        <h2 className="automation-content-title">{sections[activeSection].title}</h2>
        <p className="automation-content-desc">{sections[activeSection].description}</p>
        <ul className="automation-feature-list">
          {sections[activeSection].features.map((feature, index) => (
            <li key={index} style={{ color: '#6f42c1' }}>{feature}</li>
          ))}
        </ul>
        <div className="automation-progress mt-3">
          <div className="automation-progress-bar" style={{ width: '60%' }}></div>
        </div>
        <span className="automation-badge badge bg-success">Active</span>
      </div>
    </div>
  );
};

// Stats Section Component
const StatsSection = () => {
  const statsData = [
    {
      value: "10M+",
      label: "Data Points Processed",
      description: "Records enriched monthly",
      icon: "📈",
    },
    {
      value: "2,500+",
      label: "Active Teams",
      description: "Companies using our platform",
      icon: "👥",
    },
    {
      value: "99.9%",
      label: "Uptime",
      description: "Reliable data processing",
      icon: "⚡",
    },
    {
      value: "95%",
      label: "Time Savings",
      description: "Average automation efficiency",
      icon: "⏱️",
    },
  ];

  return (
    <div className="stats-container">
      <h2 className="stats-heading">Trusted by Growing Teams</h2>
      <p className="stats-subheading">
        Our platform processes millions of data points and helps teams across industries
        build more efficient automation workflows.
      </p>
      <div className="stats-grid">
        {statsData.map((item, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon">{item.icon}</div>
            <h3 className="stat-value">{item.value}</h3>
            <p className="stat-label">{item.label}</p>
            <p className="stat-description">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Data Automation Component
const DataAutomation = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const navigate = useNavigate();

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <div className="data-automation-container">
      <section className="da-top-section" style={{ width: '100%' }}>
        <div className="da-text-content">
          <h1 className="da-main-heading">
            Automate Your <span className="da-heading-span">Data Workflows</span>
          </h1>
          <p className="da-description">
            Build intelligent automation flows that collect, enrich, and sync your data across platforms. Perfect for marketing, recruiting, and operations teams who need scalable, no-code solutions.
          </p>
          <div className="da-button-group">
            <div>
              <button onClick={() => openAuthModal('signin')} className="da-start-btn">
                Start Building Workflows →
              </button>
              <AuthModal
                isOpen={isAuthModalOpen}
                onClose={closeAuthModal}
                initialMode={authMode}
                navigate={navigate}
              />
            </div>
            <button className="da-demo-btn">⦿ Watch Demo</button>
          </div>
        </div>
        <div className="da-image-content">
          <img
            src={image1}
            alt="Data Workflow Illustration"
            className="da-workflow-img"
          />
        </div>
      </section>

      <section className="da-middle-section" style={{ width: '100%' }}>
        <div className="da-bottom-section">
          <div className="da-text-center">
            <button className="da-feature-btn btn btn-primary">Complete Feature Suite</button>
            <h1 className="da-bottom-heading">Everything You Need for Data Automation</h1>
            <p className="da-bottom-desc">
              From data collection to workflow automation, our platform provides all the tools your team needs to build intelligent, scalable processes.
            </p>
          </div>
          <div className="da-grid-container">
            <div className="da-grid-item">
              <GearFill className="da-icon" color="#007bff" />
              <h4 className="da-item-title">Data Automation Engine</h4>
              <p className="da-item-desc">Headless browser scraping with CAPTCHA handling and scheduled jobs</p>
            </div>
            <div className="da-grid-item">
              <DatabaseFill className="da-icon" color="#6f42c1" />
              <h4 className="da-item-title">Data Enrichment Engine</h4>
              <p className="da-item-desc">Multiple API integrations with fallback logic and confidence scoring</p>
            </div>
            <div className="da-grid-item">
              <Diagram2 className="da-icon" color="#e83e8c" />
              <h4 className="da-item-title">Visual Workflow Builder</h4>
              <p className="da-item-desc">Drag-drop builder with conditions, retries, and split/merge logic</p>
            </div>
            <div className="da-grid-item">
              <CloudUploadFill className="da-icon" color="#dc3545" />
              <h4 className="da-item-title">CRM & Export Sync</h4>
              <p className="da-item-desc">Seamless integration with HubSpot, Salesforce, Google Sheets, and more</p>
            </div>
            <div className="da-grid-item">
              <PeopleFill className="da-icon" color="#ffc107" />
              <h4 className="da-item-title">Team & Project System</h4>
              <p className="da-item-desc">Projects with roles, folders, audit logs, and credit management</p>
            </div>
            <div className="da-grid-item">
              <BarChartFill className="da-icon" color="#28a745" />
              <h4 className="da-item-title">Admin Dashboard</h4>
              <p className="da-item-desc">Usage metrics, job logs, error reports, and support ticket system</p>
            </div>
            <div className="da-grid-item">
              <CreditCardFill className="da-icon" color="#17a2b8" />
              <h4 className="da-item-title">Billing System</h4>
              <p className="da-item-desc">Usage-based credits with Stripe integration and auto top-up</p>
            </div>
            <div className="da-grid-item">
              <GearWideConnected className="da-icon" color="#6c757d" />
              <h4 className="da-item-title">API & Integrations</h4>
              <p className="da-item-desc">RESTful APIs and webhooks for seamless third-party connections</p>
            </div>
          </div>
        </div>
        <AutomationSuite />
        <StatsSection />
      </section>

      <section className="data-cta-section" style={{ width: '100%' }}>
        <h2 className="data-cta-heading text-white">
          Ready to Transform Your Data Workflows?
        </h2>
        <p className="data-cta-subheading">
          Join thousands of teams already automating their data workflows with our platform.
        </p>
        <div className="data-cta-buttons">
          <button className="data-cta-btn-primary"  onClick={() => openAuthModal('signin')}
              >Start Free Trial →</button> 
        
         
         
           <button className="data-cta-btn">Schedule Demo</button>
        </div>
      </section>
      <Footer />
    </div>
  );
};
export default React.memo(DataAutomation);