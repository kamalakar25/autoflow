import React, { useState, useEffect } from 'react';
import axios from 'axios';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';



const Ticket = () => {
  const [showModal, setShowModal] = useState(false);
  const [activeView, setActiveView] = useState('raise');
  const [formData, setFormData] = useState({
    category: '',
    ticketQuery: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [inboxTickets, setInboxTickets] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState('');

  const userId = localStorage.getItem('userId');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setFieldErrors({ ...fieldErrors, [name]: '' });
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    const errors = {};
    if (!userId) errors.auth = 'You must be logged in to raise a ticket';
    if (!formData.category) errors.category = 'Please select a category';
    if (!formData.ticketQuery || formData.ticketQuery.length < 10) {
      errors.ticketQuery = 'Query must be at least 10 characters long';
    } else if (formData.ticketQuery.length > 1000) {
      errors.ticketQuery = 'Query cannot exceed 1000 characters';
    }
    console.log('Frontend validation errors:', errors);
    return errors;
  };

  const handleRaiseTicket = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const ticketData = {
        userId,
        category: formData.category,
        ticketQuery: formData.ticketQuery,
        createdAt: new Date().toISOString(),
      };
      console.log('Sending to backend:', ticketData);
      const response = await axios.post(`${BASE_URL}/api/tickets`, ticketData, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Backend response:', response.data);
      setSuccess(response.data.message || 'Ticket created successfully');
      setFormData({ category: '', ticketQuery: '' });
      setFieldErrors({});
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Axios error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors.reduce((acc, err) => ({
          ...acc,
          [err.path]: err.msg,
        }), {});
        setFieldErrors(backendErrors);
      } else {
        setError(error.response?.data?.message || 'Error creating ticket. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchInbox = async () => {
    if (!userId) {
      setInboxError('You must be logged in to view tickets');
      setInboxTickets([]);
      return;
    }
    setInboxLoading(true);
    setInboxError('');
    setInboxTickets([]);
    try {
      const response = await axios.get(`${BASE_URL}/api/tickets/inbox`, {
        params: { userId },
      });
      const tickets = response.data.tickets || [];
      setInboxTickets(tickets);
      if (tickets.length === 0) {
        setInboxError('No answered tickets found.');
      }
    } catch (error) {
      console.error('Error fetching inbox:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setInboxError(error.response?.data?.message || 'Failed to load tickets. Please try again.');
    } finally {
      setInboxLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'inbox' && userId) {
      fetchInbox();
    } else if (activeView === 'inbox') {
      setInboxTickets([]);
      setInboxError('You must be logged in to view tickets');
    }
  }, [activeView]);

  const handleShowModal = () => setShowModal(true);

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ category: '', ticketQuery: '' });
    setFieldErrors({});
    setError('');
    setSuccess('');
    setInboxTickets([]);
    setInboxError('');
    setActiveView('raise');
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    setError('');
    setSuccess('');
    setFieldErrors({});
    setInboxError('');
    if (view === 'inbox' && userId) {
      fetchInbox();
    } else if (view === 'inbox') {
      setInboxTickets([]);
      setInboxError('You must be logged in to view tickets');
    }
  };

  const handleRefresh = () => {
    setInboxTickets([]);
    if (userId) {
      fetchInbox();
    } else {
      setInboxError('You must be logged in to view tickets');
    }
  };

  const renderTicketForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm ${
            fieldErrors.category ? 'border-red-500' : 'border-gray-300'
          }`}
          required
        >
          <option value="">Select Category</option>
          <option value="Technical">Technical</option>
          <option value="Billing">Billing</option>
          <option value="General">General</option>
          <option value="Support">Support</option>
          <option value="Other">Other</option>
        </select>
        {fieldErrors.category && (
          <p className="text-red-500 text-xs mt-1">{fieldErrors.category}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Query</label>
        <textarea
          name="ticketQuery"
          value={formData.ticketQuery}
          onChange={handleChange}
          rows={4}
          placeholder="Describe your issue..."
          className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm resize-y ${
            fieldErrors.ticketQuery ? 'border-red-500' : 'border-gray-300'
          }`}
          required
        />
        {fieldErrors.ticketQuery && (
          <p className="text-red-500 text-xs mt-1">{fieldErrors.ticketQuery}</p>
        )}
      </div>
    </div>
  );

  const renderInboxView = () => (
    <div className="min-h-[300px] flex flex-col">
      {inboxError && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
          {inboxError}
        </div>
      )}
      {!inboxLoading && !inboxError && inboxTickets.length === 0 && userId && (
        <p className="text-center text-gray-600 text-sm m-auto">
          No answered tickets found
        </p>
      )}
      {!inboxLoading && inboxTickets.length > 0 && (
        <div className="max-h-[300px] overflow-y-auto space-y-4 p-2">
          {inboxTickets.map((ticket) => (
            <div
              key={ticket._id}
              className="bg-white shadow-md rounded-lg p-4 border border-gray-200"
            >
              <h6 className="text-sm font-semibold text-gray-800 mb-2">Query</h6>
              <p className="text-sm text-gray-700 mb-3">{ticket.ticketQuery}</p>
              <h6 className="text-sm font-semibold text-gray-800 mb-2">Answer</h6>
              <p className="text-sm text-gray-700 mb-3">
                {ticket.ticketAnswer || 'No response provided'}
              </p>
              <p className="text-xs text-gray-500">
                <strong>Submitted:</strong>{' '}
                {new Date(ticket.createdAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                <br />
                {ticket.repliedAt && (
                  <>
                    <strong>Answered:</strong>{' '}
                    {new Date(ticket.repliedAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed bottom-4 right-4 z-50">


      <button
        className="bg-red-600 text-white font-semibold rounded-lg px-3 py-1.5 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors duration-200 relative shadow-md flex items-center gap-1.5 text-sm sm:text-base"
        onClick={handleShowModal}
      >
        <i className="bi bi-question-circle-fill"></i>
        Help
      </button>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <div className="flex gap-2">
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    activeView === 'raise'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => handleViewChange('raise')}
                >
                  Raise Ticket
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    activeView === 'inbox'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => handleViewChange('inbox')}
                >
                  Inbox
                </button>
              </div>
              <button
                className="text-gray-500 hover:text-gray-700 text-lg"
                onClick={handleCloseModal}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="p-4 sm:p-6">
              {success && (
                <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4 text-sm">
                  {success}
                </div>
              )}
              {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}
              {fieldErrors.auth && (
                <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
                  {fieldErrors.auth}
                </div>
              )}
              {activeView === 'raise' ? renderTicketForm() : renderInboxView()}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                className="bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 text-sm transition-colors duration-200 disabled:bg-gray-400"
                onClick={handleCloseModal}
                disabled={loading || inboxLoading}
              >
                Cancel
              </button>
              {activeView === 'raise' && (
                <button
                  className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 text-sm transition-colors duration-200 disabled:bg-red-400"
                  onClick={handleRaiseTicket}
                  disabled={loading || !userId}
                >
                  {loading ? 'Submitting...' : 'Submit Ticket'}
                </button>
              )}
              {activeView === 'inbox' && (
                <button
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm transition-colors duration-200 disabled:bg-blue-400"
                  onClick={handleRefresh}
                  disabled={inboxLoading || !userId}
                >
                  {inboxLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ticket;