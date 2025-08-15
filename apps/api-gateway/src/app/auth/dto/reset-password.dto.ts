import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset-token-uuid',
    description: 'Password reset token'
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({
    example: 'newpassword123',
    description: 'New password',
    minLength: 6
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}