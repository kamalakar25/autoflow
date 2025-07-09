import React from 'react';
import { Box, Typography } from '@mui/material';
import 'bootstrap/dist/css/bootstrap.min.css';
import MetricsPage from './MetricsPage';
import UpcomingTasksPage from './UpcomingTasksPage';
import WorkflowsActivityPage from './WorkflowsActivityPage.js';
import Ticket from './ticket';

const UserDashboard = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Box className="">
        <Box>
          <MetricsPage />
        </Box>
        <Box>
          <WorkflowsActivityPage />
        </Box>
         <Box sx={{ mb: 5 }}>
          <Ticket />
        </Box>
      </Box>
    </Box>
  );
};

export default UserDashboard;