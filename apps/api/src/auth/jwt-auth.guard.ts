import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import type { AccessTokenPayload } from './auth.service.js';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

const BEARER_PREFIX = 'Bearer ';

/**
 * Requires a valid access token and records whose it is. Every owner-scoped
 * query takes its owner id from here, never from the request body or path.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (header === undefined || !header.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException('missing access token');
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(
        header.slice(BEARER_PREFIX.length),
      );
      request.userId = payload.sub;
    } catch {
      // Expired, tampered and malformed tokens all get the same answer.
      throw new UnauthorizedException('invalid access token');
    }

    return true;
  }
}

/** The signed-in user's id, set by JwtAuthGuard. */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().userId,
);
