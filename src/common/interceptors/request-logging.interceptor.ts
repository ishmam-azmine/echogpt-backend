import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        void this.writeLog(
          request,
          response.statusCode,
          Date.now() - startedAt,
          null,
        );
      }),

      catchError((error) => {
        const statusCode =
          typeof error?.getStatus === 'function'
            ? error.getStatus()
            : 500;

        void this.writeLog(
          request,
          statusCode,
          Date.now() - startedAt,
          error instanceof Error
            ? error.message
            : 'Unknown error',
        );

        throw error;
      }),
    );
  }

  private async writeLog(
    request: any,
    statusCode: number,
    responseTimeMs: number,
    errorMessage: string | null,
  ) {
    try {
      await this.prisma.requestLog.create({
        data: {
          userId: request.user?.id ?? null,
          method: request.method,
          path: request.originalUrl ?? request.url,
          statusCode,
          responseTimeMs,
          ipAddress:
            request.ip ??
            request.socket?.remoteAddress ??
            null,
          userAgent:
            request.headers?.['user-agent'] ?? null,
          errorMessage,
          status:
            statusCode >= 400 ? 'FAILED' : 'SUCCESS',
        },
      });
    } catch {
      // Logging must never break the actual API request.
    }
  }
}
