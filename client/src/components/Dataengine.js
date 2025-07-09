import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import './dataengine.css';

const DataEngine = () => {
  const [targetUrl, setTargetUrl] = useState('');
  const [cssSelector, setCssSelector] = useState('');
  const [waitTime, setWaitTime] = useState('');
  const [retryAttempts, setRetryAttempts] = useState('');
  const [dynamicScrolling, setDynamicScrolling] = useState(false);
  const [captchaHandling, setCaptchaHandling] = useState(false);
  const [loginSupport, setLoginSupport] = useState(false);

  return (
    <div className="dataengine-card">
      <div className="dataengine-card-header">
        <div className="dataengine-title-container">
          <h4>Data Automation Engine</h4>
          <h6 className="text-muted">Configure headless browser scraping</h6>
        </div>
      </div>
      <div className="dataengine-form-container">
        <div className="dataengine-form-group">
          <label className="dataengine-form-label">Target URL</label>
          <input
            type="text"
            className="dataengine-form-control"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
          />
        </div>
        <div className="dataengine-form-group">
          <label className="dataengine-form-label">CSS Selector</label>
          <input
            type="text"
            className="dataengine-form-control"
            value={cssSelector}
            onChange={(e) => setCssSelector(e.target.value)}
          />
        </div>
        <div className="dataengine-form-group">
          <label className="dataengine-form-label">Wait Time (ms)</label>
          <input
            type="text"
            className="dataengine-form-control"
            value={waitTime}
            onChange={(e) => setWaitTime(e.target.value)}
          />
        </div>
        <div className="dataengine-row">
          <div className="dataengine-column">
            <div className="dataengine-form-check">
              <input
                className="dataengine-form-check-input"
                type="checkbox"
                id="dynamicScrolling"
                checked={dynamicScrolling}
                onChange={(e) => setDynamicScrolling(e.target.checked)}
              />
              <label className="dataengine-form-check-label" htmlFor="dynamicScrolling">
                Dynamic Scrolling
              </label>
            </div>
            <div className="dataengine-form-check dataengine-mt-2">
              <input
                className="dataengine-form-check-input"
                type="checkbox"
                id="captchaHandling"
                checked={captchaHandling}
                onChange={(e) => setCaptchaHandling(e.target.checked)}
              />
              <label className="dataengine-form-check-label" htmlFor="captchaHandling">
                CAPTCHA Handling
              </label>
            </div>
            <div className="dataengine-form-check dataengine-mt-2">
              <input
                className="dataengine-form-check-input"
                type="checkbox"
                id="loginSupport"
                checked={loginSupport}
                onChange={(e) => setLoginSupport(e.target.checked)}
              />
              <label className="dataengine-form-check-label" htmlFor="loginSupport">
                Login Support
              </label>
            </div>
          </div>
          <div className="dataengine-column">
            <div className="dataengine-form-group">
              <label className="dataengine-form-label">Retry Attempts</label>
              <input
                type="text"
                className="dataengine-form-control"
                value={retryAttempts}
                onChange={(e) => setRetryAttempts(e.target.value)}
              />
            </div>
          </div>
        </div>
        <button className="dataengine-btn dataengine-btn-dark dataengine-btn-right">
          <FontAwesomeIcon icon={faGlobe} className="dataengine-icon" /> Start Scraping
        </button>
      </div>
    </div>
  );
};

export default DataEngine;