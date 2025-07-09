"use client";

import { useState, useEffect, createContext, useContext } from "react";
import "./teammember.css";
import { FaFolder } from 'react-icons/fa';
import { MdOutlineFolder } from "react-icons/md";
import { FaStar } from "react-icons/fa6";
import { IoLockClosedOutline } from "react-icons/io5";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';


const ProjectContext = createContext(undefined);

function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [workflows, setWorkflows] = useState([]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, workflowsRes] = await Promise.all([
          fetch(`${BASE_URL}/api/projects`),
          fetch(`${BASE_URL}/api/workflows`),
        ]);
        const projectsData = await projectsRes.json();
        const workflowsData = await workflowsRes.json();
        setProjects(projectsData);
        setWorkflows(workflowsData);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  const addProject = async (projectData) => {
    try {
      const res = await fetch(`${BASE_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });
      const newProject = await res.json();
      setProjects((prev) => [...prev, newProject]);
    } catch (err) {
      console.error('Error adding project:', err);
    }
  };

  const updateProject = async (id, projectData) => {
    try {
      const res = await fetch(`${BASE_URL}/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });
      const updatedProject = await res.json();
      setProjects((prev) =>
        prev.map((project) => (project._id === id ? updatedProject : project))
      );
    } catch (err) {
      console.error('Error updating project:', err);
    }
  };

  const deleteProject = async (id) => {
    try {
      await fetch(`${BASE_URL}/api/projects/${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((project) => project._id !== id));
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  // Member functions
  const addMember = async (projectId, memberData) => {
    try {
      const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
      });
      const newMember = await res.json();

      setProjects(prev => prev.map(project =>
        project._id === projectId
          ? { ...project, members: [...project.members, newMember] }
          : project
      ));
    } catch (err) {
      console.error('Error adding member:', err);
    }
  };

  const updateMember = async (projectId, memberId, memberData) => {
    try {
      const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
      });
      const updatedMember = await res.json();

      setProjects(prev => prev.map(project =>
        project._id === projectId
          ? {
            ...project,
            members: project.members.map(member =>
              member._id === memberId ? updatedMember : member
            )
          }
          : project
      ));
    } catch (err) {
      console.error('Error updating member:', err);
    }
  };

  const deleteMember = async (projectId, memberId) => {
    try {
      await fetch(`${BASE_URL}/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE'
      });

      setProjects(prev => prev.map(project =>
        project._id === projectId
          ? {
            ...project,
            members: project.members.filter(member => member._id !== memberId)
          }
          : project
      ));
    } catch (err) {
      console.error('Error deleting member:', err);
    }
  };

  const getProjectById = (id) => {
    return projects.find((project) => project._id === id);
  };

  const getMembersByProject = (projectId) => {
    const project = projects.find(p => p._id === projectId);
    return project ? project.members || [] : [];
  };

  const getWorkflowsByProject = (projectId) => {
    return workflows.filter((workflow) => workflow.projectId === projectId);
  };

  const value = {
    projects,
    workflows,
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
  )
}

// Project Modal Component
function ProjectModal({ project, onClose }) {
  const { addProject, updateProject } = useProject()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    workflows: "",
    status: "active",
    hasBookmark: false,
    hasLock: false,
  })

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title,
        description: project.description,
        workflows: project.workflows.toString(),
        status: project.status,
        hasBookmark: project.hasBookmark,
        hasLock: project.hasLock,
      })
    }
  }, [project])

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }
  const handleSubmit = () => {
    if (!formData.title || !formData.description || !formData.workflows) {
      alert("Please fill in all required fields");
      return;
    }
    // Ensure workflows is a valid number (fallback to 1 if invalid)
    const workflowsNumber = parseInt(formData.workflows, 10) || 1;

    const projectData = {
      title: formData.title,
      description: formData.description,
      workflows: workflowsNumber, // Now guaranteed to be a number
      status: formData.status,
      hasBookmark: formData.hasBookmark,
      hasLock: formData.hasLock,
    };

    if (project) {
      updateProject(project._id, projectData);
    } else {
      addProject(projectData);
    }

    onClose();
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{project ? "Edit Project" : "Create New Project"}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">
          <div className="form-field">
            <label className="form-label">Project Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Enter project name"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Description *</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Enter project description"
              rows={3}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Workflows *</label>
            <input
              type="number"
              className="form-input"
              value={formData.workflows}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow positive numbers (or empty string for UX)
                if (value === "" || /^\d+$/.test(value)) {
                  handleInputChange("workflows", value || "1"); // Fallback to "1" if empty
                }
              }}
              placeholder="Number of workflows"
              min="1"
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={formData.status}
              onChange={(e) => handleInputChange("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Project Options</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.hasBookmark}
                  onChange={(e) => handleInputChange("hasBookmark", e.target.checked)}
                />
                <span className="checkbox-text">⭐ Add to starred</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.hasLock}
                  onChange={(e) => handleInputChange("hasLock", e.target.checked)}
                />
                <span className="checkbox-text">🔒 Private project</span>
              </label>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSubmit}>
            {project ? "Update Project" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Member Modal Component
function MemberModal({ member, defaultProjectId, onClose }) {
  const { projects, addMember, updateMember } = useProject();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    status: "Active",
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        email: member.email,
        role: member.role,
        status: member.status,
      });
    }
  }, [member]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.role || !formData.status) {
      alert("Please fill in all required fields");
      return;
    }

    if (member) {
      updateMember(defaultProjectId, member._id, formData);
      console.log(formData);
      window.location.reload();

    } else {
      addMember(defaultProjectId, formData);
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
            {!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.email) && formData.email !== "" && (
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
                <option key={project.id} value={project.id}>
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
              <option value="Editor">Editor</option>
              <option value="Member">Member</option>
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
  )
}

