const { PrismaClient } = require('@prisma/client');
const { sendProjectMemberAddedEmail, sendProjectMemberRemovedEmail } = require('../utils/email');

const prisma = new PrismaClient();

/**
 * POST /api/projects
 * Create a new project (Admin only)
 */
const createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        ownerId: req.user.id,
        // Auto-add creator as project member
        members: {
          create: {
            userId: req.user.id,
          },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: { select: { members: true, tasks: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/projects
 * Get all projects where the current user is a member
 */
const getProjects = async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: { userId: req.user.id },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: { select: { members: true, tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { projects },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/projects/:id
 * Get a single project (user must be a member)
 */
const getProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
            creator: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { members: true, tasks: true } },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    // Check membership (admins must also be members)
    const isMember = project.members.some((m) => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this project.',
      });
    }

    res.json({
      success: true,
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/projects/:id
 * Update project (Admin + owner only)
 */
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Check ownership
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    if (project.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the project owner can update this project.',
      });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: { select: { members: true, tasks: true } },
      },
    });

    res.json({
      success: true,
      message: 'Project updated successfully.',
      data: { project: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/projects/:id
 * Delete project (Admin + owner only, cascades tasks)
 */
const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    if (project.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the project owner can delete this project.',
      });
    }

    await prisma.project.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Project deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/projects/:id/members
 * Add a member to the project (Admin only)
 */
const addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Check project exists
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    if (project.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the project owner can manage members.',
      });
    }

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.role !== 'MEMBER') {
      return res.status(400).json({
        success: false,
        message: 'Only members can be added to projects.',
      });
    }

    const teamLink = await prisma.teamMember.findUnique({
      where: {
        adminId_memberId: { adminId: req.user.id, memberId: userId },
      },
    });

    if (!teamLink) {
      return res.status(403).json({
        success: false,
        message: 'This member is not part of your team.',
      });
    }

    // Check if already a member
    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: id, userId },
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'User is already a member of this project.',
      });
    }

    await prisma.projectMember.create({
      data: { projectId: id, userId },
    });

    try {
      await sendProjectMemberAddedEmail({
        name: user.name,
        email: user.email,
        projectName: project.name,
        adminName: req.user.name,
      });
    } catch (emailError) {
      console.warn('Project member email failed:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: `${user.name} added to project.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/projects/:id/members/:userId
 * Remove a member from the project (Admin only)
 */
const removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    if (project.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the project owner can manage members.',
      });
    }

    // Cannot remove the project owner
    if (project.ownerId === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the project owner.',
      });
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: { projectId: id, userId },
      },
    });

    const member = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, role: true },
    });

    if (member && member.role === 'MEMBER') {
      try {
        await sendProjectMemberRemovedEmail({
          name: member.name,
          email: member.email,
          projectName: project.name,
          adminName: req.user.name,
        });
      } catch (emailError) {
        console.warn('Project removal email failed:', emailError.message);
      }
    }

    res.json({
      success: true,
      message: 'Member removed from project.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
