import React, { useState, useEffect } from 'react';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


const WorkflowsActivityPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');

        console.log('Token:', token ? 'Present' : 'Missing');
        console.log('User ID:', userId || 'Missing');

        if (!token || !userId) {
          throw new Error('Authentication token or user ID missing');
        }

        const response = await fetch(`${BASE_URL}/workflows/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }

        const fetchedWorkflows = await response.json();
        console.log('Fetched workflows:', JSON.stringify(fetchedWorkflows, null, 2));

        const sortedWorkflows = fetchedWorkflows
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 2);

        setWorkflows(sortedWorkflows);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching workflows:', err.message);
        setError(`Failed to load workflows: ${err.message}`);
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  const getRelativeTime = (dateString) => {
    try {
      const now = new Date();
      const updatedAt = new Date(dateString);
      const diffInMs = now - updatedAt;
      const diffInMin = Math.floor(diffInMs / 1000 / 60);

      if (isNaN(diffInMin)) return 'Unknown';
      if (diffInMin < 1) return 'Just now';
      if (diffInMin < 60) return `${diffInMin} min ago`;
      const diffInHours = Math.floor(diffInMin / 60);
      if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } catch (e) {
      console.error('Error calculating relative time:', e.message);
      return 'Unknown';
    }
  };

  const getWorkflowStyle = (status) => {
    switch (status) {
      case 'Ready':
        return { color: 'text-blue-600', icons: ['bi bi-play-fill', 'bi bi-arrow-clockwise'] };
      case 'In Progress':
        return { color: 'text-cyan-600', icons: ['bi bi-arrow-clockwise', 'bi bi-pause-fill'] };
      case 'Completed':
        return { color: 'text-green-600', icons: ['bi bi-check-circle-fill', 'bi bi-arrow-clockwise'] };
      case 'Paused':
        return { color: 'text-yellow-600', icons: ['bi bi-pause-fill', 'bi bi-arrow-clockwise'] };
      case 'Error':
        return { color: 'text-red-600', icons: ['bi bi-exclamation-triangle-fill', 'bi bi-arrow-clockwise'] };
      case 'Enrich':
        return { color: 'text-cyan-600', icons: ['bi bi-gear-fill', 'bi bi-arrow-clockwise'] };
      default:
        return { color: 'text-gray-500', icons: ['bi bi-play-fill', 'bi bi-arrow-clockwise'] };
    }
  };

  const getCompletionPercent = (steps) => {
    try {
      if (!steps || steps.length === 0) return '0%';
      const completedSteps = steps.filter(step => step.status === 'Completed').length;
      return `${Math.round((completedSteps / steps.length) * 100)}%`;
    } catch (e) {
      console.error('Error calculating completion percent:', e.message);
      return '0%';
    }
  };

  const getStepsInfo = (steps) => {
    try {
      if (!steps || steps.length === 0) {
        return { count: 0, names: 'None', descriptions: 'No steps available' };
      }
      const count = steps.length;
      const names = steps
        .map(step => step.name || 'Unnamed Step')
        .join(', ');
      const descriptions = steps
        .map(step => step.description || 'No description')
        .join(' | ');
      return { count, names, descriptions };
    } catch (e) {
      console.error('Error formatting steps info:', e.message);
      return { count: 0, names: 'Error', descriptions: 'Error' };
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 max-w-5xl">
      <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
          <h5 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-0">My Workflows</h5>
          <a
            href="/workflow"
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base transition-colors duration-200"
          >
            View All Workflows
          </a>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-4">
            <p className="text-gray-600 text-sm sm:text-base">Loading workflows...</p>
          </div>
        ) : error ? (
          <p className="text-red-600 text-sm sm:text-base text-center">{error}</p>
        ) : workflows && workflows.length > 0 ? (
          <div className="space-y-4 sm:space-y-6">
            {workflows.map((workflow, index) => {
              const { color, icons } = getWorkflowStyle(workflow.status || 'Ready');
              const { count, names, descriptions } = getStepsInfo(workflow.steps);
              return (
                <div
                  className="flex flex-col sm:flex-row items-start border-b border-gray-200 py-4 last:border-b-0"
                  key={workflow._id || index}
                >
                  <span className={`${color} text-lg sm:text-xl mr-3 mt-1 sm:mt-0`}>●</span>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <strong className="text-base sm:text-lg text-gray-800">
                        {workflow.title || 'Untitled Workflow'}
                      </strong>
                      {/* <div className="flex items-center mt-2 sm:mt-0">
                        <span className="text-sm sm:text-base text-gray-600 mr-3">
                          {getCompletionPercent(workflow.steps)}
                        </span>
                        {icons.map((icon, idx) => (
                          <i
                            key={idx}
                            className={`${icon} text-base sm:text-lg ${color} mr-2`}
                          ></i>
                        ))}
                      </div> */}
                    </div>
                    <div className="text-gray-600 text-xs sm:text-sm mt-1">
                      {count} steps • {getRelativeTime(workflow.updatedAt)}
                    </div>
                    <div className="text-gray-600 text-xs sm:text-sm mt-1">
                      <strong>Steps:</strong> {names}
                    </div>
                    <div
                      className="text-gray-600 text-xs sm:text-sm mt-1"
                      title={descriptions}
                    >
                      <strong>Descriptions:</strong>{' '}
                      {descriptions.length > 50 ? `${descriptions.slice(0, 50)}...` : descriptions}
                    </div>
                    <div className={`text-xs sm:text-sm ${color} mt-1`}>
                      Status: {workflow.status || 'Unknown'}
                    </div>
                  </div>
                </div>
              );
            })}
            {/* {workflows.length === 2 && (
              <div className="text-center mt-4">
                <a
                  href="/workflow"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base transition-colors duration-200"
                >
                  View More Workflows
                </a>
              </div>
            )} */}
          </div>
        ) : (
          <p className="text-gray-600 text-sm sm:text-base text-center">
            No workflows available
          </p>
        )}
      </div>
    </div>
  );
};

export default WorkflowsActivityPage;