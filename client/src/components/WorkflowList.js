import React from "react";
import "./metric.css";

const workflows = [
  { name: "Lead Generation Pipeline", runs: 45, success: "93%", status: "active", color: "green" },
  { name: "Data Enrichment Flow", runs: 32, success: "97%", status: "active", color: "green" },
  { name: "CRM Sync Automation", runs: 18, success: "89%", status: "paused", color: "yellow" },
  { name: "Email List Builder", runs: 25, success: "92%", status: "active", color: "green" }
];

const WorkflowList = () => {
  return (
    <div>
      <h5 className="mb-3 mt-2 p-1">Active Workflows</h5>
      <p className="text-muted mb-3">Performance of your running automations</p>
      {workflows.map((wf, index) => (
        <div key={index} className="d-flex justify-content-between align-items-center border px-3 py-3 mb-3 workflow">
          <div>
            <div className="d-flex align-items-center">
              <span className={`status-dot status-${wf.color}`}></span>
              <strong>{wf.name}</strong>
            </div>
            <div className="text-muted small">{wf.runs} runs • {wf.success} success</div>
          </div>
          <span
            className={`badge ${wf.status === 'active' ? 'custom-badge' : 'bg-light text-dark'}`}
          >
            {wf.status}
          </span>

        </div>
      ))}
    </div>
  );
};

export default WorkflowList;
