import { SetMetadata } from '@nestjs/common';
import { REQUIRE_EMAIL_VERIFICATION_KEY } from '../guards/email-verified.guard';

export const RequireEmailVerification = () => SetMetadata(REQUIRE_EMAIL_VERIFICATION_KEY, true);