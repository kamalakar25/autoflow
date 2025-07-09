import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { FaPlus, FaArrowLeft, FaSave } from 'react-icons/fa';
import axios from 'axios';
import AddProviderModal from './AddProviderModal';
import './enrichment.css';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


const AddEnrichmentModal = ({ show, handleClose, onSaved, providers = [] }) => {
  const [view, setView] = useState('selection'); // 'selection' or 'enrichment'
  const [type, setType] = useState('person');
  const [provider, setProvider] = useState('');
  const [inputField, setInputField] = useState('');
  const [outputFields, setOutputFields] = useState('');
  const [condition, setCondition] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [updatedProviders, setUpdatedProviders] = useState(providers);

  // Update providers when prop changes
  useEffect(() => {
    setUpdatedProviders(providers);
  }, [providers]);

  // Handle enrichment config submission
  const handleSubmit = async () => {
    if (!title || !provider || !inputField) {
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
        `${BASE_URL}/api/enrichment-configs/new`,
        {
          title,
          type,
          provider,
          inputField,
          outputFields: outputFields ? outputFields.split(',').map((f) => f.trim()) : [],
          condition,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Saved config:', response.data);
      onSaved(response.data);
      handleCloseModal();
    } catch (err) {
      console.error('Error saving config:', err);
      setError(err.response?.data?.message || 'Failed to save configuration.');
    }
  };

  // Reset form state
  const resetForm = () => {
    setView('selection');
    setError(null);
    setType('person');
    setProvider('');
    setInputField('');
    setOutputFields('');
    setCondition('');
    setTitle('');
  };

  // Handle provider added
  const handleProviderAdded = (newProvider) => {
    setUpdatedProviders([...updatedProviders, newProvider]);
    setProvider(newProvider.type);
    setView('enrichment');
  };

  // Handle back to selection view
  const handleBack = () => {
    resetForm();
  };

  // Handle modal close
  const handleCloseModal = () => {
    console.log('AddEnrichmentModal: Close button or Cancel clicked');
    resetForm();
    handleClose();
  };

  return (
    <>
      <Modal
        show={show}
        onHide={() => {
          console.log('AddEnrichmentModal: onHide triggered');
          handleCloseModal();
        }}
        size="lg"
        centered
        backdrop="static"
        className="enrichment-modal"
        autoFocus
        enforceFocus
      >
        <Modal.Header
          closeButton
          onClick={() => console.log('AddEnrichmentModal: Header close button clicked')}
        >
          <Modal.Title className="k-title-bold">
            {view === 'selection' ? 'Add New Enrichment' : 'Configure Enrichment'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="k-margin-bottom">
          {view === 'selection' ? (
            <div className="k-flex-align k-flex-justify k-gap">
              <Button
                variant="light"
                className="k-flex-align k-card-shadow"
                onClick={() => {
                  console.log('AddEnrichmentModal: Add Provider button clicked');
                  setShowProviderModal(true);
                }}
              >
                <FaPlus className="k-icon-spacing k-icon-primary" /> Add Provider
              </Button>
              <Button
                variant="dark"
                className="k-flex-align k-card-shadow"
                onClick={() => setView('enrichment')}
              >
                <FaPlus className="k-icon-spacing" /> Add Enrichment
              </Button>
            </div>
          ) : (
            <>
              {error && (
                <p className="k-text-muted k-text-danger k-margin-bottom">{error}</p>
              )}
              <Form>
                <Form.Group className="k-margin-bottom">
                  <Form.Label className="k-title-bold">Title</Form.Label>
                  <Form.Control
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Phone Number Enrichment"
                    className="k-search-input"
                  />
                </Form.Group>
                <Form.Group className="k-margin-bottom">
                  <Form.Label className="k-title-bold">Enrichment Type</Form.Label>
                  <Form.Select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="k-search-input"
                  >
                    <option value="person">Person</option>
                    <option value="email">Email</option>
                    <option value="domain">Domain</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="k-margin-bottom">
                  <Form.Label className="k-title-bold">Provider</Form.Label>
                  <Form.Select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="k-search-input"
                  >
                    <option value="">Select Provider</option>
                    {updatedProviders.length === 0 ? (
                      <option value="" disabled>
                        No providers available
                      </option>
                    ) : (
                      updatedProviders.map((p) => (
                        <option key={p._id} value={p.type}>
                          {p.type}
                        </option>
                      ))
                    )}
                  </Form.Select>
                  {updatedProviders.length === 0 && (
                    <p className="k-text-muted k-margin-bottom-sm">
                      Add a provider to start configuring enrichments.
                    </p>
                  )}
                </Form.Group>
                <Form.Group className="k-margin-bottom">
                  <Form.Label className="k-title-bold">Input Field</Form.Label>
                  <Form.Control
                    value={inputField}
                    onChange={(e) => setInputField(e.target.value)}
                    placeholder="e.g., phone_number"
                    className="k-search-input"
                  />
                </Form.Group>
                <Form.Group className="k-margin-bottom">
                  <Form.Label className="k-title-bold">Output Fields</Form.Label>
                  <Form.Control
                    value={outputFields}
                    onChange={(e) => setOutputFields(e.target.value)}
                    placeholder="e.g., valid, carrier, location"
                    className="k-search-input"
                  />
                </Form.Group>
                <Form.Group className="k-margin-bottom">
                  <Form.Label className="k-title-bold">Condition</Form.Label>
                  <Form.Control
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="Optional condition..."
                    className="k-search-input"
                  />
                </Form.Group>
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="k-flex-justify">
          {view === 'selection' ? (
            null
          ) : (
            <>
              <Button
                variant="light"
                className="k-flex-align k-card-shadow"
                onClick={handleBack}
              >
                <FaArrowLeft className="k-icon-spacing" /> Back
              </Button>
              <Button
                variant="dark"
                className="k-flex-align k-card-shadow"
                onClick={handleSubmit}
              >
                <FaSave className="k-icon-spacing" /> Save Enrichment
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
      <AddProviderModal
        show={showProviderModal}
        handleClose={() => {
          console.log('AddEnrichmentModal: Closing AddProviderModal');
          setShowProviderModal(false);
        }}
        onAdded={handleProviderAdded}
      />
    </>
  );
};

export default AddEnrichmentModal;