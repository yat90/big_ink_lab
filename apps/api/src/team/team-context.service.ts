import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthService, CurrentUserContext } from '../auth/auth.service';

/**
 * Resolves the current user's team and ensures the user actually belongs to one.
 * Centralised so member, transaction and task services share the same checks.
 */
@Injectable()
export class TeamContextService {
  constructor(private readonly authService: AuthService) {}

  async getRequiredContext(userId: string): Promise<CurrentUserContext> {
    const ctx = await this.authService.getCurrentContext(userId);
    if (!ctx.team) {
      throw new BadRequestException(
        'Set your team name on the Me page before using team features.',
      );
    }
    return ctx;
  }

  async getOptionalContext(userId: string): Promise<CurrentUserContext> {
    return this.authService.getCurrentContext(userId);
  }
}
