import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChangePlanDto } from './dto/change-plan.dto.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return this.withUsage(subscription);
  }

  async changePlan(userId: string, dto: ChangePlanDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.plan === dto.plan) {
      throw new BadRequestException(
        `User is already on the ${dto.plan} plan`,
      );
    }

    const requestLimit = dto.plan === 'PREMIUM' ? 1000 : 100;

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        plan: dto.plan,
        status: 'ACTIVE',
        requestLimit,
        requestsUsed: 0,
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.periodEnd(),
      },
    });

    return {
      message:
        dto.plan === 'PREMIUM'
          ? 'Subscription upgraded successfully'
          : 'Subscription downgraded successfully',
      subscription: this.withUsage(updated),
    };
  }

  async getUsage(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return {
      plan: subscription.plan,
      status: subscription.status,
      requestLimit: subscription.requestLimit,
      requestsUsed: subscription.requestsUsed,
      remainingRequests: Math.max(
        subscription.requestLimit - subscription.requestsUsed,
        0,
      ),
      limitReached:
        subscription.requestsUsed >= subscription.requestLimit,
    };
  }

  async ensureUsageAvailable(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new BadRequestException(
        'An active subscription is required',
      );
    }

    if (subscription.requestsUsed >= subscription.requestLimit) {
      throw new BadRequestException(
        'Subscription request limit reached',
      );
    }

    return subscription;
  }

  async consumeRequest(userId: string) {
    await this.ensureUsageAvailable(userId);

    return this.prisma.subscription.update({
      where: { userId },
      data: {
        requestsUsed: {
          increment: 1,
        },
      },
    });
  }

  private withUsage(subscription: {
    id: string;
    userId: string;
    plan: 'FREE' | 'PREMIUM';
    status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
    requestLimit: number;
    requestsUsed: number;
    currentPeriodStart: Date;
    currentPeriodEnd: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...subscription,
      remainingRequests: Math.max(
        subscription.requestLimit - subscription.requestsUsed,
        0,
      ),
    };
  }

  private periodEnd() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  }
}
