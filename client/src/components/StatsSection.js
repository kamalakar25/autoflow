import React from "react";
import "./StatsSection.css";



const StatsSection = () => {
  const statsData = [
    {
      value: "10M+",
      label: "Data Points Processed",
      description: "Records enriched monthly",
      icon: "📈",
    },
    {
      value: "2,500+",
      label: "Active Teams",
      description: "Companies using our platform",
      icon: "👥",
    },
    {
      value: "99.9%",
      label: "Uptime",
      description: "Reliable data processing",
      icon: "⚡",
    },
    {
      value: "95%",
      label: "Time Savings",
      description: "Average automation efficiency",
      icon: "⏱️",
    },
  ];

  return (
    
    <section className="stats-container">
      <h2 className="stats-heading">Trusted by Growing Teams</h2>
      <p className="stats-subheading">
        Our platform processes millions of data points and helps teams across industries
        build more efficient automation workflows.
      </p>
      <div className="stats-grid">
        {statsData.map((item, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon">{item.icon}</div>
            <h3 className="stat-value">{item.value}</h3>
            <p className="stat-label">{item.label}</p>
            <p className="stat-description">{item.description}</p>



            
          </div>



        ))}
        
      </div>
      
       <section className="data-cta__section">
      <h2 className="data-cta__heading">
        Ready to Transform Your Data Workflows?
      </h2>
      <p className="data-cta__subheading">
        Join thousands of teams already automating their data processes with our platform.
      </p>
      <div className="data-cta__buttons">
        <button className="data-cta__btn-primary">Start Free Trial →</button>
        <button className="data-cta__btn-outline">Schedule Demo</button>
      </div>
     
    </section>
       
    </section>

  );
};
  
export default StatsSection; 
