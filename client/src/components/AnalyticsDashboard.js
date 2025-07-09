// AnalyticsDashboard.js
import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import MetricCard from "./MetricCard.js";
import WorkflowList from "./WorkflowList";
import ResourceUsage from "./ResourceUsage.js";
import WorkflowExecutions from "./WorkflowExecutions.js";
import CreditUsage from "./CreditUsage.js";
import "./AnalyticsDashboard.css";
import "./metric.css"
import { Activity, TrendingUp, Clock, Zap } from 'lucide-react';



const AnalyticsDashboard = () => {
  return (
    <div className="container py-4">
      <h2 className="mb-1">Analytics Dashboard</h2>
      <p className="text-muted mb-4">Monitor your automation performance and usage metrics</p>

      <div className="row mb-4">
        <MetricCard icon={<Activity size={22} />} title="Total Executions" value="163" change="+12%" changeText="from last week" changeColor="text-success" />
        <MetricCard icon={<TrendingUp size={22} />} title="Success Rate" value="94.5%" change="+2.1%" changeText="from last week" changeColor="text-success" />
        <MetricCard icon={<Clock size={22} />} title="Avg. Runtime" value="2.3s" change="+0.2s" changeText="from last week" changeColor="text-danger" />
        <MetricCard icon={<Zap size={22} />} title="Credits Used" value="216" change="-18%" changeText="from last week" changeColor="text-danger" />
      </div>

     <div className="row">
  <div className="col-lg-4 col-sm-6 mb-4 mt-2">
    <div className="border bg-white metric met-height p-3 d-flex flex-column justify-content-between custom-box">
      <WorkflowList />
    </div>
  </div>
  <div className="col-lg-4 col-sm-6 mb-4 mt-2">
    <div className="d-flex flex-column justify-content-between custom-box">
      <ResourceUsage />
    </div>
  </div>
 <div className="col-lg-4 col-sm-6 mb-4 mt-2">
  <div className="custom-820-wrapper">
    <WorkflowExecutions />
    <CreditUsage />
  </div>
</div>

</div>

    </div>
  );
};

export default AnalyticsDashboard;
