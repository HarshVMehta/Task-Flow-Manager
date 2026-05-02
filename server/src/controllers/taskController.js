const { PrismaClient } = require('@prisma/client');
const { sendTaskAssignedEmail } = require('../utils/email');

const prisma = new PrismaClient();

const parseLocalDate = (value) => {
  if (typeof value === 'string' && value.length === 10) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
};

const isPastDueDate = (value) => {
  if (!value) return false;
  const due = parseLocalDate(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
};

/**
 * POST /api/projects/:projectId/tasks
 * Create a task in a project (Admin only)
 */
const createTask = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, priority, dueDate, assignedTo } = req.body;

    if (isPastDueDate(dueDate)) {
      return res.status(400).json({
        success: false,
        message: 'Due date cannot be in the past.',
      });
    }

    // Check project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    if (project.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this project.',
      });
    }

    // If assigning to someone, verify they are a project member
    if (assignedTo) {
      const isMember = project.members.some((m) => m.userId === assignedTo);
      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user must be a member of this project.',
        });
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? parseLocalDate(dueDate) : null,
        projectId,
        assignedTo: assignedTo || null,
        createdBy: req.user.id,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true },
        },
        project: {
          select: { id: true, name: true, ownerId: true },
        },
      },
    });

    if (task.assignedTo && task.assignee) {
      try {
        await sendTaskAssignedEmail({
          name: task.assignee.name,
          email: task.assignee.email,
          taskTitle: task.title,
          projectName: task.project.name,
          dueDate: task.dueDate,
          priority: task.priority,
          adminName: req.user.name,
        });
      } catch (emailError) {
        console.warn('Task assignment email failed:', emailError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/projects/:projectId/tasks
 * Get all tasks for a project (must be member)
 * Supports filters: ?status=TODO&priority=HIGH&assignedTo=userId
 */
const getProjectTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assignedTo } = req.query;

    // Check membership
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: req.user.id },
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this project.',
      });
    }

    // Build filter
    const where = { projectId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = assignedTo;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks/my
 * Get all tasks assigned to the current user (across all projects)
 */
const getMyTasks = async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assignedTo: req.user.id },
      include: {
        project: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks/:id
 * Get a single task
 */
const getTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true },
        },
        project: {
          select: { id: true, name: true, ownerId: true },
        },
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    if (req.user.role === 'ADMIN') {
      if (task.project.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not own this project.',
        });
      }
    } else {
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: task.projectId, userId: req.user.id },
        },
      });

      if (!membership && task.assignedTo !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not a member of this project.',
        });
      }
    }

    res.json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/tasks/:id
 * Update task — Admin can update all fields, Member can only update status of their own tasks
 */
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, assignedTo } = req.body;

    if (dueDate && isPastDueDate(dueDate)) {
      return res.status(400).json({
        success: false,
        message: 'Due date cannot be in the past.',
      });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: { include: { members: true } } },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    // RBAC: Members can only update status on their own tasks
    if (req.user.role === 'MEMBER') {
      if (task.assignedTo !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update tasks assigned to you.',
        });
      }

      // Members can only change status
      if (title || description || priority || dueDate || assignedTo) {
        return res.status(403).json({
          success: false,
          message: 'Members can only update the status of their tasks.',
        });
      }
    }

    // If reassigning, verify new assignee is a project member
    if (assignedTo) {
      const isMember = task.project.members.some((m) => m.userId === assignedTo);
      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user must be a member of this project.',
        });
      }
    }

    const normalizedAssignedTo = assignedTo === '' ? null : assignedTo;
    const assignmentChanged = assignedTo !== undefined && normalizedAssignedTo !== task.assignedTo;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? parseLocalDate(dueDate) : null;
    if (assignedTo !== undefined) updateData.assignedTo = normalizedAssignedTo || null;

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (assignmentChanged && updated.assignee) {
      try {
        await sendTaskAssignedEmail({
          name: updated.assignee.name,
          email: updated.assignee.email,
          taskTitle: updated.title,
          projectName: updated.project.name,
          dueDate: updated.dueDate,
          priority: updated.priority,
          adminName: req.user.name,
        });
      } catch (emailError) {
        console.warn('Task assignment email failed:', emailError.message);
      }
    }

    const wasAssigned = task.assignedTo && (!assignedTo || assignedTo !== task.assignedTo);
    const isNewlyAssigned = assignedTo && assignedTo !== task.assignedTo;
    
    if (isNewlyAssigned && updated.assignee) {
      try {
        await sendTaskAssignedEmail({
          name: updated.assignee.name,
          email: updated.assignee.email,
          taskTitle: updated.title,
          projectName: updated.project.name,
          dueDate: updated.dueDate,
          priority: updated.priority,
        });
      } catch (emailError) {
        console.warn('Task assignment email failed:', emailError.message);
      }
    }

    res.json({
      success: true,
      message: 'Task updated successfully.',
      data: { task: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/tasks/:id
 * Delete a task (Admin only)
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: { select: { ownerId: true } } },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.',
      });
    }

    if (task.project?.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this project.',
      });
    }

    await prisma.task.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Task deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getProjectTasks,
  getMyTasks,
  getTask,
  updateTask,
  deleteTask,
};
