import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'register' })
  async register(@Payload() data: any) {
    return this.authService.register(data);
  }

  @MessagePattern({ cmd: 'login' })
  async login(@Payload() user: any) {
    return this.authService.login(user);
  }

  @MessagePattern({ cmd: 'refresh' })
  async refresh(@Payload() data: { refreshToken: string }) {
    return this.authService.refresh(data.refreshToken);
  }

  @MessagePattern({ cmd: 'logout' })
  async logout(@Payload() data: { userId: string }) {
    return this.authService.logout(data.userId);
  }

  @MessagePattern({ cmd: 'forgot_password' })
  async forgotPassword(@Payload() data: { email: string }) {
    return this.authService.forgotPassword(data.email);
  }

  @MessagePattern({ cmd: 'reset_password' })
  async resetPassword(@Payload() data: { token: string; password: string }) {
    return this.authService.resetPassword(data.token, data.password);
  }

  @MessagePattern({ cmd: 'validate_user' })
  async validateUser(@Payload() data: { email: string; password: string }) {
    return this.authService.validateUser(data.email, data.password);
  }
}