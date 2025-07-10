"use client";
import React from 'react';

import { useState, useEffect, createContext, useContext } from "react";
import "./project.css";
import { FaFolder, FaGlobe } from 'react-icons/fa';
import { MdOutlineFolder } from "react-icons/md";
import { FaStar } from "react-icons/fa6";
import { IoLockClosedOutline } from "react-icons/io5";
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


// Minimal componentConfig for step icon mapping (update with your actual step names)
const componentConfig = {
  "Step 1": { icon: FaGlobe },
  "Step 2": { icon: FaGlobe },
  // Replace with your actual step names from the backend, e.g.:
  // import { FaDatabase, FaCog } from 'react-icons/fa';
  // "Data Collection": { icon: FaDatabase },
  // "Processing": { icon: FaCog }
};

const ProjectContext = createContext(undefined);

function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [authError, setAuthError] = useState(null); // State for auth errors

  // Fetch initial data for the authenticated user
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          const errorMsg = 'User not authenticated. Please sign in.';
          setAuthError(errorMsg);
          throw new Error(errorMsg);
        }

        const fetchProjects = async () => {
          const response = await fetch(`${BASE_URL}/projects/user`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            const text = await response.text();
            console.error('Projects fetch failed:', text);
            try {
              const errorData = JSON.parse(text);
              const errorMsg = errorData.error || `Failed to fetch projects (Status: ${response.status})`;
              setAuthError(errorMsg); // Set auth error for 401
              throw new Error(errorMsg);
            } catch {
              const errorMsg = `Failed to fetch projects: ${response.status} ${response.statusText}`;
              setAuthError(errorMsg);
              throw new Error(errorMsg);
            }
          }
          const contentType = response.headers.get('content-type');
          if (!contentType?.includes('application/json')) {
            const text = await response.text();
            console.error('Projects response is not JSON:', text);
            throw new Error('Projects response is not JSON');
          }
          return await response.json();
        };

        const fetchWorkflows = async () => {
          try {
            const response = await fetch(`${BASE_URL}/workflows/user`, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
            });
            if (!response.ok) {
              const text = await response.text();
              console.error('Fetch workflows response:', text);
              try {
                const errorData = JSON.parse(text);
                throw new Error(errorData.error || `Failed to fetch workflows (Status: ${response.status})`);
              } catch {
                throw new Error(`Failed to fetch workflows: Non-JSON response received (Status: ${response.status})`);
              }
            }
            const data = await response.json();
            // Map icon strings to React components
            const mappedWorkflows = data.map(workflow => ({
              ...workflow,
              steps: workflow.steps?.map(step => ({
                ...step,
                icon: componentConfig[step.name]?.icon || FaGlobe,
              })) || [], // Ensure steps is an array
            }));
            return mappedWorkflows;
          } catch (error) {
            console.error('Error fetching workflows:', error);
            alert(`Failed to load workflows: ${error.message}`);
            return [];
          }
        };

        const [projectsData, workflowsData] = await Promise.all([
          fetchProjects(),
          fetchWorkflows(),
        ]);

        // console.log('Fetched projects:', projectsData);
        // console.log('Fetched workflows:', workflowsData);
        setProjects(projectsData);
        setWorkflows(workflowsData);
        setAuthError(null); // Clear auth error on success
      } catch (err) {
        console.error('Error fetching data:', err.message);
        setAuthError(err.message); // Set auth error for display
      }
    };
    fetchData();
  }, []);

  const addProject = async (projectData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated. Please sign in.');
      }
      // console.log('Sending project data to backend:', projectData);
      const res = await fetch(`${BASE_URL}/projects/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add project');
      }
      const newProject = await res.json();
      // console.log('Backend response for addProject:', newProject);
      setProjects((prev) => [...prev, newProject]);
    } catch (err) {
      console.error('Error adding project:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const updateProject = async (id, projectData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated. Please sign in.');
      }
      // console.log('Sending update project data to backend:', projectData);
      const res = await fetch(`${BASE_URL}/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update project');
      }
      const updatedProject = await res.json();
      // console.log('Backend response for updateProject:', updatedProject);
      setProjects((prev) =>
        prev.map((project) => (project._id === id ? updatedProject : project))
      );
    } catch (err) {
      console.error('Error updating project:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const deleteProject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated. Please sign in.');
      }
      const res = await fetch(`${BASE_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }
      const masterResponse = await res.json();
      setProjects((prev) => prev.filter((project) => project._id !== id));
    } catch (err) {
      console.error('Error deleting project:', err);
      alert(`Error: ${err.message}`);
    }
  };

  // Member functions
  const addMember = async (projectId, memberData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated. Please sign in.');
      }
      const res = await fetch(`${BASE_URL}/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(memberData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add member');
      }
      const masterResponse = await res.json();
      const newMember = masterResponse.newMember;
      setProjects((prev) =>
        prev.map((project) =>
          project._id === projectId
            ? { ...project, members: [...(project.members || []), newMember] }
            : project
        )
      );
    } catch (err) {
      console.error('Error adding member:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const updateMember = async (projectId, memberId, memberData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated. Please sign in.');
      }
      const res = await fetch(`${BASE_URL}/projects/${projectId}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(memberData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update member');
      }
      const response = await res.json();
      const updatedMember = response.newMember;
      const newProjectId = memberData.projectId;

      setProjects((prev) => {
        if (newProjectId !== projectId) {
          return prev.map((project) => {
            if (project._id === projectId) {
              return {
                ...project,
                members: project.members.filter((member) => member._id !== memberId),
              };
            } else if (project._id === newProjectId) {
              return {
                ...project,
                members: [...(project.members || []), updatedMember],
              };
            }
            return project;
          });
        } else {
          return prev.map((project) =>
            project._id === projectId
              ? {
                  ...project,
                  members: project.members.map((member) =>
                    member._id === memberId ? updatedMember : member
                  ),
                }
              : project
          );
        }
      });
    } catch (err) {
      console.error('Error updating member:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const deleteMember = async (projectId, memberId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated. Please sign in.');
      }
      const res = await fetch(`${BASE_URL}/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete member');
      }
      setProjects((prev) =>
        prev.map((project) =>
          project._id === projectId
            ? {
                ...project,
                members: project.members.filter((member) => member._id !== memberId),
              }
            : project
        )
      );
    } catch (err) {
      console.error('Error deleting member:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const getProjectById = (id) => {
    return projects.find((project) => project._id === id);
  };

  const getMembersByProject = (projectId) => {
    const project = projects.find((p) => p._id === projectId);
    return project ? project.members || [] : [];
  };

  const getWorkflowsByProject = (projectId) => {
    const project = getProjectById(projectId);
    if (!project || !project.workflowIds || !Array.isArray(project.workflowIds)) {
      console.warn(`No valid workflowIds for project ${projectId}`, project);
      return [];
    }
    const filteredWorkflows = workflows.filter((workflow) =>
      project.workflowIds.some((id) => id.toString() === workflow._id.toString())
    );
    // console.log(`Filtered workflows for project ${projectId}:`, filteredWorkflows);
    return filteredWorkflows;
  };

  const value = {
    projects,
    workflows,
    authError, // Expose authError for login prompt
    addProject,
    updateProject,
    deleteProject,
    addMember,
    updateMember,
    deleteMember,
    getProjectById,
    getMembersByProject,
    getWorkflowsByProject,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}

// Auth Error Modal for Login Prompt
function AuthErrorModal({ message, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Authentication Required</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">
          <p className="confirm-text">{message}</p>
          <p>Please sign in to access projects and workflows.</p>
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="save-btn" onClick={() => (window.location.href = '/login')}>
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="close-btn" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modal-content">
          <p className="confirm-text">{message}</p>
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="delete-confirm-btn" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Project Modal Component
const ProjectModal = ({ project, onClose }) => {
  const { workflows, addProject, updateProject } = useProject();
  const [formData, setFormData] = useState({
    title: project?.title || '',
    description: project?.description || '',
    workflowIds: project?.workflowIds?.[0]?.toString() || (workflows.length > 0 ? workflows[0]._id : ''),
    status: project?.status || 'active',
    hasBookmark: project?.hasBookmark || false,
    hasLock: project?.hasLock || false,
  });
  const [currentWorkflowPage, setCurrentWorkflowPage] = useState(1);
  const workflowsPerPage = 3;

  useEffect(() => {
    if (project && project.workflowIds && project.workflowIds.length > 0) {
      setFormData((prev) => ({ ...prev, workflowIds: project.workflowIds[0].toString() }));
    } else if (workflows.length > 0 && !formData.workflowIds) {
      setFormData((prev) => ({ ...prev, workflowIds: workflows[0]._id }));
    }
  }, [project, workflows]);

  const handleInputChange = (field, value) => {
    // console.log(`Updating ${field}:`, value);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // console.log('Form data before submission:', formData);
    if (!formData.title || !formData.description || !formData.workflowIds) {
      alert("Please fill in all required fields, including a workflow.");
      return;
    }
    const selectedWorkflow = workflows.find(w => w._id === formData.workflowIds);
    if (!selectedWorkflow) {
      alert("Selected workflow is invalid. Please choose a valid workflow.");
      return;
    }
    const projectData = {
      title: formData.title,
      description: formData.description,
      workflowIds: [formData.workflowIds],
      status: formData.status,
      hasBookmark: formData.hasBookmark,
      hasLock: formData.hasLock,
    };
    // console.log('Project data being sent:', projectData);
    if (project) {
      updateProject(project._id, projectData);
    } else {
      addProject(projectData);
    }
    onClose();
  };

  // Sort workflows by createdAt (descending) for LIFO; fallback to _id descending
  const sortedWorkflows = [...workflows].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return b._id.localeCompare(a._id);
  });

  // Calculate pagination for workflows
  const indexOfLastWorkflow = currentWorkflowPage * workflowsPerPage;
  const indexOfFirstWorkflow = indexOfLastWorkflow - workflowsPerPage;
  const currentWorkflows = sortedWorkflows.slice(indexOfFirstWorkflow, indexOfLastWorkflow);
  const totalWorkflowPages = Math.ceil(sortedWorkflows.length / workflowsPerPage);

  const handleWorkflowPageChange = (pageNumber) => {
    setCurrentWorkflowPage(pageNumber);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4 sm:mx-6 md:mx-auto max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex-shrink-0 p-6 sm:p-8">
          <button
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold focus:outline-none"
            onClick={onClose}
          >
            ×
          </button>
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            {project ? 'Edit Project' : 'Create New Project'}
          </h2>
        </div>
        <div className="flex-grow overflow-y-auto px-6 sm:px-8">
          <div className="space-y-6 pb-6">
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter project name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter project description"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 resize-y h-24"
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Workflow</label>
              {sortedWorkflows.length > 0 ? (
                <>
                  <div className="flex flex-col gap-3 max-h-64 overflow-y-auto p-3 border border-gray-200 rounded-md bg-gray-50">
                    {currentWorkflows.map((workflow) => (
                      <div
                        key={workflow._id}
                        className={`p-3 border rounded-md cursor-pointer transition-all duration-200 ${
                          formData.workflowIds === workflow._id
                            ? 'bg-blue-100 border-blue-500 shadow-sm'
                            : 'bg-white border-gray-200 hover:bg-gray-100 hover:border-gray-400'
                        }`}
                        onClick={() => handleInputChange('workflowIds', workflow._id)}
                      >
                        <h3 className="text-base font-medium text-gray-800">{workflow.title || "Untitled Workflow"}</h3>
                        {workflow.description && (
                          <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {sortedWorkflows.length > 0 && (
                    <div className="flex justify-center items-center gap-3 mt-4">
                      <button
                        className={`px-4 py-2 text-sm font-medium rounded-md border transition-all duration-300 ${
                          currentWorkflowPage === 1
                            ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                        }`}
                        onClick={() => handleWorkflowPageChange(currentWorkflowPage - 1)}
                        disabled={currentWorkflowPage === 1}
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalWorkflowPages }, (_, index) => (
                        <button
                          key={index + 1}
                          className={`px-4 py-2 text-sm font-medium rounded-md border transition-all duration-300 ${
                            currentWorkflowPage === index + 1
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                          }`}
                          onClick={() => handleWorkflowPageChange(index + 1)}
                        >
                          {index + 1}
                        </button>
                      ))}
                      <button
                        className={`px-4 py-2 text-sm font-medium rounded-md border transition-all duration-300 ${
                          currentWorkflowPage === totalWorkflowPages
                            ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                        }`}
                        onClick={() => handleWorkflowPageChange(currentWorkflowPage + 1)}
                        disabled={currentWorkflowPage === totalWorkflowPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-red-500">No workflows available. Please create a workflow first.</p>
              )}
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hasBookmark}
                    onChange={(e) => handleInputChange('hasBookmark', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Bookmark this project</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hasLock}
                    onChange={(e) => handleInputChange('hasLock', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Mark as private</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 p-6 sm:p-8 pt-0 sm:pt-0">
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={handleSubmit}
            >
              {project ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Member Modal Component
function MemberModal({ member, defaultProjectId, onClose }) {
  const { projects, addMember, updateMember } = useProject();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    status: "Active",
    projectId: defaultProjectId || "",
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        email: member.email,
        role: member.role,
        status: member.status,
        projectId: member.projectId || defaultProjectId || "",
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        projectId: defaultProjectId || "",
      }));
    }
  }, [member, defaultProjectId]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.role || !formData.status || !formData.projectId) {
      alert("Please fill in all required fields, including project selection");
      return;
    }

    const memberData = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      status: formData.status,
      projectId: formData.projectId,
    };

    if (member) {
      updateMember(defaultProjectId, member._id, memberData);
    } else {
      addMember(formData.projectId, memberData);
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{member ? "Edit Team Member" : "Add New Team Member"}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">
          <div className="form-field">
            <label className="form-label">Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter full name"
            />
            {(!/^[A-Za-z]+$/.test(formData.name) || formData.name === "") && (
              <span style={{ color: "red", fontSize: "12px" }}>
                Name must contain only alphabets. Spaces are not allowed.
              </span>
            )}
          </div>
          <div className="form-field">
            <label className="form-label">Email *</label>
            <input
              type="email"
              className="form-input"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter email address"
            />
            {!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.email) &&
              formData.email !== "" && (
                <span style={{ color: "red", fontSize: "12px" }}>Please enter a valid email address</span>
              )}
          </div>
          <div className="form-field">
            <label className="form-label">Assign to Project *</label>
            <select
              className="form-select"
              value={formData.projectId}
              onChange={(e) => handleInputChange("projectId", e.target.value)}
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Role *</label>
            <select
              className="form-select"
              value={formData.role}
              onChange={(e) => handleInputChange("role", e.target.value)}
            >
              <option value="">Select role</option>
              <option value="Owner">Owner</option>
              <option value="Admin">Admin</option> 
              <option value="Viewer">Viewer</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Status *</label>
            <select
              className="form-select"
              value={formData.status}
              onChange={(e) => handleInputChange("status", e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSubmit}>
            {member ? "Update Member" : "Add Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Dashboard Component
function Dashboard({ onNavigate }) {
  const { projects, authError, getWorkflowsByProject } = useProject();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentProjectPage, setCurrentProjectPage] = useState(1);

  useEffect(() => {
    if (authError) {
      setShowAuthModal(true);
    }
  }, [authError]);

  useEffect(() => {
    // Debug: Log projects to verify data
    // console.log('Dashboard projects:', projects);
  }, [projects]);

  // Sort projects by createdAt (descending) for LIFO; fallback to _id descending
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return b._id.localeCompare(a._id);
  });

  // Calculate pagination for projects (2 on first page, 6 on subsequent pages)
  const getProjectsPerPage = (page) => (page === 1 ? 2 : 6);
  const calculateIndices = (page) => {
    let startIndex = 0;
    if (page === 1) {
      return { start: 0, end: 2 };
    }
    // Calculate start index for pages > 1
    startIndex = 2 + (page - 2) * 6;
    return { start: startIndex, end: startIndex + 6 };
  };
  const totalProjectPages = Math.ceil((sortedProjects.length - 2) / 6) + 1;
  const { start: indexOfFirstProject, end: indexOfLastProject } = calculateIndices(currentProjectPage);
  const currentProjects = sortedProjects.slice(indexOfFirstProject, indexOfLastProject);

  const handleProjectPageChange = (pageNumber) => {
    setCurrentProjectPage(pageNumber);
  };

  const getMemberCountForProject = (projectId) => {
    const project = projects.find((p) => p._id === projectId);
    if (!project || !project.members) return 0;
    return project.members.filter((member) => member.status === "Active").length;
  };

  const handleNewProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleProjectCardClick = (project) => {
    onNavigate("project-detail", project._id);
  };

  const statsData = [
    {
      label: "Total Projects",
      value: projects.length.toString(),
      icon: "📁",
      bgColor: "#dbeafe",
      iconBg: "#3b82f6",
    },
    {
      label: "Team Members",
      value: projects
        .flatMap((project) => project.members || [])
        .filter((member) => member.status === "Active").length.toString(),
      icon: "👥",
      bgColor: "#dcfce7",
      iconBg: "#22c55e",
    },
    {
      label: "Active Workflows",
      value: projects.reduce((sum, project) => sum + getWorkflowsByProject(project._id).length, 0).toString(),
      icon: "🔄",
      bgColor: "#f3e8ff",
      iconBg: "#a855f7",
    },
    {
      label: "Starred",
      value: projects.filter((project) => project.hasBookmark).length.toString(),
      icon: "⭐",
      bgColor: "#fed7aa",
      iconBg: "#f97316",
    },
  ];

  return (
    <div className="dashboard">
      <style>
        {`
          .pagination-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 24px 0;
            gap: 12px;
            flex-wrap: wrap;
            padding: 10px;
            background-color: #f9fafb;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }

          .pagination-btn {
            min-width: 48px;
            padding: 12px 18px;
            font-size: 16px;
            font-weight: 500;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background-color: #ffffff;
            color: #1f2937;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .pagination-btn:hover:not(:disabled) {
            background-color: #e5e7eb;
            border-color: #9ca3af;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
          }

          .pagination-btn.active {
            background-color: #2563eb;
            color: #ffffff;
            border-color: #2563eb;
            box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
          }

          .pagination-btn:disabled {
            background-color: #f3f4f6;
            color: #9ca3af;
            cursor: not-allowed;
            border-color: #e5e7eb;
            box-shadow: none;
          }

          .pagination-btn:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
          }
        `}
      </style>
      <div className="container">
        <div className="max-width">
          <nav className="nav-bar">
            <div className="nav-brand">
              <h2>Project Manager</h2>
            </div>
            <div className="nav-links">
              <button className="nav-link active" onClick={() => onNavigate("dashboard")}>
                Dashboard
              </button>
              <button className="nav-link" onClick={() => onNavigate("team-members")}>
                Team Members
              </button>
            </div>
          </nav>

          <div className="header">
            <div className="header-text">
              <h1 className="title">Projects</h1>
              <p className="subtitle">Organize your workflows and collaborate with your team</p>
            </div>

            <button className="new-project-btn" onClick={handleNewProject}>
              <span className="btn-icon">+</span>
              New Project
            </button>
          </div>

          <div className="stats-grid">
            {statsData.map((stat, index) => (
              <div key={index} className="stats-card">
                <div className="stats-content">
                  <div className="stats-icon-wrapper" style={{ backgroundColor: stat.bgColor }}>
                    <div className="stats-icon" style={{ backgroundColor: stat.iconBg }}>
                      <span>{stat.icon}</span>
                    </div>
                  </div>
                  <div className="stats-info">
                    <p className="stats-label">{stat.label}</p>
                    <p className="stats-number">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {projects.length > 0 ? (
            <>
              <div className="projects-grid">
                {currentProjects.map((project) => (
                  <div key={project._id} className="project-card" onClick={() => handleProjectCardClick(project)}>
                    <div className="project-header">
                      <div className="project-icons-left">
                        <div className="project-folder-icon">
                          <MdOutlineFolder style={{ color: "blue" }} />
                        </div>
                        {project.hasBookmark && (
                          <div className="project-bookmark">
                            <FaStar style={{ color: "yellow" }} />
                          </div>
                        )}
                        {project.hasLock && (
                          <div className="project-lock">
                            <IoLockClosedOutline style={{ color: "grey" }} />
                          </div>
                        )}
                      </div>
                      <div className="project-menu-wrapper">
                        <div className="project-menu" onClick={(e) => e.stopPropagation()}>
                          ⋮
                          <div className="project-dropdown">
                            <button onClick={() => handleEditProject(project)}>Edit Project</button>
                            <button onClick={() => handleProjectCardClick(project)} className="view-option">
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="project-content">
                      <h3 className="project-title">{project.title || "Untitled Project"}</h3>
                      <p className="project-description">{project.description || "No description available"}</p>

                      <div className="project-stats">
                        <span className="project-stat">{getWorkflowsByProject(project._id).length} workflows</span>
                        <span className="project-stat">{getMemberCountForProject(project._id)} members</span>
                      </div>

                      <div className="project-footer">
                        <span className={`project-status ${project.status || 'unknown'}`}>
                          {project.status || "Unknown"}
                        </span>
                        <span className="project-time">
                          {project.updatedAt ? new Date(project.updatedAt).toLocaleString() : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {sortedProjects.length > 0 && (
                <div className="pagination-container">
                  <button
                    className="pagination-btn"
                    onClick={() => handleProjectPageChange(currentProjectPage - 1)}
                    disabled={currentProjectPage === 1}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalProjectPages }, (_, index) => (
                    <button
                      key={index + 1}
                      className={`pagination-btn ${currentProjectPage === index + 1 ? 'active' : ''}`}
                      onClick={() => handleProjectPageChange(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    onClick={() => handleProjectPageChange(currentProjectPage + 1)}
                    disabled={currentProjectPage === totalProjectPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-projects">
              <div className="empty-state-large">
                <div className="empty-icon">📁</div>
                <h3>No Projects Yet</h3>
                <p>Create your first project to get started with organizing your workflows and team collaboration.</p>
                <button className="new-project-btn" onClick={handleNewProject}>
                  <span className="btn-icon">+</span>
                  Create Your First Project
                </button>
              </div>
            </div>
          )}

          <div className="quick-actions">
            <div className="quick-action-card">
              <div className="quick-action-content">
                <h3>Team Members</h3>
                <p>Manage your team and project assignments</p>
              </div>
              <button className="quick-action-btn" onClick={() => onNavigate("team-members")}>
                <span className="btn-icon">👥</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isProjectModalOpen && <ProjectModal project={editingProject} onClose={() => setIsProjectModalOpen(false)} />}
      {showAuthModal && (
        <AuthErrorModal
          message={authError}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}

// Team Members Component
function TeamMembers({ onNavigate }) {
  const { projects, deleteMember, authError } = useProject();
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showNoProjectsWarning, setShowNoProjectsWarning] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Number of members per page

  useEffect(() => {
    if (authError) {
      setShowAuthModal(true);
    }
  }, [authError]);

  const allMembers = projects.flatMap((project) =>
    project.members?.map((member) => ({
      ...member,
      projectId: project._id,
      projectName: project.title,
    })) || []
  );

  // Sort members by createdAt (descending) for LIFO; fallback to _id descending
  const sortedMembers = [...allMembers].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return b._id.localeCompare(a._id);
  });

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMembers = sortedMembers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedMembers.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleAddMember = () => {
    if (projects.length === 0) {
      setShowNoProjectsWarning(true);
      return;
    }
    setEditingMember(null);
    setIsMemberModalOpen(true);
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setIsMemberModalOpen(true);
  };

  const handleDeleteMember = (member) => {
    setDeleteConfirm(member);
  };

  const confirmDeleteMember = () => {
    if (deleteConfirm) {
      deleteMember(deleteConfirm.projectId, deleteConfirm._id);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="team-members">
      <style>
        {`
          .pagination-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 24px 0;
            gap: 12px;
            flex-wrap: wrap;
            padding: 10px;
            background-color: #f9fafb;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }

          .pagination-btn {
            min-width: 48px;
            padding: 12px 18px;
            font-size: 16px;
            font-weight: 500;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background-color: #ffffff;
            color: #1f2937;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .pagination-btn:hover:not(:disabled) {
            background-color: #e5e7eb;
            border-color: #9ca3af;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
          }

          .pagination-btn.active {
            background-color: #2563eb;
            color: #ffffff;
            border-color: #2563eb;
            box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
          }

          .pagination-btn:disabled {
            background-color: #f3f4f6;
            color: #9ca3af;
            cursor: not-allowed;
            border-color: #e5e7eb;
            box-shadow: none;
          }

          .pagination-btn:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
          }
        `}
      </style>
      <div className="container">
        <div className="max-width">
          <nav className="nav-bar">
            <div className="nav-brand">
              <h2>Project Manager</h2>
            </div>
            <div className="nav-links">
              <button className="nav-link" onClick={() => onNavigate("dashboard")}>
                Dashboard
              </button>
              <button className="nav-link active" onClick={() => onNavigate("team-members")}>
                Team Members
              </button>
            </div>
          </nav>

          <div className="header">
            <div className="header-text">
              <h1 className="title">Team Members</h1>
              <p className="subtitle">Manage your team members and their project assignments</p>
            </div>
            <button className="add-member-btn" onClick={handleAddMember}>
              <span className="btn-icon">+</span>
              Add Member
            </button>
          </div>

          {allMembers.length > 0 ? (
            <div className="table-card">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Project</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMembers.map((member) => (
                      <tr key={member._id} className="table-row">
                        <td className="font-medium">{member.name}</td>
                        <td className="text-gray">{member.email}</td>
                        <td>
                          <span className="project-assignment">{member.projectName || "Unassigned"}</span>
                        </td>
                        <td>
                          <span className={`chip chip-${member.role}`}>{member.role}</span>
                        </td>
                        <td>
                          <span className={`chip chip-${member.status}`}>{member.status}</span>
                        </td>
                        <td className="text-right">
                          <button className="action-btn edit-btn" onClick={() => handleEditMember(member)}>
                            ✏️
                          </button>
                          <button className="action-btn delete-btn" onClick={() => handleDeleteMember(member)}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {allMembers.length > 0 && (
                <div className="pagination-container">
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={index + 1}
                      className={`pagination-btn ${currentPage === index + 1 ? 'active' : ''}`}
                      onClick={() => handlePageChange(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-members">
              <div className="empty-state-large">
                <div className="empty-icon">👥</div>
                <h3>No Team Members Yet</h3>
                <p>Add your first team member to start collaborating on projects.</p>
                <button className="add-member-btn" onClick={handleAddMember}>
                  <span className="btn-icon">+</span>
                  Add First Member
                </button>
              </div>
            </div>
          )}

          {showNoProjectsWarning && (
            <div className="modal-overlay" onClick={() => setShowNoProjectsWarning(false)}>
              <div className="modal warning-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">No Projects Available</h3>
                  <button className="close-btn" onClick={() => setShowNoProjectsWarning(false)}>
                    ×
                  </button>
                </div>
                <div className="modal-content">
                  <div className="warning-content">
                    <div className="warning-icon">⚠️</div>
                    <p className="warning-text">
                      You need to create at least one project before adding team members. Team members must be assigned to a
                      specific project.
                    </p>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setShowNoProjectsWarning(false)}>
                    Cancel
                  </button>
                  <button
                    className="save-btn"
                    onClick={() => {
                      setShowNoProjectsWarning(false);
                      onNavigate("dashboard");
                    }}
                  >
                    Create Project First
                  </button>
                </div>
              </div>
            </div>
          )}

          {isMemberModalOpen && (
            <MemberModal
              member={editingMember}
              defaultProjectId={editingMember?.projectId || projects[0]?._id}
              onClose={() => setIsMemberModalOpen(false)}
            />
          )}

          {deleteConfirm && (
            <DeleteConfirmModal
              title="Delete Team Member"
              message={`Are you sure you want to delete ${deleteConfirm.name}? This action cannot be undone.`}
              onConfirm={confirmDeleteMember}
              onCancel={() => setDeleteConfirm(null)}
            />
          )}

          {showAuthModal && (
            <AuthErrorModal
              message={authError}
              onClose={() => setShowAuthModal(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Project Detail Component
function ProjectDetail({ projectId, onNavigate }) {
  const { getProjectById, getWorkflowsByProject, deleteProject, addMember, updateMember, deleteMember, authError } = useProject();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (authError) {
      setShowAuthModal(true);
    }
  }, [authError]);

  const project = getProjectById(projectId);
  const projectWorkflows = getWorkflowsByProject(projectId);
  const projectMembers = project?.members || [];

  if (!project) {
    return (
      <div className="project-detail">
        <div className="container">
          <div className="error-state">
            <h2>Project Not Found</h2>
            <button onClick={() => onNavigate("dashboard")}>Back to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const handleEditProject = () => {
    setIsProjectModalOpen(true);
  };

  const handleDeleteProject = () => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      deleteProject(projectId);
      onNavigate("dashboard");
    }
  };

  const handleAddMember = () => {
    setEditingMember(null);
    setIsMemberModalOpen(true);
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setIsMemberModalOpen(true);
  };

  const confirmDeleteMember = () => {
    if (deleteConfirm) {
      deleteMember(projectId, deleteConfirm._id);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="project-detail">
      <div className="container">
        <div className="max-width">
          <nav className="nav-bar">
            <div className="nav-brand">
              <h2>Project Manager</h2>
            </div>
            <div className="nav-links">
              <button className="nav-link" onClick={() => onNavigate("dashboard")}>
                Dashboard
              </button>
              <button className="nav-link" onClick={() => onNavigate("team-members")}>
                Team Members
              </button>
            </div>
          </nav>

          <div className="project-detail-header">
            <div className="project-detail-nav">
              <button className="back-btn" onClick={() => onNavigate("dashboard")}>
                ← Back to Projects
              </button>
              <div className="project-detail-info">
                <div className="project-detail-title">
                  <h1  >{project.title}</h1>
                  <span className="project-folder-icon">
                    <MdOutlineFolder style={{ color: "blue" }} />
                  </span>
                  {project.hasBookmark && (
                    <span className="project-bookmark">
                      <FaStar style={{ color: "yellow" }} />
                    </span>
                  )}
                  {project.hasLock && (
                    <span className="project-lock">
                      <IoLockClosedOutline style={{ color: "grey" }} />
                    </span>
                  )}
                </div>
                <p className="project-detail-description">{project.description}</p>
              </div>
            </div>
            <div className="project-detail-actions">
              <span className={`project-status-badge ${project.status}`}>{project.status}</span>
              <button className="settings-btn" onClick={handleEditProject}>
                ⚙️ Edit Project
              </button>
              <button className="delete-project-btn" onClick={handleDeleteProject}>
                🗑️ Delete
              </button>
            </div>
          </div>

          <div className="project-detail-content">
            <div className="project-section">
              <h2 className="section-title">Workflows ({projectWorkflows.length})</h2>
              <div className="workflows-list">
                {projectWorkflows.length > 0 ? (
                  projectWorkflows.map((workflow) => (
                    <div key={workflow._id} className="workflow-item">
                      <div className="workflow-info">
                        <div className="workflow-icon">🔄</div>
                        <div className="workflow-details">
                          <h3 className="workflow-name">{workflow.title}</h3>
                          <p className="workflow-time">Last run: {workflow.lastRun || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="vb-pipeline-steps">
                        {workflow.steps?.length === 0 || !workflow.steps ? (
                          <p className="vb-no-steps">No steps added yet. Edit to add steps.</p>
                        ) : (
                          workflow.steps.map((step, index) => {
                            const IconComponent = componentConfig[step.name]?.icon || FaGlobe;
                            return (
                              <React.Fragment key={index}>
                                {index > 0 && <div className="vb-arrow">→</div>}
                                <div className="vb-step">
                                  <div className="vb-step-header">
                                    <div className="vb-step-icon">
                                      <IconComponent color={step.color || '#6b7280'} size={40} />
                                    </div>
                                    <span className="vb-ellipsis">
                                      <span>.</span><span>.</span><span>.</span>
                                    </span>
                                  </div>
                                  <h3 className="vb-step-title">{step.name}</h3>
                                  <p className="vb-step-description">{step.description}</p>
                                  <span className="vb-step-status">
                                    {step.status} <span className="vb-ready">• Ready</span>
                                  </span>
                                </div>
                              </React.Fragment>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No workflows assigned to this project yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="project-section">
              <div className="section-header">
                <h2 className="section-title">Team Members ({projectMembers.length})</h2>
                <button className="add-member-btn-small" onClick={handleAddMember}>
                  <span className="btn-icon">+</span>
                  Add Member
                </button>
              </div>
              <div className="members-list">
                {projectMembers.length > 0 ? (
                  projectMembers.map((member) => (
                    <div key={member._id} className="member-item">
                      <div className="member-info">
                        <h3 className="member-name">{member.name}</h3>
                        <p className="member-role">{member.role}</p>
                        <p className="member-email">{member.email}</p>
                      </div>
                      <div className="member-status">
                        <span className={`chip chip-${member.status}`}>{member.status}</span>
                      </div>
                      <div className="member-actions">
                        <button className="action-btn edit-btn" onClick={() => handleEditMember(member)}>
                          ✏️
                        </button>
                        <button className="action-btn delete-btn" onClick={() => setDeleteConfirm(member)}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No team members assigned to this project yet.</p>
                    <button className="add-member-btn" onClick={handleAddMember}>
                      <span className="btn-icon">+</span>
                      Add First Member
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isProjectModalOpen && <ProjectModal project={project} onClose={() => setIsProjectModalOpen(false)} />}
      {isMemberModalOpen && (
        <MemberModal
          member={editingMember}
          defaultProjectId={projectId}
          onClose={() => setIsMemberModalOpen(false)}
        />
      )}
      {deleteConfirm && (
        <DeleteConfirmModal
          title="Delete Team Member"
          message={`Are you sure you want to delete ${deleteConfirm.name}? This action cannot be undone.`}
          onConfirm={confirmDeleteMember}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
      {showAuthModal && (
        <AuthErrorModal
          message={authError}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}

// Main App Component
export default function ProjectManagerApp() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const navigateTo = (page, projectId = null) => {
    setCurrentPage(page);
    setSelectedProjectId(projectId);
  };

  return (
    <ProjectProvider>
      <div className="app">{renderCurrentPage()}</div>
    </ProjectProvider>
  );

  function renderCurrentPage() {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={navigateTo} />;
      case "project-detail":
        return <ProjectDetail projectId={selectedProjectId} onNavigate={navigateTo} />;
      case "team-members":
        return <TeamMembers onNavigate={navigateTo} />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  }
}



