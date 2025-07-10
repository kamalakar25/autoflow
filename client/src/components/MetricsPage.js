import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


const MetricsPage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        // Retrieve JWT token and user ID from localStorage
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');

        if (!token || !userId) {
          throw new Error('Authentication token or user ID missing');
        }

        // Fetch user details from the backend
        const response = await fetch(`${BASE_URL}/users/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        // console.log('Fetched user data:', data); // Log the response for debugging

        // Check if user and userCredits data exist in the response
        if (!data.user) {
          throw new Error('No user data in response');
        }

        setUser(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user details:', err.message);
        setError('Failed to load user details. Please try again later.');
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      <style>
        {`
          @media (max-width: 576px) {
            .dashboard-header {
              flex-direction: column !important;
              align-items: stretch !important;
            }
            .dashboard-header .btn-group {
              flex-direction: column;
              gap: 0.5rem;
              width: 100%;
            }
            .dashboard-header .btn {
              width: 100%;
              justify-content: center;
            }
          }
        `}
      </style>

      <div className="container-fluid px-3 py-3">
        {/* Header */}
        <div className="d-flex dashboard-header justify-content-between align-items-center mb-4 gap-3 flex-wrap">
          <h2 className="mb-0 fs-4 fw-bold">My Dashboard</h2>
          
        </div>

        {/* Welcome Message */}
        <p className="text-muted mb-4 fs-6">
          Welcome back! Here's your personal automation overview.
        </p>

        {/* Cards Row */}
        <div className="row g-3">
          {/* User Details Card */}
          <div className="col-12 col-md-6">
            <div className="card shadow-sm h-100 w-100">
              <div className="card-body">
                <h5 className="card-title mb-3">User Details</h5>
                {loading ? (
                  <p>Loading...</p>
                ) : error ? (
                  <p className="text-danger">{error}</p>
                ) : user && user.user ? (
                  <ul className="list-unstyled mb-0">
                    <li><strong>Name:</strong> {user.user.firstName} {user.user.lastName}</li>
                    <li><strong>Email:</strong> {user.user.email}</li>
                    {/* <li><strong>Member Since:</strong> {formatDate(user.user.createdAt)}</li> */}
                  </ul>
                ) : (
                  <p>No user data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Credits Overview Card */}
          <div className="col-12 col-md-6">
            <div className="card shadow-sm h-100 w-100">
              <div className="card-body">
                <h5 className="card-title mb-3">Credits Overview</h5>
                {loading ? (
                  <p>Loading...</p>
                ) : error ? (
                  <p className="text-danger">{error}</p>
                ) : user && user.userCredits ? (
                  <>
                    <ul className="list-unstyled mb-0">
                      <li><strong>Total Credits:</strong> {(user.userCredits.currentCredits + user.userCredits.totalCreditsUsed).toLocaleString()}</li>
                      <li><strong>Used Credits:</strong> {user.userCredits.totalCreditsUsed.toLocaleString()}</li>
                      <li><strong>Available Credits:</strong> {user.userCredits.currentCredits.toLocaleString()}</li>
                    </ul>
                    <div className="progress mt-3" style={{ height: '6px' }}>
                      <div
                        className="progress-bar bg-success"
                        role="progressbar"
                        style={{
                          width: `${
                            user.userCredits.currentCredits + user.userCredits.totalCreditsUsed > 0
                              ? (user.userCredits.currentCredits /
                                  (user.userCredits.currentCredits + user.userCredits.totalCreditsUsed)) * 100
                              : 0
                          }%`,
                        }}
                        aria-valuenow={
                          user.userCredits.currentCredits + user.userCredits.totalCreditsUsed > 0
                            ? (user.userCredits.currentCredits /
                                (user.userCredits.currentCredits + user.userCredits.totalCreditsUsed)) * 100
                            : 0
                        }
                        aria-valuemin="0"
                        aria-valuemax="100"
                      ></div>
                    </div>
                  </>
                ) : (
                  <p>No credits data available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MetricsPage;