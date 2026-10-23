import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  loginRequestSchema,
  refreshRequestSchema,
  registerRequestSchema,
  type AuthSession,
  type LoginRequest,
  type RefreshRequest,
  type UserProfile,
} from '@appleway/shared';

import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AuthService, type RegisterInput } from './auth.service.js';
import { CurrentUserId, JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  register(
    @Body(new ZodValidationPipe(registerRequestSchema)) body: RegisterInput,
  ): Promise<AuthSession> {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  login(@Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest): Promise<AuthSession> {
    return this.auth.login(body);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  refresh(
    @Body(new ZodValidationPipe(refreshRequestSchema)) body: RefreshRequest,
  ): Promise<AuthSession> {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body(new ZodValidationPipe(refreshRequestSchema)) body: RefreshRequest): Promise<void> {
    return this.auth.logout(body.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUserId() userId: string): Promise<UserProfile> {
    return this.auth.profile(userId);
  }
}
