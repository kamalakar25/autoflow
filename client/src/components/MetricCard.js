import React from "react"
import "./metric.css";
const MetricCard = ({ icon, title, value, change, changeText, changeColor }) => (
  <div className="col-md-3 position-relative mt-2">
    <div className="card shadow-sm position-relative metric">
      {/* Top-right icon */}
      <div style={{ position: 'absolute', top: '30px', right: '30px', color: '#666' }} className="metric-icon">
        {icon}
      </div>

      {/* Card content */}
      <h6 className="mb-2">{title}</h6>
      <h4 className="valuetext">{value}</h4>
      <p className={`mb-0 metric-text ${changeColor}`}>{change} <small>{changeText}</small></p>
    </div>
  </div>
);


export default MetricCard;
