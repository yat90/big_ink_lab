import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model, Types } from 'mongoose';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './roles.enum';
import { JwtPayload } from './jwt.strategy';
import { User } from './schemas/user.schema';

/**
 * Guard that enforces role-based access for routes annotated with `@Roles(...)`.
 * Loads the user's role from the database (JWT does not embed the role to keep it fresh).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;
    const req = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const userId = req.user?.sub;
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedException('Invalid token.');
    }
    const user = await this.userModel.findById(userId).select('role enabled').lean().exec();
    if (!user || user.enabled === false) {
      throw new UnauthorizedException('User is disabled.');
    }
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    return true;
  }
}
