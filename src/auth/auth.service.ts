import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import ms, { type StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        subscription: {
          create: {},
        },
      },
    });

    const tokens = await this.createSession(
      user.id,
      user.email,
      user.role,
      userAgent,
      ipAddress,
    );

    return {
      message: 'Registration successful',
      user: this.safeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.createSession(
      user.id,
      user.email,
      user.role,
      userAgent,
      ipAddress,
    );

    return {
      message: 'Login successful',
      user: this.safeUser(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);

    const sessions = await this.prisma.session.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let matchingSession:
      | (typeof sessions)[number]
      | undefined;

    for (const session of sessions) {
      if (await bcrypt.compare(refreshToken, session.refreshTokenHash)) {
        matchingSession = session;
        break;
      }
    }

    if (!matchingSession) {
      throw new UnauthorizedException('Refresh token is invalid or revoked');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not available');
    }

    const accessToken = await this.signAccessToken(
      user.id,
      user.email,
      user.role,
    );

    return {
      accessToken,
    };
  }

  async logout(userId: string, refreshToken: string) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
      },
    });

    for (const session of sessions) {
      if (await bcrypt.compare(refreshToken, session.refreshTokenHash)) {
        await this.prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });

        return {
          message: 'Logged out successfully',
        };
      }
    }

    throw new UnauthorizedException('Session not found');
  }

  private async createSession(
    userId: string,
    email: string,
    role: 'USER' | 'ADMIN',
    userAgent?: string,
    ipAddress?: string,
  ) {
    const accessToken = await this.signAccessToken(userId, email, role);

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET');

    const refreshExpiry =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email,
        role,
      },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiry as StringValue,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    const expiresAt = new Date(Date.now() + ms(refreshExpiry as StringValue));

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async signAccessToken(
    userId: string,
    email: string,
    role: 'USER' | 'ADMIN',
  ) {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const expiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    return this.jwtService.signAsync(
      {
        sub: userId,
        email,
        role,
      },
      {
        secret,
        expiresIn: expiresIn as StringValue,
      },
    );
  }

  private async verifyRefreshToken(refreshToken: string) {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    try {
      return await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        role: 'USER' | 'ADMIN';
      }>(refreshToken, {
        secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private safeUser(user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: 'USER' | 'ADMIN';
    emailVerified: boolean;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