// Dashboard Component
function Dashboard({ onNavigate }) {
  const { projects } = useProject();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const getMemberCountForProject = (projectId) => {
    const project = projects.find(p => p._id === projectId);
    if (!project || !project.members) return 0;
    return project.members.filter(member => member.status === "Active").length;
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

  // Calculate stats based on the new structure
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
        .flatMap(project => project.members || [])
        .filter(member => member.status === "Active").length.toString(),
      icon: "👥",
      bgColor: "#dcfce7",
      iconBg: "#22c55e",
    },
    {
      label: "Active Workflows",
      value: projects.reduce((sum, project) => sum + project.workflows, 0).toString(),
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
      <div className="container">
        <div className="max-width">
          {/* Navigation */}
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

          {/* Header */}
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

          {/* Stats Cards */}
          <div className="stats-grid">
            {statsData.map((stat, index) => (
              <div key={index} className="stats-card">
                <div className="stats-content">
                  <div className="stats-icon-wrapper" style={{ backgroundColor: stat.bgColor }}>
                    <div className="stats-icon" style={{ backgroundColor: stat.iconBg }} >
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

          {/* Project Cards */}
          {projects.length > 0 ? (
            <div className="projects-grid">
              {projects.map((project) => (
                <div key={project._id} className="project-card" onClick={() => handleProjectCardClick(project)}>
                  <div className="project-header">
                    <div className="project-icons-left">
                      <div className="project-folder-icon">
                        <MdOutlineFolder style={{ color: "blue" }} />
                      </div>
                      {project.hasBookmark && <div className="project-bookmark">
                        <FaStar style={{ color: "yellow" }} />
                      </div>}
                      {project.hasLock && <div className="project-lock">
                        <IoLockClosedOutline style={{
                          color: "grey"
                        }} />
                      </div>}
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
                    <h3 className="project-title">{project.title}</h3>
                    <p className="project-description">{project.description}</p>

                    <div className="project-stats">
                      <span className="project-stat">{project.workflows} workflows</span>
                      <span className="project-stat">{getMemberCountForProject(project._id)} members</span>
                    </div>

                    <div className="project-footer">
                      <span className={`project-status ${project.status}`}>{project.status}</span>
                      <span className="project-time">
                        {new Date(project.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

          {/* Quick Actions */}
          <div className="quick-actions">
            <div className="quick-action-card">
              <div className="quick-action-content">
                <h3>Team Members</h3>
                <p>Manage your team and project assignments</p>
              </div>
              <button className="quick-action-btn" onClick={() => onNavigate("team-members")}>
                <span className="btn-icon">👥</span>
                Manage Team
              </button>
            </div>
          </div>
        </div>
      </div>

      {isProjectModalOpen && (
        <ProjectModal project={editingProject} onClose={() => setIsProjectModalOpen(false)} />
      )}
    </div>
  )
}

// Team Members Component
function TeamMembers({ onNavigate }) {
  const { projects, deleteMember } = useProject();
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showNoProjectsWarning, setShowNoProjectsWarning] = useState(false);

  // Flatten all members from all projects
  const allMembers = projects.flatMap(project =>
    project.members?.map(member => ({
      ...member,
      projectId: project._id,
      projectName: project.title
    })) || []
  );

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
      <div className="container">
        <div className="max-width">
          {/* Navigation */}
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

          {/* Header */}
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

          {/* Members Table */}
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
                    {allMembers.map((member) => (
                      <tr key={member._id} className="table-row">
                        <td className="font-medium">{member.name}</td>
                        <td className="text-gray">{member.email}</td>
                        <td>
                          <span className="project-assignment">
                            {member.projectName || "Unassigned"}
                          </span>
                        </td>
                        <td>
                          <span className={`chip chip-${member.role}`}>
                            {member.role}
                          </span>
                        </td>
                        <td>
                          <span className={`chip chip-${member.status}`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEditMember(member)}
                          >
                            ✏️
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteMember(member)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
        </div>
      </div>

      {/* No Projects Warning Modal */}
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
                  setShowNoProjectsWarning(false)
                  onNavigate("dashboard")
                }}
              >
                Create Project First
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {isMemberModalOpen && (
        <MemberModal
          member={editingMember}
          defaultProjectId={editingMember?.projectId || (projects[0]?._id)}
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
    </div>
  )
}

// Project Detail Component
function ProjectDetail({ projectId, onNavigate }) {
  const {
    getProjectById,
    getWorkflowsByProject,
    deleteProject,
    addMember,
    updateMember,
    deleteMember
  } = useProject();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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
    )
  }

  // const getInitials = (name) => {
  //   return name.map((word) => word.charAt(0)).join("").toUpperCase()
  // }

  const handleEditProject = () => {
    setIsProjectModalOpen(true)
  }

  const handleDeleteProject = () => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      deleteProject(projectId)
      onNavigate("dashboard")
    }
  }

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
          {/* Navigation */}
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

          {/* Project Header */}
          <div className="project-detail-header">
            <div className="project-detail-nav">
              <button className="back-btn" onClick={() => onNavigate("dashboard")}>
                ← Back to Projects
              </button>
              <div className="project-detail-info">
                <div className="project-detail-title">
                  <h1 style={{
                    fontSize: 25,
                    overflowWrap: 'break-word',  // Ensures long words break
                    wordBreak: 'break-word',     // Provides broader support
                    whiteSpace: 'normal',        // Allows wrapping
                    wordWrap: 'break-word',      // Correct fallback for older browsers
                  }}>{project.title} </h1>
                  <span className="project-folder-icon"><MdOutlineFolder style={{ color: "blue" }} /></span>
                  {/* <h1>{project.title}</h1> */}
                  {project.hasBookmark && <span className="project-bookmark"><FaStar style={{ color: "yellow" }} /></span>}
                  {project.hasLock && <span className="project-lock"><IoLockClosedOutline style={{
                    color: "grey"
                  }} /></span>}
                </div>
                <p className="project-detail-description">{project.description}</p>
              </div>
            </div>
            <div className="project-detail-actions">
              <span className={`project-status-badge ${project.status}`}>{project.status}</span>
              <button className="settings-btn" onClick={handleEditProject}>
                ⚙️ Edit Project
              </button>
              {/* <button className="run-project-btn">▶️ Run Project</button> */}
              <button className="delete-project-btn" onClick={handleDeleteProject}>
                🗑️ Delete
              </button>
            </div>
          </div>

          {/* Project Content */}
          <div className="project-detail-content">
            {/* Workflows Section */}
            <div className="project-section">
              <h2 className="section-title">Workflows ({projectWorkflows.length})</h2>
              <div className="workflows-list">
                {projectWorkflows.length > 0 ? (
                  projectWorkflows.map((workflow) => (
                    <div key={workflow.id} className="workflow-item">
                      <div className="workflow-info">
                        <div className="workflow-icon">🔄</div>
                        <div className="workflow-details">
                          <h3 className="workflow-name">{workflow.name}</h3>
                          <p className="workflow-time">Last run: {workflow.lastRun}</p>
                        </div>
                      </div>
                      <span className={`workflow-status ${workflow.status}`}>{workflow.status}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    {/* <p>No workflows assigned to this project yet.</p> */}
                  </div>
                )}
              </div>
            </div>

            {/* Team Members Section */}
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
                    <div key={member.id} className="member-item">
                      {/* <div className="member-avatar">{getInitials(member.name)}</div> */}
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

      {/* Modals */}
      {isProjectModalOpen && <ProjectModal project={project} onClose={() => setIsProjectModalOpen(false)} />}

      {isMemberModalOpen && (
        <MemberModal member={editingMember} defaultProjectId={projectId} onClose={() => setIsMemberModalOpen(false)} />
      )}

      {deleteConfirm && (
        <DeleteConfirmModal
          title="Delete Team Member"
          message={`Are you sure you want to delete ${deleteConfirm.name}? This action cannot be undone.`}
          onConfirm={confirmDeleteMember}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  )
}

// Main App Component
export default function TeamManagement() {
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [selectedProjectId, setSelectedProjectId] = useState(null)

  const navigateTo = (page, projectId = null) => {
    setCurrentPage(page)
    setSelectedProjectId(projectId)
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={navigateTo} />
      case "project-detail":
        return <ProjectDetail projectId={selectedProjectId} onNavigate={navigateTo} />
      case "team-members":
        return <TeamMembers onNavigate={navigateTo} />
      default:
        return <Dashboard onNavigate={navigateTo} />
    }
  }

  return (
    <ProjectProvider>
      <div className="app">{renderCurrentPage()}</div>
    </ProjectProvider>
  )
}