import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

/**
 * Core module for global Nest artifacts: guards, filters, interceptors.
 * Register global guards here so domain modules stay focused.
 *
 * The `RolesGuard` runs after `JwtAuthGuard` (Nest applies APP_GUARD providers
 * in the order they are registered) and only enforces when a route is
 * annotated with `@Roles(...)`.
 */
@Module({
  imports: [AuthModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class CoreModule {}
