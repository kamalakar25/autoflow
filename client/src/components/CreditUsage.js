import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import "./metric.css";
const data = [
  { week: "Week 1", credits: 45 },
  { week: "Week 2", credits: 62 },
  { week: "Week 3", credits: 38 },
  { week: "Week 4", credits: 70 }
];

const CreditUsage = () => (
  <div className="card shadow-sm workflow">
    <div className="card-body">
      <h5 className="card-title mb-3">Credit Usage</h5>
      <p className="text-muted">Weekly credit consumption</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="credits" fill="#8b5cf6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default CreditUsage;
