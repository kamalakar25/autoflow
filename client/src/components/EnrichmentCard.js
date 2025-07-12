import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import { FaCog, FaTrash, FaDatabase } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const EnrichmentCard = ({ title, subtitle, status, icon = <FaDatabase />, configId, type }) => {
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
      style={{ cursor: 'pointer', width: '100%', maxWidth: '350px', margin: '0 auto' }}
    >
      <Card.Body className="k-card-body p-3 d-flex flex-row align-items-center">
        <div className="k-icon-container mr-3">{icon}</div>
        <div className="k-content-container flex-grow-1">
          <div className="k-text-container">
            <h6 className="k-title-bold k-text-truncate mb-1">{title}</h6>
            <small className="k-text-muted k-text-truncate">{subtitle}</small>
          </div>
          <div className="k-status-container mt-2">
            <Badge bg={statusColor} className="k-badge k-text-uppercase mr-2">
              {statusLabel}
            </Badge>
            <small className="k-text-muted k-text-sm">{type}</small>
          </div>
          <div className="k-meta-info mt-1">
            <small className="k-text-muted">{lastRun}</small>
          </div>
        </div>
        <Button
          variant="link"
          className="k-icon-muted k-icon-hover p-0 ml-2"
          onClick={handleDeleteClick}
          title="Delete configuration"
        >
          <FaTrash />
        </Button>
      </Card.Body>
    </Card>
  );
};

export default React.memo(EnrichmentCard);