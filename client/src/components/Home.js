import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Automate Your Data Workflows</h1>
        <p className="hero-description">
          Build intelligent automation flows that collect, enrich, and sync your data across platforms. 
          Perfect for marketing, recruiting, and operations teams who need scalable, no-code solutions.
        </p>
        <div className="divider"></div>
        <Link to="/dashboard" className="cta-button">
          Start Building Workflows
        </Link>
      </div>
    </div>
  );
};

export default Home;