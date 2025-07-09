import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaDownload,
  FaCog
} from 'react-icons/fa';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './admindashboard.css';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


const AdminDashboard = () => {
  const [userCount, setUserCount] = useState(1247);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const token = localStorage.getItem('token');  

        setIsLoading(true);
        const response = await axios.get(`${BASE_URL}/users/count`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
        setUserCount(response.data.count);
      } catch (error) {
        console.error('Error fetching user count:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserCount();
  }, []);

  return (
    <div className="container-fluid p-3">
      {/* Header */}
      <div className="row align-items-center justify-content-between mb-3">
        <div className="col-md-6">
          <h2 className="fw-bold">System Administration</h2>
          <p className="text-muted">Monitor and manage the platform infrastructure</p>
        </div>
        
      </div>

      {/* Nav Tabs */}
      <div className="row">
        <div className="col-12">
          <nav className="nav nav-pills flex-column flex-sm-row justify-content-start justify-content-md-start admin-nav-tabs">
            <NavLink to="/admin/overview" className={({ isActive }) => isActive ? "flex-sm-fill text-sm-center nav-link active" : "flex-sm-fill text-sm-center nav-link"}>
              Overview
            </NavLink>
            <NavLink to="/admin/credits" className={({ isActive }) => isActive ? "flex-sm-fill text-sm-center nav-link active" : "flex-sm-fill text-sm-center nav-link"}>
              Credits & Team
            </NavLink>
            {/* <NavLink to="/admin/exports" className={({ isActive }) => isActive ? "flex-sm-fill text-sm-center nav-link active" : "flex-sm-fill text-sm-center nav-link"}>
              Exports & Sync
            </NavLink> */}
            <NavLink to="/admin/support" className={({ isActive }) => isActive ? "flex-sm-fill text-sm-center nav-link active" : "flex-sm-fill text-sm-center nav-link"}>
              Support Tickets
            </NavLink>
            <NavLink to="/admin/user" className={({ isActive }) => isActive ? "flex-sm-fill text-sm-center nav-link active" : "flex-sm-fill text-sm-center nav-link"}>
              User Approvals
            </NavLink>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
