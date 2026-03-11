import { Controller, Get } from '@nestjs/common';
import { AppService, HealthCheckResult } from './app.service';
import { Public } from './auth/public.decorator';

/** Root controller for hello and health endpoints. */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Returns a greeting message (public). */
  @Public()
  @Get('hello')
  getHello(): { message: string } {
    return this.appService.getHello();
  }

  /** Returns API and MongoDB health status (public). */
  @Public()
  @Get('health')
  getHealth(): HealthCheckResult {
    return this.appService.getHealth();
  }
}
