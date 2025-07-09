import React from "react";
import "./metric.css";
const usageData = [
  { label: "Monthly Credits", value: 216, limit: 1000 },
  { label: "Active Workflows", value: 3, limit: 5 },
  { label: "Data Sources", value: 4, limit: 10 },
  { label: "Team Members", value: 1, limit: 3 }
];

const ResourceUsage = () => (
  <div className="card shadow-sm workflow" style={{ minHeight: '500px' }}>
    <div className="card-body" style={{ padding: '2rem' }}>
      <h5 className="card-title mb-3">Resource Usage</h5>
      <p className="text-muted">Current usage across your plan limits</p>
      {usageData.map((item, index) => {
        const percent = (item.value / item.limit) * 100;
        return (
          <div key={index} className="mb-3">
            <div className="d-flex justify-content-between mb-1">
              <span>{item.label}</span>
              <small>{item.value} / {item.limit}</small>
            </div>
            <div className="progress" style={{ height: '8px' }}>
              <div className="progress-bar" style={{ width: `${percent}%` }}></div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default ResourceUsage;