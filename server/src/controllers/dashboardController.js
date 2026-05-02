const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * GET /api/dashboard/stats
 * Returns role-specific dashboard statistics
 */
const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    let stats;

    if (isAdmin) {
      // Admin sees everything
      const [
        totalProjects,
        totalTasks,
        totalMembers,
        tasksByStatus,
        tasksByPriority,
        overdueTasks,
        recentTasks,
        projects,
        tasksByProjectStatus,
      ] = await Promise.all([
        prisma.project.count({ where: { ownerId: userId } }),
        prisma.task.count({
          where: { project: { ownerId: userId } },
        }),
        prisma.teamMember.count({ where: { adminId: userId } }),
        prisma.task.groupBy({
          by: ['status'],
          _count: { status: true },
          where: { project: { ownerId: userId } },
        }),
        prisma.task.groupBy({
          by: ['priority'],
          _count: { priority: true },
          where: { project: { ownerId: userId } },
        }),
        prisma.task.findMany({
          where: {
            project: { ownerId: userId },
            dueDate: { lt: new Date() },
            status: { not: 'DONE' },
          },
          include: {
            assignee: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: 'asc' },
          take: 10,
        }),
        prisma.task.findMany({
          where: { project: { ownerId: userId } },
          include: {
            assignee: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.project.findMany({
          where: { ownerId: userId },
          select: { id: true, name: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.task.groupBy({
          by: ['projectId', 'status'],
          _count: { status: true },
          where: { project: { ownerId: userId } },
        }),
      ]);

      // Format status counts
      const statusCounts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
      tasksByStatus.forEach((s) => {
        statusCounts[s.status] = s._count.status;
      });

      // Format priority counts
      const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
      tasksByPriority.forEach((p) => {
        priorityCounts[p.priority] = p._count.priority;
      });

      const completedCount = statusCounts.DONE;
      const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

      const progressMap = new Map();
      projects.forEach((project) => {
        progressMap.set(project.id, {
          projectId: project.id,
          projectName: project.name,
          createdAt: project.createdAt,
          totalTasks: 0,
          completedTasks: 0,
        });
      });

      tasksByProjectStatus.forEach((entry) => {
        const target = progressMap.get(entry.projectId);
        if (!target) return;
        target.totalTasks += entry._count.status;
        if (entry.status === 'DONE') {
          target.completedTasks += entry._count.status;
        }
      });

      const projectProgress = Array.from(progressMap.values())
        .map((item) => ({
          ...item,
          completionRate: item.totalTasks > 0
            ? Math.round((item.completedTasks / item.totalTasks) * 100)
            : 0,
        }))
        .sort((a, b) => {
          if (b.completionRate !== a.completionRate) {
            return b.completionRate - a.completionRate;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

      stats = {
        totalProjects,
        totalTasks,
        totalMembers,
        completedTasks: completedCount,
        completionRate,
        overdueTasks: overdueTasks.length,
        statusCounts,
        priorityCounts,
        overdueTasksList: overdueTasks,
        recentTasks,
        projectProgress,
      };
    } else {
      // Member sees only their data
      const [
        myProjects,
        myTasks,
        myTasksByStatus,
        myOverdueTasks,
        myRecentTasks,
      ] = await Promise.all([
        prisma.project.count({
          where: { members: { some: { userId } } },
        }),
        prisma.task.count({ where: { assignedTo: userId } }),
        prisma.task.groupBy({
          by: ['status'],
          _count: { status: true },
          where: { assignedTo: userId },
        }),
        prisma.task.findMany({
          where: {
            assignedTo: userId,
            dueDate: { lt: new Date() },
            status: { not: 'DONE' },
          },
          include: {
            project: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: 'asc' },
          take: 10,
        }),
        prisma.task.findMany({
          where: { assignedTo: userId },
          include: {
            project: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      const statusCounts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
      myTasksByStatus.forEach((s) => {
        statusCounts[s.status] = s._count.status;
      });

      const completedCount = statusCounts.DONE;
      const completionRate = myTasks > 0 ? Math.round((completedCount / myTasks) * 100) : 0;

      stats = {
        totalProjects: myProjects,
        totalTasks: myTasks,
        completedTasks: completedCount,
        completionRate,
        overdueTasks: myOverdueTasks.length,
        statusCounts,
        overdueTasksList: myOverdueTasks,
        recentTasks: myRecentTasks,
      };
    }

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
