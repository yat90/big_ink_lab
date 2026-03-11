import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Core module for global Nest artifacts: guards, filters, interceptors.
 * Register global guards here so domain modules stay focused.
 */
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class CoreModule {}
