import { ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from './jwt.strategy';

/** Extract the JWT payload (current user) from the request, or throw 401. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    if (!req.user?.sub) {
      throw new UnauthorizedException('Invalid token.');
    }
    return req.user;
  },
);
