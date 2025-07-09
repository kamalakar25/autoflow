import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { FaSave } from 'react-icons/fa';
import axios from 'axios';
import './Modal.css';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


const AddProviderModal = ({ show, handleClose, onAdded }) => {
  const [type, setType] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [error, setError] = useState(null);

  // Reset form state
  const resetForm = () => {
    setType('');
    setApiKey('');
    setEndpoint('');
    setError(null);
  };

  // Handle provider submission
  const handleSubmit = async () => {
    if (!type || !apiKey || !endpoint) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in.');
        return;
      }
      const response = await axios.post(
        `${BASE_URL}/api/providers/new`,
        { type, apiKey, endpoint },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newProvider = response.data;
      if (!newProvider || !newProvider.type) {
        throw new Error('Invalid provider data received from server.');
      }
      onAdded(newProvider);
      handleCloseModal();
    } catch (err) {
      console.error('Error adding provider:', err);
      setError(err.response?.data?.message || 'Failed to add provider. Please try again.');
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    console.log('AddProviderModal: Close button or Cancel clicked');
    resetForm();
    handleClose();
  };

  return (
    <Modal
      show={show}
      onHide={() => {
        console.log('AddProviderModal: onHide triggered');
        handleCloseModal();
      }}
      size="lg"
      centered
      backdrop="static"
      className="enrichment-modal provider-modal" // Added unique class for CSS scoping
      autoFocus
      enforceFocus
    >
      <Modal.Header
        closeButton
        onClick={() => console.log('AddProviderModal: Header close button clicked')}
      >
        <Modal.Title className="k-title-bold">Add New Provider</Modal.Title>
      </Modal.Header>
      <Modal.Body className="k-margin-bottom">
        {error && (
          <p className="k-text-muted k-text-danger k-margin-bottom">{error}</p>
        )}
        <Form>
          <Form.Group className="k-margin-bottom">
            <Form.Label className="k-title-bold">Provider Type</Form.Label>
            <Form.Control
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g., Hunter"
              className="k-search-input"
            />
          </Form.Group>
          <Form.Group className="k-margin-bottom">
            <Form.Label className="k-title-bold">API Key</Form.Label>
            <Form.Control
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e.g., c7ab61c7f2c4c0192a36852dcf47f4414a585b60"
              className="k-search-input"
            />
          </Form.Group>
          <Form.Group className="k-margin-bottom">
            <Form.Label className="k-title-bold">Endpoint</Form.Label>
            <Form.Control
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="e.g., https://api.hunter.io/v2"
              className="k-search-input"
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer className="k-flex-justify">
      
        <Button
          variant="dark"
          className="k-flex-align k-card-shadow"
          onClick={handleSubmit}
        >
          <FaSave className="k-icon-spacing" /> Save Provider
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddProviderModal;