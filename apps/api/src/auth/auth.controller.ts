import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  deleteAccountRequestSchema,
  loginRequestSchema,
  refreshRequestSchema,
  registerRequestSchema,
  type AccountExport,
  type AuthSession,
  type DeleteAccountRequest,
  type LoginRequest,
  type RefreshRequest,
  type UserProfile,
} from '@appleway/shared';

import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AccountService } from './account.service.js';
import { AuthService, type RegisterInput } from './auth.service.js';
import { CurrentUserId, JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly account: AccountService,
  ) {}

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

  /** Permanently erases the account and all of its ledger data. */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  deleteAccount(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(deleteAccountRequestSchema)) body: DeleteAccountRequest,
  ): Promise<void> {
    return this.account.deleteAccount(userId, body.password);
  }

  /** Everything the account owns, as a downloadable JSON file. */
  @Get('me/export')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  async exportData(
    @CurrentUserId() userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccountExport> {
    const data = await this.account.exportData(userId);
    res.attachment(`appleway-export-${data.exportedAt.slice(0, 10)}.json`);
    return data;
  }
}
