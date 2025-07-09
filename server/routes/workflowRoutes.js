const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Workflow = require('../models/workflowSchema');
const User = require('../models/User');

const dotenv = require('dotenv');

dotenv.config();
const router = express.Router();

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Default workflow
const defaultWorkflow = {
  id: 'default',
  title: 'Lead Enrichment Pipeline',
  steps: [
    {
      name: 'Web Scraping',
      description: 'Extract data from websites',
      status: 'Extract',
      icon: 'FaGlobe',
      color: '#4CAF50',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Data Enrichment',
      description: 'Enhance with contact info',
      status: 'Enrich',
      icon: 'FaDatabase',
      color: '#2196F3',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Export & Sync',
      description: 'Send to CRM or export',
      status: 'Push',
      icon: 'FaShareSquare',
      color: '#E91E63',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  status: 'Ready',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// GET all workflows for the authenticated user
router.get('/user', authMiddleware, async (req, res) => {
  try {
    let workflows;
    if (req.userRole === 'Admin') {
      workflows = await Workflow.find().lean();
    } else {
      workflows = await Workflow.find({ userId: req.userId }).lean();
    }
    res.json(workflows);
  } catch (error) {
    console.error('Error in /workflows/user:', error);
    res.status(500).json({ error: 'Failed to fetch workflows', details: error.message });
  }
});

// GET all workflows (admin only, for debugging)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
    const workflows = await Workflow.find().lean();
    res.json(workflows);
  } catch (error) {
    console.error('Error in /workflows/all:', error);
    res.status(500).json({ error: 'Failed to fetch workflows', details: error.message });
  }
});

// GET workflow by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const workflow = await Workflow.findOne({
      id: req.params.id,
      ...(req.userRole !== 'Admin' && { userId: req.userId }),
    }).lean();
    if (!workflow) return res.status(404).json({ error: 'Workflow not found or unauthorized' });
    res.json(workflow);
  } catch (error) {
    console.error('Error in /workflows/:id:', error);
    res.status(500).json({ error: 'Failed to fetch workflow', details: error.message });
  }
});

// POST new workflow
router.post('/all', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const workflowData = {
      ...req.body,
      id: req.body.id || `workflow-${Date.now()}`,
      userId: req.userId,
      steps: (req.body.steps || []).map(step => ({
        ...step,
        createdAt: step.createdAt || now,
        updatedAt: step.updatedAt || now,
      })),
      createdAt: now,
      updatedAt: now,
    };

    const workflow = await Workflow.create(workflowData);

    // Update user's workflows array
    await User.findByIdAndUpdate(
      req.userId,
      { $push: { workflows: workflow._id } },
      { new: true }
    );

    res.status(201).json(workflow);
  } catch (error) {
    console.error('Error in POST /workflows/all:', error);
    res.status(500).json({ error: 'Failed to create workflow', details: error.message });
  }
});

// PUT update workflow
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const workflowData = {
      ...req.body,
      userId: req.userId,
      steps: (req.body.steps || []).map(step => ({
        ...step,
        createdAt: step.createdAt || now,
        updatedAt: now,
      })),
      updatedAt: now,
    };

    if (!workflowData.id || workflowData.id !== req.params.id) {
      return res.status(400).json({ error: 'Invalid or mismatched workflow ID' });
    }

    const workflow = await Workflow.findOneAndUpdate(
      { id: req.params.id, ...(req.userRole !== 'Admin' && { userId: req.userId }) },
      { $set: workflowData },
      { new: true }
    );

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found or unauthorized' });
    }

    res.json(workflow);
  } catch (error) {
    console.error('Error in PUT /workflows/:id:', error);
    res.status(500).json({ error: 'Failed to update workflow', details: error.message });
  }
});

// DELETE workflow
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.params.id === 'default') {
      return res.status(403).json({ error: 'Cannot delete default workflow' });
    }

    const workflow = await Workflow.findOneAndDelete({
      id: req.params.id,
      ...(req.userRole !== 'Admin' && { userId: req.userId }),
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found or unauthorized' });
    }

    // Remove workflow from user's workflows array
    await User.findByIdAndUpdate(
      req.userId,
      { $pull: { workflows: workflow._id } },
      { new: true }
    );

    res.status(204).send();
  } catch (error) {
    console.error('Error in DELETE /workflows/:id:', error);
    res.status(500).json({ error: 'Failed to delete workflow', details: error.message });
  }
});

// Initialize default workflow (optional, only for admin during setup)
router.post('/init-default', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
    const existingDefault = await Workflow.findOne({ id: 'default' });
    if (!existingDefault) {
      const defaultWithUser = { ...defaultWorkflow, userId: req.userId };
      const workflow = await Workflow.create(defaultWithUser);
      await User.findByIdAndUpdate(
        req.userId,
        { $push: { workflows: workflow._id } },
        { new: true }
      );
      res.status(201).json({ message: 'Default workflow inserted', workflow });
    } else {
      res.status(200).json({ message: 'Default workflow already exists' });
    }
  } catch (error) {
    console.error('Error in /init-default:', error);
    res.status(500).json({ error: 'Failed to initialize default workflow', details: error.message });
  }
});

module.exports = router;