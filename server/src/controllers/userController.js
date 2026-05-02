const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { formatUser } = require('../utils/helpers');
const { sendMemberInviteEmail, sendTeamMemberRemovedEmail } = require('../utils/email');

const prisma = new PrismaClient();

/**
 * GET /api/users
 * List all users (Admin only, for member selection)
 */
const getUsers = async (req, res, next) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const teamMembers = await prisma.teamMember.findMany({
      where: { adminId: req.user.id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const users = [admin, ...teamMembers.map((link) => link.member)].filter(Boolean);

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users
 * Admin creates a member account (Admin-Invite flow)
 */
const createMember = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (existingUser.role === 'ADMIN') {
        return res.status(409).json({
          success: false,
          message: 'An admin account already exists with this email.',
        });
      }

      const existingLink = await prisma.teamMember.findUnique({
        where: {
          adminId_memberId: { adminId: req.user.id, memberId: existingUser.id },
        },
      });

      if (existingLink) {
        return res.status(409).json({
          success: false,
          message: 'This member is already in your team.',
        });
      }

      const hasProjectLink = await prisma.projectMember.findFirst({
        where: {
          userId: existingUser.id,
          project: { ownerId: req.user.id },
        },
        select: { projectId: true },
      });

      if (!password) {
        if (!hasProjectLink) {
          return res.status(400).json({
            success: false,
            message: 'Password is required to onboard an existing member from another admin.',
          });
        }

        await prisma.teamMember.create({
          data: { adminId: req.user.id, memberId: existingUser.id },
        });

        try {
          await sendMemberInviteEmail({
            name: existingUser.name,
            email: existingUser.email,
            password: null,
            adminName: req.user.name,
            userId: existingUser.id,
          });
        } catch (emailError) {
          console.warn('Member invite email failed:', emailError.message);
        }

        return res.status(201).json({
          success: true,
          message: 'Member added to your team.',
          data: { user: formatUser(existingUser) },
        });
      }

      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword },
      });

      await prisma.teamMember.create({
        data: { adminId: req.user.id, memberId: existingUser.id },
      });

      try {
        await sendMemberInviteEmail({
          name: existingUser.name,
          email: existingUser.email,
          password,
          adminName: req.user.name,
          userId: existingUser.id,
        });
      } catch (emailError) {
        console.warn('Member invite email failed:', emailError.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Member onboarded and added to your team.',
        data: { user: formatUser(existingUser) },
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password is required for new members and must be at least 6 characters.',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create member
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'MEMBER',
      },
    });

    await prisma.teamMember.create({
      data: { adminId: req.user.id, memberId: user.id },
    });

    // Send invite email with credentials (non-blocking)
    try {
      await sendMemberInviteEmail({
        name: user.name,
        email: user.email,
        password,
        adminName: req.user.name,
        userId: user.id,
      });
    } catch (emailError) {
      console.warn('Member invite email failed:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Member account created successfully.',
      data: { user: formatUser(user) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id
 * Remove a member from the admin's team
 */
const removeMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove your own admin account.',
      });
    }

    const member = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!member || member.role !== 'MEMBER') {
      return res.status(404).json({
        success: false,
        message: 'Member not found.',
      });
    }

    const link = await prisma.teamMember.findUnique({
      where: { adminId_memberId: { adminId: req.user.id, memberId: id } },
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'This member is not part of your team.',
      });
    }

    await prisma.projectMember.deleteMany({
      where: {
        userId: id,
        project: { ownerId: req.user.id },
      },
    });

    await prisma.teamMember.delete({
      where: { adminId_memberId: { adminId: req.user.id, memberId: id } },
    });

    try {
      await sendTeamMemberRemovedEmail({
        name: member.name,
        email: member.email,
        adminName: req.user.name,
      });
    } catch (emailError) {
      console.warn('Team removal email failed:', emailError.message);
    }

    res.json({
      success: true,
      message: 'Member removed from your team.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, createMember, removeMember };
