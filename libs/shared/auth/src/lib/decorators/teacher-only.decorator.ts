import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@edutech-lms/common';

export const TEACHER_ROLES_KEY = 'teacher_roles';
export const TeacherOnly = () => SetMetadata(TEACHER_ROLES_KEY, [
  UserRole.TEACHER,
  UserRole.ADMIN
]);