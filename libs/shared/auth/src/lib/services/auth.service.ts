import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from '../strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    // This will be implemented in the auth-service
    // Here we just provide the interface
    return null;
  }

  async generateTokens(user: any, rememberMe = false) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      organizationId: user.organizationId,
    };

    // Extend token expiration if rememberMe is true
    const accessExpires = rememberMe 
      ? this.configService.get('JWT_ACCESS_EXPIRES_REMEMBER', '2h')
      : this.configService.get('JWT_ACCESS_EXPIRES', '15m');
    
    const refreshExpires = rememberMe
      ? this.configService.get('JWT_REFRESH_EXPIRES_REMEMBER', '30d')
      : this.configService.get('JWT_REFRESH_EXPIRES', '7d');

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: accessExpires,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpires,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpires,
      rememberMe, // Include remember me flag in response for client reference
    };
  }

  async hashPassword(password: string): Promise<string> {
    const rounds = parseInt(this.configService.get('BCRYPT_ROUNDS', '12'), 10);
    console.log('BCRYPT_ROUNDS from config:', this.configService.get('BCRYPT_ROUNDS'), 'parsed as:', rounds);
    return bcrypt.hash(password, rounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verify(token, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });
  }
}
