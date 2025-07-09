import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css'; // Remove if using CDN

const UpcomingTasksPage = () => {
  const tasks = [
    {
      title: 'Review workflow results',
      description: 'Q1 Sales Campaign',
      time: 'Today, 4:00 PM',
      timeColor: 'text-primary',


      
    },
    {
      title: 'Update contact list',
      description: 'Lead Generation',
      time: 'Tomorrow, 10:00 AM',
      timeColor: 'text-primary',
    },
    {
      title: 'Export enriched data',
      description: 'Customer Research',
      time: 'Jan 18, 2:00 PM',
      timeColor: 'text-primary',
    },
  ];

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="fw-bold mb-0">Upcoming Tasks</h6>
        <button className="btn btn-outline-primary rounded-3 fs-6 fw-small">
          <i className="bi bi-calendar me-1"></i>
          View Calendar
        </button>
      </div>
      <div className="row g-3">
        {tasks.map((task, index) => (
          <div className="col-12 col-md-4" key={index}>
            <div
              className="card h-100 border-1 rounded-3 shadow-sm"
              style={{
                transition: 'box-shadow 0.3s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 0 6px rgba(0,0,0,0.05)')}
            >
              <div className="card-body">
                <p className="fw-bold mb-1 fs-5">{task.title}</p>
                <p className="text-muted mb-1 fs-6">{task.description}</p>
                <p className={`fw-medium mb-0 fs-6 ${task.timeColor}`}>{task.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingTasksPage;