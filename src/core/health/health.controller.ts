import { Controller, Get } from '@nestjs/common';
import { HealthCheck } from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { HealthService } from './health.service';
import { ConfigService } from '@/core/config/config.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check application health status' })
  async check() {
    const healthCheckEnabled = this.configService.get('HEALTH_CHECK_ENABLED');

    if (!healthCheckEnabled) {
      return this.healthService.getEmptyResponse();
    }

    return this.healthService.checkHealth();
  }
}
