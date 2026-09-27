import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

@Injectable()
export class WebSearchService {
  private readonly cacheMinutes = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async search(userId: string, query: string) {
    await this.subscriptionsService.ensureUsageAvailable(userId);

    const normalizedQuery = query.trim();

    const cacheSince = new Date(
      Date.now() - this.cacheMinutes * 60 * 1000,
    );

    const cachedSearch = await this.prisma.webSearch.findFirst({
      where: {
        query: {
          equals: normalizedQuery,
          mode: 'insensitive',
        },
        results: {
          not: undefined,
        },
        createdAt: {
          gte: cacheSince,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (cachedSearch?.results) {
      await this.prisma.webSearch.create({
        data: {
          userId,
          query: normalizedQuery,
          results: cachedSearch.results,
          cached: true,
        },
      });

      await this.subscriptionsService.consumeRequest(userId);

      return {
        query: normalizedQuery,
        cached: true,
        results: cachedSearch.results,
      };
    }

    const apiKey =
      this.configService.get<string>('WEB_SEARCH_API_KEY');

    if (!apiKey) {
      throw new BadRequestException(
        'WEB_SEARCH_API_KEY is not configured',
      );
    }

    const startedAt = Date.now();

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: normalizedQuery,
          search_depth: 'basic',
          max_results: 5,
          include_answer: true,
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        throw new Error(
          data?.detail ??
            data?.message ??
            `Search provider returned HTTP ${response.status}`,
        );
      }

      const results = {
        answer: data?.answer ?? null,
        items: Array.isArray(data?.results)
          ? data.results.map((item: any) => ({
              title: item?.title ?? '',
              url: item?.url ?? '',
              content: item?.content ?? '',
              score: item?.score ?? null,
            }))
          : [],
      };

      await this.prisma.$transaction([
        this.prisma.webSearch.create({
          data: {
            userId,
            query: normalizedQuery,
            results,
            cached: false,
          },
        }),
        this.prisma.subscription.update({
          where: { userId },
          data: {
            requestsUsed: {
              increment: 1,
            },
          },
        }),
        this.prisma.apiUsageLog.create({
          data: {
            userId,
            endpoint: '/api/v1/search',
            status: 'SUCCESS',
            responseTimeMs: Date.now() - startedAt,
          },
        }),
      ]);

      return {
        query: normalizedQuery,
        cached: false,
        results,
      };
    } catch (error) {
      await this.prisma.apiUsageLog.create({
        data: {
          userId,
          endpoint: '/api/v1/search',
          status: 'FAILED',
          responseTimeMs: Date.now() - startedAt,
        },
      });

      throw new BadRequestException(
        error instanceof Error
          ? `Web search failed: ${error.message}`
          : 'Web search failed',
      );
    }
  }

  async history(userId: string) {
    return this.prisma.webSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async recent(userId: string) {
    return this.prisma.webSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        query: true,
        cached: true,
        createdAt: true,
      },
    });
  }

  async suggestions(userId: string, query: string) {
    const term = query.trim();

    if (!term) {
      return [];
    }

    const searches = await this.prisma.webSearch.findMany({
      where: {
        userId,
        query: {
          contains: term,
          mode: 'insensitive',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
      select: {
        query: true,
      },
    });

    return [
      ...new Set(searches.map((search) => search.query)),
    ].slice(0, 5);
  }
}
