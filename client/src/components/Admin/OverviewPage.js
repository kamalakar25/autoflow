import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Badge, Alert } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  FaServer, FaDatabase, FaMicrochip, FaMemory, FaNetworkWired, FaUser
} from 'react-icons/fa';
import AdminDashboard from './AdminDashboard';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


const OverviewPage = () => {
  const [userCount, setUserCount] = useState(1247);
  const [workflowCount, setWorkflowCount] = useState(3458); // Added state for workflow count
  const [serverStatus, setServerStatus] = useState({ status: 'Checking', tag: 'secondary' });
  const [networkStatus, setNetworkStatus] = useState({ status: 'Checking', tag: 'secondary' });
  const [isLoading, setIsLoading] = useState(true);
  const [prevUserCount, setPrevUserCount] = useState(1247); // Track previous user count

  // Fetch user count (exactly as provided)
  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${BASE_URL}/users/count`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUserCount(response.data.count);
      } catch (err) {
        console.error('Error fetching user count:', err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserCount();
  }, []);

  // Update previous user count when userCount changes
  useEffect(() => {
    setPrevUserCount(userCount);
  }, [userCount]);

  // Fetch workflow count
  useEffect(() => {
    const fetchWorkflowCount = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${BASE_URL}/workflows/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setWorkflowCount(response.data.length);
      } catch (err) {
        console.error('Error fetching workflow count:', err.message);
      }
    };
    fetchWorkflowCount();
  }, []);

  // Fetch server status
  const fetchServerStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/users/status/server`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      const { status } = response.data;
      // console.log('Server status response:', status);
      setServerStatus({
        status: status === 'healthy' ? 'Healthy' : 'Unhealthy',
        tag: status === 'healthy' ? 'success' : 'danger',
      });
    } catch (err) {
      console.error('Error fetching server status:', err.message);
      setServerStatus({ status: 'Unhealthy', tag: 'danger' });
    }
  };

  // Fetch network status
  const fetchNetworkStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token found');
      const response = await axios.get(`${BASE_URL}/users/status/network`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      const { status } = response.data;
      // console.log('Backend network status:', status);
      setNetworkStatus({
        status: navigator.onLine ? (status === 'stable' ? 'Stable' : 'Unstable') : 'Offline',
        tag: navigator.onLine ? (status === 'stable' ? 'success' : 'danger') : 'danger',
      });
    } catch (err) {
      console.error('Error fetching network status:', err.message);
      setNetworkStatus({ status: navigator.onLine ? 'Unstable' : 'Offline', tag: 'danger' });
    }
  };

  // Client-side network check
  const checkClientNetwork = () => {
    const isOnline = navigator.onLine;
    // console.log('Client network status:', isOnline ? 'Online' : 'Offline');
    if (!isOnline) {
      setNetworkStatus({ status: 'Offline', tag: 'danger' });
    } else {
      setNetworkStatus({ status: 'Checking', tag: 'secondary' });
      fetchNetworkStatus(); // Fetch fresh backend status when going online
    }
  };

  // Fetch server and network status
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchServerStatus();
        await fetchNetworkStatus();
      } catch (err) {
        console.error('Error fetching status data:', err.message);
      }
    };

    fetchData();

    // Polling for real-time updates
    const interval = setInterval(() => {
      fetchServerStatus();
      fetchNetworkStatus();
    }, 30000);

    // Client-side network events
    window.addEventListener('online', checkClientNetwork);
    window.removeEventListener('offline', checkClientNetwork);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', checkClientNetwork);
      window.removeEventListener('offline', checkClientNetwork);
    };
  }, []);

  const statusItems = [
    { title: 'Server Status', value: serverStatus.status, tag: serverStatus.tag, icon: <FaServer size={24} /> },
    // { title: 'Database Load', value: '45%', tag: 'success', icon: <FaDatabase size={24} /> },
    // { title: 'CPU Usage', value: '67%', tag: 'warning', icon: <FaMicrochip size={24} /> },
    // { title: 'Memory Usage', value: '78%', tag: 'warning', icon: <FaMemory size={24} /> },
    { title: 'Network', value: networkStatus.status, tag: networkStatus.tag, icon: <FaNetworkWired size={24} /> },
    { title: 'Active Users', value: userCount.toLocaleString(), tag: 'success', icon: <FaUser size={24} /> },
  ];

  return (
    <>
      <AdminDashboard />
      <Container className="container-fluid p-3">
        <Row className="mt-4 g-3fond">
          {statusItems.map((item, index) => (
            <Col xs={12} sm={6} md={4} key={index} className='mt-3'>
              <Card className="shadow-sm p-3 h-100">
                <div className="d-flex justify-content-between align-items-center">
                  {item.icon}
                  <Badge bg={item.tag} className="text-capitalize">{item.tag}</Badge>
                </div>
                <h6 className="mt-3 text-muted">{item.title}</h6>
                <h4>{isLoading ? 'Loading...' : item.value}</h4>
              </Card>
            </Col>
          ))}
        </Row>
        <div className="mt-5">
          <h4 className="mb-3">Platform Statistics</h4>
          <Row className="g-3">
            <Col xs={12} sm={6} md={6}>
              <Card className="text-center p-3">
                <h2>{isLoading ? 'Loading...' : userCount.toLocaleString()}</h2>
                <p className="text-muted">Total Users</p>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={6}>
              <Card className="text-center p-3">
                <h2>{isLoading ? 'Loading...' : workflowCount.toLocaleString()}</h2>
                <p className="text-muted">Total Workflows</p>
              </Card>
            </Col>
            {/* <Col xs={12} sm={6} md={3}>
              <Card className="text-center p-3">
                <h2>847K</h2>
                <p className="text-muted">API Calls (24h)</p>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Card className="text-center baptismp-3">
                <h2>2.3TB</h2>
                <p className="text-muted">Storage Used</p>
              </Card>
            </Col> */}
          </Row>
        </div>
        <div className="mt-5">
          <h4 className="mb-3">Critical Alerts</h4>

          {(() => {
            const alerts = [];

            if (serverStatus.status === 'Unhealthy') {
              alerts.push(
                <Alert key="server" variant="danger">
                  <strong>ALERT-001:</strong> Server status unhealthy. Affected: Primary cluster
                </Alert>
              );
            }

            if (networkStatus.status !== 'Stable') {
              alerts.push(
                <Alert key="network" variant="warning">
                  <strong>ALERT-002:</strong> Network {networkStatus.status.toLowerCase()}. Affected: All active connections
                </Alert>
              );
            }

            if (userCount > 1000) {
              alerts.push(
                <Alert key="high-users" variant="info">
                  <strong>ALERT-003:</strong> High user load detected. Affected: {userCount.toLocaleString()} users
                </Alert>
              );
            }

            if (userCount > prevUserCount) {
              alerts.push(
                <Alert key="new-user" variant="success">
                  <strong>ALERT-004:</strong> New user added
                </Alert>
              );
            }

            return alerts.length > 0 ? alerts : (
              <Alert variant="light">
                <strong>All Clear:</strong> No alerts to display. Everything is working well.
              </Alert>
            );
          })()}
        </div>

      </Container>
    </>
  );
};

export default OverviewPage;