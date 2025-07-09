import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import { FaCog, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


const EnrichmentCard = ({ title, subtitle, status, icon, configId, type }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/enrichment/${configId}`);
  };

  const handleDeleteClick = async (e) => {
    e.stopPropagation(); // Prevent card click from firing
    if (!window.confirm('Are you sure you want to delete this enrichment configuration?')) {
      return;
    }

    try {
      await axios.delete(`${BASE_URL}/api/enrichment-configs/${configId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Trigger a refresh or update parent component state
      window.location.reload(); // Simple refresh, ideally update state in parent
    } catch (err) {
      console.error('Error deleting enrichment config:', err);
      alert('Failed to delete enrichment configuration');
    }
  };

  const statusColor = status === 'paused' ? 'warning' : 'success';
  const statusLabel = status === 'paused' ? 'Paused' : 'Active';

  // Mock last run date (replace with actual data if available)
  const lastRun = 'Last run: 2025-07-07';

  return (
    <Card
      className="k-card-shadow k-card-border k-card-hover"
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      <Card.Body className="k-card-body">
        <div className="k-flex-align k-flex-justify k-margin-bottom-sm">
          <div className="k-flex-align">
            <div className="k-icon-container">{icon}</div>
            <div className="k-text-container">
              <h6 className="k-title-bold k-text-truncate">{title}</h6>
              <small className="k-text-muted k-text-truncate">{subtitle}</small>
            </div>
          </div>
          <div className="k-flex-align">
            {/* <FaCog className="k-icon-muted k-icon-hover" /> */}
            <Button
              variant="link"
              className="k-icon-muted k-icon-hover p-0"
              onClick={handleDeleteClick}
              title="Delete configuration"
            >
              <FaTrash />
            </Button>
          </div>
        </div>
        <div className="k-flex-align k-margin-bottom-sm">
          <Badge bg={statusColor} className="k-badge k-text-uppercase">
            {statusLabel}
          </Badge>
          <small className="k-text-muted k-text-sm ml-2">{type}</small>
        </div>
        <div className="k-meta-info">
          <small className="k-text-muted">{lastRun}</small>
        </div>
      </Card.Body>
    </Card>
  );
};

export default React.memo(EnrichmentCard);