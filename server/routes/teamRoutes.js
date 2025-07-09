const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');

const router = express.Router();

// JWT Authentication Middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.userId = decoded.id; // Extract userId from token
    req.userRole = decoded.role; // Extract role from token
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all projects for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    let projects;
    if (req.userRole === 'Admin') {
      projects = await Project.find(); // Admins can see all projects
    } else {
      projects = await Project.find({ user: userId }); // Non-admins see only their projects
    }
    res.json(projects);
  } catch (err) {
    console.error('Error in /projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
  }
});

// Add a new project
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { title, description, workflowIds, status, hasBookmark, hasLock } = req.body;
    const userId = req.userId;
    console.log('Request body:', req.body);

    // Validate required fields
    if (!title || !description || !workflowIds || !Array.isArray(workflowIds)) {
      return res.status(400).json({ error: 'Missing required fields: title, description, and workflows are required' });
    }

    // Validate workflowIds
    for (const id of workflowIds) {
      const workflow = await mongoose.model('Workflow').findById(id);
      if (!workflow) {
        return res.status(400).json({ error: `Invalid workflow ID: ${id}` });
      }
    }

    // Validate status
    if (!['active', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "active" or "paused"' });
    }

    // Validate boolean fields
    if (typeof hasBookmark !== 'boolean' || typeof hasLock !== 'boolean') {
      return res.status(400).json({ error: 'hasBookmark and hasLock must be booleans' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const project = new Project({
      title,
      description,
      workflows: workflowIds.length, // Set workflows to the count of workflowIds
      // workflows: Number(workflows),
      workflowIds,
      status,
      hasBookmark,
      hasLock,
      user: userId,
    });

    await project.save();
    console.log('Project saved successfully');

    user.projects.push(project._id);
    await user.save();
    console.log('User updated successfully');

    res.json(project);
  } catch (err) {
    console.error('Error in /projects/add:', err);
    res.status(500).json({ error: 'Failed to create project', details: err.message });
  }
});

// Update a project
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { title, description, workflowIds, status, hasBookmark, hasLock } = req.body;

    // Validate project exists and belongs to the user (or user is admin)
    const project = await Project.findOne({ _id: id, user: req.userRole === 'Admin' ? { $exists: true } : userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    // Validate workflowIds
    if (workflowIds && !Array.isArray(workflowIds)) {
      return res.status(400).json({ error: 'workflowIds must be an array' });
    }
    if (workflowIds) {
      for (const id of workflowIds) {
        const workflow = await mongoose.model('Workflow').findById(id);
        if (!workflow) {
          return res.status(400).json({ error: `Invalid workflow ID: ${id}` });
        }
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      {
        title,
        description,
        workflows: workflowIds ? workflowIds.length : project.workflows,
        workflowIds,
        status,
        hasBookmark,
        hasLock,
        updatedAt: new Date(),
      },
      { new: true }
    );
    res.json(updatedProject);
  } catch (err) {
    console.error('Error in /projects/:id:', err);
    res.status(500).json({ error: 'Failed to update project', details: err.message });
  }
});

// Delete a project
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Validate project exists and belongs to the user (or user is admin)
    const project = await Project.findOne({ _id: id, user: req.userRole === 'Admin' ? { $exists: true } : userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    await User.findByIdAndUpdate(project.user, {
      $pull: { projects: project._id },
    });

    await project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('Error in /projects/:id:', err);
    res.status(500).json({ error: 'Failed to delete project', details: err.message });
  }
});

// Get all projects for the authenticated user (replaces /user/:userId)
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const projects = await Project.find({ user: userId });
    res.json(projects);
  } catch (err) {
    console.error('Error in /projects/user:', err);
    res.status(500).json({ error: 'Failed to fetch user projects', details: err.message });
  }
});

// Get all members for the authenticated user's projects
router.get('/members', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    let projects;
    if (req.userRole === 'Admin') {
      projects = await Project.find(); // Admins see all projects
    } else {
      projects = await Project.find({ user: userId }); // Non-admins see only their projects
    }
    const members = projects.flatMap(project => project.members || []);
    res.json(members);
  } catch (err) {
    console.error('Error in /projects/members:', err);
    res.status(500).json({ error: 'Failed to fetch members', details: err.message });
  }
});

// Add a member to a project
router.post('/:projectId/members', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    // Validate project exists and belongs to the user (or user is admin)
    const project = await Project.findOne({ _id: projectId, user: req.userRole === 'Admin' ? { $exists: true } : userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    const newMember = {
      ...req.body,
      createdAt: new Date(),
    };

    project.members.push(newMember);
    await project.save();

    res.json(newMember);
  } catch (err) {
    console.error('Error in /projects/:projectId/members:', err);
    res.status(500).json({ error: 'Failed to add member', details: err.message });
  }
});

// Update a member in a project
router.put('/:projectId/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const userId = req.userId;
    const { name, email, role, status, projectId: newProjectId } = req.body;

    // Validate original project exists and belongs to the user (or user is admin)
    const project = await Project.findOne({ _id: projectId, user: req.userRole === 'Admin' ? { $exists: true } : userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    // Remove member from the original project
    project.members = project.members.filter(
      (member) => member._id.toString() !== memberId
    );
    await project.save();

    // Add member to the target project
    const targetProject = await Project.findById(newProjectId);
    if (!targetProject) {
      return res.status(404).json({ error: 'Target project not found' });
    }

    const newMember = {
      name,
      email,
      role,
      status,
      createdAt: new Date(),
    };
    targetProject.members.push(newMember);
    await targetProject.save();

    res.json(newMember); // Return only the new member
  } catch (err) {
    console.error('Error in /projects/:projectId/members/:memberId:', err);
    res.status(500).json({ error: 'Failed to update member', details: err.message });
  }
});

// Delete a member from a project
router.delete('/:projectId/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const userId = req.userId;

    // Validate project exists and belongs to the user (or user is admin)
    const project = await Project.findOne({ _id: projectId, user: req.userRole === 'Admin' ? { $exists: true } : userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    project.members = project.members.filter(
      (m) => m._id.toString() !== memberId
    );

    await project.save();
    res.json({ message: 'Member deleted' });
  } catch (err) {
    console.error('Error in /projects/:projectId/members/:memberId:', err);
    res.status(500).json({ error: 'Failed to delete member', details: err.message });
  }
});

module.exports = router;