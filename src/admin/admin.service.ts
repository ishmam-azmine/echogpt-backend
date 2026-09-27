import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import type { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import type { AdminUpdateSubscriptionDto } from './dto/admin-update-subscription.dto.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [
      totalUsers,
      activeUsers,
      premiumUsers,
      totalProviders,
      enabledProviders,
      totalConversations,
      totalSearches,
      totalApiRequests,
      failedApiRequests,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { isActive: true },
      }),
      this.prisma.subscription.count({
        where: {
          plan: 'PREMIUM',
          status: 'ACTIVE',
        },
      }),
      this.prisma.aiProvider.count(),
      this.prisma.aiProvider.count({
        where: { isEnabled: true },
      }),
      this.prisma.conversation.count(),
      this.prisma.webSearch.count(),
      this.prisma.apiUsageLog.count(),
      this.prisma.apiUsageLog.count({
        where: { status: 'FAILED' },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        premium: premiumUsers,
      },
      providers: {
        total: totalProviders,
        enabled: enabledProviders,
        disabled: totalProviders - enabledProviders,
      },
      activity: {
        conversations: totalConversations,
        webSearches: totalSearches,
        apiRequests: totalApiRequests,
        failedApiRequests,
      },
    };
  }

  async users() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        subscription: {
          select: {
            plan: true,
            status: true,
            requestLimit: true,
            requestsUsed: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
          },
        },
      },
    });
  }

  async user(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        role: true,
        subscription: true,
        _count: {
          select: {
            conversations: true,
            webSearches: true,
            usageLogs: true,
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateRole(
    targetUserId: string,
    dto: UpdateUserRoleDto,
  ) {
    await this.requireUser(targetUserId);

    const role = await this.prisma.role.findUnique({
      where: {
        name: dto.role,
      },
    });

    if (!role) {
      throw new NotFoundException(
        `Role ${dto.role} is not configured`,
      );
    }

    const user = await this.prisma.user.update({
      where: {
        id: targetUserId,
      },
      data: {
        roleId: role.id,
      },
      include: {
        role: true,
      },
    });

    await this.revokeUserSessions(targetUserId);

    return {
      message: 'User role updated successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
      },
    };
  }

  async updateStatus(
    adminUserId: string,
    targetUserId: string,
    dto: UpdateUserStatusDto,
  ) {
    if (adminUserId === targetUserId && dto.isActive === false) {
      throw new BadRequestException(
        'You cannot deactivate your own admin account',
      );
    }

    await this.requireUser(targetUserId);

    const user = await this.prisma.user.update({
      where: {
        id: targetUserId,
      },
      data: {
        isActive: dto.isActive,
      },
      include: {
        role: true,
      },
    });

    if (!dto.isActive) {
      await this.revokeUserSessions(targetUserId);
    }

    return {
      message: dto.isActive
        ? 'User activated successfully'
        : 'User deactivated successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        isActive: user.isActive,
      },
    };
  }

  async updateSubscription(
    userId: string,
    dto: AdminUpdateSubscriptionDto,
  ) {
    await this.requireUser(userId);

    const requestLimit =
      dto.plan === 'PREMIUM' ? 1000 : 100;

    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(
      currentPeriodEnd.getMonth() + 1,
    );

    const subscription =
      await this.prisma.subscription.upsert({
        where: {
          userId,
        },
        create: {
          userId,
          plan: dto.plan,
          status: 'ACTIVE',
          requestLimit,
          requestsUsed: 0,
          currentPeriodEnd,
        },
        update: {
          plan: dto.plan,
          status: 'ACTIVE',
          requestLimit,
          requestsUsed: 0,
          currentPeriodStart: new Date(),
          currentPeriodEnd,
        },
      });

    return {
      message: 'User subscription updated successfully',
      subscription,
    };
  }

  async usageAnalytics() {
    const [
      total,
      successful,
      failed,
      tokenTotals,
      providerGroups,
    ] = await Promise.all([
      this.prisma.apiUsageLog.count(),

      this.prisma.apiUsageLog.count({
        where: { status: 'SUCCESS' },
      }),

      this.prisma.apiUsageLog.count({
        where: { status: 'FAILED' },
      }),

      this.prisma.apiUsageLog.aggregate({
        _sum: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
        },
        _avg: {
          responseTimeMs: true,
        },
      }),

      this.prisma.apiUsageLog.groupBy({
        by: ['providerId'],
        _count: {
          _all: true,
        },
        _sum: {
          totalTokens: true,
        },
      }),
    ]);

    const providers =
      await this.prisma.aiProvider.findMany({
        select: {
          id: true,
          name: true,
          type: true,
        },
      });

    return {
      requests: {
        total,
        successful,
        failed,
      },
      tokens: {
        prompt: tokenTotals._sum.promptTokens ?? 0,
        completion:
          tokenTotals._sum.completionTokens ?? 0,
        total: tokenTotals._sum.totalTokens ?? 0,
      },
      averageResponseTimeMs:
        tokenTotals._avg.responseTimeMs ?? 0,
      providers: providerGroups.map((group) => {
        const provider = providers.find(
          (item) => item.id === group.providerId,
        );

        return {
          providerId: group.providerId,
          providerName:
            provider?.name ??
            (group.providerId ? 'Deleted provider' : 'N/A'),
          providerType: provider?.type ?? null,
          requests: group._count._all,
          totalTokens: group._sum.totalTokens ?? 0,
        };
      }),
    };
  }

  async apiUsageLogs() {
    return this.prisma.apiUsageLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  async requestLogs() {
    return this.prisma.requestLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async systemHealth() {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      const providerStats =
        await this.prisma.aiProvider.groupBy({
          by: ['isEnabled'],
          _count: {
            _all: true,
          },
        });

      const memory = process.memoryUsage();

      return {
        status: 'healthy',
        database: {
          status: 'connected',
          responseTimeMs: Date.now() - startedAt,
        },
        application: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          environment:
            process.env.NODE_ENV ?? 'development',
          memory: {
            rssMb: Math.round(
              memory.rss / 1024 / 1024,
            ),
            heapUsedMb: Math.round(
              memory.heapUsed / 1024 / 1024,
            ),
          },
        },
        providers: {
          enabled:
            providerStats.find(
              (item) => item.isEnabled,
            )?._count._all ?? 0,
          disabled:
            providerStats.find(
              (item) => !item.isEnabled,
            )?._count._all ?? 0,
        },
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'unhealthy',
        database: {
          status: 'disconnected',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private async requireUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async revokeUserSessions(userId: string) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
