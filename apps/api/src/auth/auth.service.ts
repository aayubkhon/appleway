import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthSession, LoginRequest, UserProfile } from '@appleway/shared';
import { parseLoginIdentifier } from '@appleway/shared';
import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

import type { Env } from '../config/env.js';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace.js';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateRefreshToken, hashRefreshToken, refreshTokenExpiry } from './refresh-token.js';

export interface RegisterInput {
  phone?: string;
  email?: string;
  password: string;
}

export interface AccessTokenPayload {
  sub: string;
}

const UNIQUE_VIOLATION = 'P2002';

export function toUserProfile(user: User): UserProfile {
  return { id: user.id, phone: user.phone, email: user.email, timezone: user.timezone };
}

@Injectable()
export class AuthService {
  /**
   * Verified against when the identifier matches no user, so a failed login
   * takes as long whether or not the account exists.
   */
  private readonly dummyHash = argon2.hash('appleway-timing-guard');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(input: RegisterInput): Promise<AuthSession> {
    const passwordHash = await argon2.hash(input.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          phone: input.phone ?? null,
          email: input.email ?? null,
          passwordHash,
          timezone: this.config.get('DEFAULT_TIMEZONE', { infer: true }),
        },
      });
      return await this.issueSession(user, randomUUID());
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION) {
        throw new ConflictException('account already exists');
      }
      throw error;
    }
  }

  async login(input: LoginRequest): Promise<AuthSession> {
    const identifier = parseLoginIdentifier(input.identifier);
    const user =
      identifier === null
        ? null
        : await this.prisma.user.findUnique({
            where:
              identifier.kind === 'email'
                ? { email: identifier.email }
                : { phone: identifier.phone },
          });

    const passwordMatches = await argon2.verify(
      user?.passwordHash ?? (await this.dummyHash),
      input.password,
    );

    if (user === null || !passwordMatches) {
      throw new UnauthorizedException('invalid credentials');
    }

    return this.issueSession(user, randomUUID());
  }

  /**
   * Rotates a refresh token: the presented one is revoked and a new one is
   * issued in the same family. Presenting a token that was already rotated
   * means it leaked or was replayed, so every token from that login dies.
   */
  async refresh(refreshToken: string): Promise<AuthSession> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(refreshToken) },
      include: { user: true },
    });

    if (stored === null) {
      throw new UnauthorizedException('invalid refresh token');
    }

    if (stored.revokedAt !== null) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('invalid refresh token');
    }

    if (stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('invalid refresh token');
    }

    // The revokedAt filter makes the rotation atomic: of two concurrent
    // refreshes with the same token, only one can win.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (count === 0) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('invalid refresh token');
    }

    return this.issueSession(stored.user, stored.familyId);
  }

  /** Ends the login the token belongs to. Unknown tokens are ignored. */
  async logout(refreshToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(refreshToken) },
      select: { familyId: true },
    });

    if (stored !== null) {
      await this.revokeFamily(stored.familyId);
    }
  }

  async profile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (user === null) {
      throw new UnauthorizedException('account not found');
    }

    return toUserProfile(user);
  }

  private async issueSession(user: User, familyId: string): Promise<AuthSession> {
    const accessTokenExpiresIn = this.config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true });
    const refreshToken = generateRefreshToken();
    const now = new Date();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: refreshTokenExpiry(
          now,
          this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }),
        ),
      },
    });

    const payload: AccessTokenPayload = { sub: user.id };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: accessTokenExpiresIn });

    return { accessToken, accessTokenExpiresIn, refreshToken, user: toUserProfile(user) };
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
