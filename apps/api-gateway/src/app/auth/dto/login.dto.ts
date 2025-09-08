import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'test@example.com',
    description: 'User email address'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password',
    minLength: 6
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: false,
    description: 'Remember me for extended session duration',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiProperty({
    example: '123456',
    description: 'Two-factor authentication code',
    required: false
  })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}