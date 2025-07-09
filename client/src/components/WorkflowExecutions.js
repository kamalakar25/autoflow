import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import "./AnalyticsDashboard.css";
import "./metric.css";


const data = [
  { day: "Mon", executions: 30, success: 25 },
  { day: "Tue", executions: 20, success: 18 },
  { day: "Wed", executions: 27, success: 26 },
  { day: "Thu", executions: 35, success: 30 },
  { day: "Fri", executions: 40, success: 39 },
  { day: "Sat", executions: 22, success: 21 },
  { day: "Sun", executions: 15, success: 14 }
];

const WorkflowExecutions = () => (
  <div className="card shadow-sm mb-4 workflow">
    <div className="card-body">
      <h5 className="card-title mb-3">Workflow Executions</h5>
      <p className="text-muted">Daily execution count and success rate</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="executions" stroke="#4f46e5" strokeWidth={2} />
          <Line type="monotone" dataKey="success" stroke="#22c55e" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default WorkflowExecutions;
