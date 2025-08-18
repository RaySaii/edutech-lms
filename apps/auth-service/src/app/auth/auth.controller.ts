import { Controller, ValidationPipe, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, RefreshTokenDto, VerifyEmailDto, Enable2FADto } from './dto';

@Controller()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'register' })
  async register(@Payload() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @MessagePattern({ cmd: 'login' })
  async login(@Payload() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @MessagePattern({ cmd: 'refresh' })
  async refresh(@Payload() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @MessagePattern({ cmd: 'logout' })
  async logout(@Payload() data: { userId: string }) {
    return this.authService.logout(data.userId);
  }

  @MessagePattern({ cmd: 'forgot_password' })
  async forgotPassword(@Payload() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @MessagePattern({ cmd: 'reset_password' })
  async resetPassword(@Payload() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @MessagePattern({ cmd: 'validate_user' })
  async validateUser(@Payload() data: { email: string; password: string }) {
    return this.authService.validateUser(data.email, data.password);
  }

  @MessagePattern({ cmd: 'change_password' })
  async changePassword(@Payload() data: { userId: string; changePasswordDto: ChangePasswordDto }) {
    return this.authService.changePassword(data.userId, data.changePasswordDto);
  }

  @MessagePattern({ cmd: 'verify_email' })
  async verifyEmail(@Payload() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @MessagePattern({ cmd: 'setup_2fa' })
  async setupTwoFactor(@Payload() data: { userId: string }) {
    return this.authService.setupTwoFactor(data.userId);
  }

  @MessagePattern({ cmd: 'enable_2fa' })
  async enableTwoFactor(@Payload() data: { userId: string; enable2FADto: Enable2FADto }) {
    return this.authService.enableTwoFactor(data.userId, data.enable2FADto);
  }

  @MessagePattern({ cmd: 'disable_2fa' })
  async disableTwoFactor(@Payload() data: { userId: string; currentPassword: string }) {
    return this.authService.disableTwoFactor(data.userId, data.currentPassword);
  }

  @MessagePattern({ cmd: 'get_user_profile' })
  async getUserProfile(@Payload() data: { userId: string }) {
    return this.authService.getUserProfile(data.userId);
  }

  @MessagePattern({ cmd: 'check_email_availability' })
  async checkEmailAvailability(@Payload() data: { email: string }) {
    return this.authService.checkEmailAvailability(data.email);
  }
}