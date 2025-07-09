import React, { useState, useEffect } from 'react';
import { FaUserCircle, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import AdminDashboard from './AdminDashboard';

const UserApprovals = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(6); // 6 users per page to fit 3-column grid
  const BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

        const pendingUsersResponse = await axios.get(`${BASE_URL}/users/pending`, config);
        setPendingUsers(Array.isArray(pendingUsersResponse.data) ? pendingUsersResponse.data : pendingUsersResponse.data.users);
        setPage(1); // Reset to first page on new data fetch
      } catch (error) {
        console.error('Error fetching pending users:', error);
        setError(error.response?.data?.message || 'Failed to fetch pending users');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPendingUsers();
  }, []);

  const handleApproveUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${BASE_URL}/users/${userId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingUsers(pendingUsers.filter(user => user._id !== userId));
      alert('User approved successfully');
    } catch (error) {
      console.error('Error approving user:', error);
      alert(error.response?.data?.message || 'Failed to approve user');
    }
  };

  const handleRejectUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${BASE_URL}/users/${userId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingUsers(pendingUsers.filter(user => user._id !== userId));
      alert('User rejected successfully');
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert(error.response?.data?.message || 'Failed to reject user');
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const paginatedUsers = pendingUsers.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const totalPages = Math.ceil(pendingUsers.length / rowsPerPage);

  return (
    <>
      <AdminDashboard />
      <div className="container-fluid py-4 bg-light min-vh-100">
        <style jsx>{`
          .card {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            padding: 16px;
          }
          .error-message {
            color: #d32f2f;
            font-size: 0.9rem;
            margin-bottom: 1rem;
          }
          .pagination {
            justify-content: center;
            margin-top: 1.5rem;
          }
          .page-item.active .page-link {
            background-color: #007bff;
            border-color: #007bff;
            color: #fff;
          }
          .page-link {
            color: #007bff;
          }
          .page-link:hover {
            background-color: #e9ecef;
            color: #0056b3;
          }
        `}</style>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="fw-semibold">User Approvals</h5>
            <p className="text-muted">Review and approve/reject user signup requests</p>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="row">
          {isLoading ? (
            <p className="text-center">Loading pending users...</p>
          ) : paginatedUsers.length === 0 ? (
            <p className="text-center">No pending signup requests.</p>
          ) : (
            paginatedUsers.map(user => (
              <div className="col-12 col-md-6 col-lg-4 mb-4" key={user._id}>
                <div className="card h-100">
                  <div className="card-body d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center gap-2 text-primary fw-bold mb-1">
                        <FaUserCircle />
                        <span>{user.firstName} {user.lastName}</span>
                      </div>
                      <p className="mb-1"><strong>Email:</strong> {user.email}</p>
                      <p className="mb-1"><strong>Phone:</strong> {user.phone || 'N/A'}</p>
                      <p className="mb-1"><strong>Role:</strong> {user.role}</p>
                      <p className="mb-1"><strong>Status:</strong> <span className="text-warning">{user.status}</span></p>
                                         </div>
                  </div>
                  <div className="card-footer border-top-0 bg-white d-flex justify-content-between align-items-center">
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => handleApproveUser(user._id)}
                    >
                      <FaCheckCircle /> Approve
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleRejectUser(user._id)}
                    >
                      <FaExclamationTriangle /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <nav aria-label="User approvals pagination">
            <ul className="pagination">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </button>
              </li>
              {[...Array(totalPages).keys()].map(i => (
                <li key={i + 1} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </>
  );
};

export default UserApprovals;