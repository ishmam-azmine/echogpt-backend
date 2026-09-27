import { Controller, Get } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthService } from './health.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Check API and database health',
  })
  @ApiResponse({
    status: 200,
    description: 'System health information',
    schema: {
      example: {
        status: 'ok',
        database: 'connected',
        responseTimeMs: 3,
        uptimeSeconds: 120,
        timestamp: '2026-09-27T14:00:00.000Z',
      },
    },
  })
  check() {
    return this.healthService.check();
  }
}
